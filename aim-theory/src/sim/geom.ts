export type V2 = { x: number; z: number };
export type V3 = { x: number; y: number; z: number };
export type Seg = { a: V2; b: V2 };

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function approach(current: number, target: number, maxDelta: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

function orient(a: V2, b: V2, c: V2): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function onSeg(a: V2, b: V2, c: V2): boolean {
  return (
    Math.min(a.x, b.x) - 1e-8 <= c.x &&
    c.x <= Math.max(a.x, b.x) + 1e-8 &&
    Math.min(a.z, b.z) - 1e-8 <= c.z &&
    c.z <= Math.max(a.z, b.z) + 1e-8
  );
}

export function segmentsIntersect(p: Seg, q: Seg): boolean {
  const o1 = orient(p.a, p.b, q.a);
  const o2 = orient(p.a, p.b, q.b);
  const o3 = orient(q.a, q.b, p.a);
  const o4 = orient(q.a, q.b, p.b);
  const eps = 1e-8;
  if (((o1 > eps && o2 < -eps) || (o1 < -eps && o2 > eps)) && ((o3 > eps && o4 < -eps) || (o3 < -eps && o4 > eps))) {
    return true;
  }
  if (Math.abs(o1) <= eps && onSeg(p.a, p.b, q.a)) return true;
  if (Math.abs(o2) <= eps && onSeg(p.a, p.b, q.b)) return true;
  if (Math.abs(o3) <= eps && onSeg(q.a, q.b, p.a)) return true;
  if (Math.abs(o4) <= eps && onSeg(q.a, q.b, p.b)) return true;
  return false;
}

export function lineOfSight(from: V2, to: V2, walls: Seg[]): boolean {
  const view = { a: from, b: to };
  for (const wall of walls) {
    if (segmentsIntersect(view, wall)) return false;
  }
  return true;
}

/** Radians. 0 looks down +z. Positive turns toward +x. */
export function yawTo(from: V2, to: V2): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export function degBetween(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return (d * 180) / Math.PI;
}

export function forward(yaw: number, pitch: number): V3 {
  const cp = Math.cos(pitch);
  return { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: Math.cos(yaw) * cp };
}

export function angleBetweenDeg(a: V3, b: V3): number {
  const na = Math.hypot(a.x, a.y, a.z) || 1;
  const nb = Math.hypot(b.x, b.y, b.z) || 1;
  const d = (a.x * b.x + a.y * b.y + a.z * b.z) / (na * nb);
  return (Math.acos(clamp(d, -1, 1)) * 180) / Math.PI;
}

export type Camera = { x: number; y: number; z: number; yaw: number; pitch: number };

export type Projected = { x: number; y: number; z: number; visible: boolean };

export function projectPoint(cam: Camera, p: V3, view: { w: number; h: number; fov: number }): Projected {
  const f = forward(cam.yaw, cam.pitch);
  const sy = Math.sin(cam.yaw);
  const cy = Math.cos(cam.yaw);
  const sp = Math.sin(cam.pitch);
  const cp = Math.cos(cam.pitch);
  const rx = cy;
  const ry = 0;
  const rz = -sy;
  const ux = -sy * sp;
  const uy = cp;
  const uz = -cy * sp;
  const dx = p.x - cam.x;
  const dy = p.y - cam.y;
  const dz = p.z - cam.z;
  const camX = dx * rx + dy * ry + dz * rz;
  const camY = dx * ux + dy * uy + dz * uz;
  const camZ = dx * f.x + dy * f.y + dz * f.z;
  if (camZ < 0.05) return { x: 0, y: 0, z: camZ, visible: false };
  const focal = view.w / 2 / Math.tan((view.fov * Math.PI) / 360);
  return {
    x: view.w / 2 + (camX / camZ) * focal,
    y: view.h / 2 - (camY / camZ) * focal,
    z: camZ,
    visible: true,
  };
}

export function lookErrorDeg(cam: Camera, target: V3): number {
  const aim = forward(cam.yaw, cam.pitch);
  const to = { x: target.x - cam.x, y: target.y - cam.y, z: target.z - cam.z };
  return angleBetweenDeg(aim, to);
}

export function pitchErrorDeg(cam: Camera, target: V3): number {
  const dx = target.x - cam.x;
  const dy = target.y - cam.y;
  const dz = target.z - cam.z;
  const dist = Math.hypot(dx, dy, dz) || 1;
  const want = Math.asin(clamp(dy / dist, -1, 1));
  return Math.abs(want - cam.pitch) * (180 / Math.PI);
}
