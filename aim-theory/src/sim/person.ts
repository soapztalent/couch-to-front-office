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

type RGB = [number, number, number];
type V3 = [number, number, number];

export type PersonMesh = {
  verts: Float32Array;
  indices: Uint32Array;
  triangles: number;
};

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

function bell(v: number, center: number, width: number): number {
  const d = (v - center) / width;
  return Math.exp(-d * d);
}

/** Crown sits near 1.75. Eyes are at the midline so the face reads at a glance. */
const HY = 1.6;
const HZ = 0.02;

function addHead(mesh: Mesh): void {
  const stacks = 120;
  const slices = 160;
  addSurfaceReal(
    mesh,
    stacks,
    slices,
    (iy, ix) => {
      const phi = (iy / stacks) * Math.PI;
      const ang = (ix / slices) * Math.PI * 2;
      const sp = Math.sin(phi);
      const ux = Math.cos(ang) * sp;
      const uy = Math.cos(phi);
      const uz = Math.sin(ang) * sp;
      const x0 = ux * 0.08;
      const y0 = uy * 0.112;
      const z0 = uz * 0.092;
      let x = x0;
      let y = y0;
      let z = z0;
      const facing = smooth(0.01, 0.07, z0);
      const jaw = smooth(-0.015, -0.085, y0) * facing;
      x *= 1 - jaw * 0.2;
      const socket =
        (bell(x0, 0.03, 0.013) + bell(x0, -0.03, 0.013)) * bell(y0, 0.004, 0.011) * facing;
      z -= socket * 0.016;
      const ridge = bell(x0, 0, 0.011) * bell(y0, -0.008, 0.032) * facing;
      z += ridge * 0.02;
      const tip = bell(x0, 0, 0.013) * bell(y0, -0.026, 0.013) * facing;
      z += tip * 0.02;
      y -= tip * 0.004;
      const nostril = (bell(x0, 0.011, 0.0055) + bell(x0, -0.011, 0.0055)) * bell(y0, -0.034, 0.0055) * facing;
      z -= nostril * 0.007;
      const lips = bell(x0, 0, 0.022) * bell(y0, -0.05, 0.011) * facing;
      z += lips * 0.009;
      const groove = bell(x0, 0, 0.016) * bell(y0, -0.052, 0.0036) * facing;
      z -= groove * 0.008;
      const chin = bell(x0, 0, 0.018) * bell(y0, -0.078, 0.014) * facing;
      z += chin * 0.01;
      const brow = (bell(x0, 0.032, 0.015) + bell(x0, -0.032, 0.015)) * bell(y0, 0.02, 0.0055) * facing;
      z += brow * 0.005;
      y += brow * 0.002;
      const cheek = (bell(x0, 0.038, 0.018) + bell(x0, -0.038, 0.018)) * bell(y0, -0.018, 0.022) * facing;
      z += cheek * 0.006;
      const under = smooth(-0.04, -0.1, y0) * (1 - facing);
      y += under * 0.03;
      let color = SKIN;
      color = mixc(color, [0.8, 0.5, 0.42], Math.min(0.45, cheek * 0.55));
      color = mixc(color, LIP, Math.min(1, Math.max(0, lips - 0.25) * 1.8));
      color = mixc(color, HAIR, Math.min(1, Math.max(0, brow - 0.35) * 2.4));
      color = mixc(color, SKIN_DEEP, Math.min(1, nostril * 1.3));
      color = mixc(color, [0.07, 0.02, 0.018], Math.min(1, Math.max(0, groove - 0.25) * 3));
      return { x, y: y + HY, z: z + HZ, color, mat: M_SKIN };
    },
    (x, y, z) => [x, y - HY, z - HZ],
  );
}

function addEars(mesh: Mesh): void {
  for (const side of [-1, 1]) {
    addSphere(mesh, [side * 0.098, HY - 0.006, HZ - 0.012], [0.014, 0.034, 0.02], 16, 18, SKIN, M_SKIN);
    addSphere(mesh, [side * 0.094, HY - 0.006, HZ - 0.006], [0.006, 0.018, 0.008], 8, 10, SKIN_DEEP, M_SKIN);
  }
}

