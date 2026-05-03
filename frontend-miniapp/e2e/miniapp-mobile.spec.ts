import { test, expect } from "@playwright/test";

/** Valid 40-hex UP-style address for public RPC reads (stats may be zero). */
const SAMPLE_UP = "0xd69731d2a9135663d3800e20f783f86394cfa5ad";

test.describe("miniapp mobile smoke", () => {
  test("home shows Handshake and address entry", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /handshake/i })).toBeVisible();
    await expect(page.getByPlaceholder(/0x/i)).toBeVisible();
  });

  test("?address= shows Received / Given (embed-style) without full-screen error page", async ({ page }) => {
    await page.goto(`/?address=${encodeURIComponent(SAMPLE_UP)}&chainId=42`);
    await expect(page.getByText("Received", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Given", { exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test("add-to-grid route loads", async ({ page }) => {
    await page.goto("/add-to-grid");
    await expect(page.getByText(/Add Handshake to your Grid/i)).toBeVisible();
  });
});
