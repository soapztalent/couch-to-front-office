import type { Crosshair } from "../persist/storage";
import { drawCrosshair, drawImpact, paintRangeField } from "../sim/draw";
import { cameraBasis, forward, projectOnBasis } from "../sim/geom";

export type RangeDot = { yaw: number; pitch: number; radius: number; live: boolean };

export type RangeMark = { kind: "hit" | "miss"; yaw: number; pitch: number; age: number };

const MARK_LIFE = 0.12;

/** The range picture. The loop calls this; it does not touch the DOM. */
export function drawRange(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  view: {
    fov: number;
    crosshair: Crosshair;
    yaw: number;
    pitch: number;
    targets: RangeDot[];
    dimIdle?: boolean;
    grid?: boolean;
    flash?: boolean;
    mark?: RangeMark | null;
    glued?: boolean;
  },
): void {
  const cam = { x: 0, y: 0, z: 0, yaw: (view.yaw * Math.PI) / 180, pitch: (view.pitch * Math.PI) / 180 };
  const basis = cameraBasis(cam, { w: cssW, h: cssH, fov: view.fov });
  paintRangeField(ctx, cam, basis, cssW, cssH);
  for (const target of view.targets) {
    const dir = forward((target.yaw * Math.PI) / 180, (target.pitch * Math.PI) / 180);
    const p = projectOnBasis(cam, { x: dir.x * 8, y: dir.y * 8, z: dir.z * 8 }, basis);
    if (!p.visible) continue;
    const edge = projectOnBasis(cam, { x: dir.x * 8 + 0.12, y: dir.y * 8, z: dir.z * 8 }, basis);
    const r = Math.max(8, Math.hypot(edge.x - p.x, edge.y - p.y) * (target.radius / 1.2));
    const live = !(view.dimIdle && !target.live);
    drawPlate(ctx, p.x, p.y, r, live, Boolean(view.glued && target.live));
  }
  const mark = view.mark;
  if (mark && mark.age >= 0 && mark.age <= MARK_LIFE) {
    const dir = forward((mark.yaw * Math.PI) / 180, (mark.pitch * Math.PI) / 180);
    const p = projectOnBasis(cam, { x: dir.x * 8, y: dir.y * 8, z: dir.z * 8 }, basis);
    if (p.visible) drawImpact(ctx, p.x, p.y, mark.kind);
  } else if (view.flash) {
    drawImpact(ctx, cssW / 2, cssH / 2, "hit");
  }
  drawCrosshair(ctx, cssW, cssH, view.crosshair);
}

function drawPlate(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, live: boolean, glued: boolean): void {
  ctx.beginPath();
  ctx.arc(x, y, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = live ? (glued ? "#ffffff" : "#d6ff46") : "#3a4454";
  ctx.lineWidth = live ? 2 : 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = live ? "#f4f7fb" : "#121722";
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (!live) return;
  ctx.beginPath();
  ctx.fillStyle = "#07090d";
  ctx.arc(x, y, Math.max(2, r * 0.22), 0, Math.PI * 2);
  ctx.fill();
}
