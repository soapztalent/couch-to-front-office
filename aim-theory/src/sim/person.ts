/**
 * One original standing figure. Face, hair, cloth, and hands are built as
 * their own surfaces. Nothing here is a copied character, and nothing is the
 * old block body run through a subdivider.
 *
 * Layout matches the rest of the room: pos3, normal3, color3, material.
 */

const STRIDE = 10;

const SKIN: RGB = [0.74, 0.56, 0.46];
const SKIN_DEEP: RGB = [0.5, 0.34, 0.28];
const LIP: RGB = [0.52, 0.26, 0.24];
const NAIL: RGB = [0.86, 0.72, 0.66];
const SCLERA: RGB = [0.9, 0.9, 0.88];
const IRIS: RGB = [0.18, 0.22, 0.2];
const PUPIL: RGB = [0.04, 0.04, 0.045];
const HAIR: RGB = [0.05, 0.045, 0.042];
const HAIR_LIFT: RGB = [0.1, 0.085, 0.075];
const JACKET: RGB = [0.46, 0.49, 0.54];
const JACKET_DARK: RGB = [0.26, 0.28, 0.32];
const PANTS: RGB = [0.16, 0.17, 0.2];
const BOOT: RGB = [0.07, 0.07, 0.08];

const M_SKIN = 0;
const M_CLOTH = 1;
const M_EMIT = 5;

type RGB = [number, number, number];
type V3 = [number, number, number];

export type PersonMesh = {
  verts: Float32Array;
  indices: Uint32Array;
  triangles: number;
};

const HAIR_STRANDS = 25000;
const HAIR_SEGS = 18;

class Mesh {
  private v: Float32Array;
  private idx: Uint32Array;
  private vc = 0;
  private ic = 0;

  constructor() {
    this.v = new Float32Array(14_000_000);
    this.idx = new Uint32Array(6_000_000);
  }

  vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, color: RGB, mat: number): number {
    if ((this.vc + 1) * STRIDE > this.v.length) {
      const next = new Float32Array(this.v.length * 2);
      next.set(this.v);
      this.v = next;
    }
    const o = this.vc * STRIDE;
    const len = Math.hypot(nx, ny, nz) || 1;
    this.v[o] = x;
    this.v[o + 1] = y;
    this.v[o + 2] = z;
    this.v[o + 3] = nx / len;
    this.v[o + 4] = ny / len;
    this.v[o + 5] = nz / len;
    this.v[o + 6] = color[0];
    this.v[o + 7] = color[1];
    this.v[o + 8] = color[2];
    this.v[o + 9] = mat;
    return this.vc++;
  }

  tri(a: number, b: number, c: number): void {
    if (this.ic + 3 > this.idx.length) {
      const next = new Uint32Array(this.idx.length * 2);
      next.set(this.idx);
      this.idx = next;
    }
    this.idx[this.ic] = a;
    this.idx[this.ic + 1] = b;
    this.idx[this.ic + 2] = c;
    this.ic += 3;
  }

  finish(): PersonMesh {
    return {
      verts: this.v.slice(0, this.vc * STRIDE),
      indices: this.idx.slice(0, this.ic),
      triangles: this.ic / 3,
    };
  }
}

