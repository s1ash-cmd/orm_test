import type { CaseId, LibraryId, Section } from "./types";

export const libraries: { id: LibraryId; language: string; name: string; driver: string; filename: string; syntax: string; files: string[] }[] = [
  { id: "csharp", language: "C#", name: "EF Core", driver: "Microsoft.Data.Sqlite", filename: "projects/csharp/Program.cs", syntax: "csharp", files: ["projects/csharp/Program.cs", "projects/csharp/LibraryDemo.csproj", "projects/csharp/packages.lock.json"] },
  { id: "go", language: "Go", name: "GORM", driver: "database/sql", filename: "projects/go/main.go", syntax: "go", files: ["projects/go/main.go", "projects/go/go.mod", "projects/go/go.sum"] },
  { id: "typescript", language: "TypeScript", name: "TypeORM", driver: "better-sqlite3", filename: "projects/typescript/main.ts", syntax: "typescript", files: ["projects/typescript/main.ts", "projects/typescript/package.json", "projects/typescript/package-lock.json", "projects/typescript/tsconfig.json"] },
  { id: "python", language: "Python", name: "SQLAlchemy", driver: "sqlite3", filename: "projects/python/main.py", syntax: "python", files: ["projects/python/main.py", "projects/python/requirements.txt"] },
];

export const cases: { id: CaseId; name: string; short: string; description: string }[] = [
  { id: "point", name: "Поиск по ключу", short: "По ключу", description: "Одна книга по первичному ключу." },
  { id: "range", name: "Список из 100 книг", short: "100 книг", description: "Книги от заданного id, сортировка и LIMIT 100." },
  { id: "join", name: "JOIN на 100 выдач", short: "JOIN 100", description: "Номер выдачи, внешний ключ и название книги." },
];

export const sections: { id: Section; label: string }[] = [
  { id: "results", label: "Результаты" },
  { id: "code", label: "Код" },
  { id: "repeat", label: "Как повторить" },
  { id: "method", label: "Методика" },
];

export const downloadFiles = [
  ...libraries.flatMap(library => library.files),
  ...libraries.map(library => "benchmark/" + library.id + ".json"),
  "benchmark/environment.json", "benchmark/summary.csv", "benchmark/seed.py", "benchmark/run.py",
  "diagrams/library.drawio",
] as const;

export function fileUrl(filename: string) {
  return "/api/files?path=" + encodeURIComponent(filename);
}

export function formatNumber(value: number, digits = 1) {
  const rounded = Number(value.toFixed(digits));
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(rounded);
}
