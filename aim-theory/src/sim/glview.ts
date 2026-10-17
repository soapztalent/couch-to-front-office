import type { Crosshair } from "../persist/storage";
import { parsePerson } from "./person";
import type { WorldDraw } from "./draw";
import { cameraBasis, forward, lineOfSight, type Camera, type Seg, type V3 } from "./geom";
import type { Actor } from "./lane";
import { playfieldScale } from "./surface";
import { EDGE_WALL, ENEMY_CLOSE, FAR_WALL, LANE } from "./world";

/**
 * Original first-person room. The figure, the carbine, and the bay are built here.
 * Nothing is a copied character, map, or gun.
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

export type BayFigure = { x: number; y: number; z: number; scale: number; yaw: number; tone: number };

export type WorldView = {
  size: () => { cssW: number; cssH: number; dpr: number };
  drawFight: (world: WorldDraw) => void;
  drawPlates: (view: PlateView) => void;
  drawHome: (t: number, lookX: number, lookY: number) => void;
  /** The room you stand in between fights. The score board is a quad on the left wall. */
  drawBay: (cam: Camera, figures: BayFigure[], cross: Crosshair, fov: number, solid?: boolean) => void;
  /** Upload a new board image. The frame loop does not rebuild it. */
  setBoard: (source: TexImageSource | null) => void;
  destroy: () => void;
};

type RGB = [number, number, number];

const SKIN: RGB = [0.74, 0.56, 0.46];
const JACKET: RGB = [0.46, 0.49, 0.54];
const PLASTER: RGB = [0.28, 0.3, 0.33];
const PLASTER_DIM: RGB = [0.2, 0.22, 0.25];
const CONCRETE: RGB = [0.16, 0.165, 0.175];
const SEAM: RGB = [0.07, 0.075, 0.085];
const METAL: RGB = [0.34, 0.36, 0.38];
const METAL_DARK: RGB = [0.16, 0.17, 0.18];
const POLY: RGB = [0.09, 0.095, 0.1];
const WOOD: RGB = [0.28, 0.18, 0.11];
const WOOD_DARK: RGB = [0.16, 0.1, 0.06];
const LIP: RGB = [0.839, 1, 0.275];
const HOT: RGB = [1, 0.3, 0.23];
const LAMP: RGB = [0.95, 0.92, 0.82];

/** 0 skin, 1 cloth, 2 metal, 3 wall, 4 floor, 5 emissive. */
const M_SKIN = 0;
const M_CLOTH = 1;
const M_METAL = 2;
const M_WALL = 3;
const M_FLOOR = 4;
const M_EMIT = 5;

const STRIDE = 10;
const ROOM = { x0: -6.6, x1: 7.4, z0: -4.4, z1: 12.6, y1: 3.55 };
const STAND = { x: -0.85, y: 1.62, z: -1.15 };
const FIGURE_H = 1.7;

/** Tight full-body frame. The card uses this same frustum, so the portrait is life size. */
const PORTRAIT_W = 1024;
const PORTRAIT_H = 2304;
const PORTRAIT_FOV = 22;
const BAKE_Y = 0.86;
const BAKE_Z = 2.35;

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

/** Front and back of the shipped person, baked once from the dense GLB. */
const PORTRAIT_VERT = `
attribute vec3 aPos;
attribute vec2 aUv;
uniform mat4 uMvp;
uniform mat4 uModel;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = uMvp * uModel * vec4(aPos, 1.0);
}
`;

const PORTRAIT_FRAG = `
precision mediump float;
uniform sampler2D uFront;
uniform sampler2D uBack;
uniform float uTone;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  vec4 c;
  if (gl_FrontFacing) c = texture2D(uFront, uv);
  else {
    uv.x = 1.0 - uv.x;
    c = texture2D(uBack, uv);
  }
  if (c.a < 0.4) discard;
  gl_FragColor = vec4(c.rgb * uTone, 1.0);
}
`;

const PERSON_VERT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNrm;
layout(location = 2) in vec2 aUv;
uniform mat4 uMvp;
uniform mat4 uView;
uniform mat3 uNmat;
out vec2 vUv;
out vec3 vN;
out vec3 vView;
void main() {
  vUv = aUv;
  vN = normalize(uNmat * aNrm);
  vView = (uView * vec4(aPos, 1.0)).xyz;
  gl_Position = uMvp * vec4(aPos, 1.0);
}
`;

const PERSON_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uNrm;
uniform sampler2D uRough;
uniform float uCutoff;
uniform float uTone;
in vec2 vUv;
in vec3 vN;
in vec3 vView;
out vec4 outColor;
void main() {
  vec4 tex = texture(uTex, vUv);
  if (uCutoff > 0.0 && tex.a < uCutoff) discard;
  vec3 N = normalize(vN);
  // The scan normal map is an image-space filter, not a tangent bake. Derivative
  // tangents turn UV borders (hair, brows, collar, jacket seams) into black streaks.
  float rough = texture(uRough, vUv).g;
  vec3 V = normalize(-vView);
  vec3 key = normalize(vec3(0.42, 0.78, 0.55));
  vec3 fillL = normalize(vec3(-0.62, 0.28, 0.42));
  float ndl = dot(N, key);
  float lambert = clamp(ndl, 0.0, 1.0);
  float wrap = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
  float skin = 1.0 - smoothstep(0.34, 0.62, rough);
  float lit = mix(wrap, lambert, 0.35);
  float fill = clamp(dot(N, fillL) * 0.5 + 0.5, 0.0, 1.0);
  vec3 albedo = tex.rgb;
  vec3 color = albedo * (vec3(0.18, 0.17, 0.16) + vec3(0.92, 0.84, 0.74) * lit + vec3(0.16, 0.18, 0.22) * fill);
  vec3 H = normalize(key + V);
  float nh = max(dot(N, H), 0.0);
  float gloss = mix(10.0, 72.0, 1.0 - rough);
  float spec = pow(nh, gloss) * (1.0 - rough) * 0.12;
  color += spec * vec3(1.0, 0.97, 0.92);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  color += fres * mix(0.02, 0.1, skin) * albedo;
  outColor = vec4(color * uTone, 1.0);
}
`;

