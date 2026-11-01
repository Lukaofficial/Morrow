import { Logo } from "@/components/brand/Logo";
import { TrainShape } from "@/components/art/Train";
import { LINE_BY_ID, STATIONS } from "@/lib/network";
import { pines, ridge, ridgePoints, seeded, stars } from "@/lib/scenery";
import styles from "./Posters.module.css";

/*
  The travel posters, one per line, drawn in code in the manner of a 1930s
  railway print: a handful of flat inks, no outlines, no gradients. A grain
  filter over the top stands in for the tooth of the paper.
*/

const W = 600;
const SCENE_H = 730;

function Bands({ colours, stops }: { colours: string[]; stops: number[] }) {
  return (
    <>
      {colours.map((fill, i) => (
        <rect key={fill + i} x="0" y={stops[i]} width={W} height={(stops[i + 1] ?? SCENE_H) - stops[i]} fill={fill} />
      ))}
    </>
  );
}

function Viaduct({ y, fill, arch = 76, floor = SCENE_H }: { y: number; fill: string; arch?: number; floor?: number }) {
  let path = `M0 ${y}H${W}V${floor}H0Z`;
  for (let x = -14; x < W; x += arch) {
    const inner = arch - 18;
    path += `M${x + 9} ${floor}V${y + inner * 0.6 + 12}a${inner / 2} ${inner / 2} 0 0 1 ${inner} 0V${floor}Z`;
  }
  return <path d={path} fill={fill} fillRule="evenodd" />;
}

function Train({ x, y, scale = 1, cars = 4, fill, lit = "#ffcf4d" }: { x: number; y: number; scale?: number; cars?: number; fill: string; lit?: string }) {
  return (
    <g transform={`translate(${x} ${y - 59.4 * scale}) scale(${scale})`}>
      <TrainShape carriages={cars} fill={fill} windowFill={lit} />
    </g>
  );
}

function Atlantic() {
  const random = seeded(3);
  const horizon = 470;
  return (
    <>
      <Bands colours={["#ff4f23", "#ff6a2d", "#ff8338", "#ffa647", "#ffc65a"]} stops={[0, 190, 280, 350, 410]} />
      <circle cx="240" cy={horizon} r="136" fill="#ffe9a8" />
      <rect x="0" y={horizon} width={W} height={SCENE_H - horizon} fill="#14389a" />
      {Array.from({ length: 13 }, (_, i) => {
        const y = horizon + 8 + i * 15;
        const w = 240 - i * 13 + random() * 44;
        return <rect key={i} x={240 - w / 2 + (random() - 0.5) * 18} y={y} width={w} height="6" fill="#ffcf4d" />;
      })}
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={random() * 540} y={horizon + 20 + random() * 190} width={24 + random() * 60} height="3" fill="#2f5bc4" />
      ))}
      {/* The far headland, then the near one with the lighthouse. */}
      <path d="M0 470V436l40-8 34 14 28 28Z" fill="#7f1f55" />
      <path d="M600 262 512 280l-30 42-52 10-26 62-40 22-22 56-56 26-8 40 334 120Z" fill="#3c1450" />
      <path d="M600 372 548 380l-36 34-46 14-20 48-58 34-22 50-40 28 322 90Z" fill="#0f1130" />
      <g fill="#f6f1e5">
        <rect x="536" y="218" width="20" height="66" />
        <rect x="532" y="212" width="28" height="7" fill="#0f1130" />
        <path d="M538 196h16l4 16h-24z" fill="#ffcf4d" />
        <rect x="536" y="240" width="20" height="14" fill="#ff4f23" />
      </g>
      <Viaduct y={622} fill="#0f1130" arch={72} />
      <Train x={508} y={622} scale={1} cars={5} fill="#0f1130" />
    </>
  );
}

function Peak({ x, y, base, width, fill, snow }: { x: number; y: number; base: number; width: number; fill: string; snow: string }) {
  const h = base - y;
  const capY = y + h * 0.26;
  const leftX = x - (width / 2) * 0.26;
  const rightX = x + (width / 2) * 0.26;
  const step = (rightX - leftX) / 4;
  return (
    <>
      <path d={`M${x - width / 2} ${base}L${x} ${y}L${x + width / 2} ${base}Z`} fill={fill} />
      <path
        d={`M${x} ${y}L${rightX} ${capY}L${rightX - step * 0.7} ${capY - 14}L${x + step * 0.5} ${capY + 12}L${x - step * 0.2} ${capY - 8}L${x - step} ${capY + 14}L${leftX} ${capY}Z`}
        fill={snow}
      />
    </>
  );
}

