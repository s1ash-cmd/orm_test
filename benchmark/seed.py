"""Создаёт только benchmark/library.db рядом с этим скриптом."""
from pathlib import Path
import sqlite3

path = Path(__file__).with_name('library.db')
with sqlite3.connect(path) as db:
    db.executescript('''
    PRAGMA foreign_keys=ON;
    DROP TABLE IF EXISTS loans;
    DROP TABLE IF EXISTS books;
    CREATE TABLE books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL);
    CREATE TABLE loans (id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER NOT NULL
        REFERENCES books(id));
    CREATE INDEX ix_loans_book_id ON loans(book_id);
    ''')
    db.executemany('INSERT INTO books(id,title) VALUES (?,?)',
                   ((i, f'Book {i:05d}') for i in range(1, 10001)))
    db.executemany('INSERT INTO loans(id,book_id) VALUES (?,?)',
                   ((i, (i-1) % 10000 + 1) for i in range(1, 20001)))
    db.execute('ANALYZE')
print(path)
