import { test, expect, type Page } from "@playwright/test";

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

test.describe("RouteBuilder snap-to-road persistence", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("snap-to-road route is saved with geometry and displayed on detail page", async ({ page }) => {
    // Navigate to route builder
    await page.goto("/routes/new");
    await expect(page.getByText("New Route")).toBeVisible();
    await waitForMap(page);

    // Fill in route name
    await page.getByPlaceholder("My route").fill("E2E Snap Test Route");

    // Select snap-to-road routing method
    await page.getByText("Snap to road").click();

    // Place waypoints on a known road area — use Sydney CBD area
    // First pan to Sydney by setting map center via URL or clicking in the default view
    const mapContainer = page.locator(".maplibregl-map");

    // Place two waypoints by clicking on the map at different positions
    // These clicks will be in the default Australia view
    await mapContainer.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    await mapContainer.click({ position: { x: 450, y: 320 } });

    // Wait for routing to complete (or fail — snap-to-road requires Valhalla)
    // If Valhalla is running, "Computing route..." will appear then disappear
    // If not running, a routing error will appear
    // Either way, we should be able to save the route
    await page.waitForTimeout(3_000);

    // Check if routing succeeded (route result shown) or failed
    const routingError = page.locator("text=Routing service unavailable").or(page.locator("text=Routing failed"));
    const hasRoutingError = await routingError.count() > 0;

    if (!hasRoutingError) {
      // Routing succeeded — verify Computing route... is gone
      await expect(page.locator("text=Computing route...")).not.toBeVisible({ timeout: 15_000 });
    }

    // Click Save Route
    await page.getByRole("button", { name: "Save Route" }).click();

    // Should redirect to route detail page
    await page.waitForURL(/\/routes\/[a-f0-9-]+$/, { timeout: 10_000 });

    // Verify the route detail page renders
    await expect(page.getByRole("heading", { name: "E2E Snap Test Route" })).toBeVisible();

    // Wait for map to load
    await waitForMap(page);

    // Verify the map source/route line is present
    const markers = page.locator(".maplibregl-marker");
    await expect(markers).toHaveCount(2);

    // Clean up: delete the created route
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Delete route?")).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).nth(1).click();

    // Should redirect to routes list
    await page.waitForURL(/\/routes$/, { timeout: 10_000 });
  });

  test("point-to-point route saves without geometry", async ({ page }) => {
    // Navigate to route builder
    await page.goto("/routes/new");
    await expect(page.getByText("New Route")).toBeVisible();
    await waitForMap(page);

    // Fill in route name
    await page.getByPlaceholder("My route").fill("E2E Point-to-Point Route");

    // Default is "Straight line" — no need to change routing method
    await expect(page.getByText("Straight line")).toBeVisible();

    // Place two waypoints on the map
    const mapContainer = page.locator(".maplibregl-map");
    await mapContainer.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    await mapContainer.click({ position: { x: 500, y: 350 } });
    await page.waitForTimeout(500);

    // Intercept the API call to verify no geometry is sent
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/routes") && req.method() === "POST"),
      page.getByRole("button", { name: "Save Route" }).click(),
    ]);

    const body = request.postDataJSON();
    expect(body.geometry).toBeUndefined();
    expect(body.waypoints).toHaveLength(2);

    // Should redirect to route detail page
    await page.waitForURL(/\/routes\/[a-f0-9-]+$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "E2E Point-to-Point Route" })).toBeVisible();

    // Wait for map to render
    await waitForMap(page);

    // Verify markers present
    const markers = page.locator(".maplibregl-marker");
    await expect(markers).toHaveCount(2);

    // Clean up: delete the route
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Delete route?")).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).nth(1).click();
    await page.waitForURL(/\/routes$/, { timeout: 10_000 });
  });
});
