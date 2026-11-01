import { TrainShape } from "@/components/art/Train";
import { pines, ridge } from "@/lib/scenery";
import styles from "./SunsetScene.module.css";

const W = 1800;
const H = 620;
const DECK = 500;
const TRAIN_SCALE = 1.5;

const FAR = ridge({
  seed: 11,
  width: W,
  base: 330,
  height: 240,
  floor: H,
  detail: 7,
  roughness: 0.56,
  envelope: (t) => 0.55 + 0.7 * Math.sin(t * Math.PI),
});

const MID = ridge({ seed: 42, width: W, base: 400, height: 120, floor: H, detail: 6, roughness: 0.5 });

const TREES = pines({ seed: 8, width: W, base: 480, floor: H, minHeight: 22, maxHeight: 62, spacing: 20 });

function Viaduct() {
  const span = 124;
  let path = `M0 ${DECK}H${W}V${H}H0Z`;
  for (let x = -20; x < W; x += span) {
    path += `M${x + 18} ${H}V${DECK + 62}a44 44 0 0 1 88 0V${H}Z`;
  }
  return <path d={path} fill="#0f1130" fillRule="evenodd" />;
}

/** The sun goes down behind the Alps. It does this on every page load. */
export function SunsetScene({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <circle className={styles.sun} cx="1270" cy="300" r="210" fill="#ffe08a" />
      <path d={FAR} fill="#d9304f" />
      <path d={MID} fill="#7f1f55" />
      <path d={TREES} fill="#3c1450" />
      <Viaduct />
      <g className={styles.train}>
        <g transform={`translate(1420 ${DECK - 59.4 * TRAIN_SCALE}) scale(${TRAIN_SCALE})`}>
          <TrainShape carriages={8} fill="#0f1130" />
        </g>
      </g>
    </svg>
  );
}
