import { describe, expect, it } from "vitest";
import { nextSkill, SKILLS } from "./course";
import { gapDeg, sampleGlide, sampleMark, sampleRelay, sampleStep, skillAt, skillTimeline } from "./clip";
import { placeStep } from "./steps";
import { LINES } from "../voice/lines";

const BANNED = ["aimer", "tammas", "kovaak", "pasu", "1wall", "tile frenzy", "popcorn", "fugla", "aimbeast", "voltaic"];

describe("next skill", () => {
  it("continues at the first skill that is still open", () => {
    expect(nextSkill([]).id).toBe("mark");
    expect(nextSkill(["mark"]).id).toBe("glide");
    expect(nextSkill(["mark", "glide", "relay", "step"]).id).toBe("step");
  });
});

describe("skill steps", () => {
  it("moves up one step only when every skill clears", () => {
    const up = placeStep({ mark: 0.7, glide: 0.6, relay: 0.6 }, "open");
    expect(up.up).toBe(true);
    expect(up.step).toBe("even");
    const stay = placeStep({ mark: 0.9, glide: 0.2, relay: 0.9 }, "open");
    expect(stay.up).toBe(false);
    expect(stay.step).toBe("open");
    expect(stay.weak).toBe("glide");
    const skip = placeStep({ mark: 1, glide: 1, relay: 1 }, "open");
    expect(skip.step).toBe("even");
  });

  it("does not leave Fine", () => {
    const stay = placeStep({ mark: 1, glide: 1, relay: 1 }, "fine");
    expect(stay.up).toBe(false);
    expect(stay.step).toBe("fine");
  });
});

describe("skill clips", () => {
  it("carries the crosshair onto the mark and then away", () => {
    const start = gapDeg(sampleMark(0.05));
    const arrive = gapDeg(sampleMark(1.35));
    expect(start).toBeGreaterThan(6);
    expect(arrive).toBeLessThan(3);
    expect(sampleMark(0.2).yaw).not.toBeCloseTo(sampleMark(1).yaw, 0);
  });

  it("lets the track slip off a moving bot and come back", () => {
    const on = gapDeg(sampleGlide(0.05));
    const off = gapDeg(sampleGlide(0.78));
    expect(on).toBeLessThan(2);
    expect(off).toBeGreaterThan(6);
    expect(sampleGlide(0.2).targets[0].yaw).not.toBeCloseTo(sampleGlide(1.4).targets[0].yaw, 0);
  });

  it("lights one mark and looks toward it", () => {
    const early = sampleRelay(0.05);
    const late = sampleRelay(0.9);
    expect(early.targets.filter((target) => target.live)).toHaveLength(1);
    expect(gapDeg(early)).toBeGreaterThan(8);
    expect(gapDeg(late)).toBeLessThan(2);
  });

  it("keeps the step clip moving across all three skills", () => {
    const shots = new Set([0.3, 1.8, 3.4].map((t) => sampleStep(t).shot));
    expect(shots).toEqual(new Set(["mark", "glide", "relay"]));
  });

  it("plays skill lines back to back without their source names", () => {
    for (const skill of SKILLS) {
      const timed = skillTimeline(
        skill.beats.map((beat) => ({ shot: beat.shot, lineId: beat.lineId, text: LINES[beat.lineId].text })),
      );
      expect(timed.marks[0].t0).toBe(0);
      for (let i = 1; i < timed.marks.length; i += 1) {
        expect(timed.marks[i].t0).toBeCloseTo(timed.marks[i - 1].t1, 5);
      }
      const cut = skillAt(timed.marks, timed.total, timed.marks[0].t1 + 0.02);
      expect(cut.lineId).toBe(timed.marks[1].lineId);
      expect(cut.local).toBeGreaterThan(0.5);
      for (const mark of timed.marks) {
        const text = mark.text.toLowerCase();
        for (const word of BANNED) expect(text, mark.lineId).not.toContain(word);
      }
    }
  });
});
