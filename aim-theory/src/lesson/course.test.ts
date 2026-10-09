import { describe, expect, it } from "vitest";
import { LESSONS } from "./course";
import { LINES } from "../voice/lines";

describe("course script", () => {
  it("points every beat at a real coach line", () => {
    const ids = new Set<string>();
    for (const lesson of LESSONS) {
      for (const id of [...lesson.explain, ...lesson.showBeats, lesson.brief, ...lesson.reps.map((r) => r.cueId)]) {
        expect(LINES[id], id).toBeTruthy();
        expect(LINES[id].text.length).toBeGreaterThan(8);
        ids.add(id);
      }
    }
    expect(ids.size).toBeGreaterThan(20);
  });
});
