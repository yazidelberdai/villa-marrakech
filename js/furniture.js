// Furniture & props built from primitives. Each returns a Group centred on x/z, standing on y=0, front facing +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, artTex } from './textures.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
export function box(g, mat, w, h, d, x = 0, y = 0, z = 0, worldUV = false) {
  const m = new THREE.Mesh(worldUV ? uvBox(w, h, d) : BOX, mat);
  if (!worldUV) m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
export function uvBox(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return geo;
}
function rbox(g, mat, w, h, d, r, x, y, z) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
function cyl(g, mat, rt, rb, h, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
const G = () => new THREE.Group();

// ---------- seating ----------
export function sofa(M, { len = 2.4, depth = 0.95, arms = 'both', fab = M.sofa1, lux = false, cushions = [] } = {}) {
  const g = G(), seatH = 0.42, backH = 0.82, armW = arms === 'none' ? 0 : 0.2;
  const legH = lux ? 0.1 : 0.06;
  box(g, lux ? M.metal : M.woodDark, len - 0.1, legH, depth - 0.1, 0, 0, 0);
  rbox(g, fab, len, seatH - legH - 0.12, depth, 0.03, 0, legH, 0);
  const inner = len - (arms === 'both' ? 2 : arms === 'none' ? 0 : 1) * armW;
  const x0 = -len / 2 + (arms === 'both' || arms === 'left' ? armW : 0);
  const n = Math.max(1, Math.round(inner / 0.9)), cw = inner / n;
  for (let i = 0; i < n; i++) {
    rbox(g, fab, cw - 0.02, 0.14, depth - 0.25, 0.06, x0 + cw * (i + 0.5), seatH - 0.13, 0.1);
    const back = rbox(g, fab, cw - 0.02, backH - seatH + 0.05, 0.22, 0.08, x0 + cw * (i + 0.5), seatH - 0.05, -depth / 2 + 0.16);
    back.rotation.x = -0.12;
  }
  box(g, fab, len, backH - legH - 0.1, 0.14, 0, legH, -depth / 2 + 0.07);
  if (arms === 'both' || arms === 'left') rbox(g, fab, armW, 0.62 - legH, depth, 0.05, -len / 2 + armW / 2, legH, 0);
  if (arms === 'both' || arms === 'right') rbox(g, fab, armW, 0.62 - legH, depth, 0.05, len / 2 - armW / 2, legH, 0);
  cushions.forEach((c, i) => {
    const m = rbox(g, c, 0.45, 0.45, 0.14, 0.06, x0 + 0.35 + i * 0.5 * (inner > 2 ? 1.2 : 1), seatH, -depth / 2 + 0.33);
    m.rotation.x = -0.25; m.rotation.z = (i % 2 ? 1 : -1) * 0.06;
  });
  return g;
}

// L-shaped sofa: long run along x (back at -z), return leg on the left going +z. Origin = back-left corner.
export function lSofa(M, { len, legLen, depth = 0.95, fab, lux, cushions }) {
  const g = G();
  const a = sofa(M, { len, depth, arms: 'right', fab, lux, cushions }); a.position.set(len / 2, 0, depth / 2); g.add(a);
  const b = sofa(M, { len: legLen - depth, depth, arms: 'right', fab, lux }); b.rotation.y = Math.PI / 2; b.position.set(depth / 2, 0, depth + (legLen - depth) / 2); g.add(b);
  return g;
}

export function armchair(M, { fab = M.sofa2, lux = false, round = false } = {}) {
  const g = G();
  if (round) {
    cyl(g, fab, 0.42, 0.4, 0.42, 0, 0.04, 0, 32);
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.35, 32, 1, true, Math.PI * 0.6, Math.PI * 0.8), fab);
    back.material.side = THREE.DoubleSide; back.position.y = 0.6; back.scale.set(1, 1, 1); back.castShadow = true; g.add(back);
    cyl(g, lux ? M.metal : M.woodDark, 0.3, 0.32, 0.04, 0, 0, 0);
    return g;
  }
  [-0.3, 0.3].forEach((x) => [-0.3, 0.3].forEach((z) => cyl(g, lux ? M.metal : M.woodDark, 0.02, 0.015, 0.18, x, 0, z, 8)));
  rbox(g, fab, 0.78, 0.26, 0.78, 0.06, 0, 0.16, 0);
  const b = rbox(g, fab, 0.78, 0.45, 0.16, 0.06, 0, 0.36, -0.31); b.rotation.x = -0.15;
  rbox(g, fab, 0.12, 0.25, 0.7, 0.05, -0.33, 0.38, 0.02); rbox(g, fab, 0.12, 0.25, 0.7, 0.05, 0.33, 0.38, 0.02);
  return g;
}

