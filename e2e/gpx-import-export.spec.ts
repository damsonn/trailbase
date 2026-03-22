import { test, expect, type Page } from "@playwright/test";

const THREE_SISTERS_ID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@trailbase.app");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("demo@trailbase.app")).toBeVisible({ timeout: 10_000 });
}

const FIXTURE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="e2e-test">
  <metadata>
    <name>E2E Test GPX Import</name>
    <desc>An E2E test route near Sydney</desc>
  </metadata>
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="-33.856784" lon="151.215297"><ele>10.5</ele></trkpt>
      <trkpt lat="-33.860000" lon="151.212000"><ele>15.0</ele></trkpt>
      <trkpt lat="-33.865000" lon="151.210000"><ele>20.0</ele></trkpt>
      <trkpt lat="-33.870943" lon="151.208755"><ele>25.3</ele></trkpt>
    </trkseg>
  </trk>
  <wpt lat="-33.860000" lon="151.212000">
    <name>Viewpoint</name>
    <ele>15.0</ele>
  </wpt>
</gpx>`;

test.describe("GPX Import/Export", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("imports a GPX file and creates a route", async ({ page }) => {
    // Navigate to import page
    await page.goto("/routes/import");
    await expect(page.getByRole("heading", { name: "Import GPX" })).toBeVisible();

    // Upload GPX file via the file input
    const fileInput = page.getByTestId("gpx-file-input");
    const buffer = Buffer.from(FIXTURE_GPX, "utf-8");
    await fileInput.setInputFiles({
      name: "e2e-test-route.gpx",
      mimeType: "application/gpx+xml",
      buffer,
    });

    // File info should appear
    await expect(page.getByText("e2e-test-route.gpx")).toBeVisible();

    // Name should be pre-filled
    const nameInput = page.getByLabel("Route name");
    await expect(nameInput).toHaveValue("e2e-test-route");

    // Override name
    await nameInput.clear();
    await nameInput.fill("E2E GPX Import Test");

    // Submit
    await page.getByRole("button", { name: "Import Route" }).click();

    // Should navigate to route detail page
    await expect(page.getByRole("heading", { name: "E2E GPX Import Test" })).toBeVisible({
      timeout: 10_000,
    });

    // Verify route has stats
    await expect(page.getByText("Distance")).toBeVisible();

    // Get the route ID from the URL for cleanup
    const url = page.url();
    const routeId = url.split("/routes/")[1];

    // Clean up: delete the imported route
    if (routeId) {
      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete" }).last().click();
      await expect(page.getByRole("heading", { name: "Routes" })).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("exports a seed route as GPX", async ({ page }) => {
    // Navigate to seed route
    await page.goto(`/routes/${THREE_SISTERS_ID}`);
    await expect(page.getByRole("heading", { name: "Three Sisters Loop" })).toBeVisible();

    // Click export and capture the download
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export GPX" }).click();
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toMatch(/\.gpx$/);

    // Verify content is valid GPX XML
    const path = await download.path();
    if (path) {
      const fs = await import("fs");
      const content = fs.readFileSync(path, "utf-8");
      expect(content).toContain('<?xml version="1.0"');
      expect(content).toContain("<gpx");
      expect(content).toContain("<trk>");
      expect(content).toContain("Three Sisters Loop");
    }
  });

  test("import page is accessible from routes list", async ({ page }) => {
    await page.goto("/routes");
    await expect(page.getByRole("heading", { name: "Routes" })).toBeVisible();

    // Click "Import GPX" link
    await page.getByRole("link", { name: "Import GPX" }).click();
    await expect(page.getByRole("heading", { name: "Import GPX" })).toBeVisible();
  });
});
