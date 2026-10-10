import { createMouseKeyboard } from "./mouse-keyboard";
import type { AimDevice } from "./types";

/** The only device this phase builds. */
export function createAimDevice(sens: { dpi: number; sens: number; yaw: number }): AimDevice {
  return createMouseKeyboard(sens);
}

export type { AimDevice, AimFrame, InputKind, LockResult } from "./types";
