import { describe, expect, it } from "vitest";
import { cmPer360, degreesFromCounts, sensFromCm } from "./sensitivity";

describe("sensitivity", () => {
  it("matches the known Counter-Strike centimeter value", () => {
    expect(cmPer360(800, 1, 0.022)).toBeCloseTo(51.9545, 3);
  });

  it("matches a Valorant conversion at the same physical turn", () => {
    const cm = cmPer360(800, 1, 0.022);
    const valSens = sensFromCm(800, cm, 0.07);
    expect(valSens).toBeCloseTo(0.314286, 4);
    expect(cmPer360(800, valSens, 0.07)).toBeCloseTo(cm, 3);
  });

  it("turns counts into degrees with yaw and sens only", () => {
    expect(degreesFromCounts(100, 2, 0.022)).toBeCloseTo(4.4, 5);
  });
});
