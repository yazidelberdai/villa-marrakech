// Builds the whole scene (house + plot + context) for one plan and one decoration style.
import * as THREE from 'three';
import * as FB from './furniture.js';
import { uvBox } from './furniture.js';
import { STYLES } from './styles.js';

const SLAB = 0.43; // floor slab thickness (3.83 floor-to-floor)

// rect minus hole -> up to 4 rects
function subtract(r, h) {
  const [x1, z1, x2, z2] = r, [hx1, hz1, hx2, hz2] = h;
  if (hx1 >= x2 || hx2 <= x1 || hz1 >= z2 || hz2 <= z1) return [r];
  const out = [];
  if (hz1 > z1) out.push([x1, z1, x2, hz1]);
  if (hz2 < z2) out.push([x1, hz2, x2, z2]);
  const zz1 = Math.max(z1, hz1), zz2 = Math.min(z2, hz2);
  if (hx1 > x1) out.push([x1, zz1, hx1, zz2]);
  if (hx2 < x2) out.push([hx2, zz1, x2, zz2]);
  return out;
}

export function buildWorld(plan, styleKey, opts = {}) {
  const { H, HX, HZ, WALLS, FOOTPRINT, STAIR, ROOMS, SITE, PLOT } = plan;
  const style = STYLES[styleKey];
  const M = style.make();
  if (opts.materials) Object.assign(M, opts.materials(M, styleKey));
  const F = opts.kit ? opts.kit(FB, M, styleKey) : FB;
  const lux = styleKey === 'lux';
  const root = new THREE.Group();
  const house = new THREE.Group(); house.position.set(HX, 0, HZ); root.add(house);
  const roofParts = [];          // hidden in overview mode
  const colliders = { boxes: [], segs: [] };
  const nightLights = [];
  const minimap = { walls: [], glass: [] };
  const windows = [];            // exterior glazing (world coords) for real-mode window light

  // ---------- helpers ----------
  const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const mesh = (geo, mat, parent = house) => { const m = shadow(new THREE.Mesh(geo, mat)); parent.add(m); return m; };
  const hbox = (x1, z1, x2, z2, y0, y1, mat, parent = house) => {
    if (x1 > x2) [x1, x2] = [x2, x1]; if (z1 > z2) [z1, z2] = [z2, z1];
    const m = mesh(uvBox(x2 - x1, y1 - y0, z2 - z1), mat, parent);
    m.position.set((x1 + x2) / 2, (y0 + y1) / 2, (z1 + z2) / 2); return m;
  };
  const solid = (x1, z1, x2, z2, local = true) => colliders.boxes.push(local ? [x1 + HX, z1 + HZ, x2 + HX, z2 + HZ] : [x1, z1, x2, z2]);
  const put = (obj, x, z, rot = 0, y = 0, parent = house) => { obj.position.set(x, y, z); obj.rotation.y = rot; parent.add(obj); return obj; };
  const putSite = (obj, x, z, rot = 0, y = 0) => put(obj, x, z, rot, y, root);
  // Horizontal plane with world-space UVs (metres)
  function planeXZ(x1, z1, x2, z2, y, mat, parent = house) {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1); g.rotateX(-Math.PI / 2); g.translate((x1 + x2) / 2, y, (z1 + z2) / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; parent.add(m); return m;
  }
  function addLight(x, z, y, color, power, local = true, distance = 0) {
    const l = new THREE.PointLight(color, 0, distance, 2); l.visible = false; // hidden lights cost nothing in the day shaders
    l.position.set(local ? x + HX : x, y, local ? z + HZ : z); l.userData.power = power; root.add(l); nightLights.push(l); return l;
  }

  // ---------- walls ----------
  const faceIdx = { n: 5, s: 4, e: 0, w: 1 }; // outward face of BoxGeometry groups (px,nx,py,ny,pz,nz)
  function wallPiece(x1, z1, x2, z2, y0, y1, ext, collide) {
    if (x2 - x1 < 1e-3 || z2 - z1 < 1e-3 || y1 - y0 < 1e-3) return;
    const mats = Array(6).fill(ext ? M.wallExt : M.wallInt);
    if (ext) { const inward = { n: 4, s: 5, e: 1, w: 0 }[ext]; mats[inward] = M.wallInt; }
    const m = mesh(uvBox(x2 - x1, y1 - y0, z2 - z1), mats);
    m.position.set((x1 + x2) / 2, (y0 + y1) / 2, (z1 + z2) / 2);
    if (collide) { solid(x1, z1, x2, z2); minimap.walls.push([x1 + HX, z1 + HZ, x2 + HX, z2 + HZ]); }
  }
  function glassPane(horiz, a, b, c, sill, head) {
    // c = wall centre line; pane + frame + mullions
    const t = 0.05, mull = [];
    const n = Math.max(1, Math.ceil((b - a) / 2.4));
    for (let i = 1; i < n; i++) mull.push(a + ((b - a) / n) * i);
    const piece = (p1, p2, y0, y1, mat, th) => {
      if (horiz) hbox(p1, c - th / 2, p2, c + th / 2, y0, y1, mat); else hbox(c - th / 2, p1, c + th / 2, p2, y0, y1, mat);
    };
    const g = horiz ? hbox(a, c - 0.006, b, c + 0.006, sill, head, M.glass) : hbox(c - 0.006, a, c + 0.006, b, sill, head, M.glass);
    g.castShadow = false; g.receiveShadow = false; g.renderOrder = 2;
    piece(a, a + t, sill, head, M.frame, 0.07); piece(b - t, b, sill, head, M.frame, 0.07);
    piece(a, b, sill, sill + t, M.frame, 0.07); piece(a, b, head - t, head, M.frame, 0.07);
    mull.forEach((m) => piece(m - 0.025, m + 0.025, sill, head, M.frame, 0.07));
    minimap.glass.push(horiz ? [a + HX, c - 0.05 + HZ, b + HX, c + 0.05 + HZ] : [c - 0.05 + HX, a + HZ, c + 0.05 + HX, b + HZ]);
  }
  for (const w of WALLS) {
    const [x1, z1, x2, z2] = w.r, horiz = x2 - x1 >= z2 - z1;
    const seg = (a, b, y0, y1, collide) => horiz ? wallPiece(a, z1, b, z2, y0, y1, w.ext, collide) : wallPiece(x1, a, x2, b, y0, y1, w.ext, collide);
    const c = horiz ? (z1 + z2) / 2 : (x1 + x2) / 2, th = horiz ? z2 - z1 : x2 - x1;
    let cur = horiz ? x1 : z1;
    for (const o of (w.ops || []).slice().sort((p, q) => p.a - q.a)) {
      seg(cur, o.a, 0, H, true);
      if (o.t === 'glass' || o.t === 'win') {
        seg(o.a, o.b, 0, o.sill, true); seg(o.a, o.b, o.head, H, false);
        glassPane(horiz, o.a, o.b, c, o.sill, o.head);
        if (w.ext) { const inward = { n: [0, 1], s: [0, -1], e: [-1, 0], w: [1, 0] }[w.ext];
          windows.push({ x: (horiz ? (o.a + o.b) / 2 : c) + HX, z: (horiz ? c : (o.a + o.b) / 2) + HZ, y: (o.sill + o.head) / 2, w: o.b - o.a, h: o.head - o.sill, nx: inward[0], nz: inward[1], th }); }
        if (horiz) solid(o.a, c - 0.05, o.b, c + 0.05); else solid(c - 0.05, o.a, c + 0.05, o.b);
        if (o.sill > 0.3) { // window board
          if (horiz) hbox(o.a, z1 - 0.02, o.b, z2 + 0.02, o.sill - 0.03, o.sill, M.coping); else hbox(x1 - 0.02, o.a, x2 + 0.02, o.b, o.sill - 0.03, o.sill, M.coping);
        }
      } else {
        seg(o.a, o.b, o.head, H, false);
        // door / opening frame
        const fr = (p1, p2, y0, y1) => horiz ? hbox(p1, z1 - 0.01, p2, z2 + 0.01, y0, y1, o.t === 'open' ? M.frame : M.doorLeaf) : hbox(x1 - 0.01, p1, x2 + 0.01, p2, y0, y1, o.t === 'open' ? M.frame : M.doorLeaf);
        fr(o.a, o.a + 0.04, 0, o.head); fr(o.b - 0.04, o.b, 0, o.head); fr(o.a, o.b, o.head - 0.04, o.head);
        if (o.t === 'door') {
          const wdt = o.b - o.a - 0.08, hinge = o.hinge === 'b' ? o.b - 0.06 : o.a + 0.06, s = o.swing || 1;
          const lt = o.main ? 0.07 : 0.04, hh = o.head - 0.05;
          const leafMat = o.main ? M.mainDoor : M.doorLeaf;
          const leaf = horiz ? hbox(hinge - lt / 2, c + s * (th / 2), hinge + lt / 2, c + s * (th / 2 + wdt), 0.01, hh, leafMat)
            : hbox(c + s * (th / 2), hinge - lt / 2, c + s * (th / 2 + wdt), hinge + lt / 2, 0.01, hh, leafMat);
          if (o.main && lux) { // brass studs / pull on the main door
            const pull = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8), M.accentMetal); pull.position.set(hinge + 0.06, 1.1, c + s * (th / 2 + wdt - 0.12)); house.add(pull);
          }
        }
        if (o.t === 'lift') {
          const mid = (o.a + o.b) / 2;
          hbox(o.a, c - 0.03, mid - 0.005, c + 0.03, 0, o.head, M.liftDoor); hbox(mid + 0.005, c - 0.03, o.b, c + 0.03, 0, o.head, M.liftDoor);
          hbox(o.b + 0.08, z1 - 0.02, o.b + 0.16, z1, 1.05, 1.2, M.accentMetal);
          if (horiz) solid(o.a, z1, o.b, z2);
        }
      }
      cur = o.b;
    }
    seg(cur, horiz ? x2 : z2, 0, H, true);
  }

  // ---------- floors ----------
  for (const [x1, z1, x2, z2] of FOOTPRINT) {
    planeXZ(x1, z1, x2, z2, 0, M.floor);
    hbox(x1, z1, x2, z2, -0.35, -0.002, M.wallExt).receiveShadow = false;
  }
  for (const r of ROOMS) {
    const [x1, z1, x2, z2] = r.r;
    if (r.wet) planeXZ(x1, z1, x2, z2, 0.003, M.floorWet);
  }


  // ---------- stairs (U-shape; high steps float so you can walk underneath) ----------
  const [sx1, sz1, sx2, sz2] = STAIR.well, zMid = (sz1 + sz2) / 2, R = (H + SLAB) / (STAIR.n1 + STAIR.n2);
  const T1 = (STAIR.land - STAIR.f1x) / STAIR.n1, T2 = (STAIR.land - sx1) / STAIR.n2, landX = STAIR.land;
  const stepMats = [M.wallInt, M.wallInt, M.floor, M.wallInt, M.wallInt, M.wallInt];
  const step = (xa, xb, za, zb, top) => {
    const bot = top > 2.3 ? top - 0.32 : 0;
    const m = mesh(uvBox(xb - xa, top - bot, zb - za), stepMats); m.position.set((xa + xb) / 2, (top + bot) / 2, (za + zb) / 2);
    if (bot === 0) solid(xa, za, xb, zb);
  };
  for (let i = 1; i <= STAIR.n1; i++) step(STAIR.f1x + (i - 1) * T1, STAIR.f1x + i * T1, sz1, zMid - 0.02, i * R);
  step(landX, sx2, sz1, sz2, STAIR.n1 * R);
  for (let j = 1; j <= STAIR.n2; j++) step(landX - j * T2, landX - (j - 1) * T2, zMid + 0.02, sz2, (STAIR.n1 + j) * R);
  hbox(STAIR.f1x, zMid - 0.05, landX, zMid + 0.05, 0, 1.0 + STAIR.n1 * R, M.wallInt);
  solid(STAIR.f1x, zMid - 0.05, landX, zMid + 0.05);
  { const len = landX - STAIR.f1x, rise = STAIR.n1 * R;
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(len, rise), 8), M.accentMetal);
    rail.position.set(STAIR.f1x + len / 2, 0.95 + rise / 2, sz1 + 0.06); rail.rotation.z = Math.PI / 2 - Math.atan2(rise, len); house.add(rail); }

  // ---------- roof / ceiling ----------
  const ceilMats = (mat) => [M.wallExt, M.wallExt, M.wallExt, mat, M.wallExt, M.wallExt];
  const roofRects = FOOTPRINT.flatMap((r) => subtract(r, STAIR.well));
  for (const [x1, z1, x2, z2] of roofRects) {
    const m = mesh(uvBox(x2 - x1, SLAB, z2 - z1), ceilMats(M.ceiling)); m.position.set((x1 + x2) / 2, H + SLAB / 2, (z1 + z2) / 2); roofParts.push(m);
  }
  for (const [x1, z1, x2, z2] of plan.PARAPET) roofParts.push(hbox(x1, z1, x2, z2, H + SLAB, H + SLAB + 0.7, M.wallExt));
  for (const [x1, z1, x2, z2] of FOOTPRINT) roofParts.push(planeXZ(x1 + 0.2, z1 + 0.2, x2 - 0.2, z2 - 0.2, H + SLAB + 0.01, M.coping));
  // stair / lift shaft up to the (not drawn) upper floor
  const shaftTop = H + SLAB + 2.6;
  [[sx1 - 0.15, sz1 - 0.15, sx2 + 0.15, sz1], [sx1 - 0.15, sz2, sx2 + 0.15, sz2 + 0.15], [sx1 - 0.15, sz1, sx1, sz2], [sx2, sz1, sx2 + 0.15, sz2]]
    .forEach(([a, b, c, d]) => roofParts.push(hbox(a, b, c, d, H, shaftTop, M.wallInt)));
  { const m = mesh(uvBox(sx2 - sx1 + 0.3, 0.3, sz2 - sz1 + 0.3), ceilMats(M.ceiling)); m.position.set((sx1 + sx2) / 2, shaftTop + 0.15, (sz1 + sz2) / 2); roofParts.push(m); }
  roofParts.push(hbox(sx1 - 0.2, sz1 - 0.2, sx2 + 0.2, sz1 - 0.15, H + SLAB, shaftTop + 0.3, M.wallExt), hbox(sx1 - 0.2, sz2 + 0.15, sx2 + 0.2, sz2 + 0.2, H + SLAB, shaftTop + 0.3, M.wallExt),
    hbox(sx1 - 0.2, sz1 - 0.15, sx1 - 0.15, sz2 + 0.15, H + SLAB, shaftTop + 0.3, M.wallExt), hbox(sx2 + 0.15, sz1 - 0.15, sx2 + 0.2, sz2 + 0.15, H + SLAB, shaftTop + 0.3, M.wallExt));
  for (const f of plan.FLOORS || []) planeXZ(...f.r, 0.003, M[f.mat]);

  // ---------- interior (plan-specific furniture) ----------
  const sbox = (x1, z1, x2, z2, y0, y1, mat) => hbox(x1, z1, x2, z2, y0, y1, mat, root);
  const ctx = { put, putSite, solid, hbox, sbox, planeXZ, addLight, F, M, lux, house, root, minimap, roofParts, H, HX, HZ, styleKey, real: !!opts.real };
  plan.interior(ctx);

  // ---------- site ----------
  const rectPath = ([x1, z1, x2, z2], P = THREE.Path) => new P([[x1, -z1], [x2, -z1], [x2, -z2], [x1, -z2]].map(([a, b]) => new THREE.Vector2(a, b)));
  const shape = new THREE.Shape(PLOT.map(([x, z]) => new THREE.Vector2(x, -z)));
  shape.holes.push(rectPath(SITE.poolHole));
  { const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, M.lawn); m.position.y = -0.05; m.receiveShadow = true; root.add(m); }
  { const s = rectPath(SITE.terrace, THREE.Shape); s.holes.push(rectPath(SITE.poolHole));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, [M.terrace, M.coping]); m.position.y = -0.075; m.receiveShadow = true; root.add(m); }
  // pool basins (deep pool, shallow plage, spa...) inside one hole
  const [px1, pz1, px2, pz2] = SITE.poolHole, pd = Math.max(...SITE.basins.map((b) => b.depth));
  sbox(px1, pz1, px2, pz2, -pd - 0.1, -pd, M.poolTile);
  sbox(px1 - 0.1, pz1, px1, pz2, -pd, -0.01, M.poolTile); sbox(px2, pz1, px2 + 0.1, pz2, -pd, -0.01, M.poolTile);
  sbox(px1, pz1 - 0.1, px2, pz1, -pd, -0.01, M.poolTile); sbox(px1, pz2, px2, pz2 + 0.1, -pd, -0.01, M.poolTile);
  for (const b of SITE.basins) {
    if (b.depth < pd) sbox(...b.r, -pd, -b.depth, M.poolTile);
    if (b.rim) { const [a, c, d, e] = b.r, w = 0.15; [[a, c, d, c + w], [a, e - w, d, e], [a, c, a + w, e], [d - w, c, d, e]].forEach((r) => sbox(...r, -b.depth, 0.02, lux ? M.wallWet : M.coping)); }
  }
  [[px1 - 0.3, pz1 - 0.3, px2 + 0.3, pz1], [px1 - 0.3, pz2, px2 + 0.3, pz2 + 0.3], [px1 - 0.3, pz1, px1, pz2], [px2, pz1, px2 + 0.3, pz2]]
    .forEach(([a, b, c, d]) => sbox(Math.max(a, SITE.terrace[0]), Math.max(b, SITE.terrace[1]), Math.min(c, SITE.terrace[2]), Math.min(d, SITE.terrace[3]), -0.02, 0.03, M.coping));
  const water = planeXZ(px1, pz1, px2, pz2, -0.14, M.water, root); water.receiveShadow = true;
  solid(px1, pz1, px2, pz2, false);
  minimap.pool = SITE.poolHole;
  SITE.paths.forEach(([a, b, c, d]) => planeXZ(a, b, c, d, -0.03, M.paver, root));
  // boundary walls with the two gates on the private road
  const bh = 2.6, bt = 0.2;
  const edges = PLOT.map((p, i) => [p, PLOT[(i + 1) % PLOT.length]]);
  const wallSeg = (a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const m = shadow(new THREE.Mesh(uvBox(len, bh, bt), M.boundary));
    m.position.set((a[0] + b[0]) / 2, bh / 2 - 0.05, (a[1] + b[1]) / 2); m.rotation.y = -Math.atan2(dz, dx); root.add(m);
    const cap = shadow(new THREE.Mesh(uvBox(len + 0.05, 0.06, bt + 0.08), lux ? M.coping : M.boundary)); cap.position.set(m.position.x, bh - 0.02, m.position.z); cap.rotation.y = m.rotation.y; root.add(cap);
    colliders.segs.push([a[0], a[1], b[0], b[1], bt / 2]);
    minimap.walls.push({ seg: [a[0], a[1], b[0], b[1]] });
  };
  const [g1a, g1b] = SITE.pedGate, [g2a, g2b] = SITE.carGate;
  wallSeg([0, 0], [g1a, 0]); wallSeg([g1b, 0], [g2a, 0]); wallSeg([g2b, 0], [PLOT[1][0], 0]);
  edges.slice(1).forEach(([a, b]) => wallSeg(a, b));
  // gate piers + leaves
  [g1a, g1b, g2a, g2b].forEach((x) => { sbox(x - 0.22, -0.2, x + 0.22, 0.2, -0.05, bh + 0.25, lux ? M.coping : M.boundary); solid(x - 0.22, -0.2, x + 0.22, 0.2, false); });
  if (lux) { // Moroccan portal over the pedestrian gate
    sbox(g1a - 0.22, -0.25, g1b + 0.22, 0.25, bh + 0.25, bh + 0.75, M.wallExt);
    sbox(g1a - 0.3, -0.35, g1b + 0.3, 0.35, bh + 0.75, bh + 0.85, M.coping);
    const tiles = new THREE.Mesh(uvBox(g1b - g1a, 0.35, 0.02), M.wallWet); tiles.position.set((g1a + g1b) / 2, bh + 0.5, -0.26); root.add(tiles);
  }
  { const leaf = sbox(g1a + 0.2, 0.05, g1a + 0.26, 1.5, -0.03, bh - 0.1, M.gate); leaf.castShadow = true; }
  // sliding car gate parked open behind the wall on the road side
  sbox(g2b - 0.1, -0.38, g2b + 5.2, -0.3, 0.05, 2.0, M.gate);

  // trees from the plan (5 M / 4 M)
  SITE.trees.forEach((t, i) => {
    putSite(t.kind === 'olive' ? F.oliveTree(M, { r: t.r, seed: 7 + i }) : F.palmTree(M, { h: 6.5 + i * 0.4, seed: 4 + i }), t.x, t.z, i);
    solid(t.x - 0.3, t.z - 0.3, t.x + 0.3, t.z + 0.3, false);
    if (lux) { const u = F.bollard(M); putSite(u, t.x + 0.6, t.z + 0.4); addLight(t.x + 0.5, t.z + 0.5, 0.6, 0xffe2b0, 3, false); }
  });

  // ---------- exterior (plan-specific) ----------
  plan.exterior(ctx);

  // ---------- context: private road, neighbours, Atlas ----------
  { const s = new THREE.Shape([[-200, 200], [220, 200], [220, -220], [-200, -220]].map(([a, b]) => new THREE.Vector2(a, b)));
    s.holes.push(new THREE.Path(PLOT.map(([x, z]) => new THREE.Vector2(x, -z))));
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, M.sand); m.position.y = -0.09; m.receiveShadow = true; root.add(m); }
  planeXZ(-40, -15.2, 70, -0.25, -0.07, M.asphalt, root);
  planeXZ(-40, -0.25, 70, 0.0, -0.06, M.coping, root).position.y = 0;
  const nb = (x1, z1, x2, z2, h) => { sbox(x1, z1, x2, z2, -0.05, h, M.neighbour); sbox(x1, z1, x2, z2, h, h + 0.6, M.neighbour); };
  nb(-16, 3, -5, 17, 6); nb(33, 4, 45, 18, 6.5); nb(4, 31, 20, 42, 6); nb(-10, -36, 6, -22, 7.5); nb(14, -38, 30, -22, 7);
  [[-30, 30], [50, -8], [40, 32], [-26, -18], [60, 20]].forEach(([x, z], i) => putSite(F.palmTree(M, { h: 7 + i, seed: 50 + i }), x, z));
  for (let i = 0; i < 14; i++) {
    const x = -360 + i * 55 + (i % 3) * 13, h = 60 + ((i * 37) % 70), r = 90 + ((i * 53) % 60);
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), M.mountain); mtn.position.set(x, h / 2 - 2, 330 + (i % 4) * 25); root.add(mtn);
    if (h > 90) { const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.28, h * 0.28, 7, 1), M.snow); cap.position.set(x, h - 2 - h * 0.14 + 0.5, mtn.position.z); root.add(cap); }
  }

  // ---------- night switch & animation ----------
  function setNight(on) {
    nightLights.forEach((l) => { l.intensity = on ? l.userData.power : 0; l.visible = on; });
    M.bulb.emissiveIntensity = on ? 3 : 0;
    M.shade.emissiveIntensity = on ? 0.6 : 0;
    M.water.emissiveIntensity = on ? 0.6 : 0;
  }
  function update(t) {
    const n = M.water.normalMap; n.offset.set(t * 0.012, t * 0.02);
  }
  const labels = ROOMS.filter((r) => !['asc', 'stairs', 'bath'].includes(r.id)).map((r) => ({ name: r.name, x: (r.r[0] + r.r[2]) / 2 + HX, z: (r.r[1] + r.r[3]) / 2 + HZ }))
    .concat(plan.LABELS || []);
  minimap.footprint = FOOTPRINT.map(([a, b, c, d]) => [a + HX, b + HZ, c + HX, d + HZ]);
  minimap.terrace = SITE.terrace; minimap.paths = SITE.paths;

  root.traverse((o) => { if (o.isMesh && o.material === M.glass) o.castShadow = false; });
  return { root, colliders, roofParts, windows, setNight, update, labels, minimap, materials: M, name: style.name, tagline: style.tagline };
}