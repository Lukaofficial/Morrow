import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  // Runs the production build against its own throwaway database.
  webServer: {
    command: `npm run db:seed -- --reset && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "file:.e2e-morrow.db",
      OPS_PASSWORD: "e2e-password",
      SESSION_SECRET: "e2e-session-secret-at-least-32-characters-long",
    },
  },
});
