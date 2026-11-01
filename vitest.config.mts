import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    // A throwaway database per run; the suite exercises real SQLite locking.
    env: { DATABASE_URL: "file:.test-morrow.db" },
    globalSetup: ["tests/unit/global-setup.ts"],
    pool: "forks",
    fileParallelism: false,
    testTimeout: 30000,
  },
});
