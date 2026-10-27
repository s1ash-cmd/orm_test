export type LibraryId = "csharp" | "go" | "typescript" | "python";
export type CaseId = "point" | "range" | "join";
export type Metric = "median" | "p95";
export type Section = "results" | "code" | "repeat" | "method";
export type Method = "orm" | "sql";

export interface Measurement {
  median: number;
  p95: number;
  min: number;
  max: number;
  count: number;
}

export interface QueryResult {
  case: CaseId;
  orm: Measurement;
  sql: Measurement;
}

export interface LibraryResult {
  id: LibraryId;
  language: string;
  orm: string;
  sqlite: string;
  driver: string;
  runtime: string;
  results: QueryResult[];
}

export interface Example {
  id: LibraryId;
  filename: string;
  syntax: string;
  model: string;
  connection: string;
  crud: string;
  source: string;
  queries: Record<CaseId, { orm: string; sql: string }>;
  note: string;
  commands: string;
  files: string[];
  docs: { title: string; url: string }[];
}

export interface Dataset {
  measuredAt: string;
  machine: string;
  os: string;
  architecture: string;
  totalSamples: number;
  sampleCount: number;
  warmups: number;
  rounds: number;
  perRound: number;
  libraries: LibraryResult[];
  examples: Example[];
}
