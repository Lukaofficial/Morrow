/**
 * Fares are a pure function so they can be tested without a database and so the
 * client can never talk the server into a different number. The price is worked
 * out when a place is held and stored on the claim, which is the price you pay
 * even if the train fills up while you're typing your name.
 */

import { CAPACITY, CabinClass } from "./formation";

const TARIFF: Record<CabinClass, { base: number; perKm: number }> = {
  seat: { base: 1900, perKm: 3.5 },
  couchette: { base: 2900, perKm: 5 },
  sleeper: { base: 7900, perKm: 11 },
  suite: { base: 18900, perKm: 19 },
};

/** Fuller carriages cost more: the cheap places really do go first. */
export function demandMultiplier(load: number): number {
  if (load >= 0.9) return 1.6;
  if (load >= 0.7) return 1.35;
  if (load >= 0.4) return 1.15;
  return 1;
}

export type FareInput = {
  cabinClass: CabinClass;
  km: number;
  /** Places of this class already claimed on the departure. */
  claimed: number;
  /** 0 = Sunday, in the origin's calendar. */
  weekday: number;
  /** Whole days between today and departure. */
  daysOut: number;
};

/** Fare in euro cents, rounded to a whole euro because nobody likes €83.17. */
export function fareCents({ cabinClass, km, claimed, weekday, daysOut }: FareInput): number {
  const { base, perKm } = TARIFF[cabinClass];
  const load = Math.min(claimed / CAPACITY[cabinClass], 1);
  const weekend = weekday === 5 || weekday === 6 ? 1.1 : 1;
  const lastMinute = daysOut <= 2 ? 1.1 : 1;
  const raw = (base + perKm * km) * demandMultiplier(load) * weekend * lastMinute;
  return Math.round(raw / 100) * 100;
}

export function formatEuro(cents: number): string {
  const euros = cents / 100;
  return `€${Number.isInteger(euros) ? euros.toLocaleString("en-GB") : euros.toFixed(2)}`;
}

export const BREAKFAST_CENTS = 1400;
