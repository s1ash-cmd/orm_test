export function summarize(samples: number[]) {
  if (samples.length === 0 || samples.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("Ожидаются непустые измерения времени в микросекундах.");
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    p95: sorted[Math.ceil(sorted.length * .95) - 1],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: sorted.length,
  };
}

export function niceMaximum(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const normalized = value / power;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * power;
}

export function relativeTime(orm: number, sql: number) {
  return sql > 0 ? orm / sql : null;
}
