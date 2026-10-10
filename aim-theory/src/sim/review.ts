import type { Actor, Call, RepSpec } from "./lane";
import { lineOfSight, yawTo, type Camera, type Seg, type V2 } from "./geom";
import { linePlaySeconds } from "./pov";
import { line } from "../voice/lines";
import {
  EDGE_WALL,
  ENEMY_CLOSE,
  ENEMY_DEEP,
  FAR_ENEMY,
  FAR_WALL,
  HOLD_PLAYER,
  LANE,
  NEAR_ENEMY,
} from "./world";

export type TraceSample = {
  t: number;
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  botX: number;
};

export type ReviewNote = {
  sawId: string;
  fixId: string;
  sawFor: number;
  duration: number;
};

export type ReviewRun = ReviewNote & {
  eye: V2;
  call: Call;
  enemy: "close" | "deep";
  reason: string;
  samples: TraceSample[];
};

type Miss = {
  call: Call;
  reason: string;
  won: boolean;
  placementDeg: number | null;
  shotSpeed: number | null;
  lowHead: boolean;
  misses: number;
};

/** A failed rep the coach should replay. A hold that loses to the swing is the lesson, not a miss. */
export function reviewNote(miss: Miss): ReviewNote | null {
  if (miss.won) return null;
  if (miss.call === "hold" && miss.reason === "held-loss") return null;
  const ids = pairFor(miss);
  if (!ids) return null;
  const sawFor = linePlaySeconds(line(ids.sawId).text);
  const duration = sawFor + linePlaySeconds(line(ids.fixId).text);
  return { ...ids, sawFor, duration };
}

function pairFor(miss: Miss): { sawId: string; fixId: string } | null {
  if (miss.call === "hold") return pair("rev-hold-sat");
  if (miss.call === "jiggle") {
    if (miss.reason === "took-fight") return pair("rev-jig-fight");
    if (miss.reason === "overcommit") return pair("rev-jig-wide");
    if (miss.reason === "died" || miss.reason === "slow") return pair("rev-jig-stay");
    return pair("rev-jig-none");
  }
  if (miss.call === "isolate") {
    if (miss.reason === "double") return pair("rev-iso-both");
    if (miss.reason === "order") return pair("rev-iso-order");
    if (miss.reason === "slow") return pair("rev-iso-slow");
    if (miss.reason === "no-swing" || miss.reason === "timeout") return pair("rev-iso-none");
    if (miss.lowHead) return pair("rev-iso-low");
    return pair("rev-iso-late");
  }
  if (miss.reason === "no-swing") return pair("rev-swing-none");
  if (miss.reason === "timeout") return pair("rev-swing-sat");
  if (miss.reason === "slow") return pair("rev-swing-creep");
  if (miss.lowHead) return pair("rev-swing-low");
  if (miss.shotSpeed != null && miss.shotSpeed >= 0.45) return pair("rev-swing-move");
  if (miss.placementDeg != null && miss.placementDeg > 4.5) return pair("rev-swing-wall");
  if (miss.misses >= 2) return pair("rev-swing-spam");
  if (miss.reason === "died" || miss.reason === "slow-kill") return pair("rev-swing-pixel");
  return pair("rev-swing-none");
}

function pair(id: string): { sawId: string; fixId: string } {
  return { sawId: `${id}-saw`, fixId: `${id}-fix` };
}

export function eyeFor(spec: RepSpec, reason: string, actors: Actor[], botX: number): V2 {
  if (spec.call === "hold") return { x: botX, z: LANE.playerZ };
  if (spec.call === "isolate") {
    if (reason === "double") return { x: FAR_ENEMY.x, z: FAR_ENEMY.z };
    if (reason === "order") return { x: NEAR_ENEMY.x, z: NEAR_ENEMY.z };
    const near = actors.find((a) => a.role === "near" && a.alive);
    const far = actors.find((a) => a.role === "far" && a.alive);
    const who = near ?? far ?? NEAR_ENEMY;
    return { x: who.x, z: who.z };
  }
  const enemy = spec.enemy === "deep" ? ENEMY_DEEP : ENEMY_CLOSE;
  return { x: enemy.x, z: enemy.z };
}

