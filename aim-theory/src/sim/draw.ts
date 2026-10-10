import type { Crosshair } from "../persist/storage";
import { cameraBasis, lineOfSight, projectOnBasis, type Basis, type Camera, type Seg, type V2, type V3 } from "./geom";
import type { Actor } from "./lane";
import { LANE } from "./world";

export type WorldDraw = {
  camera: Camera;
  walls: Seg[];
  actors: Actor[];
  pip: V2 | null;
  fov: number;
  crosshair: Crosshair;
  flash: "hit" | "miss" | "hurt" | null;
  /** Strafe speed. The gun settles when this drops. */
  sway?: number;
};

const SKY = "#10141c";
const GROUND = "#07090d";
const GRID = "rgba(168, 188, 214, 0.22)";
const LIP = "#d6ff46";
const HEAD = "#f4f7fb";
const INK = "#07090d";

export function drawWorld(ctx: CanvasRenderingContext2D, cssW: number, cssH: number, world: WorldDraw): void {
  const basis = cameraBasis(world.camera, { w: cssW, h: cssH, fov: world.fov });
  paintBackdrop(ctx, world.camera, basis, cssW, cssH);
  paintFloor(ctx, world.camera, basis, -4, 8, -2, 8, 1, 0);

  ctx.fillStyle = "#1a2230";
  fillQuad(
    ctx,
    world.camera,
    basis,
    { x: -2.4, y: 0, z: -2 },
    { x: -2.4, y: 2.8, z: -2 },
    { x: -2.4, y: 2.8, z: 3 },
    { x: -2.4, y: 0, z: 3 },
  );
  strokeTop(ctx, world.camera, basis, { x: -2.4, y: 2.8, z: -2 }, { x: -2.4, y: 2.8, z: 3 });

  drawSolid(ctx, world.camera, basis, { a: { x: -2.2, z: 7.4 }, b: { x: 5.2, z: 7.4 } }, "#1a2230");
  for (const wall of world.walls) drawSolid(ctx, world.camera, basis, wall, "#243044");

  if (world.pip) drawPip(ctx, world.camera, basis, world.pip);
  for (const actor of world.actors) {
    if (!actor.alive) continue;
    const hidden = !lineOfSight({ x: world.camera.x, z: world.camera.z }, actor, world.walls);
    if (hidden) continue;
    drawActor(ctx, world.camera, basis, actor);
  }

  if (world.flash === "hurt") {
    ctx.fillStyle = "#ff4d3a";
    ctx.fillRect(0, 0, 4, cssH);
    ctx.fillRect(cssW - 4, 0, 4, cssH);
  } else if (world.flash === "hit" || world.flash === "miss") {
    drawImpact(ctx, cssW / 2, cssH / 2, world.flash);
  }

  drawCrosshair(ctx, cssW, cssH, world.crosshair);
  drawGun(ctx, cssW, cssH, world.sway ?? 0);
}

/** Sky, ground, and a one-pixel horizon. No gradients and no shadows. */
function paintBackdrop(ctx: CanvasRenderingContext2D, cam: Camera, basis: Basis, cssW: number, cssH: number): void {
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, cssW, cssH);
  const ahead = 48;
  const horizon = projectOnBasis(
    cam,
    { x: cam.x + Math.sin(cam.yaw) * ahead, y: cam.y, z: cam.z + Math.cos(cam.yaw) * ahead },
    basis,
  );
  const hy = horizon.visible ? horizon.y : cssH * 0.5;
  const top = Math.max(0, Math.min(cssH, hy));
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, cssW, top);
  ctx.strokeStyle = "rgba(214, 255, 70, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, hy);
  ctx.lineTo(cssW, hy);
  ctx.stroke();
}

function paintFloor(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  basis: Basis,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  step: number,
  y: number,
): void {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) addSegment(ctx, cam, basis, { x, y, z: z0 }, { x, y, z: z1 });
  for (let z = z0; z <= z1; z += step) addSegment(ctx, cam, basis, { x: x0, y, z }, { x: x1, y, z });
  ctx.stroke();
}

