import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const departures = sqliteTable(
  "departures",
  {
    id: text("id").primaryKey(),
    lineId: text("line_id").notNull(),
    direction: text("direction", { enum: ["out", "back"] }).notNull(),
    /** The date the train leaves its origin, in the origin's calendar. */
    serviceDate: text("service_date").notNull(),
    status: text("status", { enum: ["scheduled", "cancelled"] })
      .notNull()
      .default("scheduled"),
    delayMinutes: integer("delay_minutes").notNull().default(0),
  },
  (t) => [
    uniqueIndex("departures_service_unique").on(t.lineId, t.direction, t.serviceDate),
    index("departures_date_idx").on(t.serviceDate),
  ],
);

export const holds = sqliteTable(
  "holds",
  {
    id: text("id").primaryKey(),
    departureId: text("departure_id")
      .notNull()
      .references(() => departures.id),
    fromStation: text("from_station").notNull(),
    toStation: text("to_station").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("holds_expiry_idx").on(t.expiresAt)],
);

export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    /** Unguessable token in the ticket URL. The reference alone opens nothing. */
    accessToken: text("access_token").notNull().unique(),
    departureId: text("departure_id")
      .notNull()
      .references(() => departures.id),
    fromStation: text("from_station").notNull(),
    toStation: text("to_station").notNull(),
    leadName: text("lead_name").notNull(),
    email: text("email").notNull(),
    travellers: integer("travellers").notNull(),
    breakfast: integer("breakfast", { mode: "boolean" }).notNull().default(false),
    wakeCall: integer("wake_call").notNull().default(30),
    totalCents: integer("total_cents").notNull(),
    status: text("status", { enum: ["confirmed", "cancelled"] })
      .notNull()
      .default("confirmed"),
    /** Generated demand, kept apart so the numbers can always be told from real use. */
    synthetic: integer("synthetic", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("bookings_departure_idx").on(t.departureId),
    index("bookings_created_idx").on(t.createdAt),
  ],
);

/**
 * One row per occupied place. The composite primary key is what makes it
 * impossible to sell a berth twice: holds and bookings both have to insert here.
 */
export const claims = sqliteTable(
  "claims",
  {
    departureId: text("departure_id")
      .notNull()
      .references(() => departures.id),
    placeId: text("place_id").notNull(),
    holdId: text("hold_id").references(() => holds.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.departureId, t.placeId] }),
    index("claims_hold_idx").on(t.holdId),
    index("claims_booking_idx").on(t.bookingId),
  ],
);

/** The priced places on a booking, kept after cancellation when claims are not. */
export const bookingPlaces = sqliteTable(
  "booking_places",
  {
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    placeId: text("place_id").notNull(),
    priceCents: integer("price_cents").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.placeId] })],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    at: integer("at", { mode: "timestamp_ms" }).notNull(),
    actor: text("actor", { enum: ["ops", "public"] }).notNull(),
    action: text("action").notNull(),
    detail: text("detail").notNull(),
  },
  (t) => [index("audit_at_idx").on(t.at)],
);
