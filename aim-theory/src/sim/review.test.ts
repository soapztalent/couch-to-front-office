import { describe, expect, it } from "vitest";
import type { AimFrame } from "../input/types";
import { LaneSession } from "./lane";
import { reviewNote } from "./review";
import { ENEMY_CLOSE, LANE } from "./world";

const idle: AimFrame = { yaw: 0, pitch: 0, strafe: 0, forward: 0, firePressed: false, fireHeld: false };

describe("opponent review", () => {
  it("names the miss and stays on that swing", () => {
    const session = new LaneSession([{ call: "swing", cueId: "edge-cue-swing", enemy: "close" }], (id) => id, false);
    for (let i = 0; i < 520; i += 1) session.update(0.016, idle);
    expect(session.phase).toBe("review");
    expect(session.rep).toBe(0);
    expect(session.results).toHaveLength(0);
    const view = session.view();
    expect(view.pov).toBe("opponent");
    expect(view.reviewing).toBe(true);
    expect(view.reason).toBe("no-swing");
    expect(view.sawId).toBe("rev-swing-none-saw");
    expect(view.fixId).toBe("rev-swing-none-fix");
    expect(view.camera.x).toBeCloseTo(ENEMY_CLOSE.x, 2);
    expect(view.camera.z).toBeCloseTo(ENEMY_CLOSE.z, 2);
    expect(view.camera.z).not.toBeCloseTo(LANE.playerZ, 1);
    const dur = 14;
    for (let i = 0; i < dur / 0.016; i += 1) session.update(0.016, idle);
    expect(session.phase).toBe("live");
    expect(session.rep).toBe(0);
    expect(session.view().pov).toBe("you");
    expect(session.view().cue).toBe("edge-cue-swing");
  });

  it("lets a hold loss stand, because that is the lesson", () => {
    const session = new LaneSession([{ call: "hold", cueId: "edge-cue-hold", enemy: "close" }], (id) => id, false);
    for (let i = 0; i < 400 && session.phase === "live"; i += 1) session.update(0.016, idle);
    expect(session.phase).toBe("banner");
    expect(session.results[0]?.reason).toBe("held-loss");
    expect(session.view().pov).toBe("you");
  });

  it("picks the line from the run, not a generic miss", () => {
    expect(
      reviewNote({
        call: "swing",
        reason: "slow",
        won: false,
        placementDeg: 1,
        shotSpeed: 0.2,
        lowHead: false,
        misses: 0,
      })?.sawId,
    ).toBe("rev-swing-creep-saw");
    expect(
      reviewNote({
        call: "jiggle",
        reason: "took-fight",
        won: false,
        placementDeg: null,
        shotSpeed: 0,
        lowHead: false,
        misses: 0,
      })?.sawId,
    ).toBe("rev-jig-fight-saw");
    expect(
      reviewNote({
        call: "isolate",
        reason: "double",
        won: false,
        placementDeg: null,
        shotSpeed: null,
        lowHead: false,
        misses: 0,
      })?.fixId,
    ).toBe("rev-iso-both-fix");
    expect(
      reviewNote({
        call: "hold",
        reason: "held-loss",
        won: false,
        placementDeg: null,
        shotSpeed: null,
        lowHead: false,
        misses: 0,
      }),
    ).toBeNull();
    expect(
      reviewNote({
        call: "swing",
        reason: "kill",
        won: true,
        placementDeg: 1,
        shotSpeed: 0,
        lowHead: false,
        misses: 0,
      }),
    ).toBeNull();
  });
});
