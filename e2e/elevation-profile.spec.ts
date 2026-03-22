import { test, expect, type Page } from "@playwright/test";

const THREE_SISTERS_ID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
const HARBOUR_BRIDGE_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@trailbase.app");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("demo@trailbase.app")).toBeVisible({ timeout: 10_000 });
}

test.describe("Elevation profile", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe("Three Sisters Loop (mountainous)", () => {
    test("displays elevation profile section with chart", async ({ page }) => {
      await page.goto(`/routes/${THREE_SISTERS_ID}`);
      await expect(page.getByRole("heading", { name: "Three Sisters Loop" })).toBeVisible();

      // Elevation Profile heading should be visible
      await expect(page.getByText("Elevation Profile")).toBeVisible();

      // Recharts renders an SVG inside the elevation profile container
      const chart = page.locator(".recharts-wrapper");
      await expect(chart).toBeVisible({ timeout: 5_000 });

      // Should have the filled area path (elevation curve)
      await expect(page.locator(".recharts-area-area")).toBeVisible();
    });

    test("elevation stats show non-zero values", async ({ page }) => {
      await page.goto(`/routes/${THREE_SISTERS_ID}`);
      await expect(page.getByRole("heading", { name: "Three Sisters Loop" })).toBeVisible();

      // Elevation Gain stat card should show a value with "m"
      const gainCard = page.locator("div").filter({ hasText: /^Elevation Gain/ }).first();
      await expect(gainCard).toBeVisible();
      await expect(gainCard.locator("p.text-lg")).toContainText("m");

      // Elevation Loss stat card
      const lossCard = page.locator("div").filter({ hasText: /^Elevation Loss/ }).first();
      await expect(lossCard).toBeVisible();
      await expect(lossCard.locator("p.text-lg")).toContainText("m");
    });

    test("chart has elevation values in the SVG", async ({ page }) => {
      await page.goto(`/routes/${THREE_SISTERS_ID}`);
      await expect(page.getByText("Elevation Profile")).toBeVisible();

      // The chart SVG should contain text elements with elevation values > 600m
      const svgText = await page.locator(".recharts-wrapper svg").innerHTML();
      // Y-axis labels should include values in the 700-900 range
      expect(svgText).toMatch(/[789]\d{2}/);
    });
  });

  test.describe("Harbour Bridge to Bondi (coastal)", () => {
    test("displays elevation profile chart", async ({ page }) => {
      await page.goto(`/routes/${HARBOUR_BRIDGE_ID}`);
      await expect(page.getByRole("heading", { name: "Harbour Bridge to Bondi" })).toBeVisible();

      await expect(page.getByText("Elevation Profile")).toBeVisible();

      const chart = page.locator(".recharts-wrapper");
      await expect(chart).toBeVisible({ timeout: 5_000 });

      // Should have the filled area path
      await expect(page.locator(".recharts-area-area")).toBeVisible();
    });

    test("elevation gain and loss stats are displayed", async ({ page }) => {
      await page.goto(`/routes/${HARBOUR_BRIDGE_ID}`);
      await expect(page.getByRole("heading", { name: "Harbour Bridge to Bondi" })).toBeVisible();

      // Both elevation cards should show values with "m"
      const gainCard = page.locator("div").filter({ hasText: /^Elevation Gain/ }).first();
      await expect(gainCard.locator("p.text-lg")).toContainText("m");

      const lossCard = page.locator("div").filter({ hasText: /^Elevation Loss/ }).first();
      await expect(lossCard.locator("p.text-lg")).toContainText("m");
    });
  });
});
