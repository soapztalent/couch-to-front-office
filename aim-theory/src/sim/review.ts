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
  /** A miss goes back on the same rep. A clean rep moves on after they see it. */
  retry: boolean;
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

/**
 * Every finished rep is shown from the other side.
 * A miss names the error and repeats. A clean rep says what they saw, then moves on.
 * Losing a hold to a fast swing is the lesson, so it teaches and moves on.
 */
export function reviewNote(miss: Miss): ReviewNote | null {
  if (miss.call === "hold" && miss.reason === "held-loss") return timed(pair("rev-ok-hold"), false);
  if (miss.won) {
    if (miss.call === "jiggle") return timed(pair("rev-ok-jig"), false);
    if (miss.call === "isolate") return timed(pair("rev-ok-iso"), false);
    if (miss.call === "hold") return timed(pair("rev-ok-flick"), false);
    if (miss.reason === "slow-kill") return timed(pair("rev-ok-slow"), false);
    return timed(pair("rev-ok-swing"), false);
  }
  const ids = pairFor(miss);
  if (!ids) return null;
  return timed(ids, true);
}

function timed(ids: { sawId: string; fixId: string }, retry: boolean): ReviewNote {
  const sawFor = linePlaySeconds(line(ids.sawId).text);
  const duration = sawFor + linePlaySeconds(line(ids.fixId).text);
  return { ...ids, sawFor, duration, retry };
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
  const walls = review.call === "isolate" ? [EDGE_WALL, FAR_WALL] : [EDGE_WALL];
  const sample = reviewSample(review, t, walls);
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

/** Play the moment they were seen, stretched across the note, instead of looping the time in cover. */
function reviewSample(review: ReviewRun, t: number, walls: Seg[]): TraceSample {
  const samples = review.samples;
  if (samples.length === 0) return traceAt(samples, 0);
  const u = Math.max(0, Math.min(1, t / Math.max(0.2, review.duration)));
  const eased = 1 - (1 - u) * (1 - u);
  if (review.call === "hold") {
    const t0 = samples[0].t;
    const t1 = samples[samples.length - 1].t;
    return traceAt(samples, t0 + (t1 - t0) * eased);
  }
  const eye = review.eye;
  let seen0 = -1;
  let seen1 = -1;
  for (let i = 0; i < samples.length; i += 1) {
    if (!lineOfSight(eye, { x: samples[i].x, z: samples[i].z }, walls)) continue;
    if (seen0 < 0) seen0 = i;
    seen1 = i;
  }
  if (seen0 < 0) return traceAt(samples, samples[0].t + Math.sin(t * 0.6) * 0.02);
  const lead = Math.max(samples[0].t, samples[seen0].t - 0.18);
  const end = samples[seen1].t;
  return traceAt(samples, lead + Math.max(0, end - lead) * eased);
}

function traceAt(samples: TraceSample[], t: number): TraceSample {
  if (samples.length === 0) {
    return { t: 0, x: LANE.startX, z: LANE.playerZ, yaw: 0.48, pitch: 0, botX: -1.15 };
  }
  const local = Math.max(samples[0].t, Math.min(samples[samples.length - 1].t, t));
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