export function pouf(M, mat, r = 0.28, h = 0.4) { const g = G(); rbox(g, mat, r * 2, h, r * 2, 0.12, 0, 0, 0); return g; }

export function diningChair(M, { lux = false } = {}) {
  const g = G(), legM = lux ? M.metal : M.wood;
  [-0.2, 0.2].forEach((x) => [-0.2, 0.2].forEach((z) => box(g, legM, 0.035, 0.45, 0.035, x, 0, z)));
  rbox(g, M.chairFab, 0.48, 0.08, 0.48, 0.03, 0, 0.45, 0);
  const b = rbox(g, lux ? M.chairFab : M.rattan, 0.46, lux ? 0.5 : 0.4, 0.05, 0.02, 0, lux ? 0.53 : 0.55, -0.22); b.rotation.x = -0.08;
  if (!lux) { box(g, legM, 0.035, 0.5, 0.035, -0.2, 0.45, -0.22); box(g, legM, 0.035, 0.5, 0.035, 0.2, 0.45, -0.22); }
  return g;
}

export function barStool(M, { lux }) {
  const g = G();
  cyl(g, M.metal, 0.02, 0.02, 0.62, 0, 0.04, 0, 8);
  cyl(g, M.metal, 0.2, 0.2, 0.03, 0, 0, 0);
  cyl(g, M.metal, 0.17, 0.17, 0.02, 0, 0.3, 0, 16).scale.set(1, 1, 1);
  rbox(g, lux ? M.chairFab : M.wood, 0.42, 0.07, 0.38, 0.03, 0, 0.66, 0);
  if (lux) rbox(g, M.chairFab, 0.42, 0.22, 0.05, 0.02, 0, 0.73, -0.17);
  return g;
}

// ---------- tables & storage ----------
export function coffeeTable(M, { w = 1.2, d = 0.7, round = false, lux = false } = {}) {
  const g = G();
  if (round) { cyl(g, M.tableTop, w / 2, w / 2, 0.06, 0, 0.32, 0, 40); cyl(g, lux ? M.metal : M.woodDark, w * 0.3, w * 0.34, 0.32, 0, 0, 0, 32); return g; }
  box(g, M.tableTop, w, 0.05, d, 0, 0.33, 0, true);
  if (lux) { box(g, M.metal, w - 0.1, 0.33, 0.02, 0, 0, -d / 2 + 0.1); box(g, M.metal, w - 0.1, 0.33, 0.02, 0, 0, d / 2 - 0.1); box(g, M.stone, w * 0.8, 0.02, d * 0.75, 0, 0.12, 0, true); }
  else[-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(g, M.woodDark, 0.05, 0.33, 0.05, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08))));
  return g;
}

export function sideTable(M, { lux } = {}) { const g = G(); cyl(g, lux ? M.stone : M.wood, 0.25, 0.25, 0.04, 0, 0.5, 0); cyl(g, lux ? M.metal : M.woodDark, 0.03, 0.03, 0.5, 0, 0, 0, 8); cyl(g, lux ? M.metal : M.woodDark, 0.18, 0.18, 0.02, 0, 0, 0); return g; }

