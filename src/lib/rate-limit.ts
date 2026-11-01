/**
 * A fixed-window limiter held in memory. One app instance gets one set of
 * counters, which is the right amount of machinery for a single-node deployment.
 * Running several instances would mean moving this to the database or Redis.
 */

type Window = { count: number; resetsAt: number };

const windows = new Map<string, Window>();
let lastSweep = 0;

export function allow(key: string, limit: number, windowMs = 60000, now = Date.now()): boolean {
  if (now - lastSweep > windowMs) {
    for (const [k, w] of windows) if (w.resetsAt <= now) windows.delete(k);
    lastSweep = now;
  }
  const current = windows.get(key);
  if (!current || current.resetsAt <= now) {
    windows.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}
