import type { Crosshair } from "../persist/storage";
import { lineOfSight, projectPoint, type Camera, type Seg, type V2, type V3 } from "./geom";
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
};

export function drawWorld(ctx: CanvasRenderingContext2D, cssW: number, cssH: number, world: WorldDraw): void {
  const view = { w: cssW, h: cssH, fov: world.fov };
  ctx.fillStyle = "#12110e";
  ctx.fillRect(0, 0, cssW, cssH);

  const horizon = projectPoint(world.camera, { x: world.camera.x, y: 0, z: world.camera.z + 8 }, view);
  const hy = horizon.visible ? horizon.y : cssH * 0.58;
  ctx.fillStyle = "#1c1b17";
  ctx.fillRect(0, 0, cssW, Math.max(0, hy));
  ctx.fillStyle = "#241f18";
  ctx.fillRect(0, Math.max(0, hy), cssW, cssH);

  ctx.strokeStyle = "rgba(226, 255, 87, 0.05)";
  ctx.lineWidth = 1;
  for (let x = -3; x <= 6; x += 0.5) strokeLine(ctx, world.camera, view, { x, y: 0, z: -2 }, { x, y: 0, z: 6 });
  for (let z = -2; z <= 6; z += 0.5) strokeLine(ctx, world.camera, view, { x: -3, y: 0, z }, { x: 6, y: 0, z });

  ctx.fillStyle = "#2a2822";
  fillQuad(
    ctx,
    world.camera,
    view,
    { x: -2.4, y: 0, z: -2 },
    { x: -2.4, y: 2.8, z: -2 },
    { x: -2.4, y: 2.8, z: 3 },
    { x: -2.4, y: 0, z: 3 },
  );

  for (const wall of world.walls) {
    const tall = 2.9;
    ctx.fillStyle = "#3c3932";
    fillQuad(
      ctx,
      world.camera,
      view,
      { x: wall.a.x, y: 0, z: wall.a.z },
      { x: wall.a.x, y: tall, z: wall.a.z },
      { x: wall.b.x, y: tall, z: wall.b.z },
      { x: wall.b.x, y: 0, z: wall.b.z },
    );
    ctx.strokeStyle = "#e2ff57";
    ctx.lineWidth = 3;
    strokeLine(ctx, world.camera, view, { x: wall.a.x, y: 0, z: wall.a.z }, { x: wall.a.x, y: tall, z: wall.a.z });
  }

  if (world.pip) drawPip(ctx, world.camera, view, world.pip);
  for (const actor of world.actors) {
    if (!actor.alive) continue;
    const hidden = !lineOfSight({ x: world.camera.x, z: world.camera.z }, actor, world.walls);
    if (hidden) continue;
    drawActor(ctx, world.camera, view, actor);
  }

  if (world.flash) {
    ctx.fillStyle =
      world.flash === "hit" ? "rgba(47, 158, 107, 0.16)" : world.flash === "hurt" ? "rgba(216, 74, 50, 0.22)" : "rgba(216, 74, 50, 0.08)";
    ctx.fillRect(0, 0, cssW, cssH);
  }

  drawCrosshair(ctx, cssW, cssH, world.crosshair);
}

function strokeLine(ctx: CanvasRenderingContext2D, cam: Camera, view: { w: number; h: number; fov: number }, a: V3, b: V3): void {
  const pa = projectPoint(cam, a, view);
  const pb = projectPoint(cam, b, view);
  if (!pa.visible || !pb.visible) return;
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
}

function fillQuad(ctx: CanvasRenderingContext2D, cam: Camera, view: { w: number; h: number; fov: number }, a: V3, b: V3, c: V3, d: V3): void {
  const pts = [a, b, c, d].map((p) => projectPoint(cam, p, view));
  if (pts.some((p) => !p.visible)) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawPip(ctx: CanvasRenderingContext2D, cam: Camera, view: { w: number; h: number; fov: number }, pip: V2): void {
  const p = projectPoint(cam, { x: pip.x, y: LANE.head, z: pip.z }, view);
  if (!p.visible) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = "#e2ff57";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(7, 0);
  ctx.lineTo(0, 7);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawActor(ctx: CanvasRenderingContext2D, cam: Camera, view: { w: number; h: number; fov: number }, actor: Actor): void {
  const head = projectPoint(cam, { x: actor.x, y: LANE.head, z: actor.z }, view);
  const foot = projectPoint(cam, { x: actor.x, y: 0, z: actor.z }, view);
  const side = projectPoint(cam, { x: actor.x + 0.2, y: LANE.head, z: actor.z }, view);
  if (!head.visible || !foot.visible || !side.visible) return;
  const r = Math.max(6, Math.hypot(side.x - head.x, side.y - head.y));
  const bodyH = Math.max(18, foot.y - head.y);
  ctx.fillStyle = "#d9c7a4";
  ctx.fillRect(head.x - r * 0.7, head.y + r * 0.2, r * 1.4, bodyH * 0.72);
  ctx.beginPath();
  ctx.fillStyle = "#f4efe4";
  ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "#1a1814";
  ctx.arc(head.x, head.y, Math.max(2, r * 0.28), 0, Math.PI * 2);
  ctx.fill();
}

export function drawCrosshair(ctx: CanvasRenderingContext2D, w: number, h: number, c: Crosshair): void {
  const x = w / 2;
  const y = h / 2;
  const arm = (dx1: number, dy1: number, dx2: number, dy2: number, width: number, color: string) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "square";
    ctx.moveTo(x + dx1, y + dy1);
    ctx.lineTo(x + dx2, y + dy2);
    ctx.stroke();
  };
  const gap = c.gap;
  const len = c.length;
  const arms: [number, number, number, number][] = [
    [-gap - len, 0, -gap, 0],
    [gap, 0, gap + len, 0],
    [0, -gap - len, 0, -gap],
    [0, gap, 0, gap + len],
  ];
  if (c.outline) {
    for (const a of arms) arm(a[0], a[1], a[2], a[3], c.thickness + 2, c.outlineColor);
  }
  for (const a of arms) arm(a[0], a[1], a[2], a[3], c.thickness, c.color);
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
