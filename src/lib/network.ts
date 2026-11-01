/**
 * The Morrow network, as code. Stations and lines change about as often as the
 * software does, so they live in version control rather than in the database.
 * Anything that changes nightly (departures, claims, bookings) lives in SQL.
 */

export type Station = {
  id: string;
  city: string;
  /** The building you actually stand in. */
  station: string;
  country: string;
  tz: string;
};

const station = (id: string, city: string, name: string, country: string, tz: string): Station => ({
  id,
  city,
  station: name,
  country,
  tz,
});

export const STATIONS: Record<string, Station> = Object.fromEntries(
  [
    station("lisbon", "Lisbon", "Santa Apolónia", "Portugal", "Europe/Lisbon"),
    station("salamanca", "Salamanca", "Vialia", "Spain", "Europe/Madrid"),
    station("bordeaux", "Bordeaux", "Saint-Jean", "France", "Europe/Paris"),
    station("paris", "Paris", "Gare de l'Est", "France", "Europe/Paris"),
    station("zurich", "Zürich", "Hauptbahnhof", "Switzerland", "Europe/Zurich"),
    station("innsbruck", "Innsbruck", "Hauptbahnhof", "Austria", "Europe/Vienna"),
    station("salzburg", "Salzburg", "Hauptbahnhof", "Austria", "Europe/Vienna"),
    station("vienna", "Vienna", "Wien Hauptbahnhof", "Austria", "Europe/Vienna"),
    station("milan", "Milan", "Centrale", "Italy", "Europe/Rome"),
    station("rome", "Rome", "Termini", "Italy", "Europe/Rome"),
    station("naples", "Naples", "Centrale", "Italy", "Europe/Rome"),
    station("palermo", "Palermo", "Centrale", "Italy", "Europe/Rome"),
    station("stockholm", "Stockholm", "Centralstation", "Sweden", "Europe/Stockholm"),
    station("copenhagen", "Copenhagen", "Hovedbanegård", "Denmark", "Europe/Copenhagen"),
    station("hamburg", "Hamburg", "Hauptbahnhof", "Germany", "Europe/Berlin"),
    station("berlin", "Berlin", "Hauptbahnhof", "Germany", "Europe/Berlin"),
    station("prague", "Prague", "Hlavní nádraží", "Czechia", "Europe/Prague"),
    station("ljubljana", "Ljubljana", "Železniška postaja", "Slovenia", "Europe/Ljubljana"),
    station("zagreb", "Zagreb", "Glavni kolodvor", "Croatia", "Europe/Zagreb"),
    station("split", "Split", "Kolodvor", "Croatia", "Europe/Zagreb"),
    station("budapest", "Budapest", "Keleti", "Hungary", "Europe/Budapest"),
    station("belgrade", "Belgrade", "Prokop", "Serbia", "Europe/Belgrade"),
    station("sofia", "Sofia", "Centralna Gara", "Bulgaria", "Europe/Sofia"),
    station("istanbul", "Istanbul", "Sirkeci", "Türkiye", "Europe/Istanbul"),
  ].map((s) => [s.id, s]),
);

export type Stop = {
  station: string;
  km: number;
  /** Minutes after the origin on the outbound run. */
  at: number;
  /** Position on the schematic map (viewBox 1240 × 860). */
  map: [number, number];
};

export type Line = {
  id: string;
  name: string;
  /** A short sentence for lists. */
  note: string;
  story: string[];
  colour: string;
  /** Local departure time at each terminus. */
  outbound: string;
  inbound: string;
  /** Running days, Sunday first. */
  runsOut: boolean[];
  runsBack: boolean[];
  /** Base popularity, used for pricing pressure and simulated demand. */
  demand: number;
  stops: Stop[];
  /** Full path on the schematic map, including bends between stops. */
  path: [number, number][];
};

const DAILY = [true, true, true, true, true, true, true];
const days = (pattern: string) => [...pattern].map((c) => c === "x");

