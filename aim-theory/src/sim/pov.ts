import { lineOfSight, yawTo, type Camera, type Seg, type V2 } from "./geom";
import type { Actor } from "./lane";
import { EDGE_WALL, ENEMY_CLOSE, HOLD_BOT_START, HOLD_PLAYER, LANE } from "./world";

/** How long each point of view plays before the next one. */
export const POV_SECONDS = 4.4;

export type PovId = "edge-peeker" | "edge-holder" | "swing-you" | "swing-them";

export type PovSample = {
  camera: Camera;
  actors: Actor[];
  pip: V2 | null;
  walls: Seg[];
};

const WALLS: Seg[] = [EDGE_WALL];
/** Where a holder is actually aiming: the edge, not the wide lane. */
const ANGLE: V2 = { x: 0.02, z: 0.25 };

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function burst(t: number, start: number, dur: number): number {
  const u = clamp01((t - start) / dur);
  return 1 - (1 - u) ** 3;
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function aim(from: V2, to: V2, y = LANE.head): { yaw: number; pitch: number } {
  const dist = Math.hypot(to.x - from.x, to.z - from.z) || 1;
  return {
    yaw: yawTo(from, to),
    pitch: Math.atan2(y - LANE.eye, dist),
  };
}

function cam(at: V2, look: { yaw: number; pitch: number }): Camera {
  return { x: at.x, y: LANE.eye, z: at.z, yaw: look.yaw, pitch: look.pitch };
}

/**
 * First-person playback in the same corner the drill uses.
 * Peeker shots move and look at the holder. Holder shots stay on the angle while the swing arrives wide.
 */
export function samplePov(id: PovId, t: number): PovSample {
  if (id === "edge-peeker" || id === "swing-you") {
    const wide = id === "edge-peeker" ? 1.7 : 1.35;
    const x = lerp(LANE.startX, wide, burst(t, id === "edge-peeker" ? 0.45 : 0.85, id === "edge-peeker" ? 0.62 : 0.8));
    const at = { x, z: LANE.playerZ };
    return {
      camera: cam(at, aim(at, ENEMY_CLOSE)),
      actors: [{ ...ENEMY_CLOSE, alive: true, role: "near" }],
      pip: id === "swing-you" ? ENEMY_CLOSE : null,
      walls: WALLS,
    };
  }
  const at = HOLD_PLAYER;
  const botX = lerp(HOLD_BOT_START, id === "edge-holder" ? 1.5 : 1.35, burst(t, 0.7, 0.5));
  return {
    camera: cam(at, aim(at, ANGLE)),
    actors: [{ x: botX, z: LANE.playerZ, alive: true, role: "hold" }],
    pip: null,
    walls: WALLS,
  };
}

export function povLos(sample: PovSample): { seen: boolean; offDeg: number } {
  const actor = sample.actors[0];
  const from = { x: sample.camera.x, z: sample.camera.z };
  const seen = actor ? lineOfSight(from, actor, sample.walls) : false;
  if (!actor) return { seen: false, offDeg: 0 };
  let d = Math.abs(sample.camera.yaw - yawTo(from, actor)) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return { seen, offDeg: (d * 180) / Math.PI };
}
