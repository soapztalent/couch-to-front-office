/** Degrees per count at sensitivity 1. Custom yaw covers games that are not listed. */
export const GAME_YAW = {
  cs2: 0.022,
  valorant: 0.07,
  overwatch2: 0.0066,
  apex: 0.022,
  fortnite: 0.005555,
  cod: 0.0066,
} as const;

export type GameId = keyof typeof GAME_YAW | "custom";

export const GAME_LABEL: Record<Exclude<GameId, "custom">, string> = {
  cs2: "Counter-Strike 2",
  valorant: "Valorant",
  overwatch2: "Overwatch 2",
  apex: "Apex Legends",
  fortnite: "Fortnite",
  cod: "Call of Duty",
};

export function cmPer360(dpi: number, sens: number, yaw: number): number {
  return (360 * 2.54) / (yaw * sens * dpi);
}

export function sensFromCm(dpi: number, cm: number, yaw: number): number {
  return (360 * 2.54) / (yaw * dpi * cm);
}

/** Raw device counts to degrees. No acceleration curve is applied here. */
export function degreesFromCounts(counts: number, sens: number, yaw: number): number {
  return counts * yaw * sens;
}
