import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

async function expectNoSeriousAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(serious).toEqual([]);
}

const fixtures = path.join(__dirname, "..", "crates", "ingest", "tests", "fixtures");

async function ensureSubjectWithNotes(page: Page, subjectName: string) {
  await page.goto("/subjects/new/");
  await page.getByTestId("subject-name").fill(subjectName);
  await page.getByTestId("subject-submit").click();
  await expect(page).toHaveURL(/\/subjects\/?$/, { timeout: 15000 });
  await expect(page.getByRole("cell", { name: subjectName })).toBeVisible({ timeout: 15000 });

  await page.goto("/sources/");
  const select = page.getByTestId("sources-subject");
  await expect(select.locator("option", { hasText: subjectName })).toBeAttached({ timeout: 15000 });
  await select.selectOption({ label: subjectName });
  await page.getByTestId("sources-upload").locator("input[type=file]").setInputFiles(path.join(fixtures, "sample.md"));
  await expect(page.getByText("ready").first()).toBeVisible({ timeout: 45000 });
}

test("study session mcq+written, feedback, override", async ({ page }) => {
  test.setTimeout(120000);
  const subjectName = `Phase3 Study ${Date.now()}`;
  await ensureSubjectWithNotes(page, subjectName);

  await page.goto("/settings/");
  await page.getByRole("tab", { name: "AI providers" }).click();
  await page.getByTestId("provider-name").fill("Phase3 Mock");
  await page.getByTestId("provider-kind").selectOption("mock");
  await page.getByTestId("provider-save").click();

  await page.goto("/study/");
  await expect(page.getByTestId("study-home")).toBeVisible();
  await page.getByTestId("study-subject").selectOption({ label: subjectName });
  await page.getByTestId("study-burst-size").selectOption("4");
  await page.getByTestId("study-start").click();
  await expect(page.getByTestId("study-session")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("burst-progress")).toBeVisible();
  let answered = 0;
  let didOverride = false;

  while (!(await page.getByTestId("burst-summary").isVisible().catch(() => false))) {
    if (await page.getByTestId("feedback-panel").isVisible().catch(() => false)) {
      if (!didOverride) {
        const override = page.getByTestId("override-grade");
        if (await override.isVisible().catch(() => false)) {
          await override.click();
          didOverride = true;
        }
      }
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByTestId("feedback-panel")).toBeHidden({ timeout: 15000 });
      continue;
    }

    const submit = page.getByTestId("submit-answer");
    await expect(submit).toBeVisible({ timeout: 15000 });
    const option = page.getByTestId("option-list-option").first();
    const editor = page.getByTestId("answer-editor");
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      await expect(option).toHaveAttribute("aria-checked", "true");
    } else {
      await expect(editor).toBeVisible();
      await editor.click();
      await page.keyboard.type(answered === 1 ? "partial answer" : "key points perfect", {
        delay: 15,
      });
      await expect(editor).toHaveValue(/./);
    }
    await expect(submit).toBeEnabled({ timeout: 5000 });
    await submit.click();
    await expect(page.getByTestId("feedback-panel")).toBeVisible({ timeout: 15000 });
    answered += 1;
    if (answered > 12) throw new Error("study session loop exceeded question budget");
  }

  expect(answered).toBeGreaterThanOrEqual(2);
  await expectNoSeriousAxe(page);
});

test("question bank filter/edit and gold review", async ({ page }) => {
  test.setTimeout(120000);
  const subjectName = `Phase3 Bank ${Date.now()}`;
  await ensureSubjectWithNotes(page, subjectName);

  await page.goto("/settings/");
  await page.getByRole("tab", { name: "AI providers" }).click();
  await page.getByTestId("provider-name").fill("Bank Mock");
  await page.getByTestId("provider-kind").selectOption("mock");
  await page.getByTestId("provider-save").click();

  await page.goto("/study/");
  await page.getByTestId("study-subject").selectOption({ label: subjectName });
  await page.getByTestId("study-start").click();
  await expect(page.getByTestId("study-session").or(page.getByTestId("retry-burst"))).toBeVisible({
    timeout: 45000,
  });
  if (await page.getByTestId("retry-burst").isVisible().catch(() => false)) {
    await page.getByTestId("retry-burst").click();
  }
  // ErrorState retry uses onRetry — also accept study-session after reload.
  if (await page.getByRole("button", { name: "Try again" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Try again" }).click();
  }
  await expect(page.getByTestId("study-session")).toBeVisible({ timeout: 45000 });
  const submit = page.getByTestId("submit-answer");
  await expect(submit).toBeVisible({ timeout: 15000 });
  const option = page.getByTestId("option-list-option").first();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    await expect(option).toHaveAttribute("aria-checked", "true");
  } else {
    const editor = page.getByTestId("answer-editor");
    await editor.click();
    await page.keyboard.type("answer with key points", { delay: 15 });
    await expect(editor).toHaveValue(/./);
  }
  await expect(submit).toBeEnabled({ timeout: 5000 });
  await submit.click();
  await expect(page.getByTestId("feedback-panel")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("mark-gold").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.goto("/questions/");
  await expect(page.getByTestId("question-bank")).toBeVisible();
  await page.getByTestId("bank-subject").selectOption({ label: subjectName });
  await expect(page.getByTestId("bank-edit").first()).toBeVisible({ timeout: 15000 });
  await page.getByTestId("bank-edit").first().click();
  await page.getByTestId("edit-stem").fill("Edited stem for bank");
  await page.getByTestId("edit-save").click();

  await page.goto("/questions/gold/");
  await expect(page.getByTestId("gold-review")).toBeVisible();
  const confirm = page.getByTestId("gold-confirm").first();
  const reject = page.getByTestId("gold-reject").first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  } else if (await reject.isVisible().catch(() => false)) {
    await reject.click();
  }
  await expectNoSeriousAxe(page);
});

test("burst size setting and online labeling", async ({ page }) => {
  test.setTimeout(90000);
  const subjectName = `Phase3 Online ${Date.now()}`;
  await page.goto("/subjects/new/");
  await page.getByTestId("subject-name").fill(subjectName);
  await page.getByTestId("subject-submit").click();

  await page.goto("/settings/");
  await page.getByRole("tab", { name: "AI providers" }).click();
  await page.getByTestId("provider-name").fill("Online Mock");
  await page.getByTestId("provider-kind").selectOption("mock");
  await page.getByTestId("provider-save").click();

  await page.getByRole("tab", { name: "Questions" }).click();
  await expect(page.getByTestId("questions-settings")).toBeVisible();
  await page.getByTestId("settings-burst-size").selectOption("3");
  await page.getByTestId("web-name").fill("Mock Search");
  await page.getByTestId("web-endpoint").fill("mock");
  await page.getByTestId("web-save").click();
  await page.getByTestId("settings-questions-save").click();
  await expect(page.getByText("Question settings saved")).toBeVisible({ timeout: 10000 });

  await page.goto("/study/");
  await page.getByTestId("study-subject").selectOption({ label: subjectName });
  await page.getByTestId("study-grounding-online").click();
  await page.getByTestId("study-burst-size").selectOption("3");
  await expect(page.getByTestId("study-burst-size")).toHaveValue("3");
  await page.getByTestId("study-start").click();
  await expect(page.getByTestId("study-session")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("grounding-badge")).toContainText(/online/i);
  const onlineProgress = (await page.getByTestId("burst-progress").innerText()) ?? "";
  expect(onlineProgress).toMatch(/\/[1-9]\d*/);
  await expectNoSeriousAxe(page);
});