export function diningTable(M, { w = 1.0, l = 2.6, lux = false } = {}) {
  // long along z
  const g = G();
  box(g, M.tableTop, w, 0.05, l, 0, 0.72, 0, true);
  if (lux) { box(g, M.woodDark, 0.25, 0.72, 0.6, 0, 0, -l / 4); box(g, M.woodDark, 0.25, 0.72, 0.6, 0, 0, l / 4); box(g, M.metal, 0.3, 0.02, 0.66, 0, 0.0, -l / 4); box(g, M.metal, 0.3, 0.02, 0.66, 0, 0.0, l / 4); }
  else[-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(g, M.wood, 0.07, 0.72, 0.07, sx * (w / 2 - 0.1), 0, sz * (l / 2 - 0.12))));
  return g;
}

export function sideboard(M, { len = 3, depth = 0.45, h = 0.75, lux = false } = {}) {
  const g = G();
  box(g, lux ? M.featureWall || M.woodDark : M.wood, len, h - 0.12, depth, 0, 0.1, 0, true);
  box(g, lux ? M.tableTop : M.wood, len + 0.02, 0.03, depth + 0.02, 0, h - 0.02, 0, true);
  if (lux) box(g, M.metal, len - 0.1, 0.1, depth - 0.1, 0, 0, 0); else[-1, 1].forEach((s) => box(g, M.metal, 0.04, 0.1, depth - 0.1, s * (len / 2 - 0.1), 0, 0));
  const n = Math.round(len / 0.6);
  for (let i = 1; i < n; i++) box(g, M.metal, 0.005, h - 0.2, 0.005, -len / 2 + (len / n) * i, 0.14, depth / 2 + 0.002);
  return g;
}

export function tv(M, w = 1.65) { const g = G(); box(g, M.screen, w, w * 0.57, 0.04, 0, 0, 0); return g; }

export function rug(tex, w, d) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.receiveShadow = true;
  const g = G(); g.add(m); return g;
}

export function art(M, w, h, seed) {
  const g = G();
  box(g, M.woodDark, w + 0.08, h + 0.08, 0.04, 0, -h / 2 - 0.04, 0);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: artTex(seed, M.art), roughness: 0.9 }));
  p.position.set(0, 0, 0.021); g.add(p); return g;
}

export function mirror(M, w, h, { arch = false, frame = M.metal } = {}) {
  const g = G();
  if (arch) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2 - w / 2); s.absarc(0, h / 2 - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, -h / 2);
    const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }), frame); g.add(fr);
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(s), M.mirror); inner.scale.set(0.93, 0.95, 1); inner.position.z = 0.032; g.add(inner);
  } else { box(g, frame, w + 0.04, h + 0.04, 0.02, 0, -h / 2 - 0.02, 0); box(g, M.mirror, w, h, 0.01, 0, -h / 2, 0.012); }
  return g;
}

export function shelves(M, { len = 2, h = 2.1, depth = 0.4, n = 5, mat = M.wood, items = true, seed = 5 } = {}) {
  const g = G(), R = rng(seed);
  for (let i = 0; i < n; i++) box(g, mat, len, 0.03, depth, 0, (h / (n - 1)) * i * 0.97, 0, true);
  box(g, mat, 0.03, h, depth, -len / 2, 0, 0); box(g, mat, 0.03, h, depth, len / 2, 0, 0);
  if (items) for (let i = 0; i < n - 1; i++) for (let k = 0; k < 6; k++) {
    if (R() < 0.35) continue;
    const c = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.08 + R() * 0.1, 0.3, 0.35 + R() * 0.4), roughness: 0.8 });
    const hh = 0.12 + R() * 0.18; box(g, c, 0.12 + R() * 0.1, hh, 0.15 + R() * 0.1, -len / 2 + 0.2 + k * (len - 0.4) / 5, (h / (n - 1)) * i * 0.97 + 0.03, 0);
  }
  return g;
}

