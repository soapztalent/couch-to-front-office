import { LESSONS, type Lesson } from "../lesson/course";
import { angleBetweenDeg, forward, yawTo, type Camera } from "../sim/geom";
import { ENEMY_CLOSE, LANE } from "../sim/world";
import { SKILLS } from "../skill/course";

export type CallKind = "lesson" | "skill" | "range";
export type CallPlace = "front" | "theory" | "course" | "range";

export type WorldCall = {
  id: string;
  kind: CallKind;
  title: string;
  place: CallPlace;
  x: number;
  z: number;
  scale: number;
};

const RANGE_CALLS: { id: string; title: string }[] = [
  { id: "snap", title: "Snap" },
  { id: "follow", title: "Follow" },
  { id: "chain", title: "Chain" },
  { id: "rush", title: "Rush" },
  { id: "line", title: "Line" },
];

/** Where you stand when a fight is not running. Looking at the angle. */
export const BAY_EYE = { x: -0.9, y: LANE.eye, z: -1.15 };

export function bayYaw(): number {
  return yawTo(BAY_EYE, ENEMY_CLOSE);
}

/** The fight already in front of you: the first lesson still open. */
export function nextFight(done: readonly string[]): Lesson {
  return LESSONS.find((lesson) => !done.includes(lesson.id)) ?? LESSONS[0];
}

function along(
  items: { id: string; title: string; kind: CallKind }[],
  place: CallPlace,
  x: number,
): WorldCall[] {
  const z0 = -2.5;
  const z1 = 10.2;
  const dz = items.length <= 1 ? 0 : Math.min(0.78, (z1 - z0) / (items.length - 1));
  return items.map((item, index) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    place,
    x,
    z: z0 + index * dz,
    scale: 0.52,
  }));
}

/**
 * The next fight stands on the angle. Everything else is a person you turn to:
 * theory on the near line, the course behind that, the range on the far line.
 */
export function worldCalls(done: readonly string[]): WorldCall[] {
  const next = nextFight(done);
  const front: WorldCall = {
    id: next.id,
    kind: "lesson",
    title: next.title,
    place: "front",
    x: ENEMY_CLOSE.x,
    z: ENEMY_CLOSE.z,
    scale: 1,
  };
  const rest = (door: Lesson["door"]) =>
    LESSONS.filter((lesson) => lesson.door === door && lesson.id !== next.id).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      kind: "lesson" as const,
    }));
  const course = [
    ...SKILLS.map((skill) => ({ id: skill.id, title: skill.title, kind: "skill" as const })),
    ...rest("course"),
  ];
  const range = [
    ...rest("range"),
    ...RANGE_CALLS.map((mode) => ({ id: mode.id, title: mode.title, kind: "range" as const })),
  ];
  return [front, ...along(rest("theory"), "theory", -3.4), ...along(course, "course", -4.6), ...along(range, "range", -5.75)];
}

/** The call under the crosshair, if one is close enough to count as aimed. */
export function aimCall(calls: readonly WorldCall[], cam: Camera, limitDeg = 4.5): WorldCall | null {
  const dir = forward(cam.yaw, cam.pitch);
  let best: WorldCall | null = null;
  let bestAng = limitDeg;
  for (const call of calls) {
    const to = { x: call.x - cam.x, y: 1.55 * call.scale - cam.y, z: call.z - cam.z };
    const ang = angleBetweenDeg(dir, to);
    if (ang < bestAng) {
      bestAng = ang;
      best = call;
    }
  }
  return best;
}
