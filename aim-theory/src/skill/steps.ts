import type { RangeTune } from "../range/range";

/** Where you are in the skill work. The names are ours. */
export type StepId = "open" | "even" | "fine";

export type SkillKind = "mark" | "glide" | "relay";

export const STEP_ORDER: StepId[] = ["open", "even", "fine"];

export const STEP_TITLE: Record<StepId, string> = {
  open: "Open",
  even: "Even",
  fine: "Fine",
};

/** Share of clean work required before the next step. */
const BAR: Record<StepId, Record<SkillKind, number>> = {
  open: { mark: 0.45, glide: 0.4, relay: 0.4 },
  even: { mark: 0.62, glide: 0.55, relay: 0.55 },
  fine: { mark: 0.75, glide: 0.68, relay: 0.68 },
};

export function nextStep(step: StepId): StepId | null {
  const i = STEP_ORDER.indexOf(step);
  return STEP_ORDER[i + 1] ?? null;
}

export function tuneFor(step: StepId): { mark: RangeTune; glide: RangeTune; relay: RangeTune } {
  if (step === "fine") {
    return {
      mark: { radius: 0.85, spread: 16, centered: true },
      glide: { radius: 1.05, speed: 1.35 },
      relay: { radius: 0.9, chain: 4, spread: 14 },
    };
  }
  if (step === "even") {
    return {
      mark: { radius: 1.15, spread: 14, centered: true },
      glide: { radius: 1.35, speed: 1 },
      relay: { radius: 1.15, chain: 3, spread: 12 },
    };
  }
  return {
    mark: { radius: 1.7, spread: 10, centered: true },
    glide: { radius: 1.85, speed: 0.65 },
    relay: { radius: 1.65, chain: 3, spread: 8, centered: true },
  };
}

export type SkillScores = Record<SkillKind, number>;

/**
 * You move up one step only when every skill clears the next bar.
 * The weak skill is the one furthest under that bar. A strong skill does not skip you ahead.
 */
export function placeStep(scores: SkillScores, current: StepId): { step: StepId; weak: SkillKind; up: boolean } {
  const dest = nextStep(current) ?? current;
  const bar = BAR[dest];
  const kinds: SkillKind[] = ["mark", "glide", "relay"];
  let weak: SkillKind = "mark";
  let worst = Infinity;
  for (const kind of kinds) {
    const ratio = scores[kind] / bar[kind];
    if (ratio < worst) {
      worst = ratio;
      weak = kind;
    }
  }
  const cleared = kinds.every((kind) => scores[kind] >= bar[kind]);
  const up = cleared && dest !== current;
  return { step: up ? dest : current, weak, up };
}
