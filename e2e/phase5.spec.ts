import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:18080";
const landingURL = process.env.PLAYWRIGHT_LANDING_URL ?? "http://127.0.0.1:3001";

async function expectNoSeriousAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (item) => item.impact === "serious" || item.impact === "critical",
  );
  expect(serious).toEqual([]);
}

test("auth sign-up returns user", async ({ request }) => {
  const email = `phase5-${Date.now()}@example.test`;
  const password = "phase5-password-8chars";
  const response = await request.post(`${apiURL}/auth/sign-up`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { email: string; id: string };
  expect(body.email).toBe(email);
  expect(body.id).toBeTruthy();
});

test("auth sign-in cookie session and /auth/me", async ({ request }) => {
  const email = `phase5-signin-${Date.now()}@example.test`;
  const password = "phase5-password-8chars";
  const signUp = await request.post(`${apiURL}/auth/sign-up`, {
    data: { email, password },
  });
  expect(signUp.ok()).toBeTruthy();

  const signIn = await request.post(`${apiURL}/auth/sign-in`, {
    data: { email, password },
  });
  expect(signIn.ok()).toBeTruthy();
  const session = (await signIn.json()) as { user: { email: string }; bearer_token?: string };
  expect(session.user.email).toBe(email);
  expect(session.bearer_token).toBeUndefined();

  const me = await request.get(`${apiURL}/auth/me`);
  expect(me.ok()).toBeTruthy();
  const meBody = (await me.json()) as { user: { email: string } };
  expect(meBody.user.email).toBe(email);
});

test("auth sign-in bearer when x-study-client desktop", async ({ request }) => {
  const email = `phase5-desktop-${Date.now()}@example.test`;
  const password = "phase5-password-8chars";
  const signUp = await request.post(`${apiURL}/auth/sign-up`, {
    data: { email, password },
  });
  expect(signUp.ok()).toBeTruthy();

  const signIn = await request.post(`${apiURL}/auth/sign-in`, {
    headers: { "x-study-client": "desktop" },
    data: { email, password },
  });
  expect(signIn.ok()).toBeTruthy();
  const session = (await signIn.json()) as { bearer_token?: string; user: { email: string } };
  expect(session.bearer_token).toBeTruthy();
  expect(session.user.email).toBe(email);

  const me = await request.get(`${apiURL}/auth/me`, {
    headers: { Authorization: `Bearer ${session.bearer_token}` },
  });
  expect(me.ok()).toBeTruthy();
});

test("local export without account", async ({ request }) => {
  const response = await request.get(`${apiURL}/export`);
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { user_id: string | null; subjects: unknown[] };
  expect(body.user_id).toBeNull();
  expect(Array.isArray(body.subjects)).toBeTruthy();
});

test("settings account sync sign-up and sign-in", async ({ page }) => {
  test.setTimeout(90000);
  const email = `phase5-ui-${Date.now()}@example.test`;
  const password = "phase5-password-8chars";

  await page.goto("/settings/");
  await page.getByRole("tab", { name: /Account & sync/i }).click();
  await expect(page.getByTestId("account-sync-panel")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-sign-up").click();
  await expect(page.getByTestId("auth-sign-in")).toBeEnabled({ timeout: 15000 });
  await page.getByTestId("auth-sign-in").click();
  await expect(page.getByTestId("sync-now")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(email)).toBeVisible();
  await expectNoSeriousAxe(page);
});

test("credits page balance", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/credits/");
  await expect(page.getByTestId("credits-section")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("credits-balance")).toBeVisible();
  await expectNoSeriousAxe(page);
});

test("header sync status chip", async ({ page }) => {
  await page.goto("/overview/");
  await expect(page.getByTestId("header-sync")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("sync-status-chip")).toBeVisible();
});

test("landing home sections and axe", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto(landingURL);
  await expect(page.getByTestId("landing-home")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("landing-preview-question")).toBeVisible();
  await expect(page.getByTestId("landing-preview-burst")).toBeVisible();
  await expect(page.getByTestId("landing-preview-due")).toBeVisible();
  await expectNoSeriousAxe(page);
});