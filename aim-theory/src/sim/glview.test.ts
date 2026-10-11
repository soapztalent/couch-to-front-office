import { describe, expect, it } from "vitest";
import { humanSpan, ndcOf } from "./glview";

describe("first person projection", () => {
  it("puts a point on the look axis at the center", () => {
    const cam = { x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0 };
    const n = ndcOf(cam, { x: 0, y: 1.6, z: 8 }, 90, 16 / 9);
    expect(n.w).toBeGreaterThan(0);
    expect(n.x).toBeCloseTo(0, 5);
    expect(n.y).toBeCloseTo(0, 5);
  });

  it("sends a point on the right to positive x and a point above to positive y", () => {
    const cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
    const right = ndcOf(cam, { x: 2, y: 0, z: 8 }, 90, 1);
    const up = ndcOf(cam, { x: 0, y: 2, z: 8 }, 90, 1);
    expect(right.x).toBeGreaterThan(0.1);
    expect(up.y).toBeGreaterThan(0.1);
  });

  it("stands a human with a face in front of the skull", () => {
    const span = humanSpan();
    expect(span.minY).toBeGreaterThan(-0.02);
    expect(span.minY).toBeLessThan(0.08);
    expect(span.maxY).toBeGreaterThan(1.65);
    expect(span.maxY).toBeLessThan(1.95);
    expect(span.face).toBeGreaterThan(0.1);
    expect(span.verts).toBeGreaterThan(800);
    expect(span.verts).toBeLessThan(22000);
  });

  it("follows a yaw toward +x", () => {
    const cam = { x: 0, y: 0, z: 0, yaw: Math.PI / 2, pitch: 0 };
    const n = ndcOf(cam, { x: 8, y: 0, z: 0 }, 90, 1);
    expect(n.w).toBeGreaterThan(0);
    expect(Math.abs(n.x)).toBeLessThan(0.02);
    expect(Math.abs(n.y)).toBeLessThan(0.02);
  });
});
