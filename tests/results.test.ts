import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { summarize } from "../lib/metrics.ts";
import { formatNumber } from "../lib/catalog.ts";

test("Округление совпадает с таблицами сохранённого сравнения", () => {
  assert.equal(formatNumber(149.45), "149,4");
  assert.equal(formatNumber(56.875), "56,9");
});

test("Медиана и p95 совпадают с измерениями во всех 24 сериях", async () => {
  let count = 0;
  for (const language of ["csharp", "go", "typescript", "python"]) {
    const data = JSON.parse(await readFile(new URL("../benchmark/" + language + ".json", import.meta.url), "utf8"));
    assert.equal(typeof data.sqlite, "string");
    assert.equal(data.results.length, 6);
    const seen = new Set<string>();
    for (const item of data.results) {
      const key = item.case + ":" + item.method;
      assert.ok(!seen.has(key));
      seen.add(key);
      assert.ok(["point", "range", "join"].includes(item.case));
      assert.ok(["orm", "sql"].includes(item.method));
      assert.equal(item.samples_us.length, 2100);
      const stats = summarize(item.samples_us);
      assert.ok(Math.abs(stats.median - item.median_us) < 1e-6, language + " " + key + " — медиана");
      assert.ok(Math.abs(stats.p95 - item.p95_us) < 1e-6, language + " " + key + " p95");
      count += stats.count;
    }
  }
  assert.equal(count, 50400);
});

test("Метаданные содержат переносимые пути", async () => {
  const data = JSON.parse(await readFile(new URL("../benchmark/environment.json", import.meta.url), "utf8"));
  assert.ok(Number.isFinite(Date.parse(data.utc)));
  assert.equal(data.command_paths, "portable");
  assert.ok(!JSON.stringify(data.commands).includes("/Users/"));
  assert.ok(!JSON.stringify(data.commands).includes(".work"));
});
