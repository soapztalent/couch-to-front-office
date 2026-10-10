import { describe, expect, it } from "vitest";
import { cleanName, submitScore } from "./store";

describe("score board", () => {
  it("posts a named score and ranks a higher one first", () => {
    const first = submitScore({}, { lessonId: "lookleave", name: "Rook", score: 400, at: 10 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.rank).toBe(1);
    const second = submitScore(
      { lookleave: first.entries },
      { lessonId: "lookleave", name: "North", score: 800, at: 20 },
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.entries.map((row) => row.name)).toEqual(["North", "Rook"]);
    expect(second.rank).toBe(1);
  });

  it("rejects a blank name and a score outside the run", () => {
    expect(cleanName("   ")).toBeNull();
    expect(submitScore({}, { lessonId: "edge", name: "", score: 10, at: 1 }).ok).toBe(false);
    expect(submitScore({}, { lessonId: "edge", name: "Rook", score: 1001, at: 1 }).ok).toBe(false);
    expect(submitScore({}, { lessonId: "../x", name: "Rook", score: 10, at: 1 }).ok).toBe(false);
  });
});