export function opponentScene(review: ReviewRun, t: number): { camera: Camera; walls: Seg[]; actors: Actor[] } {
  const sample = traceAt(review.samples, t);
  const walls = review.call === "isolate" ? [EDGE_WALL, FAR_WALL] : [EDGE_WALL];
  const eye = review.call === "hold" ? { x: sample.botX, z: LANE.playerZ } : review.eye;
  const player = review.call === "hold" ? { x: HOLD_PLAYER.x, z: HOLD_PLAYER.z } : { x: sample.x, z: sample.z };
  const pixel = pixelFor(review);
  const see = lineOfSight(eye, player, walls);
  const travel = Math.abs((review.samples.at(-1)?.x ?? player.x) - (review.samples[0]?.x ?? player.x));
  let aim = pixel;
  if (review.call === "hold") {
    aim = player;
  } else if (see && travel > 0.12) {
    const seenAt = firstSeen(review.samples, eye, walls);
    const u = Math.max(0, Math.min(1, (sample.t - seenAt) / 0.32));
    aim = {
      x: pixel.x + (player.x - pixel.x) * u * 0.7,
      z: pixel.z + (player.z - pixel.z) * u * 0.7,
    };
  } else if (see) {
    aim = player;
  } else {
    aim = { x: pixel.x + Math.sin(t * 1.15) * 0.07, z: pixel.z };
  }
  const look = lookAt(eye, aim);
  return {
    camera: { x: eye.x, y: LANE.eye, z: eye.z, yaw: look.yaw, pitch: look.pitch },
    walls,
    actors: [{ x: player.x, z: player.z, alive: true, role: "near" }],
  };
}

function pixelFor(review: ReviewRun): V2 {
  if (review.call === "isolate" && (review.reason === "double" || review.eye.x > 2.5)) return { x: 2.62, z: 0.42 };
  if (review.enemy === "deep") return { x: 0.55, z: 0.28 };
  return { x: 0.06, z: 0.2 };
}

function lookAt(from: V2, to: V2): { yaw: number; pitch: number } {
  const dist = Math.max(0.2, Math.hypot(to.x - from.x, to.z - from.z));
  return {
    yaw: yawTo(from, to),
    pitch: Math.atan2(LANE.head - LANE.eye, dist),
  };
}

function firstSeen(samples: TraceSample[], eye: V2, walls: Seg[]): number {
  for (const sample of samples) {
    if (lineOfSight(eye, { x: sample.x, z: sample.z }, walls)) return sample.t;
  }
  return samples[0]?.t ?? 0;
}

function traceAt(samples: TraceSample[], t: number): TraceSample {
  if (samples.length === 0) {
    return { t: 0, x: LANE.startX, z: LANE.playerZ, yaw: 0.48, pitch: 0, botX: -1.15 };
  }
  const t0 = samples[0].t;
  const span = Math.max(0.05, samples[samples.length - 1].t - t0);
  const local = t0 + ((((t % span) + span) % span));
  let i = 1;
  while (i < samples.length && samples[i].t < local) i += 1;
  const b = samples[Math.min(i, samples.length - 1)];
  const a = samples[Math.max(0, i - 1)];
  const dt = b.t - a.t;
  const u = dt > 1e-4 ? (local - a.t) / dt : 0;
  return {
    t: local,
    x: a.x + (b.x - a.x) * u,
    z: a.z + (b.z - a.z) * u,
    yaw: a.yaw + (b.yaw - a.yaw) * u,
    pitch: a.pitch + (b.pitch - a.pitch) * u,
    botX: a.botX + (b.botX - a.botX) * u,
  };
}
