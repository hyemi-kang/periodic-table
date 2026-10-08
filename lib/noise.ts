import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Small deterministic PRNG so layouts and textures are stable between renders. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Procedural, tileable-ish grayscale bump texture made of soft blotches. */
export function createBumpTexture(seed = 7, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(seed);
  for (let i = 0; i < 1800; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 2 + rnd() * rnd() * 26;
    const light = rnd() > 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, light ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)");
    g.addColorStop(1, "rgba(128,128,128,0)");
    ctx.fillStyle = g;
    // draw wrapped copies so the texture tiles without visible seams
    for (const ox of [-size, 0, size])
      for (const oy of [-size, 0, size]) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

const smoothNoise = (x: number, y: number, z: number) =>
  (Math.sin(x * 2.1 + Math.sin(y * 1.7)) +
    Math.sin(y * 2.3 + Math.sin(z * 1.9)) +
    Math.sin(z * 2.7 + Math.sin(x * 1.3))) /
  3;

/** A rock-like displaced sphere used for nuggets (iron, gold, graphite…). */
export function createNuggetGeometry(radius = 1.15, seed = 1) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(radius, 28);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const o = seed * 3.7;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      smoothNoise(v.x * 1.4 + o, v.y * 1.4, v.z * 1.4) +
      0.5 * smoothNoise(v.x * 3.1, v.y * 3.1 + o, v.z * 3.1) +
      0.25 * smoothNoise(v.x * 6.5, v.y * 6.5, v.z * 6.5 + o);
    v.multiplyScalar(1 + 0.2 * n);
    v.y *= 0.82;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  // simple spherical uvs so the bump texture can map
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    uv[i * 2] = 0.5 + Math.atan2(v.z, v.x) / (2 * Math.PI);
    uv[i * 2 + 1] = 0.5 + Math.asin(v.y) / Math.PI;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}