const VERT = `
attribute vec3 aPos;
attribute vec3 aNrm;
attribute vec3 aColor;
attribute float aMat;
uniform mat4 uMvp;
uniform mat4 uModel;
uniform mat3 uNmat;
uniform float uTone;
uniform vec3 uKey;
uniform vec3 uFill;
uniform vec3 uUp;
varying vec3 vColor;
varying float vMat;
varying float vY;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vec3 albedo = aColor * uTone;
  vec3 N = normalize(uNmat * aNrm);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float ndl = max(dot(N, uKey), 0.0);
  float wrap = clamp(dot(N, uKey) * 0.5 + 0.5, 0.0, 1.0);
  float fill = max(dot(N, uFill), 0.0);
  float hemi = clamp(dot(N, uUp) * 0.5 + 0.5, 0.0, 1.0);
  vec3 H = normalize(uKey + V);
  float spec = max(dot(N, H), 0.0);
  spec = spec * spec;
  spec = spec * spec;
  spec = spec * spec;
  float fres = 1.0 - max(dot(N, V), 0.0);
  fres = fres * fres;
  float skin = step(aMat, 0.5);
  float cloth = step(0.5, aMat) * step(aMat, 1.5);
  float metal = step(1.5, aMat) * step(aMat, 2.5);
  float emit = step(4.5, aMat);
  float lit = mix(ndl, wrap, skin * 0.9 + cloth * 0.4);
  vec3 amb = mix(vec3(0.07, 0.074, 0.082), vec3(0.2, 0.21, 0.23), hemi);
  vec3 specCol = mix(vec3(0.04), albedo, metal);
  float specK = skin * 0.02 + cloth * 0.012 + metal * 0.7 + 0.008;
  vec3 color = albedo * (amb + lit * vec3(0.78, 0.74, 0.66) + fill * vec3(0.26, 0.28, 0.32));
  color += specCol * spec * specK;
  color += mix(vec3(0.04), albedo, metal) * fres * (0.08 + metal * 0.22);
  vColor = mix(color, albedo, emit);
  vMat = aMat;
  vY = world.y;
  gl_Position = uMvp * world;
}
`;

const FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vMat;
varying float vY;
void main() {
  float emit = step(4.5, vMat);
  float ground = mix(0.4, 1.0, smoothstep(0.0, 1.15, vY));
  float crown = mix(0.7, 1.0, smoothstep(3.45, 1.7, vY));
  float contact = mix(1.0, ground * crown, step(2.5, vMat) * (1.0 - emit));
  gl_FragColor = vec4(vColor * contact, 1.0);
}
`;

const UNLIT_VERT = `
attribute vec3 aPos;
attribute vec3 aNrm;
attribute vec3 aColor;
attribute float aMat;
uniform mat4 uMvp;
varying vec3 vColor;
void main() {
  vColor = aColor;
  gl_Position = uMvp * vec4(aPos, 1.0);
}
`;

const UNLIT_FRAG = `
precision mediump float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

const BOARD_VERT = `
attribute vec3 aPos;
attribute vec2 aUv;
uniform mat4 uMvp;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = uMvp * vec4(aPos, 1.0);
}
`;

const BOARD_FRAG = `
precision mediump float;
uniform sampler2D uTex;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uTex, vUv);
}
`;

/** Left wall, facing into the room. Just clear of the plaster. */
const BOARD_QUAD = new Float32Array([
  -6.32, 1.12, 1.2, 0, 0,
  -6.32, 1.12, 3.05, 1, 0,
  -6.32, 2.22, 3.05, 1, 1,
  -6.32, 1.12, 1.2, 0, 0,
  -6.32, 2.22, 3.05, 1, 1,
  -6.32, 2.22, 1.2, 0, 1,
]);

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

  vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, r: number, g: number, b: number, mat: number): void {
    this.room(STRIDE);
    const i = this.n;
    this.data[i] = x;
    this.data[i + 1] = y;
    this.data[i + 2] = z;
    this.data[i + 3] = nx;
    this.data[i + 4] = ny;
    this.data[i + 5] = nz;
    this.data[i + 6] = r;
    this.data[i + 7] = g;
    this.data[i + 8] = b;
    this.data[i + 9] = mat;
    this.n += STRIDE;
  }

  face(
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    x3: number, y3: number, z3: number,
    nx: number, ny: number, nz: number,
    color: RGB, mat: number,
  ): void {
    const r = color[0];
    const g = color[1];
    const b = color[2];
    this.vert(x0, y0, z0, nx, ny, nz, r, g, b, mat);
    this.vert(x1, y1, z1, nx, ny, nz, r, g, b, mat);
    this.vert(x2, y2, z2, nx, ny, nz, r, g, b, mat);
    this.vert(x0, y0, z0, nx, ny, nz, r, g, b, mat);
    this.vert(x2, y2, z2, nx, ny, nz, r, g, b, mat);
    this.vert(x3, y3, z3, nx, ny, nz, r, g, b, mat);
  }

  copy(src: Float32Array): void {
    this.room(src.length);
    this.data.set(src, this.n);
    this.n += src.length;
  }
}

class Fig {
  p: number[] = [];
  c: number[] = [];
  m: number[] = [];
  ix: number[] = [];

  add(x: number, y: number, z: number, color: RGB, mat: number): number {
    const i = this.p.length / 3;
    this.p.push(x, y, z);
    this.c.push(color[0], color[1], color[2]);
    this.m.push(mat);
    return i;
  }

  triOut(a: number, b: number, c: number, ox: number, oy: number, oz: number): void {
    const ax = this.p[a * 3];
    const ay = this.p[a * 3 + 1];
    const az = this.p[a * 3 + 2];
    const bx = this.p[b * 3];
    const by = this.p[b * 3 + 1];
    const bz = this.p[b * 3 + 2];
    const cx = this.p[c * 3];
    const cy = this.p[c * 3 + 1];
    const cz = this.p[c * 3 + 2];
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const mx = (ax + bx + cx) / 3 - ox;
    const my = (ay + by + cy) / 3 - oy;
    const mz = (az + bz + cz) / 3 - oz;
    if (nx * mx + ny * my + nz * mz < 0) this.ix.push(a, c, b);
    else this.ix.push(a, b, c);
  }

  pack(): Float32Array {
    const count = this.p.length / 3;
    const nx = new Float32Array(count);
    const ny = new Float32Array(count);
    const nz = new Float32Array(count);
    for (let t = 0; t < this.ix.length; t += 3) {
      const a = this.ix[t];
      const b = this.ix[t + 1];
      const c = this.ix[t + 2];
      const ax = this.p[a * 3];
      const ay = this.p[a * 3 + 1];
      const az = this.p[a * 3 + 2];
      const ux = this.p[b * 3] - ax;
      const uy = this.p[b * 3 + 1] - ay;
      const uz = this.p[b * 3 + 2] - az;
      const vx = this.p[c * 3] - ax;
      const vy = this.p[c * 3 + 1] - ay;
      const vz = this.p[c * 3 + 2] - az;
      const fnx = uy * vz - uz * vy;
      const fny = uz * vx - ux * vz;
      const fnz = ux * vy - uy * vx;
      nx[a] += fnx;
      ny[a] += fny;
      nz[a] += fnz;
      nx[b] += fnx;
      ny[b] += fny;
      nz[b] += fnz;
      nx[c] += fnx;
      ny[c] += fny;
      nz[c] += fnz;
    }
    const out = new Float32Array(this.ix.length * STRIDE);
    let o = 0;
    for (let t = 0; t < this.ix.length; t += 1) {
      const i = this.ix[t];
      const len = Math.hypot(nx[i], ny[i], nz[i]) || 1;
      out[o] = this.p[i * 3];
      out[o + 1] = this.p[i * 3 + 1];
      out[o + 2] = this.p[i * 3 + 2];
      out[o + 3] = nx[i] / len;
      out[o + 4] = ny[i] / len;
      out[o + 5] = nz[i] / len;
      out[o + 6] = this.c[i * 3];
      out[o + 7] = this.c[i * 3 + 1];
      out[o + 8] = this.c[i * 3 + 2];
      out[o + 9] = this.m[i];
      o += STRIDE;
    }
    return out;
  }
}