export function wardrobe(M, { len = 1.2, h = 2.3, depth = 0.6 } = {}) {
  const g = G(); box(g, M.doorLeaf, len, h, depth, 0, 0, 0, true);
  for (let i = 1; i < Math.round(len / 0.5); i++) box(g, M.woodDark, 0.006, h - 0.04, 0.006, -len / 2 + i * len / Math.round(len / 0.5), 0.02, depth / 2 + 0.003);
  box(g, M.metal, 0.02, 0.4, 0.02, -0.03, 1.0, depth / 2 + 0.02); box(g, M.metal, 0.02, 0.4, 0.02, 0.03, 1.0, depth / 2 + 0.02);
  return g;
}

export function bed(M, { w = 0.95, l = 2.0, lux = false } = {}) {
  // headboard at -z
  const g = G();
  box(g, M.bed, w + 0.06, 0.3, l, 0, 0.06, 0);
  box(g, M.woodDark, w, 0.06, l - 0.1, 0, 0, 0);
  rbox(g, M.linen, w, 0.2, l - 0.05, 0.05, 0, 0.36, 0.02);
  rbox(g, M.linen, w * 0.8, 0.12, 0.38, 0.05, 0, 0.54, -l / 2 + 0.28);
  rbox(g, M.throw, w + 0.04, 0.04, 0.5, 0.02, 0, 0.55, l / 2 - 0.4);
  rbox(g, M.bed, w + 0.1, lux ? 1.2 : 1.0, 0.08, 0.03, 0, 0, -l / 2 - 0.04);
  return g;
}

// ---------- bathrooms ----------
export function toilet(M) { const g = G(); rbox(g, M.ceramic, 0.36, 0.33, 0.52, 0.12, 0, 0.25, 0.04); rbox(g, M.ceramic, 0.36, 0.04, 0.48, 0.1, 0, 0.58, 0.05); box(g, M.ceramic, 0.5, 1.1, 0.12, 0, 0, -0.27); box(g, M.tap, 0.16, 0.08, 0.01, 0, 0.95, -0.205); return g; }
export function bidet(M) { const g = G(); rbox(g, M.ceramic, 0.36, 0.3, 0.52, 0.12, 0, 0.28, 0.04); box(g, M.ceramic, 0.5, 1.1, 0.12, 0, 0, -0.27); cyl(g, M.tap, 0.015, 0.015, 0.08, 0, 0.58, -0.15, 8); return g; }
export function vanity(M, { len = 1.6, sinks = 2, lux = false } = {}) {
  const g = G(), d = 0.5;
  box(g, lux ? M.wood : M.wood, len, 0.4, d, 0, 0.45, 0, true);
  box(g, lux ? M.tableTop : M.counter, len + 0.02, 0.04, d + 0.02, 0, 0.85, 0, true);
  for (let i = 0; i < sinks; i++) {
    const x = -len / 2 + (len / sinks) * (i + 0.5);
    cyl(g, M.ceramic, 0.21, 0.17, 0.13, x, 0.89, 0.02, 28);
    const t = cyl(g, M.tap, 0.012, 0.012, 0.28, x, 0.89, -0.2, 8);
    box(g, M.tap, 0.025, 0.025, 0.14, x, 1.15, -0.14);
  }
  return g;
}
export function shower(M, { w = 0.9, d = 0.85 } = {}) {
  const g = G();
  box(g, M.floorWet, w, 0.03, d, 0, 0, 0, true);
  const gl = new THREE.Mesh(BOX, M.glass); gl.scale.set(0.01, 2.0, d); gl.position.set(-w / 2, 1.03, 0); g.add(gl);
  cyl(g, M.tap, 0.012, 0.012, 1.0, w / 2 - 0.1, 1.1, -d / 2 + 0.05, 8);
  cyl(g, M.tap, 0.12, 0.12, 0.01, w / 2 - 0.25, 2.1, -d / 2 + 0.2, 20);
  return g;
}

