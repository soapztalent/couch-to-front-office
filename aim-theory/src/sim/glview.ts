import type { Crosshair } from "../persist/storage";
import type { WorldDraw } from "./draw";
import { cameraBasis, forward, lineOfSight, type Camera, type Seg, type V3 } from "./geom";
import type { Actor } from "./lane";
import { playfieldScale } from "./surface";
import { EDGE_WALL, ENEMY_CLOSE, FAR_WALL, LANE } from "./world";

/**
 * Original first-person room. Boxes only: a bay, a corner, a block player, a viewmodel.
 * Nothing here is a copied map or a copied gun.
 */
export type PlateView = {
  fov: number;
  crosshair: Crosshair;
  yaw: number;
  pitch: number;
  targets: { yaw: number; pitch: number; radius: number; live: boolean }[];
  dimIdle?: boolean;
  grid?: boolean;
  flash?: boolean;
  mark?: { kind: "hit" | "miss"; yaw: number; pitch: number; age: number } | null;
  glued?: boolean;
  sway?: number;
};

export type WorldView = {
  size: () => { cssW: number; cssH: number; dpr: number };
  drawFight: (world: WorldDraw) => void;
  drawPlates: (view: PlateView) => void;
  drawHome: (t: number, lookX: number, lookY: number) => void;
  destroy: () => void;
};

type RGB = [number, number, number];

const FLOOR: RGB = [0.04, 0.048, 0.062];
const GRID: RGB = [0.2, 0.24, 0.3];
const CEIL: RGB = [0.07, 0.084, 0.11];
const WALL: RGB = [0.1, 0.125, 0.165];
const CORNER: RGB = [0.14, 0.18, 0.23];
const LIP: RGB = [0.839, 1, 0.275];
const HEAD: RGB = [0.93, 0.95, 0.97];
const BODY: RGB = [0.62, 0.68, 0.75];
const LEG: RGB = [0.32, 0.36, 0.42];
const VISOR: RGB = [0.03, 0.035, 0.045];
const GUN: RGB = [0.07, 0.086, 0.11];
const GUN2: RGB = [0.16, 0.2, 0.26];
const HOT: RGB = [1, 0.3, 0.23];
const DIM: RGB = [0.16, 0.18, 0.22];
const CRATE: RGB = [0.13, 0.15, 0.18];
const NORTH: RGB = [0.12, 0.15, 0.19];
const PILLAR: RGB = [0.11, 0.14, 0.18];

const ROOM = { x0: -6.6, x1: 7.4, z0: -4.4, z1: 12.6, y1: 3.55 };
const STAND = { x: -0.85, y: 1.62, z: -1.15 };

const HOME_ACTOR: Actor = { x: ENEMY_CLOSE.x, z: ENEMY_CLOSE.z, alive: true, role: "near" };
const HOME_WALLS: Seg[] = [EDGE_WALL, FAR_WALL];
const HOME_CROSS: Crosshair = {
  color: "#f4f7fb",
  length: 6,
  gap: 4,
  thickness: 2,
  outline: true,
  outlineColor: "#05070a",
  dot: false,
  dotSize: 1,
};

