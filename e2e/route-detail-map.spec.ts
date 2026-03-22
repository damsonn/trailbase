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

async function waitForMap(page: Page) {
  const mapContainer = page.locator(".maplibregl-map");
  await expect(mapContainer).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(3_000);
  return mapContainer;
}

test.describe("RouteDetailPage map", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe("Three Sisters Loop", () => {
    test("displays grouped waypoint markers", async ({ page }) => {
      await page.goto(`/routes/${THREE_SISTERS_ID}`);
      await expect(page.getByRole("heading", { name: "Three Sisters Loop" })).toBeVisible();
      await waitForMap(page);

      const markers = page.locator(".maplibregl-marker");
      // 3 waypoints (1 & 3 share coords → 2 waypoint markers) + 2 start/end markers = 4
      await expect(markers).toHaveCount(4);
      // Grouped marker shows "1/3", standalone shows "2"
      await expect(markers.filter({ hasText: "1/3" })).toHaveCount(1);
      await expect(markers.filter({ hasText: "2" })).toHaveCount(1);
    });

    test("all markers are within the visible map viewport", async ({ page }) => {
      await page.goto(`/routes/${THREE_SISTERS_ID}`);
      await expect(page.getByRole("heading", { name: "Three Sisters Loop" })).toBeVisible();
      const mapContainer = await waitForMap(page);

      const mapBox = await mapContainer.boundingBox();
      expect(mapBox).toBeTruthy();

      const markers = page.locator(".maplibregl-marker");
      const count = await markers.count();
      expect(count).toBe(4); // 2 waypoint + 2 start/end

      for (let i = 0; i < count; i++) {
        const markerBox = await markers.nth(i).boundingBox();
        expect(markerBox).toBeTruthy();
        const cx = markerBox!.x + markerBox!.width / 2;
        const cy = markerBox!.y + markerBox!.height / 2;
        expect(cx).toBeGreaterThanOrEqual(mapBox!.x);
        expect(cx).toBeLessThanOrEqual(mapBox!.x + mapBox!.width);
        expect(cy).toBeGreaterThanOrEqual(mapBox!.y);
        expect(cy).toBeLessThanOrEqual(mapBox!.y + mapBox!.height);
      }
    });

    test("map screenshot matches baseline", async ({ page }) => {
      await page.goto(`/routes/${THREE_SISTERS_ID}`);
      await expect(page.getByRole("heading", { name: "Three Sisters Loop" })).toBeVisible();
      const mapContainer = await waitForMap(page);
      await page.waitForTimeout(1_000);

      const box = await mapContainer.boundingBox();
      expect(box).toBeTruthy();
      await expect(page).toHaveScreenshot("three-sisters-map.png", {
        clip: box!,
        maxDiffPixelRatio: 0.1,
      });
    });
  });

  test.describe("Harbour Bridge to Bondi", () => {
    test("displays all 3 waypoint markers plus start/end", async ({ page }) => {
      await page.goto(`/routes/${HARBOUR_BRIDGE_ID}`);
      await expect(page.getByRole("heading", { name: "Harbour Bridge to Bondi" })).toBeVisible();
      await waitForMap(page);

      const markers = page.locator(".maplibregl-marker");
      // 3 waypoint markers + 2 start/end markers = 5
      await expect(markers).toHaveCount(5);
      await expect(markers.filter({ hasText: "1" })).toHaveCount(1);
      await expect(markers.filter({ hasText: "2" })).toHaveCount(1);
      await expect(markers.filter({ hasText: "3" })).toHaveCount(1);
    });

    test("all markers are within the visible map viewport", async ({ page }) => {
      await page.goto(`/routes/${HARBOUR_BRIDGE_ID}`);
      await expect(page.getByRole("heading", { name: "Harbour Bridge to Bondi" })).toBeVisible();
      const mapContainer = await waitForMap(page);

      const mapBox = await mapContainer.boundingBox();
      expect(mapBox).toBeTruthy();

      const markers = page.locator(".maplibregl-marker");
      const count = await markers.count();
      expect(count).toBe(5); // 3 waypoint + 2 start/end

      for (let i = 0; i < count; i++) {
        const markerBox = await markers.nth(i).boundingBox();
        expect(markerBox).toBeTruthy();
        const cx = markerBox!.x + markerBox!.width / 2;
        const cy = markerBox!.y + markerBox!.height / 2;
        expect(cx).toBeGreaterThanOrEqual(mapBox!.x);
        expect(cx).toBeLessThanOrEqual(mapBox!.x + mapBox!.width);
        expect(cy).toBeGreaterThanOrEqual(mapBox!.y);
        expect(cy).toBeLessThanOrEqual(mapBox!.y + mapBox!.height);
      }
    });

    test("map screenshot matches baseline", async ({ page }) => {
      await page.goto(`/routes/${HARBOUR_BRIDGE_ID}`);
      await expect(page.getByRole("heading", { name: "Harbour Bridge to Bondi" })).toBeVisible();
      const mapContainer = await waitForMap(page);
      await page.waitForTimeout(1_000);

      const box = await mapContainer.boundingBox();
      expect(box).toBeTruthy();
      await expect(page).toHaveScreenshot("harbour-bridge-map.png", {
        clip: box!,
        maxDiffPixelRatio: 0.1,
      });
    });
  });
});