function Transalpine() {
  return (
    <>
      <Bands colours={["#101352", "#171b57", "#1c2485", "#2333c7", "#3b50de"]} stops={[0, 170, 280, 380, 470]} />
      {stars(12, 60, W, 300).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#f6f1e5" />
      ))}
      <circle cx="432" cy="210" r="94" fill="#f6f1e5" />
      <Peak x={130} y={330} base={640} width={500} fill="#6c81f2" snow="#f6f1e5" />
      <Peak x={510} y={300} base={640} width={520} fill="#5a6fe8" snow="#f6f1e5" />
      <Peak x={306} y={226} base={660} width={620} fill="#8fa2ff" snow="#f6f1e5" />
      <path
        d={ridge({ seed: 5, width: W, base: 520, height: 70, floor: SCENE_H, detail: 6, roughness: 0.62 })}
        fill="#2333c7"
      />
      <path
        d={pines({ seed: 6, width: W, base: 590, floor: SCENE_H, minHeight: 30, maxHeight: 86, spacing: 12 })}
        fill="#171b57"
      />
      <Viaduct y={642} fill="#0f1130" arch={82} />
      <Train x={486} y={642} scale={1} cars={5} fill="#0f1130" />
    </>
  );
}

function Boreal() {
  const horizon = 480;
  const curtain = (seed: number, y0: number, fill: string, length: number, phase: number) =>
    Array.from({ length: 76 }, (_, i) => {
      const x = i * 8;
      const wave = Math.sin(i * 0.11 + phase) * 58 + Math.sin(i * 0.31 + phase * 2) * 22;
      const random = seeded(seed + i);
      return <rect key={i} x={x} y={y0 + wave} width="5" height={length + random() * 70} fill={fill} />;
    });
  return (
    <>
      <rect width={W} height={horizon} fill="#0a0d33" />
      {stars(33, 90, W, 460).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#f6f1e5" />
      ))}
      <g opacity="0.55">{curtain(1, 262, "#2fb6a0", 96, 1.2)}</g>
      <g>{curtain(2, 300, "#97e3cf", 92, 2.4)}</g>
      <g opacity="0.85">{curtain(3, 236, "#ff9d9a", 30, 0.4)}</g>
      <rect y={horizon} width={W} height={SCENE_H - horizon} fill="#0d1547" />
      <g opacity="0.2" transform={`translate(0 ${horizon * 2 + 6}) scale(1 -1)`}>
        {curtain(2, 300, "#97e3cf", 92, 2.4)}
      </g>
      <path d={pines({ seed: 41, width: W, base: horizon, floor: horizon + 6, minHeight: 20, maxHeight: 62, spacing: 8 })} fill="#05072a" />
      <Train x={444} y={horizon} scale={0.86} cars={4} fill="#05072a" />
      {Array.from({ length: 22 }, (_, i) => (
        <rect key={i} x={40 + i * 18} y={horizon + 10 + (i % 3) * 7} width="8" height="3" fill="#ffcf4d" opacity={0.75 - (i % 3) * 0.2} />
      ))}
      {[8, 52, 566, 530].map((x, i) => {
        const random = seeded(50 + i);
        const width = i % 2 === 0 ? 24 : 12;
        return (
          <g key={x}>
            <rect x={x} y="0" width={width} height={SCENE_H} fill="#f6f1e5" />
            {Array.from({ length: 16 }, (_, j) => (
              <rect
                key={j}
                x={x + (random() > 0.5 ? 0 : width * 0.45)}
                y={random() * SCENE_H}
                width={width * (0.3 + random() * 0.25)}
                height={3 + random() * 8}
                fill="#0a0d33"
              />
            ))}
          </g>
        );
      })}
      <rect y="690" width={W} height="40" fill="#05072a" />
    </>
  );
}

