/**
 * Trains cross time zones and midnight, usually at once. Everything here works
 * from an absolute instant and only turns into a local clock at the last moment.
 */

import { Direction, Line, STATIONS, stopsFor } from "./network";

/** The company clock: the board and the ops room both run on Vienna time. */
export const NETWORK_TZ = "Europe/Vienna";

function offsetMinutes(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000;
}

/** The instant a wall clock in `tz` shows `date` at `time`. */
export function zonedToInstant(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes so that a guess landing either side of a DST change settles.
  const first = offsetMinutes(new Date(wall), tz);
  const second = offsetMinutes(new Date(wall - first * 60000), tz);
  return new Date(wall - second * 60000);
}

export function clock(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** YYYY-MM-DD as seen in `tz`. */
export function localDate(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function localHour(instant: Date, tz: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(
      instant,
    ),
  );
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysBetween(from: string, to: string): number {
  const toUtc = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

export function formatDay(date: string, style: "long" | "short" = "long"): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`;
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}

/** The instant a train on this service date leaves its origin. */
export function departureInstant(line: Line, direction: Direction, serviceDate: string): Date {
  const origin = STATIONS[stopsFor(line, direction)[0].station];
  const time = direction === "out" ? line.outbound : line.inbound;
  return zonedToInstant(serviceDate, time, origin.tz);
}

export type StopTime = {
  station: string;
  km: number;
  instant: Date;
  clock: string;
  /** Local calendar date at that stop. */
  date: string;
};

export function stopTimes(line: Line, direction: Direction, serviceDate: string): StopTime[] {
  const start = departureInstant(line, direction, serviceDate).getTime();
  return stopsFor(line, direction).map((stop) => {
    const instant = new Date(start + stop.at * 60000);
    const { tz } = STATIONS[stop.station];
    return {
      station: stop.station,
      km: stop.km,
      instant,
      clock: clock(instant, tz),
      date: localDate(instant, tz),
    };
  });
}

export type Journey = {
  line: Line;
  direction: Direction;
  serviceDate: string;
  from: StopTime;
  to: StopTime;
  calls: StopTime[];
  km: number;
  minutes: number;
};

/** The part of a service between two stops, or null if it doesn't run that way. */
export function journeyOn(
  line: Line,
  direction: Direction,
  serviceDate: string,
  fromId: string,
  toId: string,
): Journey | null {
  const times = stopTimes(line, direction, serviceDate);
  const fromIndex = times.findIndex((t) => t.station === fromId);
  const toIndex = times.findIndex((t) => t.station === toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) return null;
  const from = times[fromIndex];
  const to = times[toIndex];
  return {
    line,
    direction,
    serviceDate,
    from,
    to,
    calls: times.slice(fromIndex, toIndex + 1),
    km: to.km - from.km,
    minutes: Math.round((to.instant.getTime() - from.instant.getTime()) / 60000),
  };
}
