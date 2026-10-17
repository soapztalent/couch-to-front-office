import { describe, expect, it } from "vitest";
import { buildDebrief } from "./debrief";
import type { RepResult } from "./lane";
import { LINES } from "../voice/lines";

function rep(partial: Partial<RepResult> & Pick<RepResult, "call" | "won" | "reason">): RepResult {
  return {
    cueId: "x",
    entrySpeed: 2,
    placementDeg: 2,
    shotSpeed: 0.1,
    shotErrorDeg: 1.5,
    lowHead: false,
    misses: 0,
    overcommitted: false,
    ...partial,
  };
}

describe("debrief", () => {
  it("names a slow peek and still credits a real swing", () => {
    const d = buildDebrief("edge", [
      rep({ call: "swing", won: true, reason: "kill", entrySpeed: 2.2 }),
      rep({ call: "swing", won: false, reason: "slow", entrySpeed: 0.4, shotErrorDeg: 1 }),
      rep({ call: "hold", won: false, reason: "held-loss" }),
    ]);
    expect(d.lines.map((l) => l.id)).toContain("edge-fix-slow");
    expect(d.lines.map((l) => l.id)).toContain("edge-good-swing");
    expect(d.right).toMatch(/1 of 2/);
    expect(d.fix.toLowerCase()).toMatch(/slow|strafe/);
    expect(d.score).toBeGreaterThan(0);
  });

  it("does not praise a slow peek as a clean swing", () => {
    const d = buildDebrief("edge", [
      rep({ call: "swing", won: false, reason: "slow", entrySpeed: 0.3, shotErrorDeg: 8, misses: 6 }),
      rep({ call: "hold", won: false, reason: "held-loss" }),
    ]);
    expect(d.lines.map((l) => l.id)).not.toContain("edge-good-swing");
    expect(d.lines.map((l) => l.id)).toContain("edge-fix-slow");
  });

  it("only uses lines that exist in the script", () => {
    const d = buildDebrief("choice", [
      rep({ call: "jiggle", won: false, reason: "overcommit" }),
      rep({ call: "swing", won: true, reason: "kill" }),
    ]);
    for (const l of d.lines) expect(LINES[l.id]?.text.length).toBeGreaterThan(8);
  });
});
