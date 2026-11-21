import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

async function expectNoSeriousAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(serious).toEqual([]);
}

const fixtures = path.join(__dirname, "..", "crates", "ingest", "tests", "fixtures");

async function pickSubject(page: Page, subjectName: string) {
  const select = page.getByTestId("sources-subject");
  await expect(select.locator("option", { hasText: subjectName })).toBeAttached({ timeout: 15000 });
  await select.selectOption({ label: subjectName });
}

test("upload notes, edit topic, search, provider test", async ({ page }) => {
  test.setTimeout(90000);
  const subjectName = `Phase2 ${Date.now()}`;
  await page.goto("/subjects/new/");
  await page.getByTestId("subject-name").fill(subjectName);
  await page.getByTestId("subject-submit").click();
  await expect(page.getByRole("cell", { name: subjectName })).toBeVisible();

  await page.goto("/sources/");
  await expect(page.getByTestId("sources-page")).toBeVisible();
  await pickSubject(page, subjectName);
  await page.getByTestId("sources-upload").locator("input[type=file]").setInputFiles(path.join(fixtures, "sample.md"));
  await expect(page.getByText("ready").first()).toBeVisible({ timeout: 45000 });

  await page.getByRole("link").filter({ hasText: /sample|Sample|Introduction|Methods|Document/i }).first().click();
  await expect(page.getByTestId("source-detail-page")).toBeVisible({ timeout: 15000 });
  const titleInput = page.getByTestId(/topic-title-/).first();
  await titleInput.fill("Core ideas");
  await titleInput.blur();
  const coreToggle = page.getByTestId(/topic-core-/).first();
  await coreToggle.click();

  await page.goto("/search/");
  await page.getByTestId("search-query").fill("recall");
  await page.getByTestId("search-submit").click();
  await expect(page.getByTestId("search-result").first()).toBeVisible({ timeout: 15000 });

  await page.goto("/settings/");
  await page.getByRole("tab", { name: "AI providers" }).click();
  await expect(page.getByTestId("providers-section")).toBeVisible();
  await page.getByTestId("provider-name").fill("E2E Mock");
  await page.getByTestId("provider-kind").selectOption("mock");
  await page.getByTestId("provider-save").click();
  await page.getByRole("button", { name: "Test" }).first().click();

  await expectNoSeriousAxe(page);
  await page.goto("/sources/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("sources-page")).toBeVisible();
  await expectNoSeriousAxe(page);
  await page.goto("/search/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("search-page")).toBeVisible();
  await expectNoSeriousAxe(page);
});

test("upload failure shows error state", async ({ page }) => {
  test.setTimeout(60000);
  const subjectName = `FailUpload ${Date.now()}`;
  await page.goto("/subjects/new/");
  await page.getByTestId("subject-name").fill(subjectName);
  await page.getByTestId("subject-submit").click();
  await expect(page.getByRole("cell", { name: subjectName })).toBeVisible();

  await page.goto("/sources/");
  await pickSubject(page, subjectName);
  await page.getByTestId("sources-upload").locator("input[type=file]").setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 broken"),
  });
  await expect(page.getByText("failed").first()).toBeVisible({ timeout: 45000 });
});
