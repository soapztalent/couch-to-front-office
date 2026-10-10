import type { Seg, V2 } from "./geom";

/** A right-hand corner. The player slides on a lane and swings past x = 0. */
export const LANE = {
  playerZ: -0.55,
  startX: -0.95,
  minX: -1.8,
  maxX: 4.2,
  eye: 1.6,
  head: 1.55,
  maxSpeed: 3.15,
  accel: 22,
  friction: 14,
  counter: 48,
};

export const EDGE_WALL: Seg = { a: { x: 0, z: 0 }, b: { x: 0, z: 8 } };
/** Starts above the lane so a player who has cleared it can still see the near holder. */
export const FAR_WALL: Seg = { a: { x: 2.45, z: 0.35 }, b: { x: 2.45, z: 8 } };

export const ENEMY_CLOSE: V2 = { x: 1.02, z: 2.55 };
export const ENEMY_DEEP: V2 = { x: 2.15, z: 2.45 };
export const NEAR_ENEMY: V2 = { x: 1.05, z: 2.4 };
export const FAR_ENEMY: V2 = { x: 3.55, z: 2.45 };

export const HOLD_PLAYER: V2 = { x: 1.4, z: 2.15 };
export const HOLD_BOT_START = -1.15;
export const HOLD_BOT_END = 1.2;

export const PLAYER_START: V2 = { x: LANE.startX, z: LANE.playerZ };