function ellipsoid(fig: Fig, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, slices: number, stacks: number, color: RGB, mat: number, keep?: (y: number, z: number) => boolean): void {
  const rows: number[][] = [];
  for (let iy = 0; iy <= stacks; iy += 1) {
    const phi = (iy / stacks) * Math.PI;
    const sy = Math.cos(phi);
    const sr = Math.sin(phi);
    if (iy === 0 || iy === stacks) {
      rows.push([fig.add(cx, cy + sy * ry, cz, color, mat)]);
      continue;
    }
    const row: number[] = [];
    for (let ix = 0; ix < slices; ix += 1) {
      const theta = (ix / slices) * Math.PI * 2;
      const sx = sr * Math.cos(theta);
      const sz = sr * Math.sin(theta);
      row.push(fig.add(cx + sx * rx, cy + sy * ry, cz + sz * rz, color, mat));
    }
    rows.push(row);
  }
  for (let iy = 0; iy < stacks; iy += 1) {
    const top = rows[iy];
    const bot = rows[iy + 1];
    for (let ix = 0; ix < slices; ix += 1) {
      const ix2 = (ix + 1) % slices;
      const sample = top.length === 1 ? bot[ix] : top[ix];
      if (keep && !keep(fig.p[sample * 3 + 1], fig.p[sample * 3 + 2])) continue;
      if (top.length === 1) fig.triOut(top[0], bot[ix2], bot[ix], cx, cy, cz);
      else if (bot.length === 1) fig.triOut(top[ix], top[ix2], bot[0], cx, cy, cz);
      else {
        fig.triOut(top[ix], top[ix2], bot[ix], cx, cy, cz);
        fig.triOut(top[ix2], bot[ix2], bot[ix], cx, cy, cz);
      }
    }
  }
}

function tube(fig: Fig, ax: number, ay: number, az: number, bx: number, by: number, bz: number, radius: number, slices: number, color: RGB, mat: number): void {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const wx = dx / len;
  const wy = dy / len;
  const wz = dz / len;
  let hx = 0;
  let hy = 1;
  let hz = 0;
  if (Math.abs(wy) > 0.85) {
    hx = 1;
    hy = 0;
  }
  let ux = hy * wz - hz * wy;
  let uy = hz * wx - hx * wz;
  let uz = hx * wy - hy * wx;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  const vx = wy * uz - wz * uy;
  const vy = wz * ux - wx * uz;
  const vz = wx * uy - wy * ux;
  const rowA: number[] = [];
  const rowB: number[] = [];
  for (let i = 0; i < slices; i += 1) {
    const t = (i / slices) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const ox = (ux * c + vx * s) * radius;
    const oy = (uy * c + vy * s) * radius;
    const oz = (uz * c + vz * s) * radius;
    rowA.push(fig.add(ax + ox, ay + oy, az + oz, color, mat));
    rowB.push(fig.add(bx + ox, by + oy, bz + oz, color, mat));
  }
  rowA.push(rowA[0]);
  rowB.push(rowB[0]);
  const mx = (ax + bx) * 0.5;
  const my = (ay + by) * 0.5;
  const mz = (az + bz) * 0.5;
  for (let i = 0; i < slices; i += 1) {
    fig.triOut(rowA[i], rowB[i], rowA[i + 1], mx, my, mz);
    fig.triOut(rowA[i + 1], rowB[i], rowB[i + 1], mx, my, mz);
  }
  const ca = fig.add(ax, ay, az, color, mat);
  const cb = fig.add(bx, by, bz, color, mat);
  for (let i = 0; i < slices; i += 1) {
    fig.triOut(ca, rowA[i], rowA[i + 1], mx, my, mz);
    fig.triOut(cb, rowB[i], rowB[i + 1], mx, my, mz);
  }
}

function limb(fig: Fig, ax: number, ay: number, az: number, bx: number, by: number, bz: number, radius: number, color: RGB, mat: number): void {
  tube(fig, ax, ay, az, bx, by, bz, radius, 11, color, mat);
}

function portraitQuad(): Float32Array {
  const hx = BAKE_Z * Math.tan((PORTRAIT_FOV * Math.PI) / 360);
  const hy = hx / (PORTRAIT_W / PORTRAIT_H);
  const y0 = BAKE_Y - hy;
  const y1 = BAKE_Y + hy;
  const xPos = hx;
  const xNeg = -hx;
  return new Float32Array([
    xPos, y0, 0, 0, 0,
    xNeg, y0, 0, 1, 0,
    xNeg, y1, 0, 1, 1,
    xPos, y0, 0, 0, 0,
    xNeg, y1, 0, 1, 1,
    xPos, y1, 0, 0, 1,
  ]);
}

export { humanSpan, humanTriangles } from "./person";

function pushBox(batch: Batch, x: number, y: number, z: number, w: number, h: number, d: number, color: RGB, mat: number): void {
  const x1 = x + w;
  const y1 = y + h;
  const z1 = z + d;
  batch.face(x, y1, z, x1, y1, z, x1, y1, z1, x, y1, z1, 0, 1, 0, color, mat);
  batch.face(x, y, z1, x1, y, z1, x1, y, z, x, y, z, 0, -1, 0, color, mat);
  batch.face(x, y, z1, x1, y, z1, x1, y1, z1, x, y1, z1, 0, 0, 1, color, mat);
  batch.face(x1, y, z, x, y, z, x, y1, z, x1, y1, z, 0, 0, -1, color, mat);
  batch.face(x1, y, z1, x1, y, z, x1, y1, z, x1, y1, z1, 1, 0, 0, color, mat);
  batch.face(x, y, z, x, y, z1, x, y1, z1, x, y1, z, -1, 0, 0, color, mat);
}

let bakedRoom: Float32Array | null = null;

