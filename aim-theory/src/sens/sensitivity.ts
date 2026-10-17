/**
 * Degrees the view turns per mouse count at sensitivity 1.
 * Fortnite is per 1% of the X slider (0.5555° at 100%).
 * Rainbow Six Siege assumes the default multiplier, 0.02.
 * PUBG and Battlefield are left out: their sliders are not one yaw.
 * Numbers below are the published hipfire constants, not estimates made up here.
 */
export const GAME_YAW = {
  cs2: 0.022,
  valorant: 0.07,
  apex: 0.022,
  overwatch2: 0.0066,
  cod: 0.0066,
  fortnite: 0.005555,
  r6: 0.00572957,
  destiny2: 0.0066,
  rivals: 0.0175,
  deadlock: 0.044,
  finals: 0.001,
  quake: 0.022,
  tf2: 0.022,
  titanfall2: 0.022,
  halo: 0.0225,
  rust: 0.1125,
  tarkov: 0.125,
  doom: 0.022,
  roblox: 0.397896,
} as const;

export type GameId = keyof typeof GAME_YAW | "custom";

export const GAME_LABEL: Record<Exclude<GameId, "custom">, string> = {
  cs2: "Counter-Strike 2",
  valorant: "Valorant",
  apex: "Apex Legends",
  overwatch2: "Overwatch 2",
  cod: "Call of Duty",
  fortnite: "Fortnite",
  r6: "Rainbow Six Siege",
  destiny2: "Destiny 2",
  rivals: "Marvel Rivals",
  deadlock: "Deadlock",
  finals: "THE FINALS",
  quake: "Quake Champions",
  tf2: "Team Fortress 2",
  titanfall2: "Titanfall 2",
  halo: "Halo Infinite",
  rust: "Rust",
  tarkov: "Escape from Tarkov",
  doom: "DOOM Eternal",
  roblox: "Roblox",
};

export const GAME_NOTE: Partial<Record<Exclude<GameId, "custom">, string>> = {
  fortnite: "That number is the percent slider. 8 means 8%.",
  r6: "Yaw here is the default multiplier, 0.02.",
  finals: "Hipfire. A big sens number is normal in this game.",
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
