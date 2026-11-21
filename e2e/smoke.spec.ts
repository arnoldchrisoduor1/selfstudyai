import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:18080";
const landingURL = process.env.PLAYWRIGHT_LANDING_URL ?? "http://127.0.0.1:3001";

async function expectNoSeriousAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(serious).toEqual([]);
}

test("api healthz", async ({ request }) => {
  const response = await request.get(`${apiURL}/healthz`);
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { status: string };
  expect(body.status).toBe("ok");
});

test("landing page loads", async ({ page }) => {
  await page.goto(landingURL);
  await expect(page.getByTestId("landing-home")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Self Study" })).toBeVisible();
  await expectNoSeriousAxe(page);
});

test("app shell loads", async ({ page }) => {
  await page.goto("/subjects/");
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Subjects" })).toBeVisible();
  await expectNoSeriousAxe(page);
});

test("create and edit a subject", async ({ page }) => {
  const name = `Algebra ${Date.now()}`;
  await page.goto("/subjects/new/");
  await page.getByTestId("subject-name").fill(name);
  await page.getByTestId("subject-description").fill("numbers");
  await page.getByTestId("subject-submit").click();
  await expect(page.getByRole("cell", { name })).toBeVisible();

  await page.getByRole("row", { name }).getByRole("link", { name: "Edit" }).click();
  const renamed = `${name} II`;
  await page.getByTestId("subject-name").fill(renamed);
  await page.getByTestId("subject-submit").click();
  await expect(page.getByRole("cell", { name: renamed })).toBeVisible();
});

test("change a setting", async ({ page }) => {
  const key = `theme-${Date.now()}`;
  await page.goto("/settings/");
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByTestId("setting-key").fill(key);
  await page.getByTestId("setting-value").fill("light");
  await page.getByTestId("setting-submit").click();
  await expect(page.getByRole("cell", { name: key })).toBeVisible();
  await expect(page.getByRole("cell", { name: "light" })).toBeVisible();

  await page.getByRole("row", { name: key }).getByRole("button", { name: "Edit" }).click();
  await page.getByTestId("setting-value").fill("dark");
  await page.getByTestId("setting-submit").click();
  await expect(page.getByRole("row", { name: key }).getByRole("cell", { name: "dark" })).toBeVisible();
});

test("component gallery renders", async ({ page }) => {
  await page.goto("/dev/components/");
  await expect(page.getByTestId("component-gallery")).toBeVisible();
  await expect(page.getByTestId("gallery-button")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Open modal" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoSeriousAxe(page);
});