// ---------- kitchen ----------
export function baseRun(M, { len, depth = 0.65, sink = false, hob = false, lux = false }) {
  const g = G();
  box(g, M.metal, len - 0.05, 0.1, depth - 0.1, 0, 0, -0.03);
  box(g, M.kitchenCab, len, 0.78, depth - 0.02, 0, 0.1, -0.01, true);
  const n = Math.max(1, Math.round(len / 0.6));
  for (let i = 1; i < n; i++) box(g, M.metal, 0.004, 0.76, 0.004, -len / 2 + (len / n) * i, 0.11, depth / 2 - 0.02);
  if (!lux) for (let i = 0; i < n; i++) box(g, M.metal, 0.3, 0.015, 0.02, -len / 2 + (len / n) * (i + 0.5), 0.8, depth / 2 - 0.01);
  box(g, M.counter, len + 0.02, 0.04, depth + 0.02, 0, 0.88, 0, true);
  if (sink) { box(g, M.steel, 0.75, 0.005, 0.42, 0, 0.921, 0); cyl(g, M.tap, 0.015, 0.015, 0.35, 0, 0.92, -0.25, 8); box(g, M.tap, 0.03, 0.03, 0.22, 0, 1.25, -0.16); }
  if (hob) { box(g, M.blackGlass, 0.8, 0.006, 0.5, 0, 0.92, 0); }
  return g;
}
export function island(M, { len = 2.1, depth = 1.2, lux = false }) {
  const g = G();
  box(g, M.kitchenCab2, len - 0.1, 0.88, depth - 0.3, 0, 0, -0.12, true);
  box(g, M.counter, len + (lux ? 0 : 0.02), 0.06, depth, 0, 0.88, 0, true);
  if (lux) { box(g, M.counter, 0.06, 0.88, depth, -len / 2 + 0.03, 0, 0, true); box(g, M.counter, 0.06, 0.88, depth, len / 2 - 0.03, 0, 0, true); }
  box(g, M.blackGlass, 0.8, 0.006, 0.5, 0, 0.94, -0.18);
  return g;
}
export function tallUnit(M, { len = 0.7, h = 2.35, depth = 0.65, fridge = true }) {
  const g = G(); box(g, M.kitchenCab2, len, h, depth, 0, 0, 0, true);
  if (fridge) box(g, M.metal, 0.02, 0.8, 0.02, len / 2 - 0.06, 0.8, depth / 2 + 0.01);
  return g;
}
export function hood(M, { lux }) {
  const g = G();
  if (lux) { box(g, M.accentMetal, 0.9, 0.35, 0.6, 0, 0, 0); box(g, M.kitchenCab2, 0.35, 1.0, 0.3, 0, 0.35, 0); }
  else { box(g, M.steel, 0.9, 0.08, 0.55, 0, 0, 0); box(g, M.steel, 0.3, 1.1, 0.25, 0, 0.08, 0); }
  return g;
}