const VERT = `
attribute vec3 aPos;
attribute vec3 aColor;
uniform mat4 uMvp;
varying vec3 vColor;
void main() {
  vColor = aColor;
  gl_Position = uMvp * vec4(aPos, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

class Batch {
  data: Float32Array;
  n = 0;

  constructor(cap: number) {
    this.data = new Float32Array(cap);
  }

  reset(): void {
    this.n = 0;
  }

  private room(extra: number): void {
    if (this.n + extra <= this.data.length) return;
    const next = new Float32Array(Math.max(this.data.length * 2, this.n + extra));
    next.set(this.data);
    this.data = next;
  }

  vert(x: number, y: number, z: number, r: number, g: number, b: number): void {
    this.room(6);
    const i = this.n;
    this.data[i] = x;
    this.data[i + 1] = y;
    this.data[i + 2] = z;
    this.data[i + 3] = r;
    this.data[i + 4] = g;
    this.data[i + 5] = b;
    this.n += 6;
  }

  quad(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    x3: number,
    y3: number,
    z3: number,
    color: RGB,
    shade: number,
  ): void {
    const r = color[0] * shade;
    const g = color[1] * shade;
    const b = color[2] * shade;
    this.vert(x0, y0, z0, r, g, b);
    this.vert(x1, y1, z1, r, g, b);
    this.vert(x2, y2, z2, r, g, b);
    this.vert(x0, y0, z0, r, g, b);
    this.vert(x2, y2, z2, r, g, b);
    this.vert(x3, y3, z3, r, g, b);
  }

  copy(src: Float32Array): void {
    this.room(src.length);
    this.data.set(src, this.n);
    this.n += src.length;
  }
}

let bakedRoom: Float32Array | null = null;

function roomMesh(): Float32Array {
  if (bakedRoom) return bakedRoom;
  const batch = new Batch(24000);
  pushRoom(batch);
  bakedRoom = batch.data.slice(0, batch.n);
  return bakedRoom;
}

function pushBox(batch: Batch, x: number, y: number, z: number, w: number, h: number, d: number, color: RGB): void {
  const x1 = x + w;
  const y1 = y + h;
  const z1 = z + d;
  batch.quad(x, y1, z, x1, y1, z, x1, y1, z1, x, y1, z1, color, 1);
  batch.quad(x, y, z1, x1, y, z1, x1, y, z, x, y, z, color, 0.42);
  batch.quad(x, y, z1, x1, y, z1, x1, y1, z1, x, y1, z1, color, 0.82);
  batch.quad(x1, y, z, x, y, z, x, y1, z, x1, y1, z, color, 0.58);
  batch.quad(x1, y, z1, x1, y, z, x1, y1, z, x1, y1, z1, color, 0.72);
  batch.quad(x, y, z, x, y, z1, x, y1, z1, x, y1, z, color, 0.5);
}

function pushRoom(batch: Batch): void {
  const { x0, x1, z0, z1, y1 } = ROOM;
  const w = x1 - x0;
  const d = z1 - z0;
  pushBox(batch, x0, -0.25, z0, w, 0.25, d, FLOOR);
  pushBox(batch, x0, y1, z0, w, 0.22, d, CEIL);
  pushBox(batch, x0 - 0.28, 0, z0, 0.28, y1, d, WALL);
  pushBox(batch, x1, 0, z0, 0.28, y1, d, WALL);
  pushBox(batch, x0, 0, z0 - 0.28, w, y1, 0.28, WALL);
  pushBox(batch, x0, 0, z1, w, y1, 0.28, NORTH);
  const gy = 0.012;
  for (let x = -6; x <= 7; x += 1) batch.quad(x - 0.012, gy, z0, x + 0.012, gy, z0, x + 0.012, gy, z1, x - 0.012, gy, z1, GRID, 1);
  for (let z = -4; z <= 12; z += 1) batch.quad(x0, gy, z - 0.012, x1, gy, z - 0.012, x1, gy, z + 0.012, x0, gy, z + 0.012, GRID, 1);
  pushBox(batch, -4.35, 0, -2.55, 0.72, 0.46, 0.72, CRATE);
  pushBox(batch, 5.35, 0, 6.4, 0.42, y1, 0.42, PILLAR);
  pushBox(batch, 0.4, y1 - 0.06, 2.2, 1.4, 0.04, 0.28, LIP);
}

function pushWall(batch: Batch, wall: Seg): void {
  const dx = wall.b.x - wall.a.x;
  const dz = wall.b.z - wall.a.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * 0.07;
  const nz = (dx / len) * 0.07;
  const tall = 2.82;
  const a = wall.a;
  const b = wall.b;
  const a2 = { x: a.x + nx, z: a.z + nz };
  const b2 = { x: b.x + nx, z: b.z + nz };
  const y0 = 0;
  batch.quad(a.x, y0, a.z, b.x, y0, b.z, b.x, tall, b.z, a.x, tall, a.z, CORNER, 0.9);
  batch.quad(b2.x, y0, b2.z, a2.x, y0, a2.z, a2.x, tall, a2.z, b2.x, tall, b2.z, CORNER, 0.55);
  batch.quad(a2.x, y0, a2.z, a.x, y0, a.z, a.x, tall, a.z, a2.x, tall, a2.z, CORNER, 0.7);
  batch.quad(b.x, y0, b.z, b2.x, y0, b2.z, b2.x, tall, b2.z, b.x, tall, b.z, CORNER, 0.66);
  batch.quad(a.x, tall, a.z, b.x, tall, b.z, b.x, tall + 0.045, b.z, a.x, tall + 0.045, a.z, LIP, 1);
}

function pushFighter(batch: Batch, x: number, foot: number, z: number, scale: number, body: RGB, head: RGB, ring: boolean): void {
  const s = scale;
  const y = foot;
  pushBox(batch, x - 0.1 * s, y, z - 0.05 * s, 0.08 * s, 0.78 * s, 0.1 * s, LEG);
  pushBox(batch, x + 0.02 * s, y, z - 0.05 * s, 0.08 * s, 0.78 * s, 0.1 * s, LEG);
  pushBox(batch, x - 0.16 * s, y + 0.74 * s, z - 0.08 * s, 0.32 * s, 0.46 * s, 0.16 * s, body);
  pushBox(batch, x - 0.3 * s, y + 1.05 * s, z - 0.07 * s, 0.14 * s, 0.14 * s, 0.14 * s, body);
  pushBox(batch, x + 0.16 * s, y + 1.05 * s, z - 0.07 * s, 0.14 * s, 0.14 * s, 0.14 * s, body);
  pushBox(batch, x - 0.1 * s, y + 1.28 * s, z - 0.09 * s, 0.2 * s, 0.3 * s, 0.18 * s, head);
  pushBox(batch, x - 0.105 * s, y + 1.4 * s, z - 0.096 * s, 0.21 * s, 0.05 * s, 0.192 * s, VISOR);
  if (ring) pushBox(batch, x - 0.13 * s, y + 1.56 * s, z - 0.11 * s, 0.26 * s, 0.025 * s, 0.22 * s, LIP);
}

function pushGun(batch: Batch, sway: number): void {
  const kick = Math.min(0.07, Math.abs(sway) * 0.028);
  const ox = 0.16 + kick;
  const oy = -0.2 - kick * 0.25;
  const oz = -0.55;
  pushBox(batch, ox - 0.03, oy - 0.045, oz - 0.02, 0.06, 0.07, 0.28, GUN2);
  pushBox(batch, ox - 0.012, oy - 0.012, oz - 0.34, 0.024, 0.024, 0.34, GUN);
  pushBox(batch, ox - 0.018, oy - 0.14, oz + 0.04, 0.036, 0.12, 0.05, GUN);
  pushBox(batch, ox - 0.025, oy - 0.03, oz + 0.22, 0.05, 0.055, 0.16, GUN);
  pushBox(batch, ox - 0.01, oy + 0.04, oz + 0.02, 0.02, 0.018, 0.07, LIP);
}

function rgbOf(hex: string): RGB {
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) return [0.96, 0.97, 0.98];
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function viewOf(cam: Camera, out: Float32Array): void {
  const b = cameraBasis(cam, { w: 2, h: 2, fov: 90 });
  out[0] = b.rx;
  out[1] = b.ux;
  out[2] = -b.fx;
  out[3] = 0;
  out[4] = b.ry;
  out[5] = b.uy;
  out[6] = -b.fy;
  out[7] = 0;
  out[8] = b.rz;
  out[9] = b.uz;
  out[10] = -b.fz;
  out[11] = 0;
  out[12] = -(b.rx * cam.x + b.ry * cam.y + b.rz * cam.z);
  out[13] = -(b.ux * cam.x + b.uy * cam.y + b.uz * cam.z);
  out[14] = b.fx * cam.x + b.fy * cam.y + b.fz * cam.z;
  out[15] = 1;
}

function perspective(out: Float32Array, fovDeg: number, aspect: number): void {
  const xf = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const yf = xf * aspect;
  const near = 0.05;
  const far = 80;
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = xf;
  out[5] = yf;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
}

function multiply(out: Float32Array, a: Float32Array, b: Float32Array): void {
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
}

/** Where a world point lands. x right, y up, in front when w > 0. */
export function ndcOf(cam: Camera, p: V3, fov: number, aspect: number): { x: number; y: number; w: number } {
  const view = new Float32Array(16);
  const proj = new Float32Array(16);
  const mvp = new Float32Array(16);
  viewOf(cam, view);
  perspective(proj, fov, aspect);
  multiply(mvp, proj, view);
  const x = mvp[0] * p.x + mvp[4] * p.y + mvp[8] * p.z + mvp[12];
  const y = mvp[1] * p.x + mvp[5] * p.y + mvp[9] * p.z + mvp[13];
  const w = mvp[3] * p.x + mvp[7] * p.y + mvp[11] * p.z + mvp[15];
  return { x: x / w, y: y / w, w };
}

type Aabb = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };

const BLOCKS: Aabb[] = [
  { x0: -0.08, x1: 0.02, y0: 0, y1: 2.9, z0: 0, z1: 8 },
  { x0: 2.37, x1: 2.52, y0: 0, y1: 2.9, z0: 0.35, z1: 8 },
];

function rayAabb(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, box: Aabb): number | null {
  let tmin = 0;
  let tmax = 80;
  const slab = (o: number, d: number, min: number, max: number): boolean => {
    if (Math.abs(d) < 1e-8) return o >= min && o <= max;
    let t0 = (min - o) / d;
    let t1 = (max - o) / d;
    if (t0 > t1) {
      const s = t0;
      t0 = t1;
      t1 = s;
    }
    tmin = Math.max(tmin, t0);
    tmax = Math.min(tmax, t1);
    return tmax >= tmin;
  };
  if (!slab(ox, dx, box.x0, box.x1)) return null;
  if (!slab(oy, dy, box.y0, box.y1)) return null;
  if (!slab(oz, dz, box.z0, box.z1)) return null;
  if (tmax < 0) return null;
  return tmin > 0 ? tmin : tmax;
}

function platePoint(cam: Camera, yawDeg: number, pitchDeg: number): { x: number; y: number; z: number; dist: number } {
  const dir = forward((yawDeg * Math.PI) / 180, (pitchDeg * Math.PI) / 180);
  let limit = 6.2;
  for (const box of BLOCKS) {
    const hit = rayAabb(cam.x, cam.y, cam.z, dir.x, dir.y, dir.z, box);
    if (hit != null && hit > 0.8 && hit < limit) limit = hit - 0.45;
  }
  let dist = Math.max(1.35, limit);
  for (let i = 0; i < 6; i += 1) {
    const x = cam.x + dir.x * dist;
    const y = cam.y + dir.y * dist;
    const z = cam.z + dir.z * dist;
    const inside =
      x > ROOM.x0 + 0.35 &&
      x < ROOM.x1 - 0.35 &&
      y > 0.28 &&
      y < ROOM.y1 - 0.28 &&
      z > ROOM.z0 + 0.35 &&
      z < ROOM.z1 - 0.35;
    if (inside) return { x, y, z, dist };
    dist *= 0.72;
  }
  return { x: cam.x + dir.x * dist, y: cam.y + dir.y * dist, z: cam.z + dir.z * dist, dist };
}

const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function pushCross(batch: Batch, w: number, h: number, cross: Crosshair): void {
  const color = rgbOf(cross.color);
  const outline = rgbOf(cross.outlineColor);
  const arm = (x: number, y: number, rw: number, rh: number, rgb: RGB) => {
    const x0 = (x / w) * 2;
    const y0 = (-y / h) * 2;
    const x1 = ((x + rw) / w) * 2;
    const y1 = (-(y + rh) / h) * 2;
    batch.quad(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0, rgb, 1);
  };
  const paint = (grow: number, rgb: RGB) => {
    const t = cross.thickness + grow;
    const gap = cross.gap;
    const len = cross.length;
    arm(-gap - len, -t / 2, len, t, rgb);
    arm(gap, -t / 2, len, t, rgb);
    arm(-t / 2, -gap - len, t, len, rgb);
    arm(-t / 2, gap, t, len, rgb);
    if (cross.dot) arm(-cross.dotSize - grow / 2, -cross.dotSize - grow / 2, (cross.dotSize + grow / 2) * 2, (cross.dotSize + grow / 2) * 2, rgb);
  };
  if (cross.outline) paint(2, outline);
  paint(0, color);
}

function pushImpact(batch: Batch, w: number, h: number, x: number, y: number, kind: "hit" | "miss"): void {
  const rgb = kind === "hit" ? LIP : HOT;
  const tick = (x0: number, y0: number, rw: number, rh: number) => {
    const a = ((x + x0) / w) * 2;
    const b = (-(y + y0) / h) * 2;
    const c = ((x + x0 + rw) / w) * 2;
    const d = (-(y + y0 + rh) / h) * 2;
    batch.quad(a, b, 0, c, b, 0, c, d, 0, a, d, 0, rgb, 1);
  };
  tick(-26, -1.5, 10, 3);
  tick(16, -1.5, 10, 3);
  tick(-1.5, -26, 3, 10);
  tick(-1.5, 16, 3, 10);
}

export function attachWorld(canvas: HTMLCanvasElement): WorldView {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: true,
    stencil: false,
    desynchronized: true,
    powerPreference: "high-performance",
  });
  if (!gl) throw new Error("webgl2 unavailable");

  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) throw new Error("shader unavailable");
  gl.shaderSource(vs, VERT);
  gl.shaderSource(fs, FRAG);
  gl.compileShader(vs);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs) || "vertex shader");
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs) || "fragment shader");
  const program = gl.createProgram();
  if (!program) throw new Error("program unavailable");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.bindAttribLocation(program, 1, "aColor");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link");
  const mvpLoc = gl.getUniformLocation(program, "uMvp");

  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindVertexArray(null);

  const world = new Batch(48000);
  const gun = new Batch(2048);
  const hud = new Batch(2048);
  const viewM = new Float32Array(16);
  const projM = new Float32Array(16);
  const mvpM = new Float32Array(16);
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let lost = false;

  const apply = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    const scale = playfieldScale(w, h, window.devicePixelRatio || 1);
    const bw = Math.max(1, Math.round(w * scale));
    const bh = Math.max(1, Math.round(h * scale));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    cssW = w;
    cssH = h;
    dpr = bw / w;
  };

  const observer = new ResizeObserver(apply);
  observer.observe(canvas);
  apply();
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
  });

  const flush = (batch: Batch, mvp: Float32Array, depth: boolean) => {
    if (batch.n < 18) return;
    gl.uniformMatrix4fv(mvpLoc, false, mvp);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.data.subarray(0, batch.n), gl.DYNAMIC_DRAW);
    if (depth) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, batch.n / 6);
  };

  const frame = (cam: Camera, fov: number, fill: (batch: Batch) => void, cross: Crosshair, sway: number, flash: WorldDraw["flash"]) => {
    if (lost || cssW < 2 || cssH < 2) return;
    const aspect = canvas.width / canvas.height || cssW / cssH;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.027, 0.035, 0.051, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    world.reset();
    fill(world);
    viewOf(cam, viewM);
    perspective(projM, fov, aspect);
    multiply(mvpM, projM, viewM);
    flush(world, mvpM, true);
    gun.reset();
    pushGun(gun, sway);
    flush(gun, projM, false);
    hud.reset();
    if (flash === "hurt") {
      const bar = 5;
      const span = (bar / cssW) * 2;
      hud.quad(-1, -1, 0, -1 + span, -1, 0, -1 + span, 1, 0, -1, 1, 0, HOT, 1);
      hud.quad(1 - span, -1, 0, 1, -1, 0, 1, 1, 0, 1 - span, 1, 0, HOT, 1);
    }
    pushCross(hud, cssW, cssH, cross);
    flush(hud, IDENTITY, false);
    gl.bindVertexArray(null);
  };

  const paintFight = (scene: WorldDraw) => {
    frame(
      scene.camera,
      scene.fov,
      (batch) => {
        batch.copy(roomMesh());
        for (const wall of scene.walls) pushWall(batch, wall);
        const from = { x: scene.camera.x, z: scene.camera.z };
        for (const actor of scene.actors) {
          if (!actor.alive) continue;
          if (!lineOfSight(from, actor, scene.walls)) continue;
          pushFighter(batch, actor.x, 0, actor.z, 1, BODY, HEAD, true);
        }
        if (scene.pip) {
          pushBox(batch, scene.pip.x - 0.045, LANE.head - 0.045, scene.pip.z - 0.045, 0.09, 0.09, 0.09, LIP);
        }
      },
      scene.crosshair,
      scene.sway ?? 0,
      scene.flash,
    );
  };

  return {
    size: () => ({ cssW, cssH, dpr }),
    drawFight: paintFight,
    drawPlates: (picture) => {
      const cam: Camera = {
        x: STAND.x,
        y: STAND.y,
        z: STAND.z,
        yaw: (picture.yaw * Math.PI) / 180,
        pitch: (picture.pitch * Math.PI) / 180,
      };
      frame(
        cam,
        picture.fov,
        (batch) => {
          batch.copy(roomMesh());
          pushWall(batch, EDGE_WALL);
          pushWall(batch, FAR_WALL);
          for (const target of picture.targets) {
            const spot = platePoint(cam, target.yaw, target.pitch);
            const live = !(picture.dimIdle && !target.live);
            const half = Math.max(0.05, spot.dist * Math.tan((target.radius * Math.PI) / 180));
            const height = 1.6;
            const scale = (half * 2) / height;
            const body = live ? (picture.glued && target.live ? HEAD : BODY) : DIM;
            const head = live ? HEAD : DIM;
            pushFighter(batch, spot.x, spot.y - height * 0.5 * scale, spot.z, scale, body, head, live);
          }
        },
        picture.crosshair,
        picture.sway ?? Math.sin(performance.now() / 220) * 0.25,
        null,
      );
      if (cssW < 2) return;
      hud.reset();
      if (picture.flash) pushImpact(hud, cssW, cssH, 0, 0, "hit");
      const mark = picture.mark;
      if (mark && mark.age >= 0 && mark.age <= 0.12) {
        const spot = platePoint(cam, mark.yaw, mark.pitch);
        const ndc = ndcOf(cam, spot, picture.fov, canvas.width / canvas.height || 1);
        if (ndc.w > 0) pushImpact(hud, cssW, cssH, (ndc.x * cssW) / 2, (-ndc.y * cssH) / 2, mark.kind);
      }
      if (hud.n >= 18) {
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        flush(hud, IDENTITY, false);
        gl.bindVertexArray(null);
      }
    },
    drawHome: (t, lookX, lookY) => {
      paintFight({
        camera: {
          x: -1.05 + Math.sin(t * 0.35) * 0.28,
          y: 1.6,
          z: -0.72,
          yaw: 0.46 + Math.sin(t * 0.22) * 0.1 + lookX * 0.2,
          pitch: -0.03 - lookY * 0.06,
        },
        walls: HOME_WALLS,
        actors: [HOME_ACTOR],
        pip: ENEMY_CLOSE,
        fov: 106,
        crosshair: HOME_CROSS,
        flash: null,
        sway: Math.abs(Math.sin(t * 1.5)) * 0.7,
      });
    },
    destroy: () => {
      observer.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
    },
  };
}
