import { inArray } from "drizzle-orm";
import { db } from "./db/client";
import { departures } from "./db/schema";
import { ensureDepartures } from "./departures";
import { Direction, LINE_BY_ID, originFor, platformFor, terminusFor } from "./network";
import { addDays, clock, departureInstant, localDate, NETWORK_TZ } from "./time";

export type BoardStatus = "on-time" | "boarding" | "delayed" | "cancelled" | "departed" | "tomorrow";

export type BoardRow = {
  id: string;
  time: string;
  line: string;
  lineId: string;
  from: string;
  fromId: string;
  to: string;
  toId: string;
  platform: number;
  status: BoardStatus;
  statusText: string;
  delayMinutes: number;
  serviceDate: string;
  departsAt: string;
};

const BOARDING_WINDOW_MS = 30 * 60000;

/** The next trains out, across the network, with a couple that have just gone. */
export async function getBoard(limit = 8, now = new Date()): Promise<BoardRow[]> {
  const today = localDate(now, NETWORK_TZ);
  const dates = [addDays(today, -1), today, addDays(today, 1)];
  await ensureDepartures(dates[0], dates[2], now);

  const rows = await db.select().from(departures).where(inArray(departures.serviceDate, dates));

  const board = rows.map((row): BoardRow & { instant: number } => {
    const line = LINE_BY_ID[row.lineId];
    const direction = row.direction as Direction;
    const origin = originFor(line, direction);
    const terminus = terminusFor(line, direction);
    const scheduled = departureInstant(line, direction, row.serviceDate);
    const actual = scheduled.getTime() + row.delayMinutes * 60000;
    const untilDeparture = actual - now.getTime();

    let status: BoardStatus = "on-time";
    let statusText = "On time";
    if (row.status === "cancelled") {
      status = "cancelled";
      statusText = "Cancelled";
    } else if (untilDeparture <= 0) {
      status = "departed";
      statusText = "Departed";
    } else if (row.delayMinutes > 0) {
      status = "delayed";
      statusText = `Delayed ${row.delayMinutes}`;
    } else if (untilDeparture <= BOARDING_WINDOW_MS) {
      status = "boarding";
      statusText = "Boarding";
    } else if (localDate(scheduled, origin.tz) !== localDate(now, origin.tz)) {
      status = "tomorrow";
      statusText = "Tomorrow";
    }

    return {
      id: row.id,
      time: clock(scheduled, origin.tz),
      line: line.name.replace(/^The /, ""),
      lineId: line.id,
      from: origin.city,
      fromId: origin.id,
      to: terminus.city,
      toId: terminus.id,
      platform: platformFor(line.id, direction),
      status,
      statusText,
      delayMinutes: row.delayMinutes,
      serviceDate: row.serviceDate,
      departsAt: scheduled.toISOString(),
      instant: scheduled.getTime(),
    };
  });

  board.sort((a, b) => a.instant - b.instant);
  const firstUpcoming = board.findIndex((row) => row.instant + row.delayMinutes * 60000 > now.getTime());
  const start = Math.max(0, (firstUpcoming === -1 ? board.length : firstUpcoming) - 2);

  return board.slice(start, start + limit).map(({ instant: _instant, ...row }) => row);
}
