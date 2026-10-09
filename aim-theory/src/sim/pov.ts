import { lineOfSight, yawTo, type Camera, type Seg, type V2 } from "./geom";
import type { Actor } from "./lane";
import { EDGE_WALL, ENEMY_CLOSE, FAR_ENEMY, FAR_WALL, HOLD_PLAYER, LANE, NEAR_ENEMY } from "./world";

/**
 * First-person shots. Time is seconds from the start of the shot and keeps
 * moving for as long as the line is spoken. Nothing settles into a held pose.
 */
export type PovId =
  | "edge-slow"
  | "edge-slow-hold"
  | "edge-wide"
  | "edge-hold"
  | "swing-bad"
  | "swing-you"
  | "swing-hold"
  | "choice-wide"
  | "choice-jiggle"
  | "isolate-both"
  | "isolate-one";

export type PovSample = {
  camera: Camera;
  actors: Actor[];
  pip: V2 | null;
  walls: Seg[];
};

const WALLS: Seg[] = [EDGE_WALL];
const BOTH_WALLS: Seg[] = [EDGE_WALL, FAR_WALL];
/** Holder crosshair: the edge itself, not the player who has already swung wide. */
const ANGLE: V2 = { x: 0.02, z: 0.25 };
/** The pixel a slow peek walks onto. */
const SLOW_PIXEL: V2 = { x: 0.42, z: LANE.playerZ };
const WIDE = 1.62;

export type ClipLineIn = { id: string; text: string };
export type ClipShotIn = { id: PovId; tag: string; lines: ClipLineIn[] };

export type TimedLine = {
  lineId: string;
  text: string;
  t0: number;
  t1: number;
  pov: PovId;
  tag: string;
  shotT0: number;
};

export type TimedClip = { lines: TimedLine[]; total: number };
export type ClipHit = TimedLine & { local: number };

/** Spoken pace for the picture. The clip does not wait on the synth. */
export function linePlaySeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.8, words / 2.35 + 0.45);
}

/** One timeline. Lines on the same shot share a clock so the camera does not pop. */
export function timeClip(shots: ClipShotIn[]): TimedClip {
  const lines: TimedLine[] = [];
  let t = 0;
  for (const shot of shots) {
    const shotT0 = t;
    for (const entry of shot.lines) {
      const dur = linePlaySeconds(entry.text);
      lines.push({
        lineId: entry.id,
        text: entry.text,
        t0: t,
        t1: t + dur,
        pov: shot.id,
        tag: shot.tag,
        shotT0,
      });
      t += dur;
    }
  }
  return { lines, total: t };
}

