import type { Crosshair } from "../persist/storage";
import { drawCrosshair } from "../sim/draw";
import { cameraBasis, forward, projectOnBasis } from "../sim/geom";

export type RangeDot = { yaw: number; pitch: number; radius: number; live: boolean };

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
  },
): void {
  ctx.fillStyle = "#12110e";
  ctx.fillRect(0, 0, cssW, cssH);
  const cam = { x: 0, y: 0, z: 0, yaw: (view.yaw * Math.PI) / 180, pitch: (view.pitch * Math.PI) / 180 };
  const basis = cameraBasis(cam, { w: cssW, h: cssH, fov: view.fov });
  if (view.grid) {
    ctx.strokeStyle = "rgba(232, 220, 190, 0.18)";
    ctx.lineWidth = 1;
    for (let yaw = -50; yaw <= 50; yaw += 10) {
      const top = projectOnBasis(cam, point(yaw, -12), basis);
      const bot = projectOnBasis(cam, point(yaw, 16), basis);
      if (!top.visible && !bot.visible) continue;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bot.x, bot.y);
      ctx.stroke();
    }
  }
  for (const target of view.targets) {
    const dir = forward((target.yaw * Math.PI) / 180, (target.pitch * Math.PI) / 180);
    const p = projectOnBasis(cam, { x: dir.x * 8, y: dir.y * 8, z: dir.z * 8 }, basis);
    if (!p.visible) continue;
    const edge = projectOnBasis(cam, { x: dir.x * 8 + 0.12, y: dir.y * 8, z: dir.z * 8 }, basis);
    const r = Math.max(8, Math.hypot(edge.x - p.x, edge.y - p.y) * (target.radius / 1.2));
    ctx.beginPath();
    ctx.fillStyle = view.dimIdle && !target.live ? "#5c574c" : "#f4efe4";
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#1a1814";
    ctx.arc(p.x, p.y, Math.max(2, r * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }
  drawCrosshair(ctx, cssW, cssH, view.crosshair);
  if (view.flash) {
    ctx.strokeStyle = "#e2ff57";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cssW / 2, cssH / 2, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function point(yawDeg: number, pitchDeg: number): { x: number; y: number; z: number } {
  const dir = forward((yawDeg * Math.PI) / 180, (pitchDeg * Math.PI) / 180);
  return { x: dir.x * 8, y: dir.y * 8, z: dir.z * 8 };
}
