import { describe, expect, it } from "vitest";
import { LESSONS } from "../lesson/course";
import { aimCall, bayYaw, BAY_EYE, nextFight, worldCalls } from "./bay";

describe("the room you open into", () => {
  it("puts the first open lesson on the angle", () => {
    expect(nextFight([]).id).toBe(LESSONS[0].id);
    expect(nextFight([LESSONS[0].id]).id).toBe(LESSONS[1].id);
    expect(nextFight(LESSONS.map((lesson) => lesson.id)).id).toBe(LESSONS[0].id);
  });

  it("keeps every lesson, and does not turn them into a second copy of the fight in front", () => {
    const calls = worldCalls([]);
    const lessons = calls.filter((call) => call.kind === "lesson");
    expect(lessons).toHaveLength(50);
    expect(new Set(calls.map((call) => call.id)).size).toBe(calls.length);
    expect(calls.filter((call) => call.kind === "skill")).toHaveLength(4);
    expect(calls.filter((call) => call.kind === "range")).toHaveLength(5);
    const front = calls.find((call) => call.place === "front");
    expect(front?.id).toBe(LESSONS[0].id);
    expect(calls.filter((call) => call.id === front?.id)).toHaveLength(1);
    expect(calls.filter((call) => call.place !== "front").every((call) => call.x < -2)).toBe(true);
  });

  it("aims the fight in front when you are looking at them", () => {
    const calls = worldCalls([]);
    const aimed = aimCall(calls, { ...BAY_EYE, yaw: bayYaw(), pitch: -0.02 });
    expect(aimed?.place).toBe("front");
    expect(aimCall(calls, { ...BAY_EYE, yaw: bayYaw(), pitch: 1.15 })).toBeNull();
  });
});