function pushRoom(batch: Batch): void {
  const { x0, x1, z0, z1, y1 } = ROOM;
  const w = x1 - x0;
  const d = z1 - z0;
  pushBox(batch, x0, -0.25, z0, w, 0.25, d, CONCRETE, M_FLOOR);
  pushBox(batch, x0, y1, z0, w, 0.18, d, PLASTER_DIM, M_WALL);
  pushBox(batch, x0 - 0.28, 0, z0, 0.28, y1, d, PLASTER, M_WALL);
  pushBox(batch, x1, 0, z0, 0.28, y1, d, PLASTER, M_WALL);
  pushBox(batch, x0, 0, z0 - 0.28, w, y1, 0.28, PLASTER, M_WALL);
  pushBox(batch, x0, 0, z1, w, y1, 0.28, PLASTER_DIM, M_WALL);
  pushBox(batch, x0, 0, z0, w, 0.08, 0.06, PLASTER_DIM, M_WALL);
  pushBox(batch, x0, 0, z1 - 0.06, w, 0.08, 0.06, PLASTER_DIM, M_WALL);
  pushBox(batch, x0, 0, z0, 0.06, 0.08, d, PLASTER_DIM, M_WALL);
  pushBox(batch, x1 - 0.06, 0, z0, 0.06, 0.08, d, PLASTER_DIM, M_WALL);
  for (let x = -6; x < 8; x += 1) {
    for (let z = -4; z < 13; z += 1) {
      const alt = (x + z) & 1;
      const tile: RGB = alt ? [0.145, 0.15, 0.16] : [0.185, 0.19, 0.2];
      batch.face(x, 0.008, z, x + 1, 0.008, z, x + 1, 0.008, z + 1, x, 0.008, z + 1, 0, 1, 0, tile, M_FLOOR);
    }
  }
  const gy = 0.012;
  for (let x = -6; x <= 7; x += 1) {
    batch.face(x - 0.012, gy, z0, x + 0.012, gy, z0, x + 0.012, gy, z1, x - 0.012, gy, z1, 0, 1, 0, SEAM, M_FLOOR);
  }
  for (let z = -4; z <= 12; z += 1) {
    batch.face(x0, gy, z - 0.012, x1, gy, z - 0.012, x1, gy, z + 0.012, x0, gy, z + 0.012, 0, 1, 0, SEAM, M_FLOOR);
  }
  pushBox(batch, -4.35, 0, -2.55, 0.72, 0.08, 0.72, WOOD_DARK, M_CLOTH);
  pushBox(batch, -4.32, 0.08, -2.52, 0.66, 0.06, 0.66, WOOD, M_CLOTH);
  pushBox(batch, -4.32, 0.14, -2.52, 0.66, 0.06, 0.66, WOOD_DARK, M_CLOTH);
  pushBox(batch, -4.32, 0.2, -2.52, 0.66, 0.08, 0.66, WOOD, M_CLOTH);
  pushBox(batch, 5.35, 0, 6.4, 0.42, y1, 0.42, PLASTER_DIM, M_WALL);
  pushBox(batch, 0.15, y1 - 0.12, 1.6, 2.3, 0.04, 1.2, [0.22, 0.2, 0.16], M_EMIT);
  pushBox(batch, 0.35, y1 - 0.1, 1.85, 1.9, 0.07, 0.78, METAL_DARK, M_METAL);
  pushBox(batch, 0.55, y1 - 0.035, 2.05, 1.5, 0.02, 0.42, LAMP, M_EMIT);
  for (let i = 0; i < 4; i += 1) {
    const z = 1.2 + i * 2.4;
    pushBox(batch, x1 - 0.04, 0.45, z, 0.045, 2.15, 1.15, PLASTER_DIM, M_WALL);
  }
  for (let i = 0; i < 5; i += 1) {
    const x = -3.2 + i * 2.2;
    pushBox(batch, x, 0.45, z1 - 0.04, 1.05, 2.15, 0.045, PLASTER_DIM, M_WALL);
  }
}

function roomMesh(): Float32Array {
  if (bakedRoom) return bakedRoom;
  const batch = new Batch(48000);
  pushRoom(batch);
  bakedRoom = batch.data.slice(0, batch.n);
  return bakedRoom;
}

function pushWall(batch: Batch, wall: Seg): void {
  const dx = wall.b.x - wall.a.x;
  const dz = wall.b.z - wall.a.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * 0.08;
  const nz = (dx / len) * 0.08;
  const tall = 2.72;
  const a = wall.a;
  const b = wall.b;
  const a2 = { x: a.x + nx, z: a.z + nz };
  const b2 = { x: b.x + nx, z: b.z + nz };
  const y0 = 0;
  const side = (x0: number, z0: number, x1: number, z1: number): [number, number, number] => {
    const ux = x1 - x0;
    const uz = z1 - z0;
    const fl = Math.hypot(uz, ux) || 1;
    return [uz / fl, 0, -ux / fl];
  };
  const nFront = side(a.x, a.z, b.x, b.z);
  batch.face(a.x, y0, a.z, b.x, y0, b.z, b.x, tall, b.z, a.x, tall, a.z, nFront[0], nFront[1], nFront[2], PLASTER, M_WALL);
  const nBack = side(b2.x, b2.z, a2.x, a2.z);
  batch.face(b2.x, y0, b2.z, a2.x, y0, a2.z, a2.x, tall, a2.z, b2.x, tall, b2.z, nBack[0], nBack[1], nBack[2], PLASTER_DIM, M_WALL);
  const capA: [number, number, number] = [-dx / len, 0, -dz / len];
  const capB: [number, number, number] = [dx / len, 0, dz / len];
  batch.face(a2.x, y0, a2.z, a.x, y0, a.z, a.x, tall, a.z, a2.x, tall, a2.z, capA[0], capA[1], capA[2], PLASTER_DIM, M_WALL);
  batch.face(b.x, y0, b.z, b2.x, y0, b2.z, b2.x, tall, b2.z, b.x, tall, b.z, capB[0], capB[1], capB[2], PLASTER_DIM, M_WALL);
  batch.face(a.x, tall, a.z, b.x, tall, b.z, b2.x, tall, b2.z, a2.x, tall, a2.z, 0, 1, 0, PLASTER, M_WALL);
  batch.face(a.x, tall + 0.012, a.z, b.x, tall + 0.012, b.z, b.x, tall + 0.028, b.z, a.x, tall + 0.028, a.z, nFront[0], 0.2, nFront[2], LIP, M_EMIT);
  const xMin = Math.min(a.x, b.x, a2.x, b2.x);
  const xMax = Math.max(a.x, b.x, a2.x, b2.x);
  const zMin = Math.min(a.z, b.z, a2.z, b2.z);
  const zMax = Math.max(a.z, b.z, a2.z, b2.z);
  pushBox(batch, xMin, 0, zMin, Math.max(0.04, xMax - xMin), 0.07, Math.max(0.04, zMax - zMin), PLASTER_DIM, M_WALL);
  for (let i = 1; i < 7; i += 1) {
    const t = i / 7;
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    pushBox(batch, px - 0.025, 0.2, pz - 0.025, 0.05, tall - 0.45, 0.05, PLASTER_DIM, M_WALL);
  }
}

