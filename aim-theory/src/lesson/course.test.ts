import { describe, expect, it } from "vitest";
import { LESSONS } from "./course";
import { LINES } from "../voice/lines";
import { timeClip } from "../sim/pov";

const TAUGHT: Record<string, string[]> = {
  edge: ["edge-01", "edge-02", "edge-03", "edge-show-slow", "edge-show-wide", "edge-show-hold"],
  swing: ["swing-01", "swing-02", "swing-03", "swing-show-bad", "swing-show-good"],
  choice: ["wj-01", "wj-02", "wj-03", "wj-show-wide", "wj-show-jiggle"],
  isolate: ["iso-01", "iso-02", "iso-03", "iso-show-bad", "iso-show-good"],
};

describe("course script", () => {
  it("points every beat at a real coach line", () => {
    const ids = new Set<string>();
    for (const lesson of LESSONS) {
      const spoken = lesson.pov ? lesson.pov.flatMap((shot) => shot.lines) : [...lesson.explain, ...lesson.showBeats];
      expect(lesson.pov?.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.explain).toEqual([]);
      expect(lesson.showBeats).toEqual([]);
      expect(lesson.show).toBeUndefined();
      for (let i = 1; i < (lesson.pov?.length ?? 0); i += 1) {
        expect(lesson.pov?.[i].tag).not.toBe(lesson.pov?.[i - 1].tag);
      }
      if (TAUGHT[lesson.id]) {
        for (const id of TAUGHT[lesson.id]) expect(spoken, lesson.id).toContain(id);
      }
      expect(lesson.reps.length, lesson.id).toBeGreaterThanOrEqual(4);
      expect(lesson.family, lesson.id).toBeTruthy();
      expect(lesson.door, lesson.id).toMatch(/theory|course/);
      for (const id of [...spoken, lesson.brief, ...lesson.reps.map((r) => r.cueId)]) {
        expect(LINES[id], id).toBeTruthy();
        expect(LINES[id].text.length).toBeGreaterThan(8);
        ids.add(id);
      }
      const clip = timeClip(
        (lesson.pov ?? []).map((shot) => ({
          id: shot.id,
          tag: shot.tag,
          lines: shot.lines.map((id) => ({ id, text: LINES[id].text })),
        })),
      );
      expect(clip.lines[0].t0).toBe(0);
      for (let i = 1; i < clip.lines.length; i += 1) {
        expect(clip.lines[i].t0).toBeCloseTo(clip.lines[i - 1].t1, 5);
      }
      expect(clip.total).toBeGreaterThan(12);
    }
    expect(ids.size).toBeGreaterThan(20);
    expect(LESSONS.length).toBeGreaterThanOrEqual(25);
    expect(LESSONS.length).toBeLessThanOrEqual(50);
    const titles = new Set(LESSONS.map((lesson) => lesson.title));
    expect(titles.size).toBe(LESSONS.length);
  });
});
