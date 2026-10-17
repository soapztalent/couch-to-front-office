/**
 * Lessons read this frame. They never see device counts, sticks, or touch points.
 * This phase only constructs a mouse-and-keyboard device.
 * Later phases can add a controller, a pen, or touch behind the same frame.
 */
export type InputKind = "mouse-keyboard";

export type AimFrame = {
  /** Degrees of view change this frame. Positive yaw looks right. Positive pitch looks up. */
  yaw: number;
  pitch: number;
  /** -1 to 1. Positive strafe is the D key on mouse and keyboard. */
  strafe: number;
  /** -1 to 1. Positive is W. Lane drills in this course ignore it on purpose. */
  forward: number;
  firePressed: boolean;
  fireHeld: boolean;
};

export type LockResult = {
  ok: boolean;
  /** True when the browser granted unadjusted movement (no OS acceleration). */
  raw: boolean;
};

export interface AimDevice {
  readonly kind: InputKind;
  requestLock(target: HTMLElement): Promise<LockResult>;
  release(): void;
  consume(): AimFrame;
  get locked(): boolean;
  destroy(): void;
}
