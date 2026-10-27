import { readFile } from "node:fs/promises";
import path from "node:path";
import { libraries, cases } from "./catalog";
import { summarize } from "./metrics";
import { commands, docs, exampleNotes, queries, sqlFor } from "./examples";
import type { CaseId, Dataset, Example, LibraryId, LibraryResult, Measurement, Method } from "./types";

export interface RawMeasurement {
  case: CaseId;
  method: Method;
  median_us: number;
  p95_us: number;
  samples_us: number[];
}
interface RawLibrary {
  language: string;
  orm: string;
  sqlite: string;
  results: RawMeasurement[];
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readRaw(id: LibraryId): Promise<RawLibrary> {
  const value: unknown = JSON.parse(await readFile(path.join(process.cwd(), "benchmark", id + ".json"), "utf8"));
  if (!object(value) || typeof value.language !== "string" || typeof value.orm !== "string" || typeof value.sqlite !== "string" || !Array.isArray(value.results)) {
    throw new Error("Неверный формат результатов: " + id);
  }
  const seen = new Set<string>();
  for (const result of value.results) {
    if (!object(result) || !cases.some(item => item.id === result.case) || !["orm", "sql"].includes(String(result.method)) || !Array.isArray(result.samples_us)) {
      throw new Error("Неверная серия: " + id);
    }
    const key = String(result.case) + ":" + result.method;
    if (seen.has(key)) throw new Error("Повторная серия: " + id + " " + key);
    seen.add(key);
    const samples = result.samples_us as number[];
    const stats = summarize(samples);
    if (samples.length !== 2100 || typeof result.median_us !== "number" || typeof result.p95_us !== "number" ||
      Math.abs(stats.median - result.median_us) > 1e-6 || Math.abs(stats.p95 - result.p95_us) > 1e-6) {
      throw new Error("Сводка не совпадает с измерениями: " + id + " " + key);
    }
  }
  if (seen.size !== 6) throw new Error("Неполные результаты: " + id);
  return value as unknown as RawLibrary;
}

function between(source: string, start: string, end?: string) {
  const first = source.indexOf(start);
  if (first < 0) throw new Error("Не найден фрагмент исходного кода: " + start);
  const last = end ? source.indexOf(end, first + start.length) : source.length;
  if (last < 0) throw new Error("Не найдена граница исходного кода: " + end);
  return source.slice(first, last).trim();
}

async function readExample(library: typeof libraries[number]): Promise<Example> {
  const source = await readFile(path.join(process.cwd(), "projects", library.id, path.basename(library.filename)), "utf8");
  let model: string, connection: string, crud: string;
  if (library.id === "csharp") {
    model = between(source, "public class Book");
    connection = between(source, "using var connection", 'if (mode == "demo") {');
    crud = between(source, 'if (mode == "demo") {', "} else {");
  } else if (library.id === "go") {
    model = between(source, "type Book struct", "func must(");
    connection = between(source, "db,err:=gorm.Open", 'if mode=="demo" {demo(db)}');
    crud = between(source, "func demo(", "func bench(");
  } else if (library.id === "typescript") {
    model = between(source, "@Entity('books')", "const mode");
    connection = between(source, "const source = new DataSource", "type Row");
    crud = between(source, "async function demo()", "async function bench()");
  } else {
    model = between(source, "class Base(", "ROOT =");
    connection = between(source, "engine = create_engine", "def demo():");
    crud = between(source, "def demo():", "def bench():");
  }
  return {
    ...library, model, connection, crud, source,
    note: exampleNotes[library.id], commands: commands[library.id], docs: docs[library.id],
    queries: Object.fromEntries(cases.map(item => [item.id, { orm: queries[library.id][item.id], sql: sqlFor(library.id, item.id) }])) as Example["queries"],
  };
}

export async function loadDataset(): Promise<Dataset> {
  const environment = JSON.parse(await readFile(path.join(process.cwd(), "benchmark/environment.json"), "utf8")) as {
    utc: string; system: string; python: string; node: string; dotnet: string; go: string;
    hardware?: { chip?: string; architecture?: string };
  };
  const runtimes: Record<LibraryId, string> = {
    csharp: ".NET SDK " + environment.dotnet,
    go: "Go " + (environment.go.match(/go(\d+\.\d+\.\d+)/)?.[1] ?? environment.go),
    typescript: "Node.js " + environment.node.replace(/^v/, ""),
    python: "Python " + environment.python.split(" ")[0],
  };
  const results: LibraryResult[] = await Promise.all(libraries.map(async library => {
    const raw = await readRaw(library.id);
    const measure = (kind: CaseId, method: Method): Measurement => {
      const value = raw.results.find(item => item.case === kind && item.method === method);
      if (!value) throw new Error("Не хватает измерений.");
      return summarize(value.samples_us);
    };
    return { ...library, orm: raw.orm, sqlite: raw.sqlite, runtime: runtimes[library.id],
      results: cases.map(item => ({ case: item.id, orm: measure(item.id, "orm"), sql: measure(item.id, "sql") })) };
  }));
  return {
    measuredAt: environment.utc, machine: environment.hardware?.chip ?? "Не указана",
    os: environment.system.match(/macOS-[\d.]+/)?.[0].replace("-", " ") ?? environment.system,
    architecture: environment.hardware?.architecture ?? "",
    totalSamples: results.flatMap(library => library.results).reduce((sum, item) => sum + item.orm.count + item.sql.count, 0),
    sampleCount: 2100, warmups: 50, rounds: 7, perRound: 300, libraries: results,
    examples: await Promise.all(libraries.map(readExample)),
  };
}