function hash(n: number): number {
  let x = Math.imul(n | 0, 0x6d2b79f5);
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

function smooth(a: number, b: number, t: number): number {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a || 1)));
  return u * u * (3 - 2 * u);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixc(a: RGB, b: RGB, t: number): RGB {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

function n3(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function add3(a: V3, b: V3, s = 1): V3 {
  return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
}

type Sample = { x: number; y: number; z: number; color: RGB; mat: number };

function addSurfaceReal(
  mesh: Mesh,
  stacks: number,
  slices: number,
  sample: (iy: number, ix: number) => Sample,
  outward: (x: number, y: number, z: number) => V3,
): void {
  const cols = slices + 1;
  const rows = stacks + 1;
  const count = rows * cols;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const mat = new Uint8Array(count);
  const nrm = new Float32Array(count * 3);
  for (let iy = 0; iy < rows; iy += 1) {
    for (let ix = 0; ix < cols; ix += 1) {
      const s = sample(iy, Math.min(ix, slices - 1));
      if (ix === slices) {
        const s0 = sample(iy, 0);
        const k = iy * cols + ix;
        pos[k * 3] = s0.x;
        pos[k * 3 + 1] = s0.y;
        pos[k * 3 + 2] = s0.z;
        col[k * 3] = s0.color[0];
        col[k * 3 + 1] = s0.color[1];
        col[k * 3 + 2] = s0.color[2];
        mat[k] = s0.mat;
        continue;
      }
      const k = iy * cols + ix;
      pos[k * 3] = s.x;
      pos[k * 3 + 1] = s.y;
      pos[k * 3 + 2] = s.z;
      col[k * 3] = s.color[0];
      col[k * 3 + 1] = s.color[1];
      col[k * 3 + 2] = s.color[2];
      mat[k] = s.mat;
    }
  }
  const at = (iy: number, ix: number) => {
    const k = iy * cols + ix;
    return [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]] as V3;
  };
  for (let iy = 0; iy < rows; iy += 1) {
    for (let ix = 0; ix < cols; ix += 1) {
      const ix0 = ix === 0 ? slices - 1 : ix - 1;
      const ix1 = ix === slices ? 1 : Math.min(slices, ix + 1);
      const iy0 = Math.max(0, iy - 1);
      const iy1 = Math.min(stacks, iy + 1);
      const c = at(iy, ix === slices ? 0 : ix);
      const dx = at(iy, ix1);
      const dx0 = at(iy, ix0);
      const dy = at(iy1, ix === slices ? 0 : ix);
      const dy0 = at(iy0, ix === slices ? 0 : ix);
      const tx: V3 = [dx[0] - dx0[0], dx[1] - dx0[1], dx[2] - dx0[2]];
      const ty: V3 = [dy[0] - dy0[0], dy[1] - dy0[1], dy[2] - dy0[2]];
      let n = cross(tx, ty);
      const hint = outward(c[0], c[1], c[2]);
      if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) n = [-n[0], -n[1], -n[2]];
      const k = (iy * cols + ix) * 3;
      nrm[k] = n[0];
      nrm[k + 1] = n[1];
      nrm[k + 2] = n[2];
    }
  }
  const ids = new Uint32Array(count);
  for (let k = 0; k < count; k += 1) {
    ids[k] = mesh.vert(
      pos[k * 3],
      pos[k * 3 + 1],
      pos[k * 3 + 2],
      nrm[k * 3],
      nrm[k * 3 + 1],
      nrm[k * 3 + 2],
      [col[k * 3], col[k * 3 + 1], col[k * 3 + 2]],
      mat[k],
    );
  }
  for (let iy = 0; iy < stacks; iy += 1) {
    for (let ix = 0; ix < slices; ix += 1) {
      const a = ids[iy * cols + ix];
      const b = ids[iy * cols + ix + 1];
      const c = ids[(iy + 1) * cols + ix];
      const d = ids[(iy + 1) * cols + ix + 1];
      const ax = pos[(iy * cols + ix) * 3];
      const ay = pos[(iy * cols + ix) * 3 + 1];
      const az = pos[(iy * cols + ix) * 3 + 2];
      const bx = pos[(iy * cols + ix + 1) * 3] - ax;
      const by = pos[(iy * cols + ix + 1) * 3 + 1] - ay;
      const bz = pos[(iy * cols + ix + 1) * 3 + 2] - az;
      const cx = pos[((iy + 1) * cols + ix) * 3] - ax;
      const cy = pos[((iy + 1) * cols + ix) * 3 + 1] - ay;
      const cz = pos[((iy + 1) * cols + ix) * 3 + 2] - az;
      if (bx * bx + by * by + bz * bz < 1e-10 || cx * cx + cy * cy + cz * cz < 1e-10) continue;
      const fn = cross([bx, by, bz], [cx, cy, cz]);
      const hint = outward(ax, ay, az);
      if (fn[0] * hint[0] + fn[1] * hint[1] + fn[2] * hint[2] >= 0) {
        mesh.tri(a, b, c);
        mesh.tri(b, d, c);
      } else {
        mesh.tri(a, c, b);
        mesh.tri(c, d, b);
      }
    }
  }
}