function addSegment(ctx: CanvasRenderingContext2D, cam: Camera, basis: Basis, a: V3, b: V3): void {
  const pa = projectOnBasis(cam, a, basis);
  const pb = projectOnBasis(cam, b, basis);
  if (!pa.visible || !pb.visible) return;
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
}

function strokeTop(ctx: CanvasRenderingContext2D, cam: Camera, basis: Basis, a: V3, b: V3): void {
  ctx.strokeStyle = LIP;
  ctx.lineWidth = 2;
  ctx.beginPath();
  addSegment(ctx, cam, basis, a, b);
  ctx.stroke();
}

function fillQuad(ctx: CanvasRenderingContext2D, cam: Camera, basis: Basis, a: V3, b: V3, c: V3, d: V3): void {
  const pts = [a, b, c, d].map((p) => projectOnBasis(cam, p, basis));
  if (pts.some((p) => !p.visible)) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawPip(ctx: CanvasRenderingContext2D, cam: Camera, basis: Basis, pip: V2): void {
  const p = projectOnBasis(cam, { x: pip.x, y: LANE.head, z: pip.z }, basis);
  if (!p.visible) return;
  ctx.strokeStyle = LIP;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 8);
  ctx.lineTo(p.x + 7, p.y);
  ctx.lineTo(p.x, p.y + 8);
  ctx.lineTo(p.x - 7, p.y);
  ctx.closePath();
  ctx.stroke();
}

function drawSolid(ctx: CanvasRenderingContext2D, cam: Camera, basis: Basis, wall: Seg, fill: string): void {
  const tall = 2.9;
  const dx = wall.b.x - wall.a.x;
  const dz = wall.b.z - wall.a.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * 0.2;
  const nz = (dx / len) * 0.2;
  ctx.fillStyle = fill;
  fillQuad(
    ctx,
    cam,
    basis,
    { x: wall.a.x, y: 0, z: wall.a.z },
    { x: wall.a.x, y: tall, z: wall.a.z },
    { x: wall.b.x, y: tall, z: wall.b.z },
    { x: wall.b.x, y: 0, z: wall.b.z },
  );
  ctx.fillStyle = "#1a2433";
  fillQuad(
    ctx,
    cam,
    basis,
    { x: wall.a.x, y: 0, z: wall.a.z },
    { x: wall.a.x, y: tall, z: wall.a.z },
    { x: wall.a.x + nx, y: tall, z: wall.a.z + nz },
    { x: wall.a.x + nx, y: 0, z: wall.a.z + nz },
  );
  strokeTop(ctx, cam, basis, { x: wall.a.x, y: tall, z: wall.a.z }, { x: wall.b.x, y: tall, z: wall.b.z });
  strokeTop(ctx, cam, basis, { x: wall.a.x, y: tall, z: wall.a.z }, { x: wall.a.x + nx, y: tall, z: wall.a.z + nz });
}

function drawActor(ctx: CanvasRenderingContext2D, cam: Camera, basis: Basis, actor: Actor): void {
  const head = projectOnBasis(cam, { x: actor.x, y: LANE.head, z: actor.z }, basis);
  const shoulder = projectOnBasis(cam, { x: actor.x, y: 1.32, z: actor.z }, basis);
  const hip = projectOnBasis(cam, { x: actor.x, y: 0.86, z: actor.z }, basis);
  const foot = projectOnBasis(cam, { x: actor.x, y: 0, z: actor.z }, basis);
  const side = projectOnBasis(cam, { x: actor.x + 0.2, y: LANE.head, z: actor.z }, basis);
  if (!head.visible || !foot.visible || !shoulder.visible || !hip.visible || !side.visible) return;
  const r = Math.max(6, Math.hypot(side.x - head.x, side.y - head.y));
  const wide = r * 1.35;
  ctx.fillStyle = "#8e9bab";
  ctx.fillRect(hip.x - wide * 0.42, hip.y, wide * 0.32, Math.max(8, foot.y - hip.y));
  ctx.fillRect(hip.x + wide * 0.1, hip.y, wide * 0.32, Math.max(8, foot.y - hip.y));
  ctx.fillStyle = "#d5dde6";
  ctx.fillRect(shoulder.x - wide * 0.72, shoulder.y, wide * 1.44, Math.max(10, hip.y - shoulder.y));
  ctx.fillStyle = "#b7c3d1";
  ctx.fillRect(shoulder.x - wide * 0.95, shoulder.y, wide * 0.28, r * 1.1);
  ctx.fillRect(shoulder.x + wide * 0.67, shoulder.y, wide * 0.28, r * 1.1);
  ctx.beginPath();
  ctx.fillStyle = HEAD;
  ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillRect(head.x - r * 0.55, head.y - r * 0.08, r * 1.1, Math.max(2, r * 0.28));
  ctx.beginPath();
  ctx.strokeStyle = LIP;
  ctx.lineWidth = 2;
  ctx.arc(head.x, head.y, r + 3, 0, Math.PI * 2);
  ctx.stroke();
}

