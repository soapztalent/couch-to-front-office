import { RangeSession, type RangeMode, type RangeSnapshot } from "../range/range";
import type { SkillKind, SkillScores, StepId } from "./steps";
import { tuneFor } from "./steps";

const PHASE: { kind: SkillKind; mode: RangeMode }[] = [
  { kind: "mark", mode: "snap" },
  { kind: "glide", mode: "follow" },
  { kind: "relay", mode: "chain" },
];

export const PHASE_SECONDS = 8;

/** One pass through the three skills. The step you are on sets the size and the pace. */
export class CheckSession {
  readonly sessions: RangeSession[];
  phase = 0;
  private elapsed = 0;

  constructor(step: StepId, seed = 1) {
    const tune = tuneFor(step);
    this.sessions = [
      new RangeSession("snap", PHASE_SECONDS, seed, tune.mark),
      new RangeSession("follow", PHASE_SECONDS, seed + 1, tune.glide),
      new RangeSession("chain", PHASE_SECONDS, seed + 2, tune.relay),
    ];
  }

  get done(): boolean {
    return this.elapsed >= PHASE_SECONDS * PHASE.length;
  }

  get kind(): SkillKind {
    return PHASE[this.phase].kind;
  }

  update(dt: number, yaw: number, pitch: number, shot: boolean, firing: boolean): void {
    if (this.done) return;
    this.elapsed += dt;
    const index = Math.min(PHASE.length - 1, Math.floor(this.elapsed / PHASE_SECONDS));
    if (index !== this.phase) {
      const prev = this.sessions[this.phase];
      this.phase = index;
      this.sessions[this.phase].yaw = prev.yaw;
      this.sessions[this.phase].pitch = prev.pitch;
    }
    const current = this.sessions[this.phase];
    if (!current.finished) current.update(dt, yaw, pitch, shot, firing);
  }

  snapshot(): RangeSnapshot {
    const snap = this.sessions[this.phase].snapshot();
    const left = Math.max(0, PHASE_SECONDS * PHASE.length - this.elapsed);
    return { ...snap, secondsLeft: left };
  }

  scores(): SkillScores {
    return {
      mark: ratio(this.sessions[0]),
      glide: ratio(this.sessions[1]),
      relay: ratio(this.sessions[2]),
    };
  }
}

function ratio(session: RangeSession): number {
  const snap = session.snapshot();
  const total = snap.hits + snap.misses;
  if (total <= 0) return 0;
  return snap.hits / total;
}