export function clipAt(clip: TimedClip, t: number): ClipHit {
  const last = clip.lines[clip.lines.length - 1];
  const clamped = Math.min(Math.max(0, t), Math.max(0, clip.total - 1e-4));
  const hit = clip.lines.find((line) => clamped >= line.t0 && clamped < line.t1) ?? last;
  return { ...hit, local: clamped - hit.shotT0 };
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

/** 0→1→0, moving the whole way. */
function pingpong(t: number, cycle: number): number {
  const u = (t % cycle) / cycle;
  return u < 0.5 ? u * 2 : 2 - u * 2;
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

function near(): Actor {
  return { ...ENEMY_CLOSE, alive: true, role: "near" };
}

/** Swing out, then keep sliding. Speed stays up so the shot never parks. */
function wideX(t: number): number {
  const swing = 0.7;
  if (t < swing) return lerp(LANE.startX, WIDE, t / swing);
  return WIDE + pingpong(t - swing, 1.5) * 0.36;
}

/** Slow creep out and back. Always in motion. */
function slowX(t: number): number {
  return lerp(LANE.startX * 0.35, SLOW_PIXEL.x, pingpong(t, 3.4));
}

/** Place, strafe, counter-strafe, then do it again. */
function goodX(t: number): number {
  const cycle = 2.35;
  const u = t % cycle;
  if (u < 0.62) return lerp(LANE.startX, 1.38, u / 0.62);
  if (u < 1.05) return lerp(1.38, 1.18, (u - 0.62) / 0.43);
  if (u < 1.4) return 1.18 + (u - 1.05) * 0.22;
  return lerp(1.18 + 0.35 * 0.22, LANE.startX, (u - 1.4) / (cycle - 1.4));
}

function jiggleX(t: number): number {
  return lerp(LANE.startX, 0.48, pingpong(t, 1.05));
}

function badX(t: number): number {
  return lerp(LANE.startX, 0.58, pingpong(t, 2.6));
}

function holdSample(botX: number, look: V2): PovSample {
  const at = HOLD_PLAYER;
  return {
    camera: cam(at, aim(at, look)),
    actors: [{ x: botX, z: LANE.playerZ, alive: true, role: "hold" }],
    pip: null,
    walls: WALLS,
  };
}

export function samplePov(id: PovId, t: number): PovSample {
  if (id === "edge-slow") {
    const at = { x: slowX(t), z: LANE.playerZ };
    return { camera: cam(at, aim(at, ENEMY_CLOSE)), actors: [near()], pip: null, walls: WALLS };
  }
  if (id === "edge-slow-hold") return holdSample(slowX(t), SLOW_PIXEL);
  if (id === "edge-wide" || id === "choice-wide") {
    const at = { x: wideX(t), z: LANE.playerZ };
    return {
      camera: cam(at, aim(at, ENEMY_CLOSE)),
      actors: [near()],
      pip: id === "choice-wide" ? ENEMY_CLOSE : null,
      walls: WALLS,
    };
  }
  if (id === "edge-hold") return holdSample(wideX(t), ANGLE);
  if (id === "swing-bad") {
    const at = { x: badX(t), z: LANE.playerZ };
    const stuck = { x: 0, z: 0.35 };
    return { camera: cam(at, aim(at, stuck)), actors: [near()], pip: null, walls: WALLS };
  }
  if (id === "swing-you") {
    const at = { x: goodX(t), z: LANE.playerZ };
    return { camera: cam(at, aim(at, ENEMY_CLOSE)), actors: [near()], pip: ENEMY_CLOSE, walls: WALLS };
  }
  if (id === "swing-hold") return holdSample(goodX(t), ANGLE);
  if (id === "choice-jiggle") {
    const at = { x: jiggleX(t), z: LANE.playerZ };
    return { camera: cam(at, aim(at, ENEMY_CLOSE)), actors: [near()], pip: null, walls: WALLS };
  }
  if (id === "isolate-both" || id === "isolate-one") {
    const x = id === "isolate-both" ? lerp(2.65, 3.05, pingpong(t, 2.4)) : lerp(0.95, 1.28, pingpong(t, 2.5));
    const at = { x, z: LANE.playerZ };
    return {
      camera: cam(at, aim(at, NEAR_ENEMY)),
      actors: [
        { ...NEAR_ENEMY, alive: true, role: "near" },
        { ...FAR_ENEMY, alive: true, role: "far" },
      ],
      pip: NEAR_ENEMY,
      walls: BOTH_WALLS,
    };
  }
  const at = { x: wideX(t), z: LANE.playerZ };
  return { camera: cam(at, aim(at, ENEMY_CLOSE)), actors: [near()], pip: null, walls: WALLS };
}

export function povLos(sample: PovSample, index = 0): { seen: boolean; offDeg: number } {
  const actor = sample.actors[index];
  const from = { x: sample.camera.x, z: sample.camera.z };
  const seen = actor ? lineOfSight(from, actor, sample.walls) : false;
  if (!actor) return { seen: false, offDeg: 0 };
  let d = Math.abs(sample.camera.yaw - yawTo(from, actor)) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return { seen, offDeg: (d * 180) / Math.PI };
}
