/**
 * The shared person is public/person.glb: a photogrammetry scan of a clothed
 * adult (shirt, sweatpants, hair, eyes, fists). Triangle count is the scan
 * itself, decimated from the 5-million-triangle capture. The albedo is the
 * photograph. Lighting uses geometric normals. See public/person-credits.txt.
 */

export type PersonImage = { mime: string; bytes: Uint8Array };

export type PersonPrim = {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  image: number;
  /** Image index of the tangent-space normal, or -1. */
  normal: number;
  /** Image index of the metallic-roughness map (roughness in G), or -1. */
  rough: number;
  /** 0 draws opaque. Otherwise alpha-test at this cutoff. */
  alphaCutoff: number;
};

export type PersonMesh = {
  primitives: PersonPrim[];
  images: PersonImage[];
  triangles: number;
  verts: number;
  minY: number;
  maxY: number;
  face: number;
};

type Gltf = {
  accessors: {
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
  }[];
  bufferViews: { buffer?: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
  meshes: { name?: string; primitives: { attributes: Record<string, number>; indices?: number; material?: number }[] }[];
  materials?: {
    name?: string;
    alphaMode?: string;
    alphaCutoff?: number;
    normalTexture?: { index: number };
    pbrMetallicRoughness?: {
      baseColorTexture?: { index: number };
      metallicRoughnessTexture?: { index: number };
    };
  }[];
  textures?: { source?: number }[];
  images?: { mimeType?: string; bufferView?: number }[];
  nodes?: {
    mesh?: number;
    children?: number[];
    translation?: number[];
    scale?: number[];
    rotation?: number[];
    matrix?: number[];
  }[];
  scenes?: { nodes?: number[] }[];
  scene?: number;
};

const COMPS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const CSIZE: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

function readFloats(gltf: Gltf, bin: Uint8Array, index: number): Float32Array {
  const acc = gltf.accessors[index];
  const view = gltf.bufferViews[acc.bufferView ?? 0];
  const comps = COMPS[acc.type];
  const width = CSIZE[acc.componentType];
  if (acc.componentType !== 5126 || !comps || !width) throw new Error("person glb uses non-float attributes");
  const stride = view.byteStride ?? comps * width;
  const start = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const out = new Float32Array(acc.count * comps);
  if (stride === comps * 4) {
    const src = new Float32Array(bin.buffer, bin.byteOffset + start, acc.count * comps);
    out.set(src);
    return out;
  }
  const src = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  for (let i = 0; i < acc.count; i += 1) {
    for (let c = 0; c < comps; c += 1) out[i * comps + c] = src.getFloat32(start + i * stride + c * 4, true);
  }
  return out;
}

function readIndices(gltf: Gltf, bin: Uint8Array, index: number): Uint32Array {
  const acc = gltf.accessors[index];
  const view = gltf.bufferViews[acc.bufferView ?? 0];
  const width = CSIZE[acc.componentType];
  const stride = view.byteStride ?? width;
  const start = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const out = new Uint32Array(acc.count);
  const src = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  for (let i = 0; i < acc.count; i += 1) {
    const at = start + i * stride;
    if (acc.componentType === 5125) out[i] = src.getUint32(at, true);
    else if (acc.componentType === 5123) out[i] = src.getUint16(at, true);
    else if (acc.componentType === 5121) out[i] = src.getUint8(at);
    else throw new Error("person glb index type");
  }
  return out;
}

function chunk(bytes: Uint8Array, type: number): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 12;
  while (off + 8 <= bytes.byteLength) {
    const len = view.getUint32(off, true);
    const kind = view.getUint32(off + 4, true);
    off += 8;
    if (kind === type) return bytes.subarray(off, off + len);
    off += len;
  }
  throw new Error("person glb chunk missing");
}