function addTube(
  mesh: Mesh,
  a: V3,
  b: V3,
  rings: number,
  slices: number,
  radius: (t: number, ang: number) => number,
  color: RGB | ((t: number, ang: number) => RGB),
  mat: number,
): void {
  const axis: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const w = n3(axis);
  let hx: V3 = [0, 1, 0];
  if (Math.abs(w[1]) > 0.85) hx = [1, 0, 0];
  const u = n3(cross(hx, w));
  const v = cross(w, u);
  addSurfaceReal(
    mesh,
    rings,
    slices,
    (iy, ix) => {
      const t = iy / rings;
      const ang = (ix / slices) * Math.PI * 2;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const rad = radius(t, ang);
      const ox = (u[0] * c + v[0] * s) * rad;
      const oy = (u[1] * c + v[1] * s) * rad;
      const oz = (u[2] * c + v[2] * s) * rad;
      const tint = typeof color === "function" ? color(t, ang) : color;
      return {
        x: a[0] + w[0] * len * t + ox,
        y: a[1] + w[1] * len * t + oy,
        z: a[2] + w[2] * len * t + oz,
        color: tint,
        mat,
      };
    },
    (x, y, z) => {
      const dx = x - a[0];
      const dy = y - a[1];
      const dz = z - a[2];
      const proj = dx * w[0] + dy * w[1] + dz * w[2];
      return [dx - w[0] * proj, dy - w[1] * proj, dz - w[2] * proj];
    },
  );
}

function addSphere(mesh: Mesh, c: V3, r: V3, stacks: number, slices: number, color: RGB, mat: number): void {
  addSurfaceReal(
    mesh,
    stacks,
    slices,
    (iy, ix) => {
      const phi = (iy / stacks) * Math.PI;
      const ang = (ix / slices) * Math.PI * 2;
      const sr = Math.sin(phi);
      const sy = Math.cos(phi);
      return {
        x: c[0] + Math.cos(ang) * sr * r[0],
        y: c[1] + sy * r[1],
        z: c[2] + Math.sin(ang) * sr * r[2],
        color,
        mat,
      };
    },
    (x, y, z) => [x - c[0], y - c[1], z - c[2]],
  );
}

const HEAD_Y = 1.575;

