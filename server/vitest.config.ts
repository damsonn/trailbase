import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      // Load from .env for integration tests that need DATABASE_URL etc.
    },
    setupFiles: ["dotenv/config"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.integration.test.*",
    ],
  },
});
