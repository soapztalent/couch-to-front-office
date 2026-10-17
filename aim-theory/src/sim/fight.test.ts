import { describe, expect, it } from "vitest";
import { lineOfSight } from "./geom";
import { projectPoint } from "./geom";
import {
  EDGE_WALL,
  ENEMY_CLOSE,
  FAR_ENEMY,
  FAR_WALL,
  NEAR_ENEMY,
  PLAYER_START,
} from "./world";
import { freshFight, stepFight } from "./fight";

describe("corner line of sight", () => {
  it("hides the holder until the player clears the edge", () => {
    expect(lineOfSight(PLAYER_START, ENEMY_CLOSE, [EDGE_WALL])).toBe(false);
    expect(lineOfSight({ x: 0.28, z: PLAYER_START.z }, ENEMY_CLOSE, [EDGE_WALL])).toBe(true);
  });

  it("keeps the far holder closed until the second edge", () => {
    const mid = { x: 1.2, z: PLAYER_START.z };
    const wide = { x: 2.8, z: PLAYER_START.z };
    expect(lineOfSight(mid, NEAR_ENEMY, [EDGE_WALL, FAR_WALL])).toBe(true);
    expect(lineOfSight(mid, FAR_ENEMY, [EDGE_WALL, FAR_WALL])).toBe(false);
    expect(lineOfSight(wide, FAR_ENEMY, [EDGE_WALL, FAR_WALL])).toBe(true);
    expect(lineOfSight(wide, NEAR_ENEMY, [EDGE_WALL, FAR_WALL])).toBe(true);
  });
});

describe("projection", () => {
  it("puts a point on the optical axis at the center of the view", () => {
    const p = projectPoint(
      { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
      { x: 0, y: 0, z: 8 },
      { w: 200, h: 100, fov: 90 },
    );
    expect(p.visible).toBe(true);
    expect(p.x).toBeCloseTo(100, 4);
    expect(p.y).toBeCloseTo(50, 4);
  });
});

describe("holder fight", () => {
  it("kills a slow peek that stays on the crosshair", () => {
    let f = freshFight();
    for (let i = 0; i < 30; i += 1) {
      f = stepFight(f, { dt: 0.016, exposed: true, speed: 0.4, offsetDeg: 2, shotHit: false });
    }
    expect(f.winner).toBe("holder");
    expect(f.entrySpeed).toBeCloseTo(0.4, 5);
  });

  it("loses to a fast wide swing when the peeker shoots inside the window", () => {
    let f = freshFight();
    for (let i = 0; i < 14; i += 1) {
      f = stepFight(f, { dt: 0.016, exposed: true, speed: 2.4, offsetDeg: 20, shotHit: false });
    }
    expect(f.winner).toBe("none");
    f = stepFight(f, { dt: 0.016, exposed: true, speed: 2.4, offsetDeg: 20, shotHit: true });
    expect(f.winner).toBe("peeker");
  });

  it("resets when the peeker returns to cover", () => {
    let f = freshFight();
    f = stepFight(f, { dt: 0.05, exposed: true, speed: 2, offsetDeg: 12, shotHit: false });
    expect(f.armed).toBe(true);
    f = stepFight(f, { dt: 0.05, exposed: false, speed: 0, offsetDeg: 12, shotHit: false });
    expect(f.armed).toBe(false);
    expect(f.exposedFor).toBe(0);
  });
});
