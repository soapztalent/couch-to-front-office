import type { AimDevice, AimFrame, LockResult } from "./types";
import { degreesFromCounts } from "../sens/sensitivity";

type Sens = { dpi: number; sens: number; yaw: number };

/**
 * Pointer lock plus raw deltas. OS acceleration is not applied in this app.
 * Unadjusted movement is requested so the browser does not apply it either.
 */
export function createMouseKeyboard(sens: Sens): AimDevice {
  let yawAcc = 0;
  let pitchAcc = 0;
  let firePressed = false;
  let fireHeld = false;
  let locked = false;
  let raw = false;
  let suppressUntil = 0;
  const keys = new Set<string>();

  const onMove = (e: MouseEvent) => {
    if (!locked) return;
    if (performance.now() < suppressUntil) return;
    yawAcc += e.movementX;
    pitchAcc += e.movementY;
  };

  const onDown = (e: MouseEvent) => {
    if (e.button !== 0 || !locked) return;
    if (performance.now() < suppressUntil) return;
    fireHeld = true;
    firePressed = true;
  };

  const onUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    fireHeld = false;
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.type === "keydown") keys.add(e.code);
    else keys.delete(e.code);
    if (locked && (e.code === "KeyA" || e.code === "KeyD" || e.code === "KeyW" || e.code === "KeyS")) {
      e.preventDefault();
    }
  };

  const onLock = () => {
    const nowLocked = document.pointerLockElement != null;
    if (nowLocked && !locked) {
      yawAcc = 0;
      pitchAcc = 0;
      firePressed = false;
      fireHeld = false;
      suppressUntil = performance.now() + 120;
    }
    locked = nowLocked;
    if (!locked) fireHeld = false;
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mousedown", onDown);
  window.addEventListener("mouseup", onUp);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  document.addEventListener("pointerlockchange", onLock);

  const device: AimDevice = {
    kind: "mouse-keyboard",
    get locked() {
      return locked;
    },
    async requestLock(target: HTMLElement): Promise<LockResult> {
      const el = target as HTMLElement & {
        requestPointerLock: (opts?: { unadjustedMovement?: boolean }) => Promise<void> | void;
      };
      try {
        await el.requestPointerLock({ unadjustedMovement: true });
        raw = true;
        return { ok: document.pointerLockElement === target, raw: true };
      } catch {
        try {
          await el.requestPointerLock();
          raw = false;
          return { ok: document.pointerLockElement === target, raw: false };
        } catch {
          raw = false;
          return { ok: false, raw: false };
        }
      }
    },
    release() {
      if (document.pointerLockElement) document.exitPointerLock();
    },
    consume(): AimFrame {
      const yaw = degreesFromCounts(yawAcc, sens.sens, sens.yaw);
      const pitch = -degreesFromCounts(pitchAcc, sens.sens, sens.yaw);
      yawAcc = 0;
      pitchAcc = 0;
      const pressed = firePressed;
      firePressed = false;
      const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
      const forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
      return { yaw, pitch, strafe, forward, firePressed: pressed, fireHeld };
    },
    destroy() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("pointerlockchange", onLock);
      if (document.pointerLockElement) document.exitPointerLock();
    },
  };

  void raw;
  return device;
}
