import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

async function expectNoSeriousAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (item) => item.impact === "serious" || item.impact === "critical",
  );
  expect(serious).toEqual([]);
}

const fixtures = path.join(__dirname, "..", "crates", "ingest", "tests", "fixtures");
const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:18080";

async function ensureSubjectWithNotes(page: Page, subjectName: string) {
  await page.goto("/subjects/new/");
  await page.getByTestId("subject-name").fill(subjectName);
  await page.getByTestId("subject-submit").click();
  await expect(page).toHaveURL(/\/subjects\/?$/, { timeout: 15000 });
  await expect(page.getByRole("cell", { name: subjectName })).toBeVisible({ timeout: 15000 });

  await page.goto("/sources/");
  const select = page.getByTestId("sources-subject");
  await expect(select.locator("option", { hasText: subjectName })).toBeAttached({
    timeout: 15000,
  });
  await select.selectOption({ label: subjectName });
  await page
    .getByTestId("sources-upload")
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, "sample.md"));
  await expect(page.getByText("ready").first()).toBeVisible({ timeout: 45000 });
}

async function ensureMockProvider(page: Page) {
  await page.goto("/settings/");
  await page.getByRole("tab", { name: "AI providers" }).click();
  await page.getByTestId("provider-name").fill(`Phase4 Mock ${Date.now()}`);
  await page.getByTestId("provider-kind").selectOption("mock");
  await page.getByTestId("provider-save").click();
}

test("overview dashboard and header stats", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/overview/");
  await expect(page.getByTestId("overview")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("overview-points")).toBeVisible();
  await expect(page.getByTestId("overview-streak")).toBeVisible();
  await expectNoSeriousAxe(page);
});

test("study review mode and clock advance", async ({ page, request }) => {
  test.setTimeout(120000);
  const subjectName = `Phase4 Review ${Date.now()}`;
  await ensureSubjectWithNotes(page, subjectName);
  await ensureMockProvider(page);

  await page.goto("/study/");
  await expect(page.getByTestId("study-home")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("study-subject").selectOption({ label: subjectName });
  await expect(page.getByTestId("study-mode")).toBeVisible();
  await page.getByTestId("study-mode-review_due").click();
  await expect(page.getByTestId("study-mode-review_due")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("study-mode-practice").click();

  const advance = await request.post(`${apiURL}/dev/clock/advance`, {
    data: { days: 1 },
    headers: { "content-type": "application/json" },
  });
  expect(advance.ok()).toBeTruthy();

  await page.goto("/overview/");
  await expect(page.getByTestId("overview-points")).toBeVisible();
  await expectNoSeriousAxe(page);
});

test("test builder page and settings learning", async ({ page }) => {
  test.setTimeout(120000);
  const subjectName = `Phase4 Test ${Date.now()}`;
  await ensureSubjectWithNotes(page, subjectName);

  await page.goto("/tests/new/");
  await expect(page.getByTestId("test-builder")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("test-subject").selectOption({ label: subjectName });
  await page.getByTestId("test-count").fill("2");
  await expect(page.getByTestId("test-focus")).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.goto("/settings/");
  await page.getByRole("tab", { name: /Learning/i }).click();
  await expect(page.getByTestId("learning-settings").or(page.getByText(/daily goal/i)).first()).toBeVisible({
    timeout: 15000,
  });
  await expectNoSeriousAxe(page);
});
