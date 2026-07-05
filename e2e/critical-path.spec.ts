import { expect, test } from "@playwright/test";

/**
 * Critical-path e2e.
 *
 * Public tests always run. The authenticated journey needs a real
 * Supabase user — set E2E_EMAIL and E2E_PASSWORD (an account whose
 * email is already confirmed). On first run it creates a workspace
 * with demo data; subsequent runs reuse it.
 */

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("public pages", () => {
  test("landing page renders and links to login", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /humans supervise/i })
    ).toBeVisible();
    await page
      .getByRole("link", { name: /get started/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("login rejects bad credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(
      page.getByText(/invalid login credentials/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("authenticated journey", () => {
  test.skip(!email || !password, "E2E_EMAIL / E2E_PASSWORD not set");

  test("login → onboard → inbox → reply → escalate", async ({ page }) => {
    // Sign in
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });

    // First run: create a workspace with demo data
    if (page.url().includes("/onboarding")) {
      await page.getByLabel("Name").fill("E2E Workspace");
      await page
        .getByRole("button", { name: /create workspace/i })
        .click();
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    }

    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    // Inbox: open the first conversation
    await page.getByRole("link", { name: "Inbox" }).click();
    await page.waitForURL(/\/inbox/);
    await expect(page.getByText("Conversations")).toBeVisible();

    // Reply
    const reply = `E2E reply ${Date.now()}`;
    await page.getByPlaceholder(/write a reply/i).fill(reply);
    await page.getByRole("button", { name: /^send$/i }).click();
    await expect(page.getByText(reply)).toBeVisible({ timeout: 15_000 });

    // Copilot action that works without an AI key: Escalate
    const escalate = page.getByRole("button", { name: /^escalate$/i });
    if (await escalate.isVisible()) {
      await escalate.click();
      await expect(
        page.getByText(/escalated — priority set to urgent/i)
      ).toBeVisible({ timeout: 15_000 });
    }
  });
});
