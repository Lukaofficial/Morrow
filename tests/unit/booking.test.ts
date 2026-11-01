import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { cancelBooking, confirmBooking, findBookingToken, getTicket } from "@/lib/bookings";
import { db } from "@/lib/db/client";
import { bookings, claims } from "@/lib/db/schema";
import { departureId, ensureDepartures, getDeparture, takenPlaces } from "@/lib/departures";
import { ALL_PLACES, PLACE_BY_ID } from "@/lib/formation";
import { createHold, getHold, HOLD_MINUTES } from "@/lib/holds";
import { addDays, localDate, NETWORK_TZ } from "@/lib/time";

const now = new Date();
// Far enough out that the train is mostly empty and definitely hasn't left.
const date = addDays(localDate(now, NETWORK_TZ), 30);
const id = departureId("transalpine", "out", date);
const journey = { departureId: id, from: "paris", to: "vienna" };

const details = {
  leadName: "Test Passenger",
  email: "Test@Example.com",
  travellers: 1,
  breakfast: false,
  wakeCall: 30,
};

let free: string[] = [];

/** A place nobody has claimed, removed from the pool so tests can't collide. */
function nextFree(cabinClass?: string): string {
  const index = free.findIndex((placeId) => !cabinClass || PLACE_BY_ID[placeId].cabinClass === cabinClass);
  if (index === -1) throw new Error(`Out of free ${cabinClass ?? "places"} on the test train`);
  return free.splice(index, 1)[0];
}

beforeAll(async () => {
  await ensureDepartures(date, date, now);
  const taken = new Set(await takenPlaces(id, now));
  free = ALL_PLACES.map((p) => p.id).filter((placeId) => !taken.has(placeId));
});

