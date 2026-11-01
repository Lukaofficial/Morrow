/**
 * Simulated passengers. An empty train makes for a dull demo and a meaningless
 * ops room, so each departure comes into being with a believable set of earlier
 * bookings. They go through the same tables and the same fare function as real
 * ones, and carry a `synthetic` flag so they can always be told apart.
 *
 * Everything is derived from a seed made of the departure's identity. Generating
 * the same departure twice gives the same rows, which makes concurrent creation
 * safe: the second writer's inserts simply conflict and do nothing.
 */

import { ALL_PLACES, CabinClass, Place } from "./formation";
import { Direction, Line, stopsFor } from "./network";
import { fareCents } from "./pricing";
import { daysBetween, departureInstant, weekdayOf } from "./time";

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: small, fast and good enough for pretending to be a booking curve. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Agnes", "Anouk", "Aurélien", "Beatriz", "Benedikt", "Bo", "Camille", "Carmen", "Daan", "Dimitra",
  "Elif", "Emil", "Eszter", "Filip", "Freja", "Giulia", "Hana", "Henrik", "Ida", "Inês", "Ivan",
  "Jakob", "Jana", "João", "Kaja", "Klara", "Lars", "Léa", "Leon", "Lucia", "Maja", "Marek", "Marta",
  "Mateo", "Mila", "Nadia", "Niko", "Nora", "Oskar", "Paolo", "Petra", "Rafael", "Rosa", "Sofie",
  "Stefan", "Tereza", "Theo", "Tomás", "Valentina", "Viktor", "Yara", "Zeynep",
];

const LAST = [
  "Almeida", "Andersson", "Bauer", "Bianchi", "Blažević", "Costa", "De Vries", "Dimitrov", "Dubois",
  "Eriksen", "Fernandes", "Fischer", "Gruber", "Horváth", "Janssen", "Jovanović", "Kaya", "Keller",
  "Kovač", "Larsen", "Lefèvre", "Lindqvist", "Marino", "Martínez", "Moreau", "Müller", "Nagy",
  "Nielsen", "Novák", "Öztürk", "Pereira", "Petrov", "Popescu", "Ricci", "Rossi", "Schmidt",
  "Svensson", "Vargas", "Weber", "Zupančič",
];

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export type SyntheticBooking = {
  id: string;
  reference: string;
  accessToken: string;
  fromStation: string;
  toStation: string;
  leadName: string;
  email: string;
  travellers: number;
  breakfast: boolean;
  totalCents: number;
  createdAt: Date;
  places: { placeId: string; priceCents: number }[];
};

const CLASS_APPETITE: Record<CabinClass, number> = {
  suite: 0.56,
  sleeper: 0.68,
  couchette: 0.62,
  seat: 0.46,
};

/** How full a class should look, given how far away the departure is. */
function targetLoad(line: Line, cabinClass: CabinClass, weekday: number, daysOut: number, jitter: number) {
  const weekend = weekday === 5 || weekday === 6 ? 1.14 : 1;
  // Bookings build towards departure, gently at first and then all at once.
  const curve = daysOut < 0 ? 1.28 : Math.max(0.14, 1.1 - Math.pow(Math.min(daysOut, 40) / 40, 0.5));
  return Math.min(0.97, line.demand * CLASS_APPETITE[cabinClass] * weekend * curve * (0.85 + jitter * 0.3));
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function syntheticBookingsFor(
  line: Line,
  direction: Direction,
  serviceDate: string,
  departureId: string,
  today: string,
  now: Date,
): SyntheticBooking[] {
  const random = rng(hash(departureId));
  const stops = stopsFor(line, direction);
  const departs = departureInstant(line, direction, serviceDate).getTime();
  const weekday = weekdayOf(serviceDate);
  const daysOut = daysBetween(today, serviceDate);
  const bookings: SyntheticBooking[] = [];

  (["suite", "sleeper", "couchette", "seat"] as CabinClass[]).forEach((cabinClass) => {
    const places = ALL_PLACES.filter((p) => p.cabinClass === cabinClass);
    const wanted = Math.round(places.length * targetLoad(line, cabinClass, weekday, daysOut, random()));
    const free = shuffled(places, random);
    let sold = 0;

    while (sold < wanted && free.length > 0) {
      const anchor = free.pop()!;
      const party: Place[] = [anchor];
      // Shared-space passengers tend to arrive in pairs and want to sit together.
      if ((cabinClass === "couchette" || cabinClass === "seat") && random() < 0.4) {
        const neighbour = free.findIndex((p) => p.car === anchor.car && p.group === anchor.group);
        if (neighbour !== -1) party.push(free.splice(neighbour, 1)[0]);
      }

      const fullRun = random() < 0.68;
      const a = fullRun ? 0 : Math.floor(random() * (stops.length - 1));
      const b = fullRun ? stops.length - 1 : a + 1 + Math.floor(random() * (stops.length - 1 - a));
      const km = stops[b].km - stops[a].km;

      const price = fareCents({ cabinClass, km, claimed: sold, weekday, daysOut: 14 });
      const first = FIRST[Math.floor(random() * FIRST.length)];
      const last = LAST[Math.floor(random() * LAST.length)];
      const travellers = cabinClass === "suite" || cabinClass === "sleeper" ? (random() < 0.72 ? 2 : 1) : party.length;
      const breakfast = random() < 0.46;

      // Booked between a month and a couple of hours before departure, never in the future.
      const earliest = departs - 30 * 86400000;
      const latest = Math.min(departs - 2 * 3600000, now.getTime());
      const skew = Math.pow(random(), 0.55);
      const createdAt = new Date(earliest + (Math.max(latest, earliest + 1) - earliest) * skew);

      const code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
      const id = `syn-${departureId}-${anchor.id}`;

      bookings.push({
        id,
        reference: `MRW-${code}${(hash(id) % 900) + 100}`,
        accessToken: `syn${hash(id).toString(36)}${hash(`${id}:t`).toString(36)}`,
        fromStation: stops[a].station,
        toStation: stops[b].station,
        leadName: `${first} ${last}`,
        email: `${first}.${last}@example.com`
          .normalize("NFD")
          .replace(/[^\w.@-]/g, "")
          .toLowerCase(),
        travellers,
        breakfast,
        totalCents: price * party.length + (breakfast ? 1400 * travellers : 0),
        createdAt,
        places: party.map((p) => ({ placeId: p.id, priceCents: price })),
      });
      sold += party.length;
    }
  });

  return bookings;
}
