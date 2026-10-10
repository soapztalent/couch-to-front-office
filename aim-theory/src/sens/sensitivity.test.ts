import { describe, expect, it } from "vitest";
import { GAME_YAW, cmPer360, degreesFromCounts, sensFromCm } from "./sensitivity";

describe("sensitivity", () => {
  it("matches the known Counter-Strike centimeter value", () => {
    expect(cmPer360(800, 1, GAME_YAW.cs2)).toBeCloseTo(51.9545, 3);
  });

  it("matches a Valorant conversion at the same physical turn", () => {
    const cm = cmPer360(800, 1, GAME_YAW.cs2);
    const valSens = sensFromCm(800, cm, GAME_YAW.valorant);
    expect(valSens).toBeCloseTo(0.314286, 4);
    expect(cmPer360(800, valSens, GAME_YAW.valorant)).toBeCloseTo(cm, 3);
  });

  it("keeps centimeters when the game yaw changes", () => {
    const cm = cmPer360(800, 1, GAME_YAW.cs2);
    for (const yaw of Object.values(GAME_YAW)) {
      const sens = sensFromCm(800, cm, yaw);
      expect(cmPer360(800, sens, yaw)).toBeCloseTo(cm, 3);
    }
  });

  it("uses the published hipfire yaws", () => {
    expect(GAME_YAW.cs2).toBe(0.022);
    expect(GAME_YAW.valorant).toBe(0.07);
    expect(GAME_YAW.apex).toBe(0.022);
    expect(GAME_YAW.overwatch2).toBe(0.0066);
    expect(GAME_YAW.cod).toBe(0.0066);
    expect(GAME_YAW.fortnite).toBe(0.005555);
    expect(GAME_YAW.r6).toBeCloseTo(0.00572957, 8);
    expect(GAME_YAW.destiny2).toBe(0.0066);
    expect(GAME_YAW.rivals).toBe(0.0175);
    expect(GAME_YAW.deadlock).toBe(0.044);
    expect(GAME_YAW.finals).toBe(0.001);
    expect(GAME_YAW.quake).toBe(0.022);
    expect(GAME_YAW.tf2).toBe(0.022);
    expect(GAME_YAW.titanfall2).toBe(0.022);
    expect(GAME_YAW.halo).toBe(0.0225);
    expect(GAME_YAW.rust).toBe(0.1125);
    expect(GAME_YAW.tarkov).toBe(0.125);
    expect(GAME_YAW.doom).toBe(0.022);
    expect(GAME_YAW.roblox).toBeCloseTo(0.397896, 6);
  });

  it("turns counts into degrees with yaw and sens only", () => {
    expect(degreesFromCounts(100, 2, 0.022)).toBeCloseTo(4.4, 5);
  });
});
