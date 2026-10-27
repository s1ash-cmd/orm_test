from __future__ import annotations
import json
from dataclasses import dataclass
import math
import os
from pathlib import Path
import sqlite3
import statistics
import sys
from time import perf_counter_ns
from sqlalchemy import ForeignKey, String, create_engine, event, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, selectinload

@dataclass
class PlainBook:
    id: int
    title: str

class Base(DeclarativeBase):
    pass

class Book(Base):
    __tablename__ = 'books'
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    loans: Mapped[list[Loan]] = relationship(back_populates='book')

class Loan(Base):
    __tablename__ = 'loans'
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(ForeignKey('books.id'), index=True)
    book: Mapped[Book] = relationship(back_populates='loans')

ROOT = Path(__file__).resolve().parents[2]
mode = sys.argv[1] if len(sys.argv) > 1 else 'demo'
path = Path(os.getenv('ORM_DB_PATH', str(ROOT / ('benchmark/library.db' if mode == 'bench' else 'projects/python/demo.db')))).resolve()
engine = create_engine('sqlite:///' + str(path), echo=(mode == 'demo'))
@event.listens_for(engine, 'connect')
def enable_fk(conn, _):
    conn.execute('PRAGMA foreign_keys=ON')

def demo():
    Base.metadata.create_all(engine)
    with Session(engine) as session, session.begin():
        book = Book(title='ORM на практике')
        session.add(book)
        session.flush()  # INSERT, но ещё не COMMIT
        loan = Loan(book=book)
        session.add(loan)
        session.flush()
        book.title = 'ORM и SQL'
        session.flush()  # UPDATE
        loaded = session.scalars(select(Book).where(Book.id == book.id)
            .options(selectinload(Book.loans))).one()
        assert loaded.title == 'ORM и SQL' and len(loaded.loans) == 1
        print(f'Книга {loaded.id}: {loaded.title}; выдач: {len(loaded.loans)}')
        session.delete(loan)
        session.flush()
        session.delete(book)
        session.flush()
        assert session.scalar(select(Book.id).where(Book.id == book.id)) is None
    print('CRUD и связь 1:N проверены; демонстрационные записи удалены.')

def bench():
    if not path.exists():
        raise SystemExit('Сначала выполните python benchmark/seed.py')
    raw = sqlite3.connect(path)
    # Соединения открыты заранее. Session создаётся на каждый запрос;
    # Карта идентичности не может вернуть объект вместо обращения к SQLite.
    conn = engine.connect()
    def orm(kind, start):
        with Session(bind=conn, autoflush=False) as s:
            if kind == 'join':
                return [tuple(r) for r in s.execute(select(Loan.id, Loan.book_id, Book.title)
                    .join(Book).where(Loan.id >= start).order_by(Loan.id).limit(100))]
            q = select(Book).where(Book.id == start) if kind == 'point' else (
                select(Book).where(Book.id >= start).order_by(Book.id).limit(100))
            return [(b.id, b.title) for b in s.scalars(q).all()]
    def sql(kind, start):
        if kind == 'join':
            return raw.execute('SELECT l.id,l.book_id,b.title FROM loans l JOIN books b ON b.id=l.book_id WHERE l.id>=? ORDER BY l.id LIMIT 100', (start,)).fetchall()
        query = 'SELECT id,title FROM books WHERE id=?' if kind == 'point' else 'SELECT id,title FROM books WHERE id>=? ORDER BY id LIMIT 100'
        books = [PlainBook(id=r[0], title=r[1]) for r in raw.execute(query, (start,))]
        return [(b.id, b.title) for b in books]
    results = []
    for kind in ('point', 'range', 'join'):
        for start in (1, 2501, 5001):
            assert orm(kind, start) == sql(kind, start), kind
        samples = {'orm': [], 'sql': []}
        for i in range(50):
            orm(kind, 1+i); sql(kind, 1+i)
        for r in range(7):
            for name in (('orm','sql') if r % 2 == 0 else ('sql','orm')):
                fn = orm if name == 'orm' else sql
                for i in range(300):
                    start = 1 + ((i*37+r*101) % 9000)
                    t = perf_counter_ns(); rows = fn(kind,start)
                    samples[name].append((perf_counter_ns()-t)/1000)
                    assert len(rows) == (1 if kind == 'point' else 100)
        for name, xs in samples.items():
            results.append(dict(case=kind, method=name, median_us=statistics.median(xs),
                p95_us=sorted(xs)[math.ceil(len(xs)*.95)-1], samples_us=xs))
    conn.close(); raw.close()
    print(json.dumps(dict(language='Python', orm='SQLAlchemy 2.0.55',
        sqlite=sqlite3.sqlite_version, results=results)))

if __name__ == '__main__':
    demo() if mode == 'demo' else bench() if mode == 'bench' else sys.exit('Укажите режим demo или bench.')
