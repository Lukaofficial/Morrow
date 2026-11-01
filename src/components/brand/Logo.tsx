/**
 * The wordmark is drawn, not set. The first O is the moon you leave under and
 * the second is the sun you arrive to, which is the whole business in six letters.
 */

export function Logo({ className, title = "Morrow" }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 100" fill="currentColor" role="img" aria-label={title}>
      {/* M */}
      <path d="M0 100V0h24l26 50L76 0h24v100H76V46L54 88h-8L24 46v54z" />
      {/* Moon */}
      <circle cx="160" cy="50" r="45.5" fill="none" stroke="currentColor" strokeWidth="9" />
      <path transform="translate(160 50)" d="M18-46.6A50 50 0 1 0 18 46.6 51.2 51.2 0 0 1 18-46.6Z" />
      {/* R */}
      <path
        fillRule="evenodd"
        d="M218 0h48c20 0 34 13 34 31 0 15-9 26-22 29l26 40h-27l-23-38h-12v38h-24zm24 20v24h22c8 0 13-5 13-12s-5-12-13-12z"
      />
      {/* R */}
      <path
        fillRule="evenodd"
        d="M310 0h48c20 0 34 13 34 31 0 15-9 26-22 29l26 40h-27l-23-38h-12v38h-24zm24 20v24h22c8 0 13-5 13-12s-5-12-13-12z"
      />
      {/* Sun */}
      <circle cx="452" cy="50" r="50" fill="var(--logo-sun, currentColor)" />
      {/* W */}
      <path d="M508 0h25l13 62 18-62h19l18 62 13-62h25l-26 100h-23l-16-58-16 58h-24z" />
    </svg>
  );
}