/** Parse the shipped person. Node scale and translation are baked into the vertices. */
export function parsePerson(buffer: ArrayBuffer): PersonMesh {
  const bytes = new Uint8Array(buffer);
  const magic = new DataView(buffer).getUint32(0, true);
  if (magic !== 0x46546c67) throw new Error("person file is not a glb");
  const json = JSON.parse(new TextDecoder().decode(chunk(bytes, 0x4e4f534a))) as Gltf;
  const bin = chunk(bytes, 0x004e4942);
  const scene = json.scenes?.[json.scene ?? 0];
  const nodes = json.nodes ?? [];
  const placed: { mesh: number; scale: number[]; trans: number[] }[] = [];
  const walk = (index: number, scale: number[], trans: number[]) => {
    const node = nodes[index];
    if (!node) return;
    if (node.matrix || node.rotation) throw new Error("person glb node has a rotation");
    const s = node.scale ?? [1, 1, 1];
    const t = node.translation ?? [0, 0, 0];
    const nextS = [scale[0] * s[0], scale[1] * s[1], scale[2] * s[2]];
    const nextT = [trans[0] + scale[0] * t[0], trans[1] + scale[1] * t[1], trans[2] + scale[2] * t[2]];
    if (node.mesh != null) placed.push({ mesh: node.mesh, scale: nextS, trans: nextT });
    for (const child of node.children ?? []) walk(child, nextS, nextT);
  };
  for (const root of scene?.nodes ?? []) walk(root, [1, 1, 1], [0, 0, 0]);

  const images: PersonImage[] = (json.images ?? []).map((image) => {
    const view = json.bufferViews[image.bufferView ?? 0];
    const start = view.byteOffset ?? 0;
    return { mime: image.mimeType ?? "image/png", bytes: bin.subarray(start, start + view.byteLength) };
  });

  let triangles = 0;
  let verts = 0;
  let minY = 99;
  let maxY = -99;
  let face = -99;
  const primitives: PersonPrim[] = [];
  for (const place of placed) {
    const mesh = json.meshes[place.mesh];
    for (const prim of mesh.primitives) {
      const pos = readFloats(json, bin, prim.attributes.POSITION);
      const nrm = readFloats(json, bin, prim.attributes.NORMAL);
      const uv = readFloats(json, bin, prim.attributes.TEXCOORD_0);
      const indices = readIndices(json, bin, prim.indices ?? 0);
      const [sx, sy, sz] = place.scale;
      const [tx, ty, tz] = place.trans;
      for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i] * sx + tx;
        const y = pos[i + 1] * sy + ty;
        const z = pos[i + 2] * sz + tz;
        pos[i] = x;
        pos[i + 1] = y;
        pos[i + 2] = z;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (y > 1.45 && y < 1.75 && z > face) face = z;
      }
      const mat = json.materials?.[prim.material ?? 0];
      const sourceOf = (index: number | undefined) => {
        if (index == null) return -1;
        const source = json.textures?.[index]?.source;
        return source == null ? -1 : source;
      };
      const image = sourceOf(mat?.pbrMetallicRoughness?.baseColorTexture?.index);
      const normal = sourceOf(mat?.normalTexture?.index);
      const rough = sourceOf(mat?.pbrMetallicRoughness?.metallicRoughnessTexture?.index);
      const cutoff = mat?.alphaMode === "MASK" ? (mat.alphaCutoff ?? 0.5) : 0;
      triangles += indices.length / 3;
      verts += pos.length / 3;
      primitives.push({ name: mesh.name ?? "person", positions: pos, normals: nrm, uvs: uv, indices, image, normal, rough, alphaCutoff: cutoff });
    }
  }
  primitives.sort((a, b) => a.alphaCutoff - b.alphaCutoff);
  return { primitives, images, triangles, verts, minY, maxY, face };
}

/** Bounds and density of a parsed person buffer. */
export function humanSpan(buffer: ArrayBuffer): { minY: number; maxY: number; face: number; verts: number; triangles: number } {
  const mesh = parsePerson(buffer);
  return { minY: mesh.minY, maxY: mesh.maxY, face: mesh.face, verts: mesh.verts, triangles: mesh.triangles };
}

export function humanTriangles(buffer: ArrayBuffer): number {
  return humanSpan(buffer).triangles;
}
