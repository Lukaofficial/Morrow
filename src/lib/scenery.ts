/**
 * Landscape generators for the illustrations. Seeded, so the server and the
 * browser draw the same hills and a given poster never changes between visits.
 */

export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

type RidgeOptions = {
  seed: number;
  width: number;
  /** The y coordinate the ridge wanders around. */
  base: number;
  /** How far it wanders. */
  height: number;
  /** Bottom edge of the filled shape. */
  floor: number;
  /** Doublings of detail. 5 is rolling, 8 is jagged. */
  detail?: number;
  /** 0.5 is smooth, 0.7 is craggy. */
  roughness?: number;
  /** Multiplies height along the ridge, for massing peaks where you want them. */
  envelope?: (t: number) => number;
  /** Raises the whole ridge by this much at t, for a range that has to appear on cue. */
  lift?: (t: number) => number;
};

/** Midpoint displacement: returns points along a ridgeline. */
export function ridgePoints({ seed, width, base, height, detail = 6, roughness = 0.55, envelope, lift }: RidgeOptions) {
  const random = seeded(seed);
  const count = 2 ** detail;
  const values = new Array<number>(count + 1).fill(0);
  values[0] = random() - 0.5;
  values[count] = random() - 0.5;
  let step = count;
  let scale = 1;
  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < count; i += step) {
      values[i] = (values[i - half] + values[i + half]) / 2 + (random() - 0.5) * scale;
    }
    step = half;
    scale *= roughness;
  }
  return values.map((value, i) => {
    const t = i / count;
    return [round(t * width), round(base - value * height * (envelope ? envelope(t) : 1) - (lift ? lift(t) : 0))] as const;
  });
}

/** A filled ridge shape as an SVG path. */
export function ridge(options: RidgeOptions): string {
  const points = ridgePoints(options);
  const line = points.map(([x, y]) => `${x} ${y}`).join("L");
  return `M0 ${options.floor}L${line}L${options.width} ${options.floor}Z`;
}

/**
 * A mountain range, peak by peak, each with its own snowcap. Random noise alone
 * gives you hills; poster Alps need sharp triangles arranged on purpose.
 */
export function alps(options: {
  seed: number;
  width: number;
  base: number;
  floor: number;
  from: number;
  to: number;
  peaks: number;
  maxHeight: number;
}) {
  const random = seeded(options.seed);
  const { width, base, floor, from, to, peaks, maxHeight } = options;
  const span = to - from;
  const bump = (x: number) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (x - from) / span))), 0.7);

  const tops = Array.from({ length: peaks }, (_, i) => {
    const x = from + ((i + 0.5 + (random() - 0.5) * 0.5) / peaks) * span;
    const h = maxHeight * bump(x) * (0.62 + random() * 0.38);
    return { x, y: base - h };
  });

  let ridgeLine = `M0 ${floor}L0 ${base}L${round(from)} ${base}`;
  const snow: string[] = [];

  tops.forEach((top, i) => {
    const next = tops[i + 1];
    const prevX = i === 0 ? from : (tops[i - 1].x + top.x) / 2;
    const nextX = next ? (top.x + next.x) / 2 : to;
    const prevY = i === 0 ? base : base - (base - Math.max(tops[i - 1].y, top.y)) * 0.48;
    const nextY = next ? base - (base - Math.max(top.y, next.y)) * 0.48 : base;

    const along = (fromX: number, fromY: number, f: number) => [top.x + (fromX - top.x) * f, top.y + (fromY - top.y) * f] as const;
    const [lx, ly] = along(prevX, prevY, 0.3);
    const [rx, ry] = along(nextX, nextY, 0.3);
    const [lmx, lmy] = along(prevX, prevY, 0.62);
    const [rmx, rmy] = along(nextX, nextY, 0.62);
    const jitter = () => (random() - 0.5) * 18;

    ridgeLine += `L${round(lmx + jitter())} ${round(lmy + jitter())}L${round(lx)} ${round(ly)}L${round(top.x)} ${round(top.y)}L${round(rx)} ${round(ry)}L${round(rmx + jitter())} ${round(rmy + jitter())}L${round(nextX)} ${round(nextY)}`;

    if (base - top.y > maxHeight * 0.34) {
      const teeth = 3;
      const depth = (ly + ry) / 2 - top.y;
      let cap = `M${round(top.x)} ${round(top.y)}L${round(rx)} ${round(ry)}`;
      for (let t = 1; t < teeth * 2; t++) {
        const f = t / (teeth * 2);
        const x = rx + (lx - rx) * f;
        const y = ry + (ly - ry) * f + depth * (t % 2 === 1 ? -0.32 : 0.1) * (0.8 + random() * 0.4);
        cap += `L${round(x)} ${round(y)}`;
      }
      snow.push(`${cap}L${round(lx)} ${round(ly)}Z`);
    }
  });

  return { ridge: `${ridgeLine}L${width} ${base}L${width} ${floor}Z`, snow: snow.join("") };
}

/** A row of conifers along a line, as one path. */
export function pines(options: {
  seed: number;
  width: number;
  base: number;
  floor: number;
  minHeight: number;
  maxHeight: number;
  spacing: number;
}): string {
  const random = seeded(options.seed);
  const { width, base, floor, minHeight, maxHeight, spacing } = options;
  let path = `M0 ${floor}L0 ${base}`;
  let x = 0;
  while (x < width) {
    const h = minHeight + random() * (maxHeight - minHeight);
    const w = h * (0.28 + random() * 0.1);
    const y = base + (random() - 0.5) * 8;
    path += `L${round(x)} ${round(y)}L${round(x + w / 2)} ${round(y - h)}L${round(x + w)} ${round(y)}`;
    x += w * 0.7 + random() * spacing;
  }
  return `${path}L${width} ${base}L${width} ${floor}Z`;
}

/** Scattered stars as [x, y, radius] triples. */
export function stars(seed: number, count: number, width: number, height: number) {
  const random = seeded(seed);
  return Array.from({ length: count }, () => {
    const big = random() > 0.88;
    return [round(random() * width), round(random() * random() * height), big ? 1.8 : 0.5 + random() * 0.7] as const;
  });
}
