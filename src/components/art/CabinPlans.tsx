import { CabinClass } from "@/lib/formation";
import styles from "./CabinPlans.module.css";

/*
  Floor plans in the manner of a carriage builder's general arrangement: walls
  heavy, furniture light, a dimension or two to show someone measured.
*/

function Dimension({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g className={styles.dim}>
      <path d={`M${x1} ${y}H${x2}M${x1} ${y - 7}v14M${x2} ${y - 7}v14`} />
      <rect x={(x1 + x2) / 2 - 30} y={y - 12} width="60" height="24" className={styles.dimGap} />
      <text x={(x1 + x2) / 2} y={y + 6} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function Window({ x, width, y }: { x: number; width: number; y: number }) {
  return (
    <g className={styles.window}>
      <rect x={x} y={y - 5} width={width} height="10" />
      <path d={`M${x} ${y}H${x + width}`} />
    </g>
  );
}

function Door({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const dir = flip ? -1 : 1;
  return (
    <path
      className={styles.door}
      d={`M${x} ${y}v${-52}M${x} ${y - 52}A52 52 0 0 ${flip ? 0 : 1} ${x + dir * 52} ${y}`}
    />
  );
}

function Bed({ x, y, w, h, pillow = "left" }: { x: number; y: number; w: number; h: number; pillow?: "left" | "right" }) {
  const px = pillow === "left" ? x + 8 : x + w - 8 - h * 0.46;
  return (
    <g className={styles.furniture}>
      <rect x={x} y={y} width={w} height={h} />
      <rect x={px} y={y + 7} width={h * 0.46} height={h - 14} rx="5" />
      <path d={pillow === "left" ? `M${x + w * 0.56} ${y}V${y + h}` : `M${x + w * 0.44} ${y}V${y + h}`} />
    </g>
  );
}

function Suite() {
  return (
    <>
      <path className={styles.wall} d="M30 34H550V206H30Z" />
      <Window x={110} width={360} y={34} />
      <Bed x={46} y={52} w={214} h={140} />
      <g className={styles.furniture}>
        <rect x={420} y={120} width="114" height="72" />
        <path d="M420 120l114 72M534 120l-114 72" className={styles.hatch} />
        <circle cx="477" cy="156" r="6" />
        <rect x={294} y={52} width="60" height="60" rx="12" />
        <rect x={304} y={62} width="40" height="40" rx="8" />
        <circle cx="476" cy="74" r="22" />
      </g>
      <Door x={400} y={206} />
      <Dimension x1={30} x2={550} y={228} label="3.40 m" />
    </>
  );
}

function Sleeper() {
  return (
    <>
      <path className={styles.wall} d="M120 34H460V206H120Z" />
      <Window x={190} width={200} y={34} />
      <Bed x={136} y={52} w={230} h={68} />
      <rect x={136} y={52} width="230" height="68" className={styles.upper} transform="translate(7 7)" />
      <g className={styles.furniture}>
        <circle cx="414" cy="82" r="24" />
        <circle cx="414" cy="82" r="14" />
        <rect x={136} y={148} width="94" height="42" />
      </g>
      <Door x={400} y={206} />
      <Dimension x1={120} x2={460} y={228} label="2.20 m" />
    </>
  );
}

function Couchette() {
  return (
    <>
      <path className={styles.wall} d="M150 34H430V206H150Z" />
      <Window x={210} width={160} y={34} />
      <Bed x={166} y={52} w={78} h={120} />
      <Bed x={336} y={52} w={78} h={120} />
      <rect x={166} y={52} width="78" height="120" className={styles.upper} transform="translate(5 6)" />
      <rect x={336} y={52} width="78" height="120" className={styles.upper} transform="translate(-5 6)" />
      <g className={styles.furniture}>
        <rect x={272} y={52} width="36" height="36" />
      </g>
      <path className={styles.curtain} d="M166 186q14-9 28 0t28 0 28 0 28 0 28 0 28 0 28 0 28 0 28 0" />
      <Dimension x1={150} x2={430} y={228} label="1.80 m" />
    </>
  );
}

function Recliner() {
  const seat = (x: number, y: number) => (
    <g key={`${x}-${y}`} className={styles.furniture}>
      <rect x={x} y={y} width="66" height="56" rx="10" />
      <rect x={x + 6} y={y + 7} width="16" height="42" rx="6" />
      <path d={`M${x + 66} ${y + 10}h26M${x + 66} ${y + 46}h26`} />
      <rect x={x + 92} y={y + 8} width="10" height="40" rx="4" />
    </g>
  );
  return (
    <>
      <path className={styles.wall} d="M60 34H520V206H60Z" />
      <Window x={90} width={120} y={34} />
      <Window x={250} width={120} y={34} />
      <Window x={410} width={90} y={34} />
      {[80, 230, 380].map((x) => seat(x, 48))}
      {[80, 230, 380].map((x) => seat(x, 142))}
      <path className={styles.curtain} d="M70 124H510" strokeDasharray="4 8" />
      <Dimension x1={60} x2={520} y={228} label="4.20 m" />
    </>
  );
}

const PLANS: Record<CabinClass, () => React.ReactNode> = {
  suite: Suite,
  sleeper: Sleeper,
  couchette: Couchette,
  seat: Recliner,
};

export function CabinPlan({ cabinClass, className }: { cabinClass: CabinClass; className?: string }) {
  const Plan = PLANS[cabinClass];
  return (
    <svg className={`${styles.plan} ${className ?? ""}`} viewBox="0 0 580 244" role="img" aria-label={`Floor plan of a ${cabinClass}`}>
      <Plan />
    </svg>
  );
}
