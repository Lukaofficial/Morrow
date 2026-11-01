import { describe, expect, it } from "vitest";
import { CAPACITY } from "@/lib/formation";
import { demandMultiplier, fareCents, formatEuro } from "@/lib/pricing";

const midweek = { km: 1000, weekday: 2, daysOut: 14 } as const;

describe("fares", () => {
  it("rounds every fare to a whole euro", () => {
    for (let km = 0; km < 2000; km += 137) {
      expect(fareCents({ ...midweek, km, cabinClass: "sleeper", claimed: 3 }) % 100).toBe(0);
    }
  });

  it("orders the classes the way the brochure does", () => {
    const fare = (cabinClass: "seat" | "couchette" | "sleeper" | "suite") =>
      fareCents({ ...midweek, cabinClass, claimed: 0 });
    expect(fare("seat")).toBeLessThan(fare("couchette"));
    expect(fare("couchette")).toBeLessThan(fare("sleeper"));
    expect(fare("sleeper")).toBeLessThan(fare("suite"));
  });

  it("never gets cheaper as a carriage fills up", () => {
    let last = 0;
    for (let claimed = 0; claimed <= CAPACITY.couchette; claimed++) {
      const fare = fareCents({ ...midweek, cabinClass: "couchette", claimed });
      expect(fare).toBeGreaterThanOrEqual(last);
      last = fare;
    }
  });

  it("charges more for longer journeys", () => {
    const short = fareCents({ ...midweek, km: 300, cabinClass: "seat", claimed: 0 });
    const long = fareCents({ ...midweek, km: 1500, cabinClass: "seat", claimed: 0 });
    expect(long).toBeGreaterThan(short);
  });

  it("adds a weekend and a last-minute supplement", () => {
    const base = fareCents({ ...midweek, cabinClass: "sleeper", claimed: 0 });
    expect(fareCents({ ...midweek, weekday: 5, cabinClass: "sleeper", claimed: 0 })).toBeGreaterThan(base);
    expect(fareCents({ ...midweek, daysOut: 1, cabinClass: "sleeper", claimed: 0 })).toBeGreaterThan(base);
  });

  it("steps demand at the published thresholds", () => {
    expect(demandMultiplier(0.39)).toBe(1);
    expect(demandMultiplier(0.4)).toBe(1.15);
    expect(demandMultiplier(0.7)).toBe(1.35);
    expect(demandMultiplier(0.9)).toBe(1.6);
  });

  it("formats euros without pointless decimals", () => {
    expect(formatEuro(8300)).toBe("€83");
    expect(formatEuro(123400)).toBe("€1,234");
  });
});