// ---------- lighting ----------
export function pendant(M, { kind = 'rattan', drop = 1.0, ceil = 3.4 }) {
  const g = G();
  const y = ceil - drop;
  cyl(g, M.metal, 0.004, 0.004, drop, 0, y, 0, 4);
  if (kind === 'rattan') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), M.rattan); m.material.side = THREE.DoubleSide; m.position.y = y - 0.02; m.castShadow = true; g.add(m); }
  else if (kind === 'dome') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.shade); m.position.y = y - 0.05; g.add(m); }
  else if (kind === 'globe') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), M.bulb); m.position.y = y - 0.1; g.add(m); cyl(g, M.metal, 0.03, 0.03, 0.06, 0, y - 0.03, 0, 12); }
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), M.bulb); b.position.y = y - 0.12; g.add(b);
  return g;
}
export function ringChandelier(M, { r = 0.9, ceil = 3.4, drop = 1.2 }) {
  const g = G(), y = ceil - drop;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const c = cyl(g, M.metal, 0.004, 0.004, drop, Math.cos(a) * r * 0.8, y, Math.sin(a) * r * 0.8, 4); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 10, 64), M.metal); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.6, 0.02, 10, 48), M.metal); ring2.rotation.x = Math.PI / 2; ring2.position.y = y + 0.25; g.add(ring2);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), M.bulb); b.position.set(Math.cos(a) * r, y + 0.06, Math.sin(a) * r); g.add(b); }
  return g;
}
export function linearPendant(M, { len = 2, ceil = 3.4, drop = 1.15 }) {
  const g = G(), y = ceil - drop;
  cyl(g, M.metal, 0.003, 0.003, drop, -len / 2 + 0.1, y, 0, 4); cyl(g, M.metal, 0.003, 0.003, drop, len / 2 - 0.1, y, 0, 4);
  box(g, M.accentMetal, len, 0.05, 0.08, 0, y - 0.05, 0);
  box(g, M.bulb, len - 0.06, 0.01, 0.05, 0, y - 0.06, 0);
  return g;
}
export function lantern(M, { h = 0.6, hanging = false }) {
  // Moroccan brass lantern
  const g = G(), y = hanging ? -h : 0;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.22, h * 0.28, h * 0.6, 8, 1, true), M.accentMetal); body.material.side = THREE.DoubleSide; body.position.y = y + h * 0.4; g.add(body);
  const top = new THREE.Mesh(new THREE.ConeGeometry(h * 0.24, h * 0.3, 8), M.accentMetal); top.position.y = y + h * 0.85; g.add(top);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(h * 0.12, 10, 8), M.bulb); glow.position.y = y + h * 0.4; g.add(glow);
  cyl(g, M.accentMetal, h * 0.2, h * 0.2, 0.02, 0, y + h * 0.08, 0, 8);
  return g;
}
export function floorLamp(M, { lux }) {
  const g = G();
  cyl(g, M.metal, 0.16, 0.16, 0.02, 0, 0, 0); cyl(g, M.metal, 0.012, 0.012, 1.45, 0, 0.02, 0, 8);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.3, 24, 1, true), lux ? M.shade : M.shade); s.position.y = 1.5; g.add(s);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.bulb); b.position.y = 1.45; g.add(b);
  return g;
}
export function downlight(M) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), M.bulb); m.rotation.x = Math.PI / 2; return m; }

