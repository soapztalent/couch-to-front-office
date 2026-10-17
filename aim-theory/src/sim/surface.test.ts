import { describe, expect, it } from "vitest";
import { playfieldScale } from "./surface";

describe("playfield scale", () => {
  it("keeps a normal window at device resolution up to 1.5", () => {
    expect(playfieldScale(1280, 720, 1)).toBe(1);
    expect(playfieldScale(800, 600, 2)).toBe(1.5);
  });

  it("caps a large high-dpi window so the bitmap stays near 1440p", () => {
    const scale = playfieldScale(1920, 1080, 2);
    expect(scale).toBeLessThan(1.5);
    expect(1920 * scale * 1080 * scale).toBeLessThanOrEqual(2560 * 1440 + 1);
  });

  it("does not blow up on an empty canvas", () => {
    expect(playfieldScale(0, 0, 2)).toBe(1);
  });
});
