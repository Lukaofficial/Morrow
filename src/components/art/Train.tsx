/**
 * The Morrow train in profile: a blunt electric loco and a run of carriages.
 * Length is in units of 100 per carriage, and everything is one colour with
 * windows knocked out in a second. Fill comes from CSS so scenes can recolour it.
 */

type TrainProps = {
  carriages?: number;
  fill?: string;
  windowFill?: string;
  /** Marks each window so a scene can switch lights on and off. */
  windowClass?: string;
  className?: string;
};

export const CAR_LENGTH = 116;
export const LOCO_LENGTH = 86;

export function trainLength(carriages: number) {
  return LOCO_LENGTH + carriages * CAR_LENGTH;
}

export function TrainShape({
  carriages = 4,
  fill = "currentColor",
  windowFill = "#ffcf4d",
  windowClass,
}: Omit<TrainProps, "className">) {
  return (
    <g>
      {/* Pantograph */}
      <path d="M14 16l14-9-8-6M12 1h16" fill="none" stroke={fill} strokeWidth="1.8" />
      {/* Locomotive */}
      <path
        fill={fill}
        d="M6 16h62q6 0 10 5l6 9q2 3 2 6v12q0 4-4 4H4q-4 0-4-4V22q0-6 6-6z"
      />
      <path d="M60 22h8q3 0 5 3l5 7H60z" fill={windowFill} className={windowClass} />
      <rect x="8" y="24" width="6" height="16" fill={windowFill} className={windowClass} opacity=".35" />
      {Array.from({ length: carriages }, (_, i) => {
        const x = -(i + 1) * CAR_LENGTH;
        return (
          <g key={i} transform={`translate(${x} 0)`}>
            <path fill={fill} d="M4 18q0-4 4-4h100q4 0 4 4v30q0 4-4 4H8q-4 0-4-4z" />
            {[0, 1, 2, 3, 4, 5].map((w) => (
              <rect
                key={w}
                x={12 + w * 15.4}
                y="22"
                width="10"
                height="11"
                fill={windowFill}
                className={windowClass}
                data-window={`${i}-${w}`}
              />
            ))}
            {/* Coupling */}
            <rect x="112" y="38" width="4" height="6" fill={fill} />
            {/* Bogies */}
            <circle cx="22" cy="55" r="4.4" fill={fill} />
            <circle cx="34" cy="55" r="4.4" fill={fill} />
            <circle cx="82" cy="55" r="4.4" fill={fill} />
            <circle cx="94" cy="55" r="4.4" fill={fill} />
          </g>
        );
      })}
      <circle cx="18" cy="55" r="4.4" fill={fill} />
      <circle cx="30" cy="55" r="4.4" fill={fill} />
      <circle cx="58" cy="55" r="4.4" fill={fill} />
      <circle cx="70" cy="55" r="4.4" fill={fill} />
    </g>
  );
}
