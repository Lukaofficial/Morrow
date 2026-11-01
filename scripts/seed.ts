/**
 * Applies migrations and creates a working window of departures, so the first
 * page load doesn't have to generate six weeks of passengers.
 */

import { migrate } from "drizzle-orm/libsql/migrator";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { ensureDepartures } from "../src/lib/departures";
import { addDays, localDate, NETWORK_TZ } from "../src/lib/time";

async function main() {
  // Readers shouldn't have to wait for a booking to commit. Remote databases ignore this.
  await db.run(sql`PRAGMA journal_mode = WAL`).catch(() => undefined);
  await migrate(db, { migrationsFolder: "drizzle" });
  if (process.argv.includes("--reset")) {
    for (const table of ["claims", "booking_places", "bookings", "holds", "departures", "audit_log"]) {
      await db.run(sql.raw(`delete from ${table}`));
    }
  }
  const today = localDate(new Date(), NETWORK_TZ);
  const started = Date.now();
  await ensureDepartures(addDays(today, -21), addDays(today, 21));
  const count = async (table: string) => {
    const result = await db.run(sql.raw(`select count(*) as n from ${table}`));
    return result.rows[0].n;
  };
  console.log(
    `Ready in ${Date.now() - started}ms: ${await count("departures")} departures, ` +
      `${await count("bookings")} bookings, ${await count("claims")} occupied places.`,
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