describe("holding a place", () => {
  it("lets exactly one of many simultaneous requests win", async () => {
    const placeId = nextFree();
    const attempts = await Promise.all(
      Array.from({ length: 12 }, () => createHold({ ...journey, placeIds: [placeId] }, now)),
    );
    const winners = attempts.filter((a) => a.ok);
    const losers = attempts.filter((a) => !a.ok);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(11);
    for (const loser of losers) {
      expect(loser).toMatchObject({ reason: "conflict", conflicts: [placeId] });
    }
  });

  it("fails as a whole if any one place in the request is gone", async () => {
    const taken = nextFree();
    const wanted = nextFree();
    await createHold({ ...journey, placeIds: [taken] }, now);
    const result = await createHold({ ...journey, placeIds: [wanted, taken] }, now);
    expect(result).toMatchObject({ ok: false, reason: "conflict", conflicts: [taken] });
    expect(await takenPlaces(id, now)).not.toContain(wanted);
  });

  it("gives the place back once the hold runs out", async () => {
    const placeId = nextFree();
    const first = await createHold({ ...journey, placeIds: [placeId] }, now);
    expect(first.ok).toBe(true);

    const later = new Date(now.getTime() + (HOLD_MINUTES + 1) * 60000);
    expect(await takenPlaces(id, later)).not.toContain(placeId);

    const second = await createHold({ ...journey, placeIds: [placeId] }, later);
    expect(second.ok).toBe(true);
  });

  it("rejects unknown places, too many places, and impossible journeys", async () => {
    expect(await createHold({ ...journey, placeIds: ["99-1"] }, now)).toMatchObject({ reason: "invalid-places" });
    expect(await createHold({ ...journey, placeIds: [] }, now)).toMatchObject({ reason: "invalid-places" });
    expect(
      await createHold({ ...journey, placeIds: ALL_PLACES.slice(0, 5).map((p) => p.id) }, now),
    ).toMatchObject({ reason: "invalid-places" });
    expect(
      await createHold({ ...journey, from: "vienna", to: "paris", placeIds: [nextFree()] }, now),
    ).toMatchObject({ reason: "invalid-journey" });
  });

  it("won't sell a place on a train that has gone", async () => {
    const after = new Date(new Date(`${date}T23:59:00Z`).getTime());
    expect(await createHold({ ...journey, placeIds: [nextFree()] }, after)).toMatchObject({ reason: "departed" });
  });

  it("works out the price on the server", async () => {
    const result = await createHold({ ...journey, placeIds: [nextFree("couchette")] }, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const held = await getHold(result.holdId, now);
    expect(held?.places[0].priceCents).toBeGreaterThan(0);
  });
});

describe("confirming a booking", () => {
  it("turns a hold into a booking and keeps the place taken", async () => {
    const placeId = nextFree("sleeper");
    const hold = await createHold({ ...journey, placeIds: [placeId] }, now);
    if (!hold.ok) throw new Error("hold failed");

    const result = await confirmBooking(hold.holdId, { ...details, travellers: 2 }, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ticket = await getTicket(result.accessToken);
    expect(ticket?.booking.status).toBe("confirmed");
    expect(ticket?.places.map((p) => p.placeId)).toEqual([placeId]);
    expect(ticket?.booking.email).toBe("test@example.com");
    expect(await getHold(hold.holdId, now)).toBeNull();

    const later = new Date(now.getTime() + (HOLD_MINUTES + 5) * 60000);
    expect(await takenPlaces(id, later)).toContain(placeId);
  });

  it("charges for breakfast per traveller", async () => {
    const hold = await createHold({ ...journey, placeIds: [nextFree("sleeper")] }, now);
    if (!hold.ok) throw new Error("hold failed");
    const held = await getHold(hold.holdId, now);
    const result = await confirmBooking(hold.holdId, { ...details, travellers: 2, breakfast: true }, now);
    if (!result.ok) throw new Error("confirm failed");
    const ticket = await getTicket(result.accessToken);
    expect(ticket?.booking.totalCents).toBe(held!.places[0].priceCents + 2 * 1400);
  });

  it("refuses to confirm an expired hold", async () => {
    const hold = await createHold({ ...journey, placeIds: [nextFree()] }, now);
    if (!hold.ok) throw new Error("hold failed");
    const later = new Date(now.getTime() + (HOLD_MINUTES + 1) * 60000);
    expect(await confirmBooking(hold.holdId, details, later)).toEqual({ ok: false, reason: "expired" });
  });

  it("can't be confirmed twice", async () => {
    const hold = await createHold({ ...journey, placeIds: [nextFree()] }, now);
    if (!hold.ok) throw new Error("hold failed");
    const results = await Promise.all([confirmBooking(hold.holdId, details, now), confirmBooking(hold.holdId, details, now)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("won't put three people in a two-berth cabin", async () => {
    const hold = await createHold({ ...journey, placeIds: [nextFree("sleeper")] }, now);
    if (!hold.ok) throw new Error("hold failed");
    expect(await confirmBooking(hold.holdId, { ...details, travellers: 3 }, now)).toEqual({
      ok: false,
      reason: "too-many-travellers",
    });
  });
});

describe("after booking", () => {
  it("finds a booking only with the matching reference and email", async () => {
    const hold = await createHold({ ...journey, placeIds: [nextFree()] }, now);
    if (!hold.ok) throw new Error("hold failed");
    const result = await confirmBooking(hold.holdId, details, now);
    if (!result.ok) throw new Error("confirm failed");

    expect(await findBookingToken(result.reference.toLowerCase(), " TEST@example.com ")).toBe(result.accessToken);
    expect(await findBookingToken(result.reference, "someone@else.com")).toBeNull();
    expect(await findBookingToken("MRW-NOPE00", "test@example.com")).toBeNull();
  });

  it("returns the place to sale on cancellation and keeps the record", async () => {
    const placeId = nextFree();
    const hold = await createHold({ ...journey, placeIds: [placeId] }, now);
    if (!hold.ok) throw new Error("hold failed");
    const result = await confirmBooking(hold.holdId, details, now);
    if (!result.ok) throw new Error("confirm failed");

    expect(await cancelBooking({ accessToken: result.accessToken }, "public", now)).toEqual({ ok: true });
    expect(await takenPlaces(id, now)).not.toContain(placeId);

    const ticket = await getTicket(result.accessToken);
    expect(ticket?.booking.status).toBe("cancelled");
    expect(ticket?.places.map((p) => p.placeId)).toEqual([placeId]);

    expect(await cancelBooking({ accessToken: result.accessToken }, "public", now)).toEqual({
      ok: false,
      reason: "already-cancelled",
    });

    const again = await createHold({ ...journey, placeIds: [placeId] }, now);
    expect(again.ok).toBe(true);
  });
});

describe("booking horizon", () => {
  it("won't create trains beyond the on-sale window, however the date is asked for", async () => {
    const far = addDays(localDate(now, NETWORK_TZ), 3650);
    await ensureDepartures(far, far, now);
    expect(await getDeparture(departureId("transalpine", "out", far))).toBeNull();
  });
});

describe("simulated demand", () => {
  it("creates the same passengers however many times it runs", async () => {
    const next = addDays(date, 1);
    const nextId = departureId("transalpine", "out", next);
    await ensureDepartures(next, next, now);
    const first = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.departureId, nextId));
    const { forgetEnsuredDates } = await import("@/lib/departures");
    forgetEnsuredDates();
    await ensureDepartures(next, next, now);
    const second = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.departureId, nextId));
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(0);
  });

  it("never occupies a place that doesn't exist", async () => {
    const rows = await db.select({ placeId: claims.placeId }).from(claims).where(eq(claims.departureId, id));
    for (const row of rows) expect(PLACE_BY_ID[row.placeId], row.placeId).toBeDefined();
  });
});
