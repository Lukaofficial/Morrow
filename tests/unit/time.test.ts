import { describe, expect, it } from "vitest";
import { connections, LINE_BY_ID, LINES, reachableFrom, stopsFor } from "@/lib/network";
import { addDays, clock, journeyOn, stopTimes, zonedToInstant } from "@/lib/time";

describe("zoned time", () => {
  it("turns a wall clock into the right instant in summer and winter", () => {
    expect(zonedToInstant("2026-07-01", "12:00", "Europe/Paris").toISOString()).toBe("2026-07-01T10:00:00.000Z");
    expect(zonedToInstant("2026-12-01", "12:00", "Europe/Paris").toISOString()).toBe("2026-12-01T11:00:00.000Z");
  });

  it("survives the night the clocks go back", () => {
    const instant = zonedToInstant("2026-10-25", "20:12", "Europe/Paris");
    expect(clock(instant, "Europe/Paris")).toBe("20:12");
  });

  it("adds days across a month end", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("journeys", () => {
  const transalpine = LINE_BY_ID.transalpine;

  it("runs the timetable forward from the origin", () => {
    const times = stopTimes(transalpine, "out", "2026-11-03");
    expect(times[0].clock).toBe("20:12");
    expect(times[0].date).toBe("2026-11-03");
    expect(times[times.length - 1].date).toBe("2026-11-04");
  });

  it("shows local time at each stop across a time zone", () => {
    const line = LINE_BY_ID.atlantic;
    const times = stopTimes(line, "out", "2026-11-03");
    const lisbonLeaves = times[0].instant.getTime();
    const salamanca = times[1];
    const hours = (salamanca.instant.getTime() - lisbonLeaves) / 3600000;
    expect(hours).toBeCloseTo(6.2, 1);
    // 6h12 after 17:48 is midnight in Lisbon, and Spain is an hour ahead of Portugal.
    expect(salamanca.clock).toBe("01:00");
  });

  it("refuses a journey against the direction of travel", () => {
    expect(journeyOn(transalpine, "out", "2026-11-03", "vienna", "paris")).toBeNull();
    expect(journeyOn(transalpine, "back", "2026-11-03", "vienna", "paris")).not.toBeNull();
  });

  it("mirrors distance and times on the return run", () => {
    const back = stopsFor(transalpine, "back");
    expect(back[0].station).toBe("vienna");
    expect(back[0].at).toBe(0);
    expect(back[back.length - 1].km).toBe(1380);
  });

  it("has every stop sitting on its line's drawn path", () => {
    for (const line of LINES) {
      for (const { map: [x, y], station } of line.stops) {
        const onPath = line.path.slice(1).some(([bx, by], i) => {
          const [ax, ay] = line.path[i];
          const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
          const within = x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by);
          return cross === 0 && within;
        });
        expect(onPath, `${line.id}/${station}`).toBe(true);
      }
    }
  });
});

describe("network", () => {
  it("connects stations on the same line in the right direction", () => {
    expect(connections("paris", "vienna").map((c) => [c.line.id, c.direction])).toEqual([["transalpine", "out"]]);
    expect(connections("vienna", "paris").map((c) => [c.line.id, c.direction])).toEqual([["transalpine", "back"]]);
  });

  it("offers nothing between stations with no direct train", () => {
    expect(connections("lisbon", "istanbul")).toEqual([]);
  });

  it("makes Vienna the interchange it's drawn as", () => {
    expect(reachableFrom("vienna").length).toBeGreaterThan(10);
  });
});
