import { test, expect, type Page } from "@playwright/test";

const SEED_ROUTE_ID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"; // Three Sisters Loop

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@trailbase.app");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("demo@trailbase.app")).toBeVisible({ timeout: 10_000 });
}

/** Walk the React fiber tree to find the MapLibre map instance */
function getMapInstanceScript() {
  return `(() => {
    const container = document.querySelector(".maplibregl-map");
    if (!container) return null;
    const fiberKey = Object.keys(container).find(k => k.startsWith("__reactFiber"));
    if (!fiberKey) return null;
    let fiber = container[fiberKey];
    let depth = 0;
    while (fiber && depth < 50) {
      if (fiber.memoizedState) {
        let state = fiber.memoizedState;
        while (state) {
          if (state.memoizedState?.current && typeof state.memoizedState.current?.getSource === "function") {
            return state.memoizedState.current;
          }
          state = state.next;
        }
      }
      fiber = fiber.return;
      depth++;
    }
    return null;
  })()`;
}

test.describe("RouteDetailPage map", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("displays all waypoint markers for Three Sisters Loop", async ({
    page,
  }) => {
    await page.goto(`/routes/${SEED_ROUTE_ID}`);
    await expect(
      page.getByRole("heading", { name: "Three Sisters Loop" }),
    ).toBeVisible();

    const mapContainer = page.locator(".maplibregl-map");
    await expect(mapContainer).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3_000);

    // The route has 3 waypoints. All 3 marker DOM elements should exist.
    const markers = page.locator(".maplibregl-marker");
    await expect(markers).toHaveCount(3);

    // Verify numbered labels
    for (const num of [1, 2, 3]) {
      await expect(markers.filter({ hasText: String(num) })).toHaveCount(1);
    }
  });

  test("all markers are within the visible map viewport", async ({ page }) => {
    await page.goto(`/routes/${SEED_ROUTE_ID}`);
    await expect(
      page.getByRole("heading", { name: "Three Sisters Loop" }),
    ).toBeVisible();

    const mapContainer = page.locator(".maplibregl-map");
    await expect(mapContainer).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3_000);

    const mapBox = await mapContainer.boundingBox();
    expect(mapBox).toBeTruthy();

    const markers = page.locator(".maplibregl-marker");
    const count = await markers.count();
    expect(count).toBe(3);

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

  test("route line GeoJSON source and layer are configured correctly", async ({
    page,
  }) => {
    await page.goto(`/routes/${SEED_ROUTE_ID}`);
    await expect(
      page.getByRole("heading", { name: "Three Sisters Loop" }),
    ).toBeVisible();

    const mapContainer = page.locator(".maplibregl-map");
    await expect(mapContainer).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3_000);

    // Verify the GeoJSON source, layer, and data via the MapLibre API.
    // Note: MapLibre WebGL layers don't render to screenshots in headless
    // Chromium, so we verify correctness via the API instead.
    const result = await page.evaluate(() => {
      const container = document.querySelector(".maplibregl-map");
      if (!container) return { error: "no map container" };
      const fiberKey = Object.keys(container).find((k) =>
        k.startsWith("__reactFiber"),
      );
      if (!fiberKey) return { error: "no fiber" };

      let fiber = (container as Record<string, unknown>)[fiberKey] as {
        memoizedState: {
          memoizedState?: { current?: Record<string, unknown> };
          next?: unknown;
        } | null;
        return: unknown;
      } | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let map: any = null;
      let depth = 0;
      while (fiber && depth < 50) {
        if (fiber.memoizedState) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let state = fiber.memoizedState as any;
          while (state) {
            if (
              state.memoizedState?.current &&
              typeof state.memoizedState.current?.getSource === "function"
            ) {
              map = state.memoizedState.current;
              break;
            }
            state = state.next;
          }
        }
        if (map) break;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fiber = (fiber as any).return;
        depth++;
      }

      if (!map) return { error: "no map instance" };

      const source = map.getSource("route-line");
      const style = map.getStyle();
      const routeLayer = style?.layers?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (l: any) => l.id === "route-line-layer",
      );

      return {
        hasSource: !!source,
        sourceData: source?._data?.geojson ?? source?._data,
        hasLayer: !!routeLayer,
        layerType: routeLayer?.type,
        layerPaint: routeLayer?.paint,
      };
    });

    expect(result).not.toHaveProperty("error");
    expect(result.hasSource).toBe(true);
    expect(result.hasLayer).toBe(true);
    expect(result.layerType).toBe("line");
    expect(result.layerPaint).toEqual({
      "line-color": "#2563eb",
      "line-width": 3,
      "line-opacity": 0.8,
    });

    // Verify the GeoJSON data has the correct coordinates
    const geojson = result.sourceData;
    expect(geojson).toBeTruthy();
    expect(geojson.type).toBe("Feature");
    expect(geojson.geometry.type).toBe("LineString");
    expect(geojson.geometry.coordinates).toHaveLength(3);
    // First coordinate: Echo Point
    expect(geojson.geometry.coordinates[0][0]).toBeCloseTo(150.3124, 3);
    expect(geojson.geometry.coordinates[0][1]).toBeCloseTo(-33.732, 3);
    // Second coordinate: Giant Stairway
    expect(geojson.geometry.coordinates[1][0]).toBeCloseTo(150.3156, 3);
    expect(geojson.geometry.coordinates[1][1]).toBeCloseTo(-33.731, 3);
  });

  test("map screenshot matches baseline", async ({ page }) => {
    await page.goto(`/routes/${SEED_ROUTE_ID}`);
    await expect(
      page.getByRole("heading", { name: "Three Sisters Loop" }),
    ).toBeVisible();

    const mapContainer = page.locator(".maplibregl-map");
    await expect(mapContainer).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(4_000);

    const box = await mapContainer.boundingBox();
    expect(box).toBeTruthy();

    // Note: MapLibre line layers don't render in headless Chromium screenshots,
    // so this baseline captures markers and tile backdrop only. The route line
    // is verified via the MapLibre API in the test above.
    await expect(page).toHaveScreenshot("three-sisters-map.png", {
      clip: box!,
      maxDiffPixelRatio: 0.1,
    });
  });
});