function sampleHead(iy: number, ix: number, stacks: number, slices: number): Sample {
  const v = iy / stacks;
  const ang = (ix / slices) * Math.PI * 2;
  const front = Math.cos(ang);
  const side = Math.sin(ang);
  const phi = v * Math.PI;
  const up = Math.cos(phi);
  const rad = Math.sin(phi);
  const jaw = smooth(0.52, 0.9, v);
  let rx = 0.086 * (1 - jaw * 0.3);
  let ry = 0.11;
  let rz = 0.094 * (1 - jaw * 0.1);
  const chin = Math.exp(-((v - 0.9) ** 2) / 0.0035) * Math.exp(-(ang * ang) / 0.22);
  ry *= 1 + chin * 0.05;
  let x = side * rad * rx;
  let y = HEAD_Y + up * ry;
  let z = front * rad * rz;
  const face = Math.max(0, front);
  const brow = Math.exp(-((v - 0.34) ** 2) / 0.0016) * face;
  z += 0.011 * brow * (1 - Math.min(1, Math.abs(ang) * 0.7));
  const eye = (shift: number) => Math.exp(-((ang - shift) ** 2) / 0.018) * Math.exp(-((v - 0.4) ** 2) / 0.0026);
  const socket = eye(0.36) + eye(-0.36);
  z -= 0.018 * socket;
  const nose = Math.exp(-(ang * ang) / 0.04) * Math.exp(-((v - 0.52) ** 2) / 0.011);
  z += 0.036 * nose;
  x *= 1 - 0.22 * nose;
  const nostril = Math.exp(-((Math.abs(ang) - 0.2) ** 2) / 0.006) * Math.exp(-((v - 0.6) ** 2) / 0.0014);
  z -= 0.009 * nostril;
  const mouth = Math.exp(-(ang * ang) / 0.08) * Math.exp(-((v - 0.69) ** 2) / 0.002);
  z += 0.011 * mouth;
  const lipLine = Math.exp(-(ang * ang) / 0.06) * Math.exp(-((v - 0.705) ** 2) / 0.00035);
  z -= 0.005 * lipLine;
  const cheek = Math.exp(-((Math.abs(ang) - 0.75) ** 2) / 0.09) * Math.exp(-((v - 0.55) ** 2) / 0.018) * face;
  z += 0.01 * cheek;
  let color = SKIN;
  color = mixc(color, LIP, Math.min(1, mouth * 1.15));
  color = mixc(color, SKIN_DEEP, Math.min(1, socket * 0.9 + nostril * 0.6 + lipLine));
  color = mixc(color, [0.42, 0.3, 0.24], Math.min(1, brow * 0.35));
  return { x, y, z, color, mat: M_SKIN };
}

function addEar(mesh: Mesh, side: number): void {
  addSurfaceReal(
    mesh,
    16,
    18,
    (iy, ix) => {
      const v = iy / 16;
      const u = ix / 18;
      const ang = u * Math.PI * 1.15 - 0.2;
      const lift = Math.sin(v * Math.PI);
      const curl = Math.sin(ang) * 0.012 * lift;
      return {
        x: side * (0.09 + curl + (v - 0.5) * 0.01),
        y: 1.56 + Math.cos(ang) * 0.028 * lift + (v - 0.45) * 0.01,
        z: -0.005 + Math.sin(v * Math.PI) * 0.012 + (1 - lift) * 0.004,
        color: mixc(SKIN, SKIN_DEEP, 0.25 + 0.2 * (1 - lift)),
        mat: M_SKIN,
      };
    },
    (x) => [Math.sign(side) || 1, 0, x === 0 ? 0.2 : 0.2],
  );
}

function addClothBody(mesh: Mesh): void {
  const rings = 180;
  const slices = 220;
  addSurfaceReal(
    mesh,
    rings,
    slices,
    (iy, ix) => {
      const t = iy / rings;
      const ang = (ix / slices) * Math.PI * 2;
      const y = 1.46 - t * 0.48;
      const shoulder = Math.exp(-((t - 0.16) ** 2) / 0.012);
      const waist = smooth(0.42, 0.68, t);
      let rx = 0.075 + shoulder * 0.145 + smooth(0.2, 0.4, t) * 0.04 - waist * 0.025 + smooth(0.78, 1, t) * 0.02;
      let rz = 0.058 + shoulder * 0.04 + smooth(0.25, 0.5, t) * 0.03 - waist * 0.01;
      const fold = Math.sin(ang * 7 + t * 11);
      rx += fold * 0.007 * (0.25 + t);
      rz += Math.cos(ang * 5 + t * 8) * 0.006 * (0.2 + t);
      const lapel = Math.exp(-(ang * ang) / 0.12) * (1 - t * 0.65);
      rz += 0.012 * lapel;
      const shade = 0.5 + 0.5 * fold;
      return {
        x: Math.sin(ang) * rx,
        y,
        z: Math.cos(ang) * rz + 0.015,
        color: mixc(JACKET, JACKET_DARK, shade * 0.45 * (0.3 + t) + lapel * 0.15),
        mat: M_CLOTH,
      };
    },
    (x, _y, z) => [x, 0.15, z - 0.015],
  );
}