function addEyes(mesh: Mesh): void {
  for (const side of [-1, 1]) {
    const x = side * 0.031;
    const y = HY + 0.004;
    const z = HZ + 0.078;
    addSphere(mesh, [x, y, z], [0.015, 0.012, 0.012], 20, 24, SCLERA, M_SKIN);
    addSphere(mesh, [x, y, z + 0.01], [0.008, 0.008, 0.004], 14, 16, IRIS, M_SKIN);
    addSphere(mesh, [x, y, z + 0.014], [0.0038, 0.0038, 0.002], 8, 10, PUPIL, M_SKIN);
    addTube(mesh, [x - 0.014, y + 0.008, z + 0.008], [x + 0.014, y + 0.008, z + 0.01], 3, 6, () => 0.0045, SKIN, M_SKIN);
  }
}

function addBrows(mesh: Mesh): void {
  const y = HY + 0.022;
  const z = HZ + 0.096;
  addTube(mesh, [-0.052, y, z], [-0.012, y + 0.007, z + 0.004], 4, 7, () => 0.0048, HAIR, M_SKIN);
  addTube(mesh, [0.012, y + 0.007, z + 0.004], [0.052, y, z], 4, 7, () => 0.0048, HAIR, M_SKIN);
}

function addNose(mesh: Mesh): void {
  addSphere(mesh, [0, HY - 0.012, HZ + 0.108], [0.012, 0.028, 0.016], 16, 18, SKIN, M_SKIN);
  addSphere(mesh, [0, HY - 0.03, HZ + 0.118], [0.014, 0.012, 0.012], 12, 14, SKIN, M_SKIN);
}

function addMouth(mesh: Mesh): void {
  addSphere(mesh, [0, HY - 0.05, HZ + 0.1], [0.026, 0.011, 0.012], 14, 18, LIP, M_SKIN);
  addSphere(mesh, [0, HY - 0.052, HZ + 0.112], [0.016, 0.0042, 0.007], 10, 14, [0.05, 0.015, 0.014], M_SKIN);
}

function addHair(mesh: Mesh): void {
  const layers = 9;
  const stacks = 200;
  const slices = 280;
  for (let layer = 0; layer < layers; layer += 1) {
    const lift = 0.008 + layer * 0.0036;
    const color = mixc(HAIR, HAIR_LIFT, layer / (layers - 1));
    addSurfaceReal(
      mesh,
      stacks,
      slices,
      (iy, ix) => {
        const ang = (ix / slices) * Math.PI * 2;
        const front = Math.max(0, Math.sin(ang));
        const back = Math.max(0, -Math.sin(ang));
        const side = Math.abs(Math.cos(ang));
        let phi = 1.17 + side * 0.16 + back * 0.98;
        phi += Math.exp(-(Math.cos(ang) * Math.cos(ang)) / 0.22) * front * 0.08;
        phi += back * layer * 0.012;
        const t = iy / stacks;
        const p = phi * t;
        const sp = Math.sin(p);
        const ux = Math.cos(ang) * sp;
        const uy = Math.cos(p);
        const uz = Math.sin(ang) * sp;
        return {
          x: ux * 0.082 + ux * lift,
          y: HY + uy * 0.114 + uy * lift,
          z: HZ + uz * 0.094 + uz * lift,
          color,
          mat: M_CLOTH,
        };
      },
      (x, y, z) => [x, y - HY, z - HZ],
    );
  }
}

function addNeck(mesh: Mesh): void {
  addTube(mesh, [0, 1.46, 0.02], [0, 1.55, HZ], 10, 20, (t) => mix(0.058, 0.046, t), SKIN, M_SKIN);
}

function addJacket(mesh: Mesh): void {
  addSurfaceReal(
    mesh,
    64,
    128,
    (iy, ix) => {
      const t = iy / 64;
      const ang = (ix / 128) * Math.PI * 2;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const y = mix(0.86, 1.46, t);
      let rx = 0.15;
      rx += Math.exp(-((t - 0.2) ** 2) / 0.028) * -0.018;
      rx += Math.exp(-((t - 0.6) ** 2) / 0.05) * 0.032;
      rx += smooth(0.72, 1, t) * 0.085;
      let rz = 0.092 + smooth(0.35, 0.72, t) * 0.028;
      const front = Math.max(0, sa);
      rz += front * 0.022 * smooth(0.4, 0.78, t);
      const side = ca * ca;
      const yUse = y - smooth(0.78, 1, t) * side * 0.06;
      const seam = Math.exp(-(ca * ca) / 0.008) * front;
      let color = mixc(JACKET, JACKET_DARK, seam * 0.92 + (1 - t) * 0.28);
      color = mixc(color, [0.62, 0.65, 0.7], smooth(0.72, 1, t) * 0.4);
      return { x: ca * rx, y: yUse, z: sa * rz, color, mat: M_CLOTH };
    },
    (x, _y, z) => [x, 0, z],
  );
  addTube(mesh, [0, 1.42, 0.02], [0, 1.5, 0.028], 6, 28, (t) => 0.064 + t * 0.012, JACKET_DARK, M_CLOTH);
}

