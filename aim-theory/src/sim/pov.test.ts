import { describe, expect, it } from "vitest";
import { povLos, samplePov } from "./pov";

describe("first-person points of view", () => {
  it("lets the peeker see the holder on the crosshair after the swing", () => {
    const tucked = povLos(samplePov("edge-peeker", 0.1));
    const wide = povLos(samplePov("edge-peeker", 2.4));
    expect(tucked.seen).toBe(false);
    expect(wide.seen).toBe(true);
    expect(wide.offDeg).toBeLessThan(4);
  });

  it("keeps the holder aimed at the edge while the swing appears wide", () => {
    const before = povLos(samplePov("edge-holder", 0.2));
    const after = povLos(samplePov("edge-holder", 2.6));
    expect(before.seen).toBe(false);
    expect(after.seen).toBe(true);
    expect(after.offDeg).toBeGreaterThan(12);
  });

  it("shows the swing with the crosshair on the head, and the holder still on the angle", () => {
    const you = povLos(samplePov("swing-you", 3));
    const them = povLos(samplePov("swing-them", 2.8));
    expect(you.seen).toBe(true);
    expect(you.offDeg).toBeLessThan(4);
    expect(samplePov("swing-you", 0.2).pip).not.toBeNull();
    expect(them.seen).toBe(true);
    expect(them.offDeg).toBeGreaterThan(12);
  });
});
