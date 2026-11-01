import { Client, createClient } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema> & { $client: Client };
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Next's dev server reloads modules freely; keep one connection across reloads.
const cache = globalThis as unknown as { __morrowDb?: Db; __morrowWriteQueue?: Promise<unknown> };

function connect(): Db {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:morrow.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
    // Writers in other processes queue for the lock instead of failing with SQLITE_BUSY.
    timeout: 5000,
  });
  return drizzle(client, { schema });
}

export const db: Db = cache.__morrowDb ?? (cache.__morrowDb = connect());

/**
 * Runs a write transaction after any others this process has already started.
 *
 * The local libSQL driver is synchronous, so a busy-wait on the file lock blocks
 * the event loop. If the transaction holding the lock belongs to this process it
 * can never finish, and the waiter times out with SQLITE_BUSY. Queueing here
 * means that never happens; the database still has the last word on conflicts.
 */
export function writeTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  const tail = cache.__morrowWriteQueue ?? Promise.resolve();
  const run = tail.then(() => db.transaction(work, { behavior: "immediate" }));
  cache.__morrowWriteQueue = run.catch(() => undefined);
  return run;
}
