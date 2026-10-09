import { describe, expect, it } from "vitest";
import { lineOfSight } from "./geom";
import { clipAt, povLos, samplePov, timeClip, type PovId } from "./pov";

function travel(id: PovId): number {
  let prev = samplePov(id, 0);
  let dist = 0;
  for (let t = 0.1; t <= 5; t += 0.1) {
    const next = samplePov(id, t);
    dist += Math.abs(next.camera.x - prev.camera.x);
    dist += Math.abs((next.actors[0]?.x ?? 0) - (prev.actors[0]?.x ?? 0));
    prev = next;
  }
  return dist;
}

describe("first-person points of view", () => {
  it("keeps every shot moving instead of parking on a pose", () => {
    const ids: PovId[] = [
      "edge-slow",
      "edge-slow-hold",
      "edge-wide",
      "edge-hold",
      "swing-bad",
      "swing-you",
      "swing-hold",
      "choice-wide",
      "choice-jiggle",
      "isolate-both",
      "isolate-one",
    ];
    for (const id of ids) expect(travel(id), id).toBeGreaterThan(1.2);
  });

  it("walks a slow peek onto the holder's crosshair", () => {
    const tucked = povLos(samplePov("edge-slow", 0));
    const out = povLos(samplePov("edge-slow", 1.7));
    const held = povLos(samplePov("edge-slow-hold", 1.7));
    expect(tucked.seen).toBe(false);
    expect(out.seen).toBe(true);
    expect(held.seen).toBe(true);
    expect(held.offDeg).toBeLessThan(6);
  });

  it("shows a wide swing on the head, and the holder still on the edge", () => {
    const you = povLos(samplePov("edge-wide", 0.85));
    const them = povLos(samplePov("edge-hold", 0.85));
    expect(samplePov("edge-wide", 0).camera.x).toBeLessThan(0);
    expect(you.seen).toBe(true);
    expect(you.offDeg).toBeLessThan(4);
    expect(them.seen).toBe(true);
    expect(them.offDeg).toBeGreaterThan(12);
  });

  it("sticks a bad clear to the wall and a swing to the head", () => {
    const bad = povLos(samplePov("swing-bad", 1.3));
    const good = povLos(samplePov("swing-you", 0.7));
    const hold = povLos(samplePov("swing-hold", 0.7));
    expect(bad.seen).toBe(true);
    expect(bad.offDeg).toBeGreaterThan(8);
    expect(good.seen).toBe(true);
    expect(good.offDeg).toBeLessThan(4);
    expect(samplePov("swing-you", 0.2).pip).not.toBeNull();
    expect(hold.seen).toBe(true);
    expect(hold.offDeg).toBeGreaterThan(12);
  });

  it("stays out on a wide swing and gets back on a jiggle", () => {
    const wide = povLos(samplePov("choice-wide", 1));
    const peek = povLos(samplePov("choice-jiggle", 0.52));
    const back = povLos(samplePov("choice-jiggle", 1.05));
    expect(wide.seen).toBe(true);
    expect(wide.offDeg).toBeLessThan(4);
    expect(samplePov("choice-wide", 1).camera.x).toBeGreaterThan(1);
    expect(peek.seen).toBe(true);
    expect(back.seen).toBe(false);
  });

  it("opens both angles wide and only the near angle when tight", () => {
    for (const t of [0.2, 1.2, 2.2]) {
      const both = samplePov("isolate-both", t);
      const one = samplePov("isolate-one", t);
      const fromBoth = { x: both.camera.x, z: both.camera.z };
      const fromOne = { x: one.camera.x, z: one.camera.z };
      expect(lineOfSight(fromBoth, both.actors[0], both.walls)).toBe(true);
      expect(lineOfSight(fromBoth, both.actors[1], both.walls)).toBe(true);
      expect(lineOfSight(fromOne, one.actors[0], one.walls)).toBe(true);
      expect(lineOfSight(fromOne, one.actors[1], one.walls)).toBe(false);
      expect(povLos(one).offDeg).toBeLessThan(4);
    }
  });
});

describe("clip timeline", () => {
  const clip = timeClip([
    {
      id: "edge-wide",
      tag: "PEEKER",
      lines: [
        { id: "a", text: "You swing out and you see the holder first." },
        { id: "b", text: "Their crosshair is still on the edge you left." },
      ],
    },
    {
      id: "edge-hold",
      tag: "HOLDER",
      lines: [{ id: "c", text: "You are holding the angle and the swing is already wide." }],
    },
  ]);

  it("plays lines back to back and keeps the shot clock running", () => {
    expect(clip.lines[1].t0).toBeCloseTo(clip.lines[0].t1, 5);
    const before = clipAt(clip, clip.lines[0].t1 - 0.05);
    const after = clipAt(clip, clip.lines[0].t1 + 0.05);
    expect(before.pov).toBe("edge-wide");
    expect(after.pov).toBe("edge-wide");
    expect(after.lineId).toBe("b");
    expect(after.local).toBeGreaterThan(before.local);
    const cut = clipAt(clip, clip.lines[1].t1 + 0.02);
    expect(cut.pov).toBe("edge-hold");
    expect(cut.local).toBeLessThan(0.1);
  });
});