function pushGun(batch: Batch, sway: number): void {
  const kick = Math.min(0.05, Math.abs(sway) * 0.02);
  const ox = 0.18 + kick;
  const oy = -0.22 - kick * 0.2;
  const oz = -0.48;
  pushBox(batch, ox - 0.028, oy - 0.04, oz - 0.02, 0.056, 0.055, 0.26, METAL, M_METAL);
  pushBox(batch, ox - 0.02, oy - 0.028, oz + 0.2, 0.04, 0.04, 0.14, POLY, M_CLOTH);
  limbGun(batch, ox, oy - 0.002, oz - 0.36, ox, oy - 0.002, oz - 0.02, 0.011, METAL_DARK, M_METAL);
  limbGun(batch, ox, oy - 0.002, oz - 0.38, ox, oy - 0.002, oz - 0.34, 0.014, METAL, M_METAL);
  pushBox(batch, ox - 0.02, oy - 0.03, oz - 0.16, 0.04, 0.028, 0.16, POLY, M_CLOTH);
  pushBox(batch, ox - 0.014, oy - 0.12, oz + 0.02, 0.028, 0.1, 0.045, POLY, M_CLOTH);
  pushBox(batch, ox - 0.016, oy - 0.11, oz - 0.02, 0.032, 0.07, 0.03, METAL_DARK, M_METAL);
  pushBox(batch, ox - 0.006, oy + 0.02, oz + 0.04, 0.012, 0.018, 0.05, METAL, M_METAL);
  pushBox(batch, ox - 0.004, oy + 0.012, oz - 0.2, 0.008, 0.02, 0.012, LIP, M_EMIT);
}

let bakedHand: Float32Array | null = null;

function viewHandMesh(): Float32Array {
  if (bakedHand) return bakedHand;
  const fig = new Fig();
  limb(fig, 0.14, -0.22, 0.16, 0.05, -0.1, 0.055, 0.034, JACKET, M_CLOTH);
  limb(fig, 0.05, -0.1, 0.055, 0.032, -0.068, 0.03, 0.024, SKIN, M_SKIN);
  ellipsoid(fig, 0.038, -0.048, 0.018, 0.03, 0.046, 0.036, 10, 6, SKIN, M_SKIN);
  limb(fig, 0.018, -0.018, 0.042, -0.008, -0.026, 0.012, 0.011, SKIN, M_SKIN);
  ellipsoid(fig, -0.01, -0.028, 0.01, 0.011, 0.009, 0.011, 6, 4, SKIN, M_SKIN);
  for (let i = 0; i < 4; i += 1) {
    const z = -0.016 + i * 0.015;
    limb(fig, 0.042, -0.072, z, 0.016, -0.084, z - 0.01, 0.0085, SKIN, M_SKIN);
    limb(fig, 0.016, -0.084, z - 0.01, -0.002, -0.074, z - 0.004, 0.0075, SKIN, M_SKIN);
  }
  bakedHand = fig.pack();
  return bakedHand;
}

function limbGun(batch: Batch, ax: number, ay: number, az: number, bx: number, by: number, bz: number, radius: number, color: RGB, mat: number): void {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const wx = dx / len;
  const wy = dy / len;
  const wz = dz / len;
  let ux = wy;
  let uy = -wx;
  let uz = 0;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  const vx = wy * uz - wz * uy;
  const vy = wz * ux - wx * uz;
  const vz = wx * uy - wy * ux;
  const slices = 10;
  for (let i = 0; i < slices; i += 1) {
    const t0 = (i / slices) * Math.PI * 2;
    const t1 = ((i + 1) / slices) * Math.PI * 2;
    const c0 = Math.cos(t0);
    const s0 = Math.sin(t0);
    const c1 = Math.cos(t1);
    const s1 = Math.sin(t1);
    const o0x = (ux * c0 + vx * s0) * radius;
    const o0y = (uy * c0 + vy * s0) * radius;
    const o0z = (uz * c0 + vz * s0) * radius;
    const o1x = (ux * c1 + vx * s1) * radius;
    const o1y = (uy * c1 + vy * s1) * radius;
    const o1z = (uz * c1 + vz * s1) * radius;
    const nx = (o0x + o1x) * 0.5;
    const ny = (o0y + o1y) * 0.5;
    const nz = (o0z + o1z) * 0.5;
    const nl = Math.hypot(nx, ny, nz) || 1;
    batch.face(ax + o0x, ay + o0y, az + o0z, bx + o0x, by + o0y, bz + o0z, bx + o1x, by + o1y, bz + o1z, ax + o1x, ay + o1y, az + o1z, nx / nl, ny / nl, nz / nl, color, mat);
  }
}

