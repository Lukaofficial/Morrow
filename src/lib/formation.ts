/**
 * The train itself. Every Morrow service runs the same seven-car formation,
 * so places are identified by a stable id such as "5-2C" and only ever exist
 * in the database once someone has claimed them.
 */

export type CabinClass = "suite" | "sleeper" | "couchette" | "seat";

export const CLASSES: Record<
  CabinClass,
  { name: string; plural: string; sleeps: number; blurb: string; unit: string }
> = {
  suite: {
    name: "Suite",
    plural: "Suites",
    sleeps: 2,
    unit: "suite",
    blurb: "A proper double bed, your own shower, and a window the size of a door.",
  },
  sleeper: {
    name: "Sleeper",
    plural: "Sleepers",
    sleeps: 2,
    unit: "cabin",
    blurb: "Two bunks and a basin behind a door that locks. Breakfast comes to you.",
  },
  couchette: {
    name: "Couchette",
    plural: "Couchettes",
    sleeps: 1,
    unit: "berth",
    blurb: "One flat berth in a compartment of four. Clean linen and a curtain.",
  },
  seat: {
    name: "Recliner",
    plural: "Recliners",
    sleeps: 1,
    unit: "seat",
    blurb: "A wide seat that goes back further than you'd expect. Bring a scarf.",
  },
};

export type Place = {
  id: string;
  car: number;
  cabinClass: CabinClass;
  /** Compartment, cabin or row number within the car. */
  group: number;
  /** Short label printed on the ticket, such as "12" or "2C". */
  label: string;
  /** Berth position, where that means anything. */
  position?: "upper" | "lower" | "window" | "aisle";
};

export type Car = {
  number: number;
  kind: CabinClass | "dining";
  name: string;
  places: Place[];
};

function suiteCar(number: number): Car {
  const places: Place[] = [];
  for (let i = 1; i <= 5; i++) {
    places.push({ id: `${number}-${i}`, car: number, cabinClass: "suite", group: i, label: `${i}` });
  }
  return { number, kind: "suite", name: "Suites", places };
}

function sleeperCar(number: number, offset: number): Car {
  const places: Place[] = [];
  for (let i = 1; i <= 10; i++) {
    const label = `${i + offset}`;
    places.push({ id: `${number}-${label}`, car: number, cabinClass: "sleeper", group: i, label });
  }
  return { number, kind: "sleeper", name: "Sleepers", places };
}

function couchetteCar(number: number): Car {
  const places: Place[] = [];
  for (let compartment = 1; compartment <= 6; compartment++) {
    for (const [berth, position] of [
      ["A", "upper"],
      ["B", "upper"],
      ["C", "lower"],
      ["D", "lower"],
    ] as const) {
      const label = `${compartment}${berth}`;
      places.push({
        id: `${number}-${label}`,
        car: number,
        cabinClass: "couchette",
        group: compartment,
        label,
        position,
      });
    }
  }
  return { number, kind: "couchette", name: "Couchettes", places };
}

function seatCar(number: number): Car {
  const places: Place[] = [];
  for (let row = 1; row <= 12; row++) {
    for (const [seat, position] of [
      ["A", "window"],
      ["B", "aisle"],
      ["C", "window"],
    ] as const) {
      const label = `${row}${seat}`;
      places.push({
        id: `${number}-${label}`,
        car: number,
        cabinClass: "seat",
        group: row,
        label,
        position,
      });
    }
  }
  return { number, kind: "seat", name: "Recliners", places };
}

export const FORMATION: Car[] = [
  suiteCar(1),
  sleeperCar(2, 0),
  sleeperCar(3, 10),
  { number: 4, kind: "dining", name: "Dining car", places: [] },
  couchetteCar(5),
  couchetteCar(6),
  seatCar(7),
];

export const ALL_PLACES: Place[] = FORMATION.flatMap((car) => car.places);

export const PLACE_BY_ID: Record<string, Place> = Object.fromEntries(
  ALL_PLACES.map((p) => [p.id, p]),
);

export const CAPACITY: Record<CabinClass, number> = ALL_PLACES.reduce(
  (totals, place) => {
    totals[place.cabinClass] += 1;
    return totals;
  },
  { suite: 0, sleeper: 0, couchette: 0, seat: 0 } as Record<CabinClass, number>,
);

export const TOTAL_PLACES = ALL_PLACES.length;

/** What goes on the ticket: "Car 5, compartment 2, berth C". */
export function describePlace(place: Place): string {
  switch (place.cabinClass) {
    case "suite":
      return `Car ${place.car}, suite ${place.label}`;
    case "sleeper":
      return `Car ${place.car}, cabin ${place.label}`;
    case "couchette":
      return `Car ${place.car}, compartment ${place.group}, berth ${place.label.slice(-1)} (${place.position})`;
    case "seat":
      return `Car ${place.car}, row ${place.group}, seat ${place.label.slice(-1)}`;
  }
}