// ---------- plants ----------
export function plant(M, { h = 1.6, pot = 0.45, seed = 1, kind = 'olive' } = {}) {
  const g = G(), R = rng(seed);
  cyl(g, M.pot, pot * 0.5, pot * 0.38, pot * 0.95, 0, 0, 0, 20);
  cyl(g, M.soil, pot * 0.46, pot * 0.46, 0.02, 0, pot * 0.9, 0, 16);
  if (kind === 'fern' || kind === 'bush') {
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(pot * 0.45 + R() * 0.12, 0), M.leaf); m.position.set((R() - 0.5) * pot, pot + 0.15 + R() * pot * 0.6, (R() - 0.5) * pot); m.castShadow = true; g.add(m); }
    return g;
  }
  cyl(g, M.trunk, 0.025, 0.04, h * 0.6, 0, pot * 0.9, 0, 6);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + R() * 0.14, 0), kind === 'olive' ? M.olive : M.leaf);
    const a = R() * Math.PI * 2, r = R() * h * 0.22;
    m.position.set(Math.cos(a) * r, pot + h * 0.55 + R() * h * 0.4, Math.sin(a) * r); m.castShadow = true; g.add(m);
  }
  return g;
}
export function oliveTree(M, { r = 2.5, seed = 3 }) {
  const g = G(), R = rng(seed), h = r * 1.4;
  for (let k = 0; k < 3; k++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.16, h * 0.55, 7), M.trunk);
    t.position.set((R() - 0.5) * 0.3, h * 0.27, (R() - 0.5) * 0.3); t.rotation.z = (R() - 0.5) * 0.4; t.rotation.x = (R() - 0.5) * 0.4; t.castShadow = true; g.add(t);
  }
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + R() * 0.55, 1), M.olive);
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r * 0.75;
    m.position.set(Math.cos(a) * d, h * 0.55 + R() * h * 0.45, Math.sin(a) * d); m.scale.y = 0.7; m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  return g;
}
export function palmTree(M, { h = 6, seed = 4 }) {
  const g = G(), R = rng(seed);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, h * 0.4, 0.1), new THREE.Vector3(0.45, h * 0.8, 0.15), new THREE.Vector3(0.5, h, 0.2)]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.17, 8), M.palmTrunk); trunk.castShadow = true; g.add(trunk);
  const top = curve.getPoint(1);
  const frond = new THREE.PlaneGeometry(0.5, 2.6, 1, 6); frond.translate(0, 1.3, 0);
  const pos = frond.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, -0.12 * y * y); pos.setX(i, pos.getX(i) * (1 - y / 2.8)); }
  frond.computeVertexNormals();
  for (let i = 0; i < 16; i++) {
    const f = new THREE.Mesh(frond, M.palm); f.position.copy(top);
    f.rotation.order = 'YXZ'; f.rotation.y = (i / 16) * Math.PI * 2 + R() * 0.3; f.rotation.x = -(0.5 + R() * 0.9); f.castShadow = true; g.add(f);
  }
  return g;
}
export function cypress(M, { h = 4.5, seed = 5 }) {
  const g = G(); cyl(g, M.trunk, 0.06, 0.08, 0.5, 0, 0, 0, 6);
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.55, h, 9, 3), M.cypress); c.position.y = h / 2 + 0.3; c.scale.set(1, 1, 1); c.castShadow = true; g.add(c);
  return g;
}
export function shrub(M, { r = 0.5, seed = 6, mat }) {
  const g = G(), R = rng(seed);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.5 + R() * 0.5), 1), mat || M.shrub); m.position.set((R() - 0.5) * r, r * 0.5 + R() * r * 0.4, (R() - 0.5) * r); m.castShadow = true; g.add(m); }
  return g;
}