export const LINES: Line[] = [
  {
    id: "atlantic",
    name: "The Atlantic",
    note: "From the Tagus to the Seine by way of two breakfasts.",
    story: [
      "We leave Lisbon as the river goes the colour of a peach, climb through the cork forests of the Alentejo, and cross into Spain while the dining car is still arguing about dessert.",
      "By Bordeaux it's a different day. The vineyards start outside your window at about the point you start wanting coffee, and Paris arrives mid-morning, which gives you the rest of it.",
    ],
    colour: "#ff5a2b",
    outbound: "17:48",
    inbound: "18:32",
    runsOut: DAILY,
    runsBack: DAILY,
    demand: 0.78,
    stops: [
      { station: "lisbon", km: 0, at: 0, map: [50, 760] },
      { station: "salamanca", km: 470, at: 372, map: [130, 640] },
      { station: "bordeaux", km: 1130, at: 716, map: [190, 480] },
      { station: "paris", km: 1680, at: 932, map: [310, 360] },
    ],
    path: [
      [50, 760],
      [130, 680],
      [130, 640],
      [190, 580],
      [190, 480],
      [310, 360],
    ],
  },
  {
    id: "transalpine",
    name: "The Transalpine",
    note: "Our oldest line and the reason we bought better blinds.",
    story: [
      "Paris to Vienna is the journey people mean when they tell you they took a night train once. You board in the blue hour at the Gare de l'Est and eat somewhere around Troyes.",
      "The climb past Zürich happens while you're asleep, and we've spent real money making sure of that. If you're awake at Innsbruck, raise the blind: the Karwendel is right there, and it's enormous.",
    ],
    colour: "#f7f3e8",
    outbound: "20:12",
    inbound: "20:40",
    runsOut: DAILY,
    runsBack: DAILY,
    demand: 0.92,
    stops: [
      { station: "paris", km: 0, at: 0, map: [310, 360] },
      { station: "zurich", km: 610, at: 276, map: [470, 480] },
      { station: "innsbruck", km: 900, at: 478, map: [580, 480] },
      { station: "salzburg", km: 1080, at: 590, map: [670, 480] },
      { station: "vienna", km: 1380, at: 744, map: [790, 480] },
    ],
    path: [
      [310, 360],
      [350, 400],
      [390, 400],
      [470, 480],
      [790, 480],
    ],
  },
  {
    id: "tyrrhenian",
    name: "The Tyrrhenian",
    note: "The one where the train gets on a boat.",
    story: [
      "South from Zürich through the Gotthard, then the long dark run down the Italian coast with Rome and Naples going by in the small hours like somebody else's party.",
      "At Villa San Giovanni the train is uncoupled and rolled onto a ferry. You can stay in bed for the crossing, but nobody ever does. There's a bar up on deck, and Sicily is getting bigger.",
    ],
    colour: "#ffd35c",
    outbound: "20:40",
    inbound: "15:20",
    runsOut: days("x.x.x.x"),
    runsBack: days(".x.x.x."),
    demand: 0.7,
    stops: [
      { station: "zurich", km: 0, at: 0, map: [470, 480] },
      { station: "milan", km: 280, at: 198, map: [470, 590] },
      { station: "rome", km: 880, at: 510, map: [610, 730] },
      { station: "naples", km: 1100, at: 610, map: [680, 800] },
      { station: "palermo", km: 1820, at: 960, map: [610, 860] },
    ],
    path: [
      [470, 480],
      [470, 590],
      [610, 730],
      [680, 800],
      [680, 830],
      [650, 860],
      [610, 860],
    ],
  },
  {
    id: "boreal",
    name: "The Boreal",
    note: "Long enough to finish the book you brought.",
    story: [
      "Twenty-one hours from Stockholm to Vienna, and most people get off well before the end. The Skåne fields go by in the last of the light and the Øresund crossing comes at dinner.",
      "Hamburg and Berlin happen while you sleep. Stay on and you'll have Prague with your second breakfast. We keep the sauna car running until midnight, for reasons that made sense to the Swedes.",
    ],
    colour: "#8fe3cf",
    outbound: "16:10",
    inbound: "15:05",
    runsOut: DAILY,
    runsBack: DAILY,
    demand: 0.66,
    stops: [
      { station: "stockholm", km: 0, at: 0, map: [720, 30] },
      { station: "copenhagen", km: 650, at: 310, map: [600, 150] },
      { station: "hamburg", km: 950, at: 595, map: [540, 240] },
      { station: "berlin", km: 1240, at: 780, map: [660, 280] },
      { station: "prague", km: 1590, at: 1015, map: [720, 380] },
      { station: "vienna", km: 1920, at: 1250, map: [790, 480] },
    ],
    path: [
      [720, 30],
      [600, 150],
      [540, 210],
      [540, 240],
      [580, 280],
      [660, 280],
      [720, 340],
      [720, 380],
      [790, 450],
      [790, 480],
    ],
  },
  {
    id: "adriatic",
    name: "The Adriatic",
    note: "Summer's train, and winter's best-kept secret.",
    story: [
      "You leave Vienna after work and go to sleep somewhere in Styria. Ljubljana passes without comment at one in the morning, its castle lit up for no one in particular.",
      "The last two hours are the point. The line comes down out of the Dinaric karst in long loops, and then there's the sea, flat and impossibly blue, a few hundred metres below your toothbrush.",
    ],
    colour: "#7cc7ff",
    outbound: "19:25",
    inbound: "18:15",
    runsOut: days("x.xx.xx"),
    runsBack: days("xx.xx.x"),
    demand: 0.74,
    stops: [
      { station: "vienna", km: 0, at: 0, map: [790, 480] },
      { station: "ljubljana", km: 385, at: 330, map: [730, 620] },
      { station: "zagreb", km: 525, at: 455, map: [840, 620] },
      { station: "split", km: 930, at: 780, map: [840, 760] },
    ],
    path: [
      [790, 480],
      [790, 540],
      [730, 600],
      [730, 620],
      [840, 620],
      [840, 760],
    ],
  },
  {
    id: "danubian",
    name: "The Danubian",
    note: "Vienna to the Bosphorus, the old way round.",
    story: [
      "An afternoon departure, because the Hungarian plain deserves daylight. Budapest comes at dinner, all lit up along the river, and Belgrade comes when you've stopped counting.",
      "You wake up in the Balkans with a long morning ahead and nothing to do in it. We pull into Sirkeci, the old terminus of the old trains, in time for a late lunch and the ferries.",
    ],
    colour: "#ff9fb0",
    outbound: "15:50",
    inbound: "13:30",
    runsOut: days(".x.x.x."),
    runsBack: days("x.x.x.x"),
    demand: 0.84,
    stops: [
      { station: "vienna", km: 0, at: 0, map: [790, 480] },
      { station: "budapest", km: 245, at: 165, map: [940, 480] },
      { station: "belgrade", km: 620, at: 500, map: [1020, 600] },
      { station: "sofia", km: 1010, at: 880, map: [1090, 690] },
      { station: "istanbul", km: 1560, at: 1335, map: [1210, 690] },
    ],
    path: [
      [790, 480],
      [940, 480],
      [1020, 560],
      [1020, 600],
      [1090, 670],
      [1090, 690],
      [1210, 690],
    ],
  },
];

