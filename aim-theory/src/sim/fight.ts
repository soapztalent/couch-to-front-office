/** How long a holder needs after you expose yourself. Fast, wide swings cost them a flick. */
export const FIGHT = {
  fastSpeed: 1.45,
  slowSpeed: 0.85,
  advantageFast: 0.12,
  advantageMid: 0.05,
  advantageSlow: 0.015,
  reaction: 0.18,
  flickDegPerSec: 85,
  killAngle: 2.3,
};

export function advantageSeconds(entrySpeed: number): number {
  if (entrySpeed >= FIGHT.fastSpeed) return FIGHT.advantageFast;
  if (entrySpeed <= FIGHT.slowSpeed) return FIGHT.advantageSlow;
  return FIGHT.advantageMid;
}

export type Fight = {
  exposedFor: number;
  entrySpeed: number;
  aimError: number;
  winner: "none" | "peeker" | "holder";
  armed: boolean;
};

export function freshFight(): Fight {
  return { exposedFor: 0, entrySpeed: 0, aimError: 0, winner: "none", armed: false };
}

export function stepFight(
  f: Fight,
  o: {
    dt: number;
    exposed: boolean;
    speed: number;
    /** Degrees between the holder's pre-aim and the peeker right now. */
    offsetDeg: number;
    shotHit: boolean;
  },
): Fight {
  if (f.winner !== "none") return f;
  if (!o.exposed) return freshFight();
  const entry = f.armed ? f.entrySpeed : Math.max(0, o.speed);
  const exposedFor = f.exposedFor + o.dt;
  const ready = advantageSeconds(entry) + FIGHT.reaction;
  const flicked = Math.max(0, exposedFor - ready) * FIGHT.flickDegPerSec;
  const aimError = Math.max(0, o.offsetDeg - flicked);
  let winner: Fight["winner"] = "none";
  if (o.shotHit) winner = "peeker";
  else if (aimError <= FIGHT.killAngle && exposedFor >= ready) winner = "holder";
  return { exposedFor, entrySpeed: entry, aimError, winner, armed: true };
}

/** Head hit size, in degrees, shrinks while you are still sliding. */
export function headRadiusDeg(dist: number, speed: number, maxSpeed: number): number {
  const base = (Math.atan(0.2 / Math.max(0.45, dist)) * 180) / Math.PI;
  const t = Math.max(0, Math.min(1, speed / maxSpeed));
  return base * (1 - t * 0.82);
}