// ---------- outdoor ----------
export function lounger(M, { lux }) {
  // long along z, head at -z
  const g = G();
  box(g, M.outdoorFrame, 0.7, 0.28, 1.95, 0, 0.0, 0.05, true);
  rbox(g, M.outdoorFab, 0.66, 0.08, 1.35, 0.03, 0, 0.28, 0.33);
  const back = rbox(g, M.outdoorFab, 0.66, 0.08, 0.7, 0.03, 0, 0.45, -0.55); back.rotation.x = 0.55;
  if (lux) rbox(g, M.cushA, 0.4, 0.12, 0.2, 0.05, 0, 0.62, -0.7);
  return g;
}
export function parasol(M, { r = 1.4, h = 2.5 }) {
  const g = G(); cyl(g, M.outdoorFrame, 0.025, 0.025, h, 0, 0, 0, 8); cyl(g, M.metal, 0.25, 0.25, 0.06, 0, 0, 0);
  const c = new THREE.Mesh(new THREE.ConeGeometry(r, 0.45, 8, 1, true), M.parasol); c.position.y = h - 0.1; c.castShadow = true; g.add(c);
  return g;
}
export function outdoorTable(M, { w = 1.0, l = 2.0 }) { const g = G(); box(g, M.teak, w, 0.05, l, 0, 0.72, 0, true);[-1, 1].forEach((s) => box(g, M.teak, w - 0.1, 0.72, 0.08, 0, 0, s * (l / 2 - 0.2))); return g; }
export function outdoorChair(M) { const g = G(); box(g, M.teak, 0.5, 0.45, 0.5, 0, 0, 0, true); box(g, M.teak, 0.5, 0.4, 0.05, 0, 0.45, -0.23, true); rbox(g, M.outdoorFab, 0.46, 0.06, 0.46, 0.02, 0, 0.45, 0.02); return g; }
export function outdoorSofa(M, { len = 2.4 }) {
  const g = G(); box(g, M.teak, len, 0.32, 0.9, 0, 0, 0, true); box(g, M.teak, len, 0.7, 0.12, 0, 0, -0.39, true);
  rbox(g, M.outdoorFab, len - 0.1, 0.14, 0.75, 0.05, 0, 0.32, 0.05);
  for (let i = 0; i < Math.round(len / 0.8); i++) { const b = rbox(g, M.outdoorFab, 0.75, 0.42, 0.16, 0.06, -len / 2 + 0.45 + i * 0.78, 0.44, -0.24); b.rotation.x = -0.15; }
  rbox(g, M.cushA, 0.4, 0.4, 0.12, 0.05, -len / 2 + 0.4, 0.5, -0.1); rbox(g, M.cushB, 0.4, 0.4, 0.12, 0.05, len / 2 - 0.4, 0.5, -0.1);
  return g;
}
export function pergola(M, { w, d, h = 2.8 }) {
  const g = G();
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, M.teak, 0.14, h, 0.14, sx * (w / 2 - 0.07), 0, sz * (d / 2 - 0.07)));
  box(g, M.teak, w, 0.2, 0.14, 0, h, -d / 2 + 0.07); box(g, M.teak, w, 0.2, 0.14, 0, h, d / 2 - 0.07);
  for (let x = -w / 2 + 0.1; x <= w / 2; x += 0.22) box(g, M.teak, 0.05, 0.12, d, x, h + 0.2, 0);
  return g;
}
export function car(M, mat, { len = 4.5, w = 1.85, suv = false } = {}) {
  // long along z
  const g = G(), h = suv ? 0.95 : 0.75;
  rbox(g, mat, w, h - 0.3, len, 0.12, 0, 0.3, 0);
  const cab = rbox(g, M.blackGlass, w - 0.18, suv ? 0.6 : 0.48, len * (suv ? 0.62 : 0.5), 0.14, 0, h - 0.02, suv ? 0.15 : 0.1);
  rbox(g, mat, w - 0.24, 0.05, len * (suv ? 0.58 : 0.44), 0.02, 0, h + (suv ? 0.58 : 0.46) - 0.04, suv ? 0.15 : 0.1);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20), M.tyre); t.rotation.z = Math.PI / 2; t.position.set(sx * (w / 2 - 0.1), 0.34, sz * (len / 2 - 0.8)); t.castShadow = true; g.add(t); }));
  box(g, M.bulb, w - 0.5, 0.06, 0.02, 0, 0.6, -len / 2 - 0.005);
  return g;
}
export function fountain(M, { r = 0.9 }) {
  const g = G();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.45, 8), M.wallWet); rim.position.y = 0.225; rim.castShadow = rim.receiveShadow = true; g.add(rim);
  const wtr = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.08, r - 0.08, 0.02, 8), M.water); wtr.position.y = 0.42; g.add(wtr);
  cyl(g, M.coping, 0.12, 0.18, 0.8, 0, 0.4, 0, 8); cyl(g, M.wallWet, 0.35, 0.2, 0.08, 0, 1.15, 0, 8);
  return g;
}
export function firepit(M) {
  const g = G(); cyl(g, M.coping, 0.6, 0.65, 0.4, 0, 0, 0, 24); cyl(g, M.blackGlass, 0.45, 0.45, 0.02, 0, 0.4, 0, 24);
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 8), M.bulb); f.position.y = 0.6; g.add(f); return g;
}
export function bollard(M) { const g = G(); box(g, M.frame, 0.12, 0.6, 0.12, 0, 0, 0); box(g, M.bulb, 0.1, 0.06, 0.1, 0, 0.5, 0.012); return g; }
export function wallLamp(M) { const g = G(); box(g, M.frame, 0.12, 0.25, 0.1, 0, 0, 0.05); box(g, M.bulb, 0.08, 0.04, 0.08, 0, -0.01, 0.05); return g; }