function Adriatic() {
  const horizon = 410;
  const houses: [number, number, number, number][] = [
    [0, 520, 74, 120], [58, 556, 70, 90], [118, 586, 66, 70], [176, 610, 62, 70], [230, 640, 72, 60],
    [6, 610, 60, 90], [68, 640, 70, 70], [130, 660, 62, 60], [190, 672, 62, 60], [0, 668, 74, 62], [70, 690, 66, 40],
  ];
  return (
    <>
      <Bands colours={["#97e3cf", "#b4ecd9", "#d2f3df", "#fff0bd"]} stops={[0, 170, 270, 350]} />
      <circle cx="430" cy="154" r="74" fill="#ffcf4d" />
      <path d={ridge({ seed: 15, width: W, base: 322, height: 140, floor: 560, detail: 6, roughness: 0.58, envelope: (t) => Math.max(0.1, 1.3 - t * 1.25) })} fill="#c9c3e6" />
      <path d={ridge({ seed: 16, width: W, base: 380, height: 110, floor: 560, detail: 6, roughness: 0.55, envelope: (t) => Math.max(0.05, 1.1 - t * 1.25) })} fill="#8d86c4" />
      <Bands colours={["#2fa8dc", "#1d7fd1", "#2333c7", "#171b57"]} stops={[horizon, 470, 540, 650]} />
      <path d="M400 410c20-14 44-20 74-20s60 8 86 20Z" fill="#8d86c4" />
      <path d="M500 410c12-8 26-11 44-11s38 4 56 11Z" fill="#c9c3e6" />
      <Train x={300} y={horizon + 2} scale={0.56} cars={4} fill="#0f1130" />
      {/* A boat, for scale and because you'd want to be on it. */}
      <path d="M420 560l44-110v110Z" fill="#f6f1e5" />
      <path d="M470 560l34-76v76Z" fill="#ff4f23" />
      <path d="M408 568h112l-16 22h-80Z" fill="#0f1130" />
      {/* Bell tower */}
      <g>
        <rect x="150" y="360" width="52" height="280" fill="#f6f1e5" />
        <path d="M144 362h64l-32-62Z" fill="#ff4f23" />
        {[396, 448].map((y) => (
          <path key={y} d={`M166 ${y + 34}v-22a10 10 0 0 1 20 0v22Z`} fill="#0f1130" />
        ))}
        <rect x="150" y="490" width="52" height="4" fill="#d8d0bd" />
      </g>
      {houses.map(([x, y, w, h]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={w} height={h} fill={x % 4 === 0 ? "#f6f1e5" : "#ebe2cd"} />
          <path d={`M${x - 5} ${y}h${w + 10}l-${(w + 10) / 2} -${w * 0.32}Z`} fill={x % 3 === 0 ? "#d9401e" : "#ff4f23"} />
          <rect x={x + w * 0.3} y={y + h * 0.26} width={w * 0.14} height={h * 0.26} fill="#0f1130" />
          <rect x={x + w * 0.62} y={y + h * 0.26} width={w * 0.14} height={h * 0.26} fill="#0f1130" />
        </g>
      ))}
      {[276, 300].map((x, i) => (
        <path key={x} d={`M${x} 650c-14-40-8-92 8-${130 - i * 30}c16 ${38 - i * 10} 22 90 8 ${130 - i * 30}Z`} fill="#0d4a44" />
      ))}
      <rect y="700" width={W} height="30" fill="#0f1130" />
    </>
  );
}

