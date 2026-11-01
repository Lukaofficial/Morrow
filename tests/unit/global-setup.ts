import { rmSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const FILE = ".test-morrow.db";

function clean() {
  for (const suffix of ["", "-shm", "-wal", "-journal"]) rmSync(FILE + suffix, { force: true });
}

export async function setup() {
  clean();
  const client = createClient({ url: `file:${FILE}` });
  await client.execute("PRAGMA journal_mode = WAL");
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  client.close();
}

export function teardown() {
  // Windows can keep the file locked for a moment after workers exit. Setup cleans up anyway.
  try {
    clean();
  } catch {}
}