function addLeg(mesh: Mesh, side: number): void {
  const hip: V3 = [side * 0.09, 1.0, 0.01];
  const ankle: V3 = [side * 0.1, 0.08, 0.02];
  addTube(mesh, hip, ankle, 140, 48, (t, ang) => {
    const knee = Math.exp(-((t - 0.48) ** 2) / 0.008);
    const calf = Math.exp(-((t - 0.72) ** 2) / 0.02);
    const fold = 1 + Math.sin(ang * 5 + t * 9) * 0.04 * t;
    return (0.078 - t * 0.028 + knee * 0.012 + calf * 0.01) * fold;
  }, (t, ang) => mixc(PANTS, [0.1, 0.11, 0.13], (0.5 + 0.5 * Math.sin(ang * 5 + t * 9)) * 0.35), M_CLOTH);
  const bootTop: V3 = [side * 0.1, 0.09, 0.02];
  const bootSole: V3 = [side * 0.1, 0.018, 0.045];
  addTube(mesh, bootTop, bootSole, 28, 24, (t, ang) => {
    const toe = Math.max(0, Math.cos(ang)) * 0.012 * t;
    return 0.048 + t * 0.012 + toe;
  }, BOOT, M_CLOTH);
}

function addSleeve(mesh: Mesh, side: number): { wrist: V3; down: V3; palm: V3; across: V3 } {
  const shoulder: V3 = [side * 0.2, 1.36, 0.02];
  const elbow: V3 = [side * 0.3, 1.08, 0.07];
  const wrist: V3 = [side * 0.26, 0.8, 0.12];
  const cloth = (t: number, ang: number) => mixc(JACKET, JACKET_DARK, (0.5 + 0.5 * Math.sin(ang * 4 + t * 7)) * 0.4);
  addTube(mesh, shoulder, elbow, 70, 28, (t, ang) => (0.055 - t * 0.012) * (1 + Math.sin(ang * 3) * 0.05), cloth, M_CLOTH);
  addTube(mesh, elbow, wrist, 64, 28, (t, ang) => (0.042 - t * 0.008) * (1 + Math.sin(ang * 4 + t * 5) * 0.06), cloth, M_CLOTH);
  const down = n3([side * 0.06, -0.95, 0.22]);
  const palm = n3([-side, 0.08, 0.25]);
  const across = n3(cross(down, palm));
  const palmN = n3(cross(across, down));
  return { wrist, down, palm: palmN, across };
}

function addFinger(mesh: Mesh, root: V3, along: V3, up: V3, length: number, radius: number): void {
  let cursor = root;
  let dir = along;
  const bones = [0.4, 0.33, 0.27];
  for (let b = 0; b < bones.length; b += 1) {
    const next = add3(cursor, dir, length * bones[b]);
    const r0 = radius * (1 - b * 0.16);
    const r1 = radius * (1 - (b + 1) * 0.16);
    addTube(mesh, cursor, next, 12, 10, (t) => {
      const knuckle = t < 0.18 ? 1.2 : 1;
      return (r0 + (r1 - r0) * t) * knuckle;
    }, SKIN, M_SKIN);
    if (b === bones.length - 1) {
      const nailC = add3(add3(cursor, dir, length * bones[b] * 0.62), up, r1 * 0.95);
      addSurfaceReal(
        mesh,
        6,
        8,
        (iy, ix) => {
          const u = ix / 8 - 0.5;
          const v = iy / 6 - 0.5;
          return {
            x: nailC[0] + up[0] * 0.0015 + dir[0] * v * length * 0.16 + (cross(dir, up)[0]) * u * r1 * 0.7,
            y: nailC[1] + up[1] * 0.0015 + dir[1] * v * length * 0.16 + (cross(dir, up)[1]) * u * r1 * 0.7,
            z: nailC[2] + up[2] * 0.0015 + dir[2] * v * length * 0.16 + (cross(dir, up)[2]) * u * r1 * 0.7,
            color: NAIL,
            mat: M_SKIN,
          };
        },
        () => up,
      );
    }
    cursor = next;
    dir = n3(add3(dir, up, -0.28));
  }
}