function Tyrrhenian() {
  const random = seeded(9);
  const puffs: [number, number, number][] = [
    [300, 188, 26], [326, 160, 34], [364, 132, 42], [414, 112, 50], [474, 96, 56], [540, 92, 64], [610, 84, 72],
  ];
  return (
    <>
      <Bands colours={["#ff9d9a", "#ffae9c", "#ffc2a0", "#ffd9a8", "#ffedc0"]} stops={[0, 140, 240, 330, 400]} />
      {puffs.map(([x, y, r]) => (
        <circle key={x} cx={x} cy={y} r={r} fill="#f6f1e5" />
      ))}
      {puffs.slice(2).map(([x, y, r]) => (
        <circle key={x} cx={x + r * 0.22} cy={y + r * 0.34} r={r * 0.72} fill="#f3d9c7" />
      ))}
      <path d="M-40 500 262 210h74L640 500Z" fill="#5a1a4f" />
      <path d="M262 210 300 232l36-22 42 40-24 22-30-14-22 34-22-36-34 20-26-22Z" fill="#7f1f55" />
      <path d="M296 214c-4 30 8 40 2 66s-14 40-6 74" fill="none" stroke="#ff4f23" strokeWidth="5" />
      <rect y="480" width={W} height="60" fill="#2333c7" />
      <path d={pines({ seed: 66, width: W, base: 500, floor: 512, minHeight: 6, maxHeight: 16, spacing: 16 })} fill="#3c1450" />
      <Bands colours={["#1d7fd1", "#2333c7", "#171b57"]} stops={[512, 572, 660]} />
      {Array.from({ length: 22 }, (_, i) => (
        <rect key={i} x={random() * 560} y={522 + random() * 180} width={22 + random() * 56} height="3" fill="#97e3cf" opacity="0.6" />
      ))}
      {/* The ferry, with the train on board. */}
      <g>
        <path d="M44 620H566L534 680H74Z" fill="#0f1130" />
        <rect x="44" y="620" width="522" height="10" fill="#ff4f23" />
        <rect x="430" y="540" width="110" height="80" fill="#f6f1e5" />
        <rect x="444" y="500" width="72" height="42" fill="#f6f1e5" />
        <rect x="450" y="508" width="60" height="12" fill="#0f1130" />
        <rect x="486" y="462" width="28" height="40" fill="#ff4f23" />
        <rect x="486" y="462" width="28" height="9" fill="#0f1130" />
        {[446, 472, 498].map((x) => (
          <circle key={x} cx={x + 8} cy="580" r="8" fill="#0f1130" />
        ))}
        <Train x={344} y={620} scale={0.9} cars={2} fill="#0f1130" />
      </g>
      <rect x="86" y="680" width="430" height="4" fill="#f6f1e5" />
      <rect x="20" y="694" width="330" height="4" fill="#f6f1e5" />
      <rect x="360" y="706" width="200" height="4" fill="#f6f1e5" />
    </>
  );
}

