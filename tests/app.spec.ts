import { expect, test, type Page } from "@playwright/test";

async function filters(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) < 900) {
    await page.getByRole("button", { name: "Открыть фильтры" }).click();
    return page.getByRole("dialog", { name: "Фильтры результатов" });
  }
  return page.locator("aside.sidebar");
}
async function closeFilters(page: Page) {
  const button = page.getByRole("button", { name: "Закрыть фильтры" });
  if (await button.isVisible()) await button.click();
}

test("graphs change metric and unit using saved measurements", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".benchmark-chart")).toHaveCount(4);
  const value = page.locator('[data-library="csharp"] .orm-label').first();
  await expect(value).toHaveText("56,7");
  await page.getByRole("button", { name: "p95", exact: true }).click();
  await expect(value).toHaveText("68,5");
  await page.getByRole("button", { name: "ORM / SQL", exact: true }).click();
  await expect(value).toHaveText("12,9×");
  await page.getByRole("checkbox", { name: "Единая шкала" }).check();
  const panel = await filters(page);
  await panel.getByRole("button", { name: "JOIN на 100 выдач", exact: true }).click();
  await closeFilters(page);
  await expect(page.locator(".chart-point")).toHaveCount(4);
  await page.locator('[data-library="csharp"] .chart-point').click();
  await expect(page.getByRole("dialog").filter({ has: page.locator("#detail-title") })).toBeVisible();
  await expect(page.locator(".sample-plot svg")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть измерения" }).click();
  await expect(page.locator(".detail-dialog")).not.toBeVisible();
});

test("TypeORM shows both models, relationship decorators, and JOIN", async ({ page }) => {
  await page.goto("/#code/typescript");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("TypeORM");
  await expect(page.locator(".code-block").first()).toContainText("@OneToMany");
  await expect(page.locator(".code-block").first()).toContainText("@ManyToOne");
  await page.getByRole("button", { name: "Запросы", exact: true }).click();
  await expect(page.locator(".code-columns")).toContainText(".innerJoin");
  await expect(page.locator(".code-columns")).toContainText("JOIN books");
  await page.getByRole("button", { name: "По ключу", exact: true }).click();
  await expect(page.locator(".code-columns")).toContainText("b.id = :start");
});

test("empty filters recover and theme persists without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const panel = await filters(page);
  await panel.getByRole("button", { name: "Сбросить", exact: true }).click();
  await closeFilters(page);
  await expect(page.getByRole("heading", { name: "Нет выбранных библиотек" })).toBeVisible();
  await page.getByRole("button", { name: "Показать все" }).click();
  await expect(page.locator(".benchmark-chart")).toHaveCount(4);
  await page.getByRole("button", { name: "Светлая тема" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator(".main-feed").evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test("CSV export follows filters and the table sorts numerically", async ({ page }) => {
  await page.goto("/");
  const panel = await filters(page);
  await panel.getByRole("button", { name: "JOIN на 100 выдач", exact: true }).click();
  await closeFilters(page);
  await page.getByRole("button", { name: "Таблица", exact: true }).click();
  await expect(page.locator(".results-table tbody tr")).toHaveCount(4);
  await page.getByRole("button", { name: "ORM / SQL", exact: true }).click();
  await expect(page.locator(".results-table tbody tr").first()).toContainText("GORM");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("orm_test_results.csv");
  const stream = await download.createReadStream();
  let content = "";
  for await (const chunk of stream) content += chunk.toString();
  expect(content.split("\n")).toHaveLength(5);
  expect(content).toContain('"join"');
  expect(content).not.toContain('"point"');
});

test("instructions include all projects and Windows commands", async ({ page }) => {
  await page.goto("/#repeat/python");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Повторить тест");
  await expect(page.locator(".repeat-view")).toContainText("dotnet restore --locked-mode");
  await expect(page.locator(".repeat-view")).toContainText("go mod download");
  await expect(page.locator(".repeat-view")).toContainText("npm ci");
  await page.getByRole("button", { name: "Windows", exact: true }).click();
  await expect(page.locator(".repeat-view")).toContainText(".venv\\Scripts\\python.exe");
  await expect(page.locator(".repeat-view")).toContainText("go-demo.exe");
});

test("data routes expose measurements and only approved project files", async ({ request }) => {
  const result = await request.get("/api/results");
  expect(result.ok()).toBe(true);
  const data = await result.json();
  expect(data.totalSamples).toBe(50400);
  expect(data.libraries).toHaveLength(4);
  const samples = await request.get("/api/samples?library=python&case=join");
  const raw = await samples.json();
  expect(raw.orm).toHaveLength(2100);
  expect(raw.sql).toHaveLength(2100);
  const source = await request.get("/api/files?path=projects/python/main.py");
  expect(await source.text()).toContain("class Loan");
  for (const path of [".work/report.md", "README.md", "../../.git/config", "deliverables/ORM_projects.zip"]) {
    expect((await request.get("/api/files?path=" + encodeURIComponent(path))).status()).toBe(404);
  }
  expect((await request.get("/api/samples?library=../../x&case=join")).status()).toBe(400);
});