function addHand(mesh: Mesh, wrist: V3, down: V3, palm: V3, across: V3): void {
  const center = add3(wrist, down, 0.034);
  addSurfaceReal(
    mesh,
    16,
    18,
    (iy, ix) => {
      const phi = (iy / 16) * Math.PI;
      const ang = (ix / 18) * Math.PI * 2;
      const sr = Math.sin(phi);
      const sy = Math.cos(phi);
      const thenar = Math.exp(-((ang - Math.PI * 0.5) ** 2) / 0.4) * sr;
      const rx = 0.034 + thenar * 0.008;
      const ry = 0.046;
      const rz = 0.015;
      const lx = Math.cos(ang) * sr;
      const lz = Math.sin(ang) * sr;
      return {
        x: center[0] + across[0] * lx * rx + down[0] * sy * ry + palm[0] * lz * rz,
        y: center[1] + across[1] * lx * rx + down[1] * sy * ry + palm[1] * lz * rz,
        z: center[2] + across[2] * lx * rx + down[2] * sy * ry + palm[2] * lz * rz,
        color: thenar > 0.4 ? mixc(SKIN, SKIN_DEEP, 0.2) : SKIN,
        mat: M_SKIN,
      };
    },
    (x, y, z) => [x - center[0], y - center[1], z - center[2]],
  );
  const spreads = [-0.1, -0.035, 0.03, 0.095];
  const lengths = [0.078, 0.086, 0.08, 0.064];
  for (let f = 0; f < 4; f += 1) {
    const root = add3(add3(center, down, 0.04), across, spreads[f]);
    const dir = n3(add3(down, across, spreads[f] * 1.6));
    addFinger(mesh, root, dir, palm, lengths[f], 0.009 - f * 0.0006);
  }
  const thumbRoot = add3(add3(center, across, -0.03), down, 0.008);
  const thumbDir = n3(add3([-across[0], -across[1], -across[2]], down, 0.35));
  addFinger(mesh, thumbRoot, thumbDir, palm, 0.058, 0.011);
}

function addNeck(mesh: Mesh): void {
  addTube(mesh, [0, 1.48, 0.01], [0, 1.38, 0.02], 24, 28, (t) => 0.042 + t * 0.01, SKIN, M_SKIN);
}

function addEyes(mesh: Mesh): void {
  for (const x of [-0.031, 0.031]) {
    addSphere(mesh, [x, 1.608, 0.078], [0.013, 0.011, 0.01], 14, 16, SCLERA, M_SKIN);
    addSphere(mesh, [x, 1.608, 0.086], [0.0065, 0.0065, 0.004], 10, 12, IRIS, M_CLOTH);
    addSphere(mesh, [x, 1.608, 0.089], [0.0032, 0.0032, 0.002], 8, 8, PUPIL, M_CLOTH);
  }
}