function Mosque({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  const dome = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 0 1 ${2 * r} 0Z`;
  const minaret = (mx: number, h: number) =>
    `M${mx - 5} 0V${-h}L${mx} ${-h - 34}L${mx + 5} ${-h}V0ZM${mx - 8} ${-h * 0.7}h16v5h-16Z`;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <rect x="-120" y="-80" width="240" height="80" />
      <path d={dome(0, -80, 86)} />
      <rect x="-3" y="-188" width="6" height="26" />
      <path d={dome(-104, -80, 40)} />
      <path d={dome(104, -80, 40)} />
      <path d={dome(-58, -80, 30)} />
      <path d={dome(58, -80, 30)} />
      <path d={minaret(-150, 190)} />
      <path d={minaret(150, 190)} />
      <path d={minaret(-190, 150)} />
      <path d={minaret(190, 150)} />
      <rect x="-200" y="-34" width="400" height="34" />
    </g>
  );
}

function Danubian() {
  const random = seeded(21);
  const horizon = 500;
  return (
    <>
      <Bands colours={["#ffcf4d", "#ffd96d", "#ffe28a", "#ffeab0"]} stops={[0, 180, 300, 400]} />
      <circle cx="300" cy="316" r="170" fill="#ff4f23" />
      {[[70, 120], [120, 150], [480, 90], [530, 130], [440, 150]].map(([x, y]) => (
        <path key={x} d={`M${x} ${y}q9-10 16 0q7-10 16 0`} fill="none" stroke="#0f1130" strokeWidth="2.6" />
      ))}
      <Mosque x={120} y={horizon} s={0.62} fill="#b52a52" />
      <Mosque x={480} y={horizon} s={0.5} fill="#b52a52" />
      <Mosque x={300} y={horizon} s={1} fill="#5a1a4f" />
      <path
        d={`M0 ${horizon}${ridgePoints({ seed: 88, width: W, base: horizon - 14, height: 26, floor: horizon, detail: 5 })
          .map(([x, y]) => `L${x} ${y}`)
          .join("")}L${W} ${horizon}Z`}
        fill="#3c1450"
      />
      <Bands colours={["#1a8c8c", "#126a78", "#0d4a5e", "#0f1130"]} stops={[horizon, 548, 600, 676]} />
      {Array.from({ length: 11 }, (_, i) => {
        const w = 150 - i * 11 + random() * 30;
        return <rect key={i} x={300 - w / 2} y={horizon + 6 + i * 13} width={w} height="5" fill="#ff7a45" />;
      })}
      {/* A Bosphorus ferry going about its business. */}
      <g transform="translate(70 548)">
        <path d="M0 18H128L116 38H12Z" fill="#f6f1e5" />
        <rect x="18" y="4" width="84" height="14" fill="#f6f1e5" />
        <rect x="58" y="-14" width="14" height="18" fill="#0f1130" />
        <rect x="58" y="-14" width="14" height="5" fill="#ff4f23" />
        <rect x="0" y="30" width="118" height="8" fill="#0f1130" />
      </g>
      <Train x={574} y={676} scale={1} cars={5} fill="#f6f1e5" lit="#0f1130" />
    </>
  );
}

const SCENES: Record<string, { scene: () => React.ReactNode; ink: string; title: string; strip: string; stripInk: string }> = {
  atlantic: { scene: Atlantic, ink: "#0f1130", title: "Atlantic", strip: "#0f1130", stripInk: "#ffcf4d" },
  transalpine: { scene: Transalpine, ink: "#f6f1e5", title: "Transalpine", strip: "#0f1130", stripInk: "#f6f1e5" },
  boreal: { scene: Boreal, ink: "#ffcf4d", title: "Boreal", strip: "#05072a", stripInk: "#97e3cf" },
  adriatic: { scene: Adriatic, ink: "#0f1130", title: "Adriatic", strip: "#0f1130", stripInk: "#97e3cf" },
  tyrrhenian: { scene: Tyrrhenian, ink: "#5a1a4f", title: "Tyrrhenian", strip: "#0f1130", stripInk: "#ff9d9a" },
  danubian: { scene: Danubian, ink: "#5a1a4f", title: "Danubian", strip: "#0f1130", stripInk: "#ffcf4d" },
};

/** Sized to fill the sheet, the way a poster artist would letter it to the margins. */
function titleSize(title: string) {
  return Math.min(214, (W - 56) / (title.length * 0.43));
}

export function Poster({ lineId, className }: { lineId: string; className?: string }) {
  const config = SCENES[lineId];
  const line = LINE_BY_ID[lineId];
  const first = STATIONS[line.stops[0].station].city;
  const last = STATIONS[line.stops[line.stops.length - 1].station].city;
  const size = titleSize(config.title);
  const Scene = config.scene;
  return (
    <svg className={className} viewBox="0 0 600 840" role="img" aria-label={`Travel poster for ${line.name}, ${first} to ${last}`}>
      <defs>
        <filter id={`grain-${lineId}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.05" />
        </filter>
        <clipPath id={`sheet-${lineId}`}>
          <rect width="600" height="840" />
        </clipPath>
      </defs>
      <g clipPath={`url(#sheet-${lineId})`}>
        <Scene />
        <text
          x="28"
          y={size * 0.78 + 26}
          className={styles.title}
          fontSize={size}
          fill={config.ink}
          textLength={W - 56}
          lengthAdjust="spacingAndGlyphs"
        >
          {config.title}
        </text>
        <rect y={SCENE_H} width="600" height={840 - SCENE_H} fill={config.strip} />
        <text x="28" y={SCENE_H + 62} className={styles.route} fill={config.stripInk}>
          {first} — {last}
        </text>
        <svg x="28" y={SCENE_H + 76} width="128" height="20" color={config.stripInk}>
          <Logo />
        </svg>
        <text x="572" y={SCENE_H + 91} textAnchor="end" className={styles.small} fill={config.stripInk}>
          Sleeper trains of Europe
        </text>
        <rect width="600" height="840" filter={`url(#grain-${lineId})`} opacity="0.11" className={styles.grain} />
      </g>
    </svg>
  );
}
