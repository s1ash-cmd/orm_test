import type { CaseId, LibraryId } from "./types";

const sql = {
  point: "SELECT id, title FROM books\nWHERE id = ?;",
  range: "SELECT id, title FROM books\nWHERE id >= ?\nORDER BY id LIMIT 100;",
  join: "SELECT l.id, l.book_id, b.title\nFROM loans AS l\nJOIN books AS b ON b.id = l.book_id\nWHERE l.id >= ?\nORDER BY l.id LIMIT 100;",
};

function lines(...value: string[]) { return value.join("\n"); }

export const queries: Record<LibraryId, Record<CaseId, string>> = {
  csharp: {
    point: lines("var rows = db.Books.AsNoTracking()", "    .Where(b => b.Id == start).ToList();"),
    range: lines("var rows = db.Books.AsNoTracking()", "    .Where(b => b.Id >= start)", "    .OrderBy(b => b.Id).Take(100).ToList();"),
    join: lines("var rows = db.Loans.AsNoTracking()", "    .Where(l => l.Id >= start)", "    .OrderBy(l => l.Id).Take(100)", "    .Select(l => new {", "        l.Id, l.BookId, l.Book.Title", "    }).ToList();"),
  },
  go: {
    point: lines("var books []Book", "err := db.Select(\"id,title\").", "    Where(\"id = ?\", start).Find(&books).Error"),
    range: lines("var books []Book", "err := db.Select(\"id,title\").", "    Where(\"id >= ?\", start).Order(\"id\").", "    Limit(100).Find(&books).Error"),
    join: lines("var rows []JoinRow", "err := db.Table(\"loans AS l\").", "    Select(\"l.id,l.book_id,b.title\").", "    Joins(\"JOIN books b ON b.id=l.book_id\").", "    Where(\"l.id >= ?\", start).Order(\"l.id\").", "    Limit(100).Scan(&rows).Error"),
  },
  typescript: {
    point: lines("const rows = await source.getRepository(Book)", "  .createQueryBuilder('b')", "  .where('b.id = :start', { start }).getMany();"),
    range: lines("const rows = await source.getRepository(Book)", "  .createQueryBuilder('b')", "  .where('b.id >= :start', { start })", "  .orderBy('b.id').limit(100).getMany();"),
    join: lines("const rows = await source.getRepository(Loan)", "  .createQueryBuilder('l')", "  .innerJoin('l.book', 'b')", "  .select('l.id', 'id')", "  .addSelect('l.book_id', 'book_id')", "  .addSelect('b.title', 'title')", "  .where('l.id >= :start', { start })", "  .orderBy('l.id').limit(100).getRawMany();"),
  },
  python: {
    point: lines("rows = session.scalars(", "    select(Book).where(Book.id == start)", ").all()"),
    range: lines("rows = session.scalars(", "    select(Book).where(Book.id >= start)", "    .order_by(Book.id).limit(100)", ").all()"),
    join: lines("rows = session.execute(", "    select(Loan.id, Loan.book_id, Book.title)", "    .join(Book).where(Loan.id >= start)", "    .order_by(Loan.id).limit(100)", ").all()"),
  },
};

export function sqlFor(id: LibraryId, kind: CaseId) {
  return id === "csharp" ? sql[kind].replace("?", "$start") : sql[kind];
}

export const exampleNotes: Record<LibraryId, string> = {
  csharp: "Новый DbContext на запрос. Чтение с AsNoTracking, связь настроена в OnModelCreating.",
  go: "Структуры и теги задают модель. В JOIN результат считывается в JoinRow; Error проверяется после каждой операции.",
  typescript: "Нужны reflect-metadata и настройки декораторов. synchronize включён только в demo, в benchmark отключён.",
  python: "Новая Session на запрос. Прямой sqlite3 преобразует строки в отдельный dataclass PlainBook.",
};

export const docs: Record<LibraryId, { title: string; url: string }[]> = {
  csharp: [
    { title: "EF Core", url: "https://learn.microsoft.com/en-us/ef/core/" },
    { title: "Связь 1:N", url: "https://learn.microsoft.com/en-us/ef/core/modeling/relationships/one-to-many" },
  ],
  go: [
    { title: "GORM", url: "https://gorm.io/docs/" },
    { title: "Загрузка связей", url: "https://gorm.io/docs/preload.html" },
  ],
  typescript: [
    { title: "TypeORM", url: "https://typeorm.io/docs/getting-started/" },
    { title: "OneToMany / ManyToOne", url: "https://typeorm.io/docs/relations/many-to-one-one-to-many-relations/" },
  ],
  python: [
    { title: "SQLAlchemy 2.0", url: "https://docs.sqlalchemy.org/en/20/orm/quickstart.html" },
    { title: "Session", url: "https://docs.sqlalchemy.org/en/20/orm/session_basics.html" },
  ],
};

export const commands: Record<LibraryId, string> = {
  csharp: lines("cd projects/csharp", "dotnet restore --locked-mode", "dotnet build -c Release --no-restore", "dotnet run -c Release --no-build -- demo", "cd ../.."),
  go: lines("cd projects/go", "go mod download", "go build -o ../../benchmark/go-demo .", "go run . demo", "cd ../.."),
  typescript: lines("cd projects/typescript", "npm ci", "npm run build", "npm run demo", "cd ../.."),
  python: lines("python3 -m venv .venv", ".venv/bin/python -m pip install -r projects/python/requirements.txt", ".venv/bin/python projects/python/main.py demo"),
};