/** A rifle in the lower right. It kicks while you are still fast, then sits for the shot. */
function drawGun(ctx: CanvasRenderingContext2D, w: number, h: number, sway: number): void {
  const kick = Math.min(22, Math.abs(sway) * 14);
  const x = Math.round(w * 0.58 + kick);
  const y = h + Math.round(kick * 0.35);
  ctx.fillStyle = "#121820";
  ctx.fillRect(x + 18, y - 86, 22, 92);
  ctx.fillStyle = "#243044";
  ctx.fillRect(x - 78, y - 124, 168, 26);
  ctx.fillStyle = "#0c1016";
  ctx.fillRect(x + 70, y - 118, 96, 8);
  ctx.fillStyle = LIP;
  ctx.fillRect(x - 6, y - 132, 16, 5);
}

/** Four ticks around a shot. One stroke, no blur. */
export function drawImpact(ctx: CanvasRenderingContext2D, x: number, y: number, kind: "hit" | "miss"): void {
  ctx.strokeStyle = kind === "hit" ? LIP : "#ff4d3a";
  ctx.lineWidth = 2;
  ctx.lineCap = "butt";
  ctx.beginPath();
  const inner = 16;
  const outer = 26;
  ctx.moveTo(x - outer, y);
  ctx.lineTo(x - inner, y);
  ctx.moveTo(x + inner, y);
  ctx.lineTo(x + outer, y);
  ctx.moveTo(x, y - outer);
  ctx.lineTo(x, y - inner);
  ctx.moveTo(x, y + inner);
  ctx.lineTo(x, y + outer);
  ctx.stroke();
}

export function drawCrosshair(ctx: CanvasRenderingContext2D, w: number, h: number, c: Crosshair): void {
  const x = Math.round(w / 2);
  const y = Math.round(h / 2);
  const gap = c.gap;
  const len = c.length;
  const arms: [number, number, number, number][] = [
    [-gap - len, 0, -gap, 0],
    [gap, 0, gap + len, 0],
    [0, -gap - len, 0, -gap],
    [0, gap, 0, gap + len],
  ];
  ctx.lineCap = "butt";
  const strokeArms = (width: number, color: string) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const a of arms) {
      ctx.moveTo(x + a[0], y + a[1]);
      ctx.lineTo(x + a[2], y + a[3]);
    }
    ctx.stroke();
  };
  if (c.outline) strokeArms(c.thickness + 2, c.outlineColor);
  strokeArms(c.thickness, c.color);
  if (c.dot) {
    if (c.outline) {
      ctx.beginPath();
      ctx.fillStyle = c.outlineColor;
      ctx.arc(x, y, c.dotSize + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.fillStyle = c.color;
    ctx.arc(x, y, c.dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintRangeField(ctx: CanvasRenderingContext2D, cam: Camera, basis: Basis, cssW: number, cssH: number): void {
  paintBackdrop(ctx, cam, basis, cssW, cssH);
  paintFloor(ctx, cam, basis, -16, 16, 3, 24, 2, -1.35);
  ctx.strokeStyle = "rgba(168, 188, 214, 0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const yaw of [-40, -20, 0, 20, 40]) {
    const rad = (yaw * Math.PI) / 180;
    addSegment(
      ctx,
      cam,
      basis,
      { x: Math.sin(rad) * 6, y: -1.2, z: Math.cos(rad) * 6 },
      { x: Math.sin(rad) * 22, y: 6, z: Math.cos(rad) * 22 },
    );
  }
  ctx.stroke();
}