function addHair(mesh: Mesh): void {
  const scalp = (ang: number, phi: number): V3 => {
    const front = Math.cos(ang);
    const side = Math.sin(ang);
    const sr = Math.sin(phi);
    const up = Math.cos(phi);
    return [side * sr * 0.09, HEAD_Y + up * 0.112, front * sr * 0.098];
  };
  for (let s = 0; s < HAIR_STRANDS; s += 1) {
    const ang = hash(s * 3 + 1) * Math.PI * 2;
    let phi = 0.06 + hash(s * 3 + 2) * 1.15;
    const front = Math.cos(ang);
    const bang = front > 0.35 && hash(s * 3 + 5) > 0.42;
    if (front > 0.15) phi *= bang ? 0.42 : 0.62;
    if (!bang && phi > 1.05 && front > 0) continue;
    const root = scalp(ang, Math.min(phi, 1.2));
    const seed = hash(s * 3 + 4);
    const length = (bang ? 0.045 : 0.07 + seed * 0.14) * (0.85 + hash(s * 3 + 6) * 0.3);
    let dir = n3([
      root[0] * 0.35 + Math.sin(seed * 12) * 0.08,
      -1,
      root[2] * 0.2 + (bang ? 0.85 : -0.25),
    ]);
    const pts: V3[] = [root];
    let p = root;
    const step = length / HAIR_SEGS;
    for (let i = 0; i < HAIR_SEGS; i += 1) {
      const curl = Math.sin(i * 0.65 + seed * 20) * 0.18;
      const side: V3 = [Math.cos(ang + 1.2), 0, Math.sin(ang)];
      dir = n3(add3(add3(dir, [0, -0.12, 0]), side, curl));
      p = add3(p, dir, step);
      if (p[1] < 1.28) p = [p[0], 1.28, p[2]];
      pts.push(p);
    }
    const color = seed > 0.82 ? HAIR_LIFT : HAIR;
    const width = 0.0016 + seed * 0.0011;
    const edge: number[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      const tan = n3([next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]]);
      let side = cross(tan, [0, 1, 0]);
      if (side[0] * side[0] + side[1] * side[1] + side[2] * side[2] < 0.04) side = cross(tan, [1, 0, 0]);
      side = n3(side);
      const n = n3(cross(tan, side));
      const w = width * (1 - i / (pts.length - 1 || 1));
      const a = pts[i];
      edge.push(
        mesh.vert(a[0] + side[0] * w, a[1] + side[1] * w, a[2] + side[2] * w, n[0], n[1], n[2], color, M_CLOTH),
        mesh.vert(a[0] - side[0] * w, a[1] - side[1] * w, a[2] - side[2] * w, n[0], n[1], n[2], color, M_CLOTH),
      );
    }
    for (let i = 0; i < pts.length - 1; i += 1) {
      const i0 = edge[i * 2];
      const i1 = edge[i * 2 + 1];
      const i2 = edge[(i + 1) * 2];
      const i3 = edge[(i + 1) * 2 + 1];
      mesh.tri(i0, i2, i1);
      mesh.tri(i1, i2, i3);
    }
  }
}

function addContact(mesh: Mesh): void {
  const slices = 18;
  const rings = 5;
  const center = mesh.vert(0, 0.02, 0.02, 0, 1, 0, [0.02, 0.02, 0.024], M_EMIT);
  let prev: number[] = [];
  for (let r = 1; r <= rings; r += 1) {
    const row: number[] = [];
    const t = r / rings;
    const tone = 0.012 + t * 0.05;
    for (let i = 0; i <= slices; i += 1) {
      const a = (i / slices) * Math.PI * 2;
      row.push(
        mesh.vert(
          Math.cos(a) * 0.34 * t,
          0.02,
          0.02 + Math.sin(a) * 0.22 * t,
          0,
          1,
          0,
          [tone, tone, tone + 0.004],
          M_EMIT,
        ),
      );
    }
    const inner = prev.length ? prev : row.map(() => center);
    for (let i = 0; i < slices; i += 1) {
      mesh.tri(inner[i], row[i], inner[i + 1] ?? inner[0]);
      mesh.tri(inner[i + 1] ?? inner[0], row[i], row[i + 1]);
    }
    prev = row;
  }
}

let baked: PersonMesh | null = null;

export function buildPersonMesh(): PersonMesh {
  if (baked) return baked;
  const mesh = new Mesh();
  addSurfaceReal(mesh, 200, 280, (iy, ix) => sampleHead(iy, ix, 200, 280), (x, y, z) => [x, y - HEAD_Y, z]);
  addEar(mesh, -1);
  addEar(mesh, 1);
  addEyes(mesh);
  addNeck(mesh);
  addHair(mesh);
  addClothBody(mesh);
  addLeg(mesh, -1);
  addLeg(mesh, 1);
  for (const side of [-1, 1]) {
    const arm = addSleeve(mesh, side);
    addHand(mesh, arm.wrist, arm.down, arm.palm, arm.across);
  }
  addContact(mesh);
  baked = mesh.finish();
  return baked;
}