export const LINE_BY_ID: Record<string, Line> = Object.fromEntries(LINES.map((l) => [l.id, l]));

export type Direction = "out" | "back";

/** The stops of a line in the order a train in this direction calls at them. */
export function stopsFor(line: Line, direction: Direction): Stop[] {
  if (direction === "out") return line.stops;
  const total = line.stops[line.stops.length - 1].at;
  const longest = line.stops[line.stops.length - 1].km;
  return [...line.stops].reverse().map((s) => ({ ...s, at: total - s.at, km: longest - s.km }));
}

export function terminusFor(line: Line, direction: Direction): Station {
  const stops = stopsFor(line, direction);
  return STATIONS[stops[stops.length - 1].station];
}

export function originFor(line: Line, direction: Direction): Station {
  return STATIONS[stopsFor(line, direction)[0].station];
}

export function runsOn(line: Line, direction: Direction, weekday: number): boolean {
  return (direction === "out" ? line.runsOut : line.runsBack)[weekday];
}

/** Every direct connection between two stations. A pair can be served by more than one line. */
export function connections(fromId: string, toId: string): { line: Line; direction: Direction }[] {
  if (fromId === toId) return [];
  const found: { line: Line; direction: Direction }[] = [];
  for (const line of LINES) {
    const from = line.stops.findIndex((s) => s.station === fromId);
    const to = line.stops.findIndex((s) => s.station === toId);
    if (from === -1 || to === -1) continue;
    found.push({ line, direction: from < to ? "out" : "back" });
  }
  return found;
}

/** Stations reachable without changing trains. */
export function reachableFrom(fromId: string): Station[] {
  const ids = new Set<string>();
  for (const line of LINES) {
    if (!line.stops.some((s) => s.station === fromId)) continue;
    for (const s of line.stops) if (s.station !== fromId) ids.add(s.station);
  }
  return Object.values(STATIONS).filter((s) => ids.has(s.id));
}

/** Stable platform number, so a train doesn't appear to move between page loads. */
export function platformFor(lineId: string, direction: Direction): number {
  let hash = direction === "out" ? 7 : 13;
  for (const c of lineId) hash = (hash * 31 + c.charCodeAt(0)) % 997;
  return (hash % 18) + 1;
}