function addLimb(mesh: Mesh, a: V3, b: V3, r0: number, r1: number, color: RGB, mat: number): void {
  addTube(mesh, a, b, 16, 22, (t) => mix(r0, r1, t), color, mat);
  addSphere(mesh, a, [r0, r0, r0], 12, 14, color, mat);
  addSphere(mesh, b, [r1, r1, r1], 12, 14, color, mat);
}

function addArms(mesh: Mesh): void {
  for (const side of [-1, 1]) {
    const shoulder: V3 = [side * 0.19, 1.38, 0.03];
    const elbow: V3 = [side * 0.23, 1.1, 0.07];
    const wrist: V3 = [side * 0.2, 0.88, 0.13];
    addLimb(mesh, shoulder, elbow, 0.052, 0.042, JACKET, M_CLOTH);
    addLimb(mesh, elbow, wrist, 0.04, 0.032, JACKET, M_CLOTH);
  }
}

function addHands(mesh: Mesh): void {
  for (const side of [-1, 1]) {
    const x = side * 0.2;
    const y = 0.84;
    const z = 0.16;
    addSphere(mesh, [x, y - 0.01, z], [0.078, 0.05, 0.014], 16, 18, SKIN, M_SKIN);
    const lengths = [0.078, 0.096, 0.09, 0.07];
    for (let i = 0; i < 4; i += 1) {
      const fx = x + (i - 1.5) * 0.042;
      const len = lengths[i];
      const spread = (i - 1.5) * 0.012;
      const y0 = y - 0.038;
      const z0 = z + 0.016;
      addTube(mesh, [fx, y0, z0], [fx + spread, y0 - len, z0 + 0.028], 10, 12, (t) => mix(0.0085, 0.0064, t), SKIN, M_SKIN);
      addSphere(mesh, [fx + spread, y0 - len - 0.004, z0 + 0.03], [0.0075, 0.006, 0.005], 6, 8, NAIL, M_SKIN);
    }
    const tx = x + side * 0.09;
    addTube(
      mesh,
      [tx, y + 0.02, z + 0.01],
      [tx + side * 0.04, y - 0.05, z + 0.04],
      8,
      10,
      (t) => mix(0.012, 0.008, t),
      SKIN,
      M_SKIN,
    );
    addSphere(mesh, [tx + side * 0.042, y - 0.056, z + 0.042], [0.01, 0.008, 0.007], 6, 8, NAIL, M_SKIN);
  }
}

function addLegs(mesh: Mesh): void {
  addSphere(mesh, [0, 0.98, 0.0], [0.13, 0.05, 0.075], 12, 16, PANTS, M_CLOTH);
  for (const side of [-1, 1]) {
    const hip: V3 = [side * 0.09, 0.9, 0.01];
    const knee: V3 = [side * 0.1, 0.5, 0.045];
    const ankle: V3 = [side * 0.085, 0.16, 0.025];
    addLimb(mesh, hip, knee, 0.074, 0.052, PANTS, M_CLOTH);
    addLimb(mesh, knee, ankle, 0.05, 0.038, PANTS, M_CLOTH);
  }
}

function addBoots(mesh: Mesh): void {
  for (const side of [-1, 1]) {
    const x = side * 0.085;
    addTube(mesh, [x, 0.18, 0.03], [x, 0.055, 0.05], 10, 14, (t) => mix(0.046, 0.05, t), BOOT, M_CLOTH);
    addSphere(mesh, [x, 0.055, 0.12], [0.046, 0.032, 0.06], 12, 14, BOOT, M_CLOTH);
  }
}

let baked: PersonMesh | null = null;

export function buildPersonMesh(): PersonMesh {
  if (baked) return baked;
  const mesh = new Mesh();
  addHead(mesh);
  addEars(mesh);
  addEyes(mesh);
  addBrows(mesh);
  addNose(mesh);
  addMouth(mesh);
  addHair(mesh);
  addNeck(mesh);
  addJacket(mesh);
  addArms(mesh);
  addHands(mesh);
  addLegs(mesh);
  addBoots(mesh);
  baked = mesh.finish();
  return baked;
}

