import { describe, expect, it } from "vitest";
import { LESSONS } from "./course";
import { LINES } from "../voice/lines";

describe("course script", () => {
  it("points every beat at a real coach line", () => {
    const ids = new Set<string>();
    for (const lesson of LESSONS) {
      const spoken = lesson.pov ? lesson.pov.map((beat) => beat.line) : [...lesson.explain, ...lesson.showBeats];
      if (lesson.pov) {
        expect(lesson.explain).toEqual([]);
        expect(lesson.showBeats).toEqual([]);
        expect(lesson.pov.map((beat) => beat.tag)).toEqual(expect.arrayContaining([expect.any(String)]));
        expect(new Set(lesson.pov.map((beat) => beat.tag)).size).toBe(lesson.pov.length);
      }
      for (const id of [...spoken, lesson.brief, ...lesson.reps.map((r) => r.cueId)]) {
        expect(LINES[id], id).toBeTruthy();
        expect(LINES[id].text.length).toBeGreaterThan(8);
        if (lesson.pov?.some((beat) => beat.line === id)) expect(LINES[id].text.length).toBeLessThan(80);
        ids.add(id);
      }
    }
    expect(ids.size).toBeGreaterThan(20);
  });
});
