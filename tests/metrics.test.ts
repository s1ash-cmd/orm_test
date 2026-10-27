import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize, niceMaximum, relativeTime } from "../lib/metrics.ts";

test("median uses the middle pair for even-length samples", () => {
  const input = [100, 3, 1, 2];
  assert.deepEqual(summarize(input), { median: 2.5, p95: 100, min: 1, max: 100, count: 4 });
  assert.deepEqual(input, [100, 3, 1, 2]);
});

test("p95 uses nearest rank, rather than interpolation", () => {
  const samples = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.equal(summarize(samples).p95, 19);
  assert.equal(summarize([7]).median, 7);
});

test("invalid timing samples fail instead of showing a graph", () => {
  for (const input of [[], [-1], [NaN], [Infinity]]) assert.throws(() => summarize(input));
});

test("a ratio needs a nonzero SQL time and chart limits cover the data", () => {
  assert.equal(relativeTime(12, 4), 3);
  assert.equal(relativeTime(1, 0), null);
  for (const value of [.15, 1, 2.4, 17, 199, 500]) assert.ok(niceMaximum(value) >= value);
});
