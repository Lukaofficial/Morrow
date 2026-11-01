# Morrow

A sleeper-train company that doesn't exist, with a booking system that does.

Morrow runs six overnight lines across twenty-four European cities. Search for a journey, pick a berth on a floor plan of the actual train, hold it for ten minutes, get a ticket with a scannable barcode, and then sign in to the operations room and delay the train. No money changes hands and no train will come.

## Things worth trying

- **Change the cities in the headline.** The sentence "Go to bed in Paris, wake up in Vienna" is the search form. The split-flap tiles are the inputs.
- **Scroll through the night.** One scrollbar drives a twelve-hour journey: the clock, the sky, the Alps, and each cabin window going dark at its own bedtime.
- **Open the same train in two browsers.** Pick the same berth in both and hold it in one. The other is told within seconds.
- **Delay a train.** Sign in at `/ops` (the password is on the login page), add fifteen minutes, then look at the departure board on the home page.
- **Print a ticket.** It has its own print stylesheet, and the Code 128 barcode is generated from scratch and scans.

## Stack

Next.js 16 (App Router), React 19, TypeScript, libSQL (SQLite locally, Turso in production), Drizzle ORM, Zod, jose. Vitest and Playwright for tests.

The CSS is hand-written modules on a small set of tokens. There's no component library, no icon set, and no stock imagery. The logotype, the posters, the floor plans and the landscape are all drawn in SVG, most of them generated from seeded functions so the server and browser agree on every hill.

## How the interesting parts work

**A berth can't be sold twice.** Every occupied place is a row in `claims` with a composite primary key of departure and place. Holds and bookings both have to insert there, inside a write transaction, so concurrent requests are serialised and the key is the final guarantee. A test fires twelve simultaneous requests at one berth and asserts exactly one wins. See [`src/lib/holds.ts`](src/lib/holds.ts).

**Writes queue in-process.** The local libSQL driver is synchronous, so a writer busy-waiting on the file lock blocks the event loop, and if the lock holder belongs to the same process it can never finish. The test suite caught this as `SQLITE_BUSY` under load. [`writeTransaction`](src/lib/db/client.ts) serialises writers within a process, and WAL mode keeps readers out of the way.

**Holds expire without a timer.** A hold is a row with an expiry time. Availability queries ignore expired holds, and the next write purges them. There's no background job to keep alive.

**Departures appear when someone asks for them.** There's no timetable-generation cron. The first request for a date creates that date's trains, up to a 120-day booking horizon, so the site can sit idle for a year and still have tonight's trains.

**Simulated passengers are deterministic.** So that a demo isn't an empty train and a blank dashboard, each new departure comes with bookings derived from a seed of its own id. They go through the same tables and fare function as real ones and carry a `synthetic` flag, and the dashboard labels them. Because generation is deterministic, two processes creating the same departure simply conflict and do nothing.

**Prices are decided on the server, once.** [`pricing.ts`](src/lib/pricing.ts) is a pure function of class, distance, load, day and notice. The fare is computed when a place is held and stored on the claim, so it can't be changed by the client or by the train filling up while you type your name.

**Time zones are handled as instants.** A train can leave Lisbon, cross into Spain and pass midnight in a single leg. Everything is computed from an absolute instant and converted to a wall clock per station. A search for "leaving Innsbruck today" also checks trains that started yesterday.

**The scroll story never touches React state.** All frames derive from one number between 0 and 1, and the loop writes straight to custom properties and transforms.

## Running it

Needs Node 22.9 or newer.

```bash
npm install
npm run setup   # creates morrow.db and six weeks of departures
npm run dev
```

Then open http://localhost:3000. It works without an env file. Copy `.env.example` to `.env.local` to change the defaults.

```bash
npm run lint       # type check
npm test           # unit and concurrency tests, against a real SQLite file
npm run test:e2e   # production build, then Playwright through a real browser
npm run db:seed -- --reset   # regenerate all demo data
```

## Deploying

The app needs a Node host and a database that persists.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:morrow.db` on a persistent disk, or `libsql://...` for Turso |
| `DATABASE_AUTH_TOKEN` | Turso only |
| `SESSION_SECRET` | At least 32 random characters. Required in production |
| `OPS_PASSWORD` | Defaults to the demo password, which the login page then prints |
| `SITE_URL` | Your public URL, for share images |

Run `npm run db:seed` once against the production database, then `npm run build && npm start`. Serverless hosts need Turso, because their disks don't persist.

## What it deliberately doesn't do

- **Payments.** A portfolio piece has no business collecting card details, so checkout stops at confirmation.
- **Confirmation emails.** The ticket page and the reference-plus-email lookup do that job, and an unsent-email stub would prove nothing.
- **Connections or per-segment inventory.** Journeys are direct, and a berth is sold for the whole run of the train even if you get off halfway. A real operator would resell it.
- **Distributed rate limiting.** The limiter is in memory and per instance, which suits one node and would have to move to shared storage for more.

## Layout

```
src/lib/          domain logic: network, formation, pricing, holds, bookings, board, ops
src/lib/db/       schema and connection
src/app/api/      JSON API, validated with Zod
src/app/          pages
src/components/   art (posters, plans, train), flap (split-flap engine), home, booking, ops
tests/unit/       pricing, time zones, concurrency, booking lifecycle
tests/e2e/        full journeys through a browser
drizzle/          SQL migrations
```