function rgbOf(hex: string): RGB {
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
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

function eyeDir(view: Float32Array, x: number, y: number, z: number, out: Float32Array): void {
  const len = Math.hypot(x, y, z) || 1;
  const nx = x / len;
  const ny = y / len;
  const nz = z / len;
  out[0] = view[0] * nx + view[4] * ny + view[8] * nz;
  out[1] = view[1] * nx + view[5] * ny + view[9] * nz;
  out[2] = view[2] * nx + view[6] * ny + view[10] * nz;
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
const IDENTITY3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

function pushCross(batch: Batch, w: number, h: number, cross: Crosshair): void {
  const color = rgbOf(cross.color);
  const outline = rgbOf(cross.outlineColor);
  const arm = (x: number, y: number, rw: number, rh: number, rgb: RGB) => {
    const x0 = (x / w) * 2;
    const y0 = (-y / h) * 2;
    const x1 = ((x + rw) / w) * 2;
    const y1 = (-(y + rh) / h) * 2;
    batch.face(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0, 0, 0, 1, rgb, M_EMIT);
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
    batch.face(a, b, 0, c, b, 0, c, d, 0, a, d, 0, 0, 0, 1, rgb, M_EMIT);
  };
  tick(-26, -1.5, 10, 3);
  tick(16, -1.5, 10, 3);
  tick(-1.5, -26, 3, 10);
  tick(-1.5, 16, 3, 10);
}

function linkSampled(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string, label: string): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) throw new Error("shader unavailable");
  gl.shaderSource(vs, vertSrc);
  gl.shaderSource(fs, fragSrc);
  gl.compileShader(vs);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs) || label);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs) || label);
  const program = gl.createProgram();
  if (!program) throw new Error("program unavailable");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.bindAttribLocation(program, 1, "aUv");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || label);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function linkBoard(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) throw new Error("shader unavailable");
  gl.shaderSource(vs, BOARD_VERT);
  gl.shaderSource(fs, BOARD_FRAG);
  gl.compileShader(vs);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs) || "board vertex");
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs) || "board fragment");
  const program = gl.createProgram();
  if (!program) throw new Error("program unavailable");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.bindAttribLocation(program, 1, "aUv");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "board link");
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function linkPerson(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) throw new Error("shader unavailable");
  gl.shaderSource(vs, PERSON_VERT);
  gl.shaderSource(fs, PERSON_FRAG);
  gl.compileShader(vs);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs) || "person vertex");
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs) || "person fragment");
  const program = gl.createProgram();
  if (!program) throw new Error("program unavailable");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.bindAttribLocation(program, 1, "aNrm");
  gl.bindAttribLocation(program, 2, "aUv");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "person link");
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function link(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) throw new Error("shader unavailable");
  gl.shaderSource(vs, vertSrc);
  gl.shaderSource(fs, fragSrc);
  gl.compileShader(vs);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs) || "vertex shader");
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs) || "fragment shader");
  const program = gl.createProgram();
  if (!program) throw new Error("program unavailable");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.bindAttribLocation(program, 1, "aNrm");
  gl.bindAttribLocation(program, 2, "aColor");
  gl.bindAttribLocation(program, 3, "aMat");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link");
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
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

  const program = link(gl, VERT, FRAG);
  const portraitProg = linkSampled(gl, PORTRAIT_VERT, PORTRAIT_FRAG, "portrait");
  const personProg = linkPerson(gl);
  const unlit = link(gl, UNLIT_VERT, UNLIT_FRAG);
  const boardProg = linkBoard(gl);
  const boardMvp = gl.getUniformLocation(boardProg, "uMvp");
  const boardSampler = gl.getUniformLocation(boardProg, "uTex");
  const mvpLoc = gl.getUniformLocation(program, "uMvp");
  const modelLoc = gl.getUniformLocation(program, "uModel");
  const nLoc = gl.getUniformLocation(program, "uNmat");
  const toneLoc = gl.getUniformLocation(program, "uTone");
  const keyLoc = gl.getUniformLocation(program, "uKey");
  const fillLoc = gl.getUniformLocation(program, "uFill");
  const upLoc = gl.getUniformLocation(program, "uUp");
  const pMvp = gl.getUniformLocation(portraitProg, "uMvp");
  const pModel = gl.getUniformLocation(portraitProg, "uModel");
  const pTone = gl.getUniformLocation(portraitProg, "uTone");
  const pFront = gl.getUniformLocation(portraitProg, "uFront");
  const pBack = gl.getUniformLocation(portraitProg, "uBack");
  const personMvp = gl.getUniformLocation(personProg, "uMvp");
  const personView = gl.getUniformLocation(personProg, "uView");
  const personN = gl.getUniformLocation(personProg, "uNmat");
  const personTex = gl.getUniformLocation(personProg, "uTex");
  const personNrm = gl.getUniformLocation(personProg, "uNrm");
  const personRough = gl.getUniformLocation(personProg, "uRough");
  const personCut = gl.getUniformLocation(personProg, "uCutoff");
  const personTone = gl.getUniformLocation(personProg, "uTone");
  const hudMvp = gl.getUniformLocation(unlit, "uMvp");

  const roomBuf = gl.createBuffer();
  const handBuf = gl.createBuffer();
  const dyn = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.enableVertexAttribArray(2);
  gl.enableVertexAttribArray(3);
  const bindMesh = (buf: WebGLBuffer) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE * 4, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE * 4, 12);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, STRIDE * 4, 24);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, STRIDE * 4, 36);
  };
  const park = (buf: WebGLBuffer, data: Float32Array) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return data.length / STRIDE;
  };
  const boardVao = gl.createVertexArray();
  const boardBuf = gl.createBuffer();
  gl.bindVertexArray(boardVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, boardBuf);
  gl.bufferData(gl.ARRAY_BUFFER, BOARD_QUAD, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
  gl.bindVertexArray(null);
  const boardTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, boardTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12, 16, 22, 255]));
  let boardSource: TexImageSource | null = null;

  const roomCount = park(roomBuf, roomMesh());
  const handCount = park(handBuf, viewHandMesh());
  const portraitVao = gl.createVertexArray();
  const portraitBuf = gl.createBuffer();
  gl.bindVertexArray(portraitVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, portraitBuf);
  gl.bufferData(gl.ARRAY_BUFFER, portraitQuad(), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
  const allocPortrait = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PORTRAIT_W, PORTRAIT_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return tex;
  };
  const frontTex = allocPortrait();
  const backTex = allocPortrait();
  const portraitRb = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, portraitRb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, PORTRAIT_W, PORTRAIT_H);
  const portraitFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, portraitFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frontTex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, portraitRb);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("portrait framebuffer");
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindVertexArray(null);
  let personReady = false;
  const gpuPrims: { vao: WebGLVertexArrayObject; count: number; albedo: WebGLTexture; normal: WebGLTexture; rough: WebGLTexture; cutoff: number }[] = [];

  const world = new Batch(65536);
  const gun = new Batch(8192);
  const hud = new Batch(4096);
  const viewM = new Float32Array(16);
  const projM = new Float32Array(16);
  const mvpM = new Float32Array(16);
  const mvM = new Float32Array(16);
  const figMvp = new Float32Array(16);
  const modelM = new Float32Array(16);
  const viewN = new Float32Array(9);
  const figN = new Float32Array(9);
  const key = new Float32Array(3);
  const fill = new Float32Array(3);
  const up = new Float32Array(3);
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let lost = false;
  const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const rendererName = rendererInfo ? String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)) : "";
  const softwareGl = /swiftshader|llvmpipe|softpipe|basic render/i.test(rendererName);

  const apply = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    let scale = playfieldScale(w, h, window.devicePixelRatio || 1);
    if (softwareGl) {
      const fit = Math.sqrt((1280 * 720) / (w * h));
      scale = Math.min(scale, fit);
    }
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

  const uploadDyn = (batch: Batch) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, dyn);
    gl.bufferData(gl.ARRAY_BUFFER, batch.data.subarray(0, batch.n), gl.DYNAMIC_DRAW);
    bindMesh(dyn);
  };

  const drawMesh = (buf: WebGLBuffer, count: number, mvp: Float32Array, nrm: Float32Array, model: Float32Array, tone: number, depth: boolean) => {
    if (count < 3) return;
    gl.useProgram(program);
    gl.uniformMatrix4fv(mvpLoc, false, mvp);
    gl.uniformMatrix4fv(modelLoc, false, model);
    gl.uniformMatrix3fv(nLoc, false, nrm);
    gl.uniform1f(toneLoc, tone);
    gl.uniform3fv(keyLoc, key);
    gl.uniform3fv(fillLoc, fill);
    gl.uniform3fv(upLoc, up);
    bindMesh(buf);
    if (depth) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, count);
  };

  const drawPortrait = (tone: number) => {
    if (!personReady) return;
    gl.useProgram(portraitProg);
    gl.uniformMatrix4fv(pMvp, false, mvpM);
    gl.uniformMatrix4fv(pModel, false, modelM);
    gl.uniform1f(pTone, tone);
    gl.uniform1i(pFront, 0);
    gl.uniform1i(pBack, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, frontTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, backTex);
    gl.bindVertexArray(portraitVao);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
  };

  const bakeSide = (tex: WebGLTexture, cam: Camera) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, portraitFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, PORTRAIT_W, PORTRAIT_H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    viewOf(cam, viewM);
    perspective(projM, PORTRAIT_FOV, PORTRAIT_W / PORTRAIT_H);
    multiply(mvpM, projM, viewM);
    lights(viewM);
    drawGpu(viewM, mvpM, viewN, 1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.clearColor(0.02, 0.025, 0.032, 1);
  };

  const drawDyn = (batch: Batch, mvp: Float32Array, nrm: Float32Array, model: Float32Array, tone: number, depth: boolean) => {
    if (batch.n < STRIDE * 3) return;
    gl.useProgram(program);
    gl.uniformMatrix4fv(mvpLoc, false, mvp);
    gl.uniformMatrix4fv(modelLoc, false, model);
    gl.uniformMatrix3fv(nLoc, false, nrm);
    gl.uniform1f(toneLoc, tone);
    gl.uniform3fv(keyLoc, key);
    gl.uniform3fv(fillLoc, fill);
    gl.uniform3fv(upLoc, up);
    uploadDyn(batch);
    if (depth) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, batch.n / STRIDE);
  };

  const drawHud = (batch: Batch) => {
    if (batch.n < STRIDE * 3) return;
    gl.useProgram(unlit);
    gl.uniformMatrix4fv(hudMvp, false, IDENTITY);
    uploadDyn(batch);
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, batch.n / STRIDE);
  };

  const lights = (view: Float32Array) => {
    eyeDir(view, 0.35, 0.88, 0.28, key);
    eyeDir(view, -0.55, 0.32, -0.22, fill);
    eyeDir(view, 0, 1, 0, up);
    viewN[0] = view[0];
    viewN[1] = view[1];
    viewN[2] = view[2];
    viewN[3] = view[4];
    viewN[4] = view[5];
    viewN[5] = view[6];
    viewN[6] = view[8];
    viewN[7] = view[9];
    viewN[8] = view[10];
  };

  const yawModel = (x: number, y: number, z: number, yaw: number, scale: number) => {
    const sy = Math.sin(yaw);
    const cy = Math.cos(yaw);
    modelM[0] = scale * cy;
    modelM[1] = 0;
    modelM[2] = -scale * sy;
    modelM[3] = 0;
    modelM[4] = 0;
    modelM[5] = scale;
    modelM[6] = 0;
    modelM[7] = 0;
    modelM[8] = scale * sy;
    modelM[9] = 0;
    modelM[10] = scale * cy;
    modelM[11] = 0;
    modelM[12] = x;
    modelM[13] = y;
    modelM[14] = z;
    modelM[15] = 1;
    const rot = (rx: number, ry: number, rz: number, o: number) => {
      figN[o] = viewN[0] * rx + viewN[3] * ry + viewN[6] * rz;
      figN[o + 1] = viewN[1] * rx + viewN[4] * ry + viewN[7] * rz;
      figN[o + 2] = viewN[2] * rx + viewN[5] * ry + viewN[8] * rz;
    };
    rot(cy, 0, -sy, 0);
    rot(0, 1, 0, 3);
    rot(sy, 0, cy, 6);
  };

  const flatTex = (rgba: [number, number, number, number]) => {
    const tex = gl.createTexture();
    if (!tex) throw new Error("texture unavailable");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
    return tex;
  };
  const flatNormal = flatTex([128, 128, 255, 255]);
  const flatRough = flatTex([255, 140, 0, 255]);

  const drawGpu = (view: Float32Array, mvp: Float32Array, nrm: Float32Array, tone: number) => {
    if (!gpuPrims.length) return;
    gl.useProgram(personProg);
    gl.uniformMatrix4fv(personMvp, false, mvp);
    gl.uniformMatrix4fv(personView, false, view);
    gl.uniformMatrix3fv(personN, false, nrm);
    gl.uniform1i(personTex, 0);
    if (personNrm) gl.uniform1i(personNrm, 1);
    gl.uniform1i(personRough, 2);
    gl.uniform1f(personTone, tone);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    for (const prim of gpuPrims) {
      gl.uniform1f(personCut, prim.cutoff);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, prim.albedo);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, prim.normal);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, prim.rough);
      gl.bindVertexArray(prim.vao);
      gl.drawElements(gl.TRIANGLES, prim.count, gl.UNSIGNED_INT, 0);
    }
    gl.bindVertexArray(null);
    gl.activeTexture(gl.TEXTURE0);
  };

  const uploadPerson = async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}person.glb`);
    if (!response.ok) throw new Error("person glb missing");
    const mesh = parsePerson(await response.arrayBuffer());
    const linear = new Set<number>();
    for (const prim of mesh.primitives) {
      if (prim.normal >= 0) linear.add(prim.normal);
      if (prim.rough >= 0) linear.add(prim.rough);
    }
    const bitmaps = await Promise.all(
      mesh.images.map(async (image, index) => {
        const blob = new Blob([image.bytes.buffer.slice(image.bytes.byteOffset, image.bytes.byteOffset + image.bytes.byteLength) as ArrayBuffer], { type: image.mime });
        if (!linear.has(index)) return createImageBitmap(blob);
        try {
          return await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
        } catch {
          return createImageBitmap(blob);
        }
      }),
    );
    const beauty = ["front", "back", "face"].includes(new URLSearchParams(window.location.search).get("shot") ?? "");
    const textures = bitmaps.map((bitmap) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, beauty ? gl.LINEAR : gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      if (!beauty) gl.generateMipmap(gl.TEXTURE_2D);
      bitmap.close();
      return tex;
    });
    for (const prim of mesh.primitives) {
      const vao = gl.createVertexArray();
      const buf = gl.createBuffer();
      const elem = gl.createBuffer();
      const interleaved = new Float32Array(prim.positions.length / 3 * 8);
      for (let i = 0, v = 0; i < prim.positions.length; i += 3, v += 8) {
        interleaved[v] = prim.positions[i];
        interleaved[v + 1] = prim.positions[i + 1];
        interleaved[v + 2] = prim.positions[i + 2];
        interleaved[v + 3] = prim.normals[i];
        interleaved[v + 4] = prim.normals[i + 1];
        interleaved[v + 5] = prim.normals[i + 2];
        const u = (i / 3) * 2;
        interleaved[v + 6] = prim.uvs[u];
        interleaved[v + 7] = prim.uvs[u + 1];
      }
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elem);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, prim.indices, gl.STATIC_DRAW);
      gpuPrims.push({
        vao,
        count: prim.indices.length,
        albedo: textures[prim.image] ?? flatRough,
        normal: prim.normal >= 0 ? textures[prim.normal] : flatNormal,
        rough: prim.rough >= 0 ? textures[prim.rough] : flatRough,
        cutoff: prim.alphaCutoff,
      });
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    const bakeStarted = performance.now();
    if (!beauty) {
      bakeSide(frontTex, { x: 0, y: BAKE_Y, z: BAKE_Z, yaw: Math.PI, pitch: 0 });
      bakeSide(backTex, { x: 0, y: BAKE_Y, z: -BAKE_Z, yaw: 0, pitch: 0 });
      gl.finish();
    }
    personReady = true;
    canvas.dataset.software = softwareGl ? "1" : "0";
    canvas.dataset.tris = String(mesh.triangles);
    canvas.dataset.verts = String(mesh.verts);
    canvas.dataset.ready = "1";
    canvas.dataset.bakeMs = (performance.now() - bakeStarted).toFixed(1);
  };
  void uploadPerson();

  type Figure = { x: number; y: number; z: number; scale: number; yaw: number; tone: number };

  const frame = (cam: Camera, fov: number, fillWalls: (batch: Batch) => void, figures: Figure[], cross: Crosshair, sway: number, flash: WorldDraw["flash"], extras?: () => void, solid = false) => {
    if (lost || cssW < 2 || cssH < 2) return;
    const frameStarted = performance.now();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const aspect = canvas.width / canvas.height || cssW / cssH;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.02, 0.025, 0.032, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    viewOf(cam, viewM);
    perspective(projM, fov, aspect);
    multiply(mvpM, projM, viewM);
    lights(viewM);
    drawMesh(roomBuf, roomCount, mvpM, viewN, IDENTITY, 1, true);
    world.reset();
    fillWalls(world);
    drawDyn(world, mvpM, viewN, IDENTITY, 1, true);
    for (let i = 0; i < figures.length; i += 1) {
      const fig = figures[i];
      yawModel(fig.x, fig.y, fig.z, fig.yaw, fig.scale);
      if (solid && personReady) {
        multiply(mvM, viewM, modelM);
        multiply(figMvp, projM, mvM);
        drawGpu(mvM, figMvp, figN, fig.tone);
      } else drawPortrait(fig.tone);
    }
    extras?.();
    const kick = Math.min(0.05, Math.abs(sway) * 0.02);
    gun.reset();
    pushGun(gun, sway);
    drawDyn(gun, projM, IDENTITY3, IDENTITY, 1, false);
    modelM.set(IDENTITY);
    modelM[12] = 0.18 + kick;
    modelM[13] = -0.22 - kick * 0.2;
    modelM[14] = -0.48;
    drawMesh(handBuf, handCount, projM, IDENTITY3, modelM, 1, false);
    hud.reset();
    if (flash === "hurt") {
      const span = (5 / cssW) * 2;
      hud.face(-1, -1, 0, -1 + span, -1, 0, -1 + span, 1, 0, -1, 1, 0, 0, 0, 1, HOT, M_EMIT);
      hud.face(1 - span, -1, 0, 1, -1, 0, 1, 1, 0, 1 - span, 1, 0, 0, 0, 1, HOT, M_EMIT);
    }
    pushCross(hud, cssW, cssH, cross);
    drawHud(hud);
    gl.bindVertexArray(null);
    if (softwareGl && personReady) {
      gl.finish();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    }
    canvas.dataset.frameMs = (performance.now() - frameStarted).toFixed(2);
  };

  const paintFight = (scene: WorldDraw) => {
    const figures: Figure[] = [];
    const from = { x: scene.camera.x, z: scene.camera.z };
    let covered = false;
    for (const actor of scene.actors) {
      if (!actor.alive) continue;
      if (!lineOfSight(from, actor, scene.walls)) continue;
      figures.push({
        x: actor.x,
        y: 0,
        z: actor.z,
        scale: 1,
        yaw: Math.atan2(scene.camera.x - actor.x, scene.camera.z - actor.z),
        tone: 1,
      });
      if (scene.pip && Math.hypot(actor.x - scene.pip.x, actor.z - scene.pip.z) < 0.35) covered = true;
    }
    frame(
      scene.camera,
      scene.fov,
      (batch) => {
        for (const wall of scene.walls) pushWall(batch, wall);
        if (scene.pip && !covered) {
          pushBox(batch, scene.pip.x - 0.03, LANE.head - 0.03, scene.pip.z - 0.03, 0.06, 0.06, 0.06, LIP, M_EMIT);
        }
      },
      figures,
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
      const figures: Figure[] = [];
      for (const target of picture.targets) {
        const spot = platePoint(cam, target.yaw, target.pitch);
        const live = !(picture.dimIdle && !target.live);
        const half = Math.max(0.05, spot.dist * Math.tan((target.radius * Math.PI) / 180));
        const scale = (half * 2) / FIGURE_H;
        figures.push({
          x: spot.x,
          y: spot.y - FIGURE_H * 0.5 * scale,
          z: spot.z,
          scale,
          yaw: Math.atan2(cam.x - spot.x, cam.z - spot.z),
          tone: live ? (picture.glued && target.live ? 1.15 : 1) : 0.45,
        });
      }
      frame(
        cam,
        picture.fov,
        (batch) => {
          pushWall(batch, EDGE_WALL);
          pushWall(batch, FAR_WALL);
        },
        figures,
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
      if (hud.n >= STRIDE * 3) {
        gl.bindVertexArray(vao);
        drawHud(hud);
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
    drawBay: (cam, figures, cross, fov, solid = false) => {
      frame(
        cam,
        fov,
        (batch) => {
          pushWall(batch, EDGE_WALL);
          pushWall(batch, FAR_WALL);
        },
        figures,
        cross,
        0,
        null,
        () => {
          if (boardSource) {
            gl.bindTexture(gl.TEXTURE_2D, boardTex);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, boardSource);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            boardSource = null;
          }
          gl.useProgram(boardProg);
          gl.uniformMatrix4fv(boardMvp, false, mvpM);
          gl.uniform1i(boardSampler, 0);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, boardTex);
          gl.bindVertexArray(boardVao);
          gl.enable(gl.DEPTH_TEST);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          gl.bindVertexArray(vao);
        },
        solid,
      );
    },
    setBoard: (source) => {
      boardSource = source;
    },
    destroy: () => {
      observer.disconnect();
      gl.deleteProgram(program);
      gl.deleteProgram(portraitProg);
      gl.deleteProgram(personProg);
      gl.deleteProgram(unlit);
      gl.deleteProgram(boardProg);
      gl.deleteBuffer(roomBuf);
      gl.deleteBuffer(handBuf);
      gl.deleteBuffer(dyn);
      gl.deleteBuffer(boardBuf);
      gl.deleteBuffer(portraitBuf);
      gl.deleteTexture(boardTex);
      gl.deleteTexture(frontTex);
      gl.deleteTexture(backTex);
      gl.deleteFramebuffer(portraitFbo);
      gl.deleteRenderbuffer(portraitRb);
      gl.deleteVertexArray(vao);
      gl.deleteVertexArray(boardVao);
      gl.deleteVertexArray(portraitVao);
      for (const prim of gpuPrims) gl.deleteVertexArray(prim.vao);
    },
  };
}
