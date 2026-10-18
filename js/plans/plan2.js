// PLAN 2 — second floor-plan photo (Desktop/Plan House/IMG_0254.HEIC).
// Same plot as plan 1. Measured through a perspective correction anchored on the 4 survey corners,
// then snapped to the plan's own figures (178.67 m², kitchen 4.057, ASC 1.40, WC 2.001 × 1.879, stair 2.636, cellier 1.492…).
import * as THREE from 'three';

const H = 3.4;
const HX = 7.8, HZ = 5.1;             // house NW outer corner in the plot
const W = 15.4, D = 11.6;             // ≈ 178.7 m² footprint
const PLOT = [[0, 0], [27.47, 0], [25.82, 20.4], [-0.6, 21.72]];

const G = (a, b) => ({ a, b, t: 'glass', sill: 0, head: 3.1 });
const O = (a, b) => ({ a, b, t: 'open', head: 3.1 });
const WALLS = [
  // North façade (front garden / street)
  { r: [0, 0, W, 0.35], ext: 'n', ops: [G(1.2, 5.25), G(5.75, 9.9), { a: 10.5, b: 11.9, t: 'door', head: 2.9, hinge: 'a', swing: 1, main: true }, { a: 12.8, b: 14.3, t: 'win', sill: 1.5, head: 2.4 }] },
  // West façade (pool terrace): salon marocain + SAM glazing with sliding openings
  { r: [0, 0.35, 0.35, 11.25], ext: 'w', ops: [G(1.3, 2.6), O(2.6, 4.4), G(4.4, 5.6), G(6.35, 7.4), O(7.4, 9.2), G(9.2, 10.8)] },
  // South façade
  { r: [0, 11.25, W, 11.6], ext: 's', ops: [G(0.5, 4.2), { a: 5.9, b: 9.0, t: 'win', sill: 1.0, head: 2.3 }, { a: 9.25, b: 10.1, t: 'door', head: 2.3, hinge: 'b', swing: -1 }, { a: 10.6, b: 11.3, t: 'win', sill: 1.6, head: 2.3 }] },
  // East façade
  { r: [15.05, 0.35, W, 11.25], ext: 'e', ops: [{ a: 2.9, b: 3.8, t: 'win', sill: 1.6, head: 2.4 }, { a: 4.6, b: 6.6, t: 'win', sill: 0.4, head: 3.1 }, { a: 7.4, b: 8.1, t: 'win', sill: 0.9, head: 2.3 }, { a: 8.6, b: 9.4, t: 'win', sill: 1.6, head: 2.3 }] },
  // Kitchen: west wall (SAM side) and north wall with service door
  { r: [5.1, 7.05, 5.35, 11.25] },
  { r: [5.1, 6.85, 15.05, 7.05], ops: [{ a: 9.55, b: 10.35, t: 'door', head: 2.2, hinge: 'a', swing: 1 }] },
  // Ch P / cellier column
  { r: [10.4, 7.05, 10.55, 11.25], ops: [{ a: 7.55, b: 8.35, t: 'door', head: 2.2, hinge: 'a', swing: 1 }, { a: 10.35, b: 11.1, t: 'door', head: 2.2, hinge: 'b', swing: 1 }] },
  { r: [12.4, 8.1, 15.05, 8.25], ops: [{ a: 13.3, b: 14.0, t: 'door', head: 2.2, hinge: 'a', swing: 1 }] },
  { r: [12.4, 8.25, 12.55, 9.85] },
  { r: [10.55, 9.85, 15.05, 10.0] },
  // Hall / VI / WC / lift
  { r: [12.55, 0.35, 12.7, 2.4], ops: [{ a: 1.45, b: 2.25, t: 'door', head: 2.2, hinge: 'b', swing: 1 }] },
  { r: [12.7, 2.4, 15.05, 2.55] },
  { r: [12.55, 2.4, 12.7, 4.25], ops: [{ a: 2.6, b: 3.35, t: 'door', head: 2.2, hinge: 'a', swing: 1 }] },
  { r: [10.9, 4.25, 15.05, 4.4] },
  { r: [10.9, 2.75, 12.55, 2.9], ops: [{ a: 11.2, b: 11.95, t: 'lift', head: 2.2 }] },
  { r: [10.9, 2.9, 11.05, 4.25] },
];

const FOOTPRINT = [[0, 0, W, D]];
const STAIR = { well: [9.45, 4.4, 15.05, 6.85], f1x: 10.75, land: 13.05, n1: 9, n2: 13 };
const PARAPET = [[0, 0, W, 0.2], [0, 0.2, 0.2, D], [0.2, D - 0.2, W, D], [W - 0.2, 0.2, W, D - 0.2]];
const FLOORS = [{ r: [10.55, 7.05, 15.05, 8.1], mat: 'floorChp' }, { r: [10.55, 8.1, 12.4, 9.85], mat: 'floorChp' }];

const ROOMS = [
  { id: 'salon', name: 'Salon Marocain', r: [0.35, 0.35, 4.9, 6.0], area: '30,54 m²' },
  { id: 'sejour', name: 'Séjour', r: [4.9, 0.35, 10.45, 6.0], area: '37,73 m²' },
  { id: 'sam', name: 'Salle à manger', r: [0.35, 6.0, 5.1, 11.25] },
  { id: 'hall', name: "Hall d'entrée", r: [10.45, 0.35, 12.55, 2.75] },
  { id: 'vi', name: 'Vestiaire', r: [12.7, 0.35, 15.05, 2.4], wet: true, area: '7,13 m²' },
  { id: 'wc', name: 'WC', r: [12.7, 2.55, 15.05, 4.25], wet: true },
  { id: 'asc', name: 'Ascenseur', r: [11.05, 2.9, 12.55, 4.25] },
  { id: 'stairs', name: 'Escalier', r: [9.45, 4.4, 15.05, 6.85] },
  { id: 'cuisine', name: 'Cuisine', r: [5.35, 7.05, 10.4, 11.25], area: '20,32 m²' },
  { id: 'chp', name: 'Chambre P.', r: [10.55, 7.05, 15.05, 9.85], area: '8,75 m²' },
  { id: 'bath', name: 'Douche Ch. P', r: [12.55, 8.25, 15.05, 9.85], wet: true },
  { id: 'cellier', name: 'Cellier', r: [10.55, 10.0, 15.05, 11.25], area: '4,52 m²' },
];

// Site (plot coords): pool, plage and jacuzzi run north–south along the west terrace
const SITE = {
  terrace: [1.0, 3.45, 7.8, 17.2],
  poolHole: [1.25, 6.65, 5.25, 16.7],
  basins: [
    { r: [1.25, 10.55, 5.25, 16.7], depth: 1.6 },               // Piscine
    { r: [1.25, 8.25, 5.25, 10.55], depth: 0.35 },              // Plage / Bassin
    { r: [2.75, 6.65, 5.25, 8.25], depth: 0.9, rim: true },     // Jacuzzi
    { r: [1.25, 6.65, 2.75, 7.2], depth: 0.05 },                // steps down into the plage
    { r: [1.25, 7.2, 2.75, 7.75], depth: 0.18 },
    { r: [1.25, 7.75, 2.75, 8.25], depth: 0.28 },
  ],
  paths: [[18.3, 0, 20.6, 5.1], [21.0, 0, 26.6, 5.1], [23.2, 5.1, 24.4, 16.7], [16.9, 16.7, 24.4, 17.7]],
  pedGate: [18.95, 20.6],
  carGate: [21.2, 26.65],
  trees: [
    { x: 13.4, z: 2.56, r: 2.5, kind: 'olive' },   // "5 M" front garden
    { x: 25.1, z: 11.9, r: 2.0, kind: 'palm' },    // "4 M" east
    { x: 12.8, z: 18.9, r: 2.0, kind: 'palm' },    // "4 M" south
    // the second "5 M" circle sits over the pool on the plan, so no tree is placed there
  ],
};
const LABELS = [{ name: 'Terrasse', x: 4.6, z: 4.9 }, { name: 'Jacuzzi', x: 4.0, z: 7.4 }, { name: 'Plage / Bassin', x: 3.25, z: 9.4 }, { name: 'Piscine', x: 3.25, z: 13.6 }, { name: 'Parking', x: 23.8, z: 2.4 }, { name: 'Jardin', x: 12, z: 19.6 }];

const P = Math.PI;
const xy = (x, z) => ({ x: x + HX, z: z + HZ });
const VIEWS = [
  { id: 'gate', name: 'Portail', x: 19.5, z: 0.8, yaw: P },
  { id: 'hall', name: "Hall d'entrée", ...xy(12.1, 2.4), yaw: P * 0.42 },
  { id: 'salon', name: 'Salon Marocain', ...xy(4.5, 6.4), yaw: P * 0.27 },
  { id: 'sejour', name: 'Séjour', ...xy(7.05, 6.05), yaw: 0 },
  { id: 'sam', name: 'Salle à manger', ...xy(4.4, 6.4), yaw: P * 0.78 },
  { id: 'cuisine', name: 'Cuisine', ...xy(9.9, 9.0), yaw: P / 2 },
  { id: 'vi', name: 'Vestiaire / WC', ...xy(12.1, 1.9), yaw: -P / 2 },
  { id: 'chp', name: 'Chambre P.', ...xy(12.1, 8.0), yaw: P * 0.8 },
  { id: 'terrasse', name: 'Terrasse', x: 6.6, z: 4.4, yaw: P * 0.9 },
  { id: 'piscine', name: 'Piscine', x: 6.6, z: 16.6, yaw: P * 0.1 },
  { id: 'jardin', name: 'Jardin', x: 12, z: 19.8, yaw: 0 },
  { id: 'parking', name: 'Parking', x: 25.9, z: 0.7, yaw: P * 0.82 },
];

function interior(c) {
  const { put, solid, hbox, addLight, F, M, lux, house, H } = c;
  const cush = [M.cushA, M.cushC, M.cushB];

  // wet-room cladding + kitchen splash
  const cladH = lux ? H : 1.35;
  const clad = (x1, z1, x2, z2, y0, y1, mat = M.wallWet) => hbox(x1, z1, x2, z2, y0, y1, mat);
  clad(15.035, 0.35, 15.05, 2.4, 0, lux ? H : 1.9);
  clad(12.7, 0.35, 15.05, 0.365, 0, Math.min(cladH, 1.45));
  clad(12.7, 4.235, 15.05, 4.25, 0, cladH);
  clad(15.035, 2.55, 15.05, 4.25, 0, Math.min(cladH, 1.55));
  clad(15.035, 8.25, 15.05, 9.85, 0, Math.min(cladH, 1.55));
  clad(12.55, 9.835, 15.05, 9.85, 0, lux ? H : 2.1);
  clad(5.45, 7.05, 8.75, 7.065, 0.92, lux ? 2.35 : 1.5, M.splash);

  const dl = (x, z) => { const d = F.downlight(M); d.position.set(x, H - 0.005, z); house.add(d); };
  [[1.5, 1.5], [3.6, 1.5], [1.5, 5.0], [6.0, 1.2], [8.6, 1.2], [6.0, 5.4], [8.6, 5.4], [1.5, 7.5], [3.8, 10.5], [11.5, 1.0], [13.9, 1.4], [13.9, 3.4], [6.3, 8.0], [8.6, 8.0], [6.3, 10.4], [8.6, 10.4], [9.9, 9.0], [11.5, 8.5], [13.8, 9.0], [12.8, 10.6], [10.2, 3.5]].forEach(([x, z]) => dl(x, z));

  // Salon Marocain: two facing L banquettes opening to the west glazing
  const sA = put(F.lSofa(M, { len: 3.55, legLen: 2.55, fab: M.sofa1, lux, cushions: cush }), 4.15, 0.45); sA.scale.x = -1;
  const sB = put(F.lSofa(M, { len: 3.35, legLen: 2.3, fab: M.sofa1, lux, cushions: cush }), 3.75, 6.1); sB.scale.set(-1, 1, -1);
  solid(0.6, 0.45, 4.15, 1.4); solid(3.2, 1.4, 4.15, 3.0); solid(0.4, 5.15, 3.75, 6.1); solid(2.8, 3.8, 3.75, 5.15);
  put(F.rug(lux ? M.rugMain : M.rugMain, 2.4, 2.9), 1.85, 3.3);
  put(F.coffeeTable(M, { w: 1.0, round: true, lux }), 1.75, 3.3); solid(1.25, 2.8, 2.25, 3.8);
  [[0.75, 2.2], [0.75, 4.4]].forEach(([x, z]) => put(F.pouf(M, M.cushB, 0.27, 0.38), x, z));
  put(F.plant(M, { h: 1.7, pot: 0.45, seed: 21, kind: lux ? 'olive' : 'ficus' }), 4.55, 0.8);
  put(F.floorLamp(M, { lux }), 0.6, 5.6);

  // Séjour: U-shaped sofa around a coffee table
  put(F.sofa(M, { len: 4.5, depth: 0.9, arms: 'none', fab: M.sofa2, lux, cushions: [M.cushB, M.cushA, M.cushC, M.cushA] }), 7.05, 2.25);
  put(F.sofa(M, { len: 2.4, depth: 0.9, arms: 'right', fab: M.sofa2, lux, cushions: [M.cushA] }), 5.25, 3.9, Math.PI / 2);
  put(F.sofa(M, { len: 2.4, depth: 0.9, arms: 'left', fab: M.sofa2, lux, cushions: [M.cushC] }), 8.85, 3.9, -Math.PI / 2);
  solid(4.8, 1.8, 9.3, 2.7); solid(4.8, 2.7, 5.7, 5.1); solid(8.4, 2.7, 9.3, 5.1);
  put(F.rug(M.rugSecond, 3.4, 3.2), 7.05, 3.9);
  put(F.coffeeTable(M, lux ? { w: 1.2, round: true, lux } : { w: 1.3, d: 0.8, lux }), 7.05, 3.9); solid(6.4, 3.4, 7.7, 4.4);
  [5.1, 9.0].forEach((x) => put(F.sideTable(M, { lux }), x, 1.55));
  if (lux) hbox(5.35, 6.83, 9.45, 6.85, 0, H, M.featureWall);
  put(F.sideboard(M, { len: 3.2, depth: 0.42, lux }), 7.1, 6.62, Math.PI); solid(5.5, 6.4, 8.7, 6.85);
  put(F.art(M, 1.4, 1.0, lux ? 17 : 13), 7.1, 6.82, Math.PI, 1.75);
  put(F.plant(M, { h: 1.6, pot: 0.42, seed: 22, kind: 'ficus' }), 9.9, 0.8);

  // Salle à manger: table for 10 + sideboard on the kitchen wall
  put(F.diningTable(M, { w: 1.1, l: 3.0, lux }), 2.45, 8.8, Math.PI / 2);
  [1.25, 2.05, 2.85, 3.65].forEach((x) => { put(F.diningChair(M, { lux }), x, 8.0, 0); put(F.diningChair(M, { lux }), x, 9.6, Math.PI); });
  put(F.diningChair(M, { lux }), 0.65, 8.8, Math.PI / 2); put(F.diningChair(M, { lux }), 4.25, 8.8, -Math.PI / 2);
  solid(0.45, 7.75, 4.5, 9.85);
  put(F.sideboard(M, { len: 2.6, depth: 0.42, lux }), 4.88, 9.0, -Math.PI / 2); solid(4.65, 7.7, 5.1, 10.3);
  put(F.art(M, 1.0, 1.3, lux ? 19 : 15), 5.08, 9.0, -Math.PI / 2, 1.8);
  put(F.plant(M, { h: 1.5, pot: 0.4, seed: 23, kind: 'bush' }), 0.75, 10.8);

  // Hall
  put(F.sideboard(M, { len: 1.0, depth: 0.35, h: 0.8, lux }), 12.37, 0.95, -Math.PI / 2); solid(12.2, 0.45, 12.55, 1.45);
  put(F.mirror(M, lux ? 0.8 : 0.7, lux ? 1.4 : 1.0, { arch: lux, frame: lux ? M.accentMetal : M.woodDark }), 12.54, 0.95, -Math.PI / 2, lux ? 1.6 : 1.55);
  put(F.wardrobe(M, { len: 1.35, h: 2.3, depth: 0.5 }), 10.6, 3.57, -Math.PI / 2); solid(10.35, 2.9, 10.9, 4.25);
  put(F.rug(M.rugHall, 1.3, 1.9), 11.5, 1.6);

  // Vestiaire + WC
  put(F.vanity(M, { len: 1.65, sinks: 2, lux }), 14.8, 1.35, -Math.PI / 2); solid(14.55, 0.5, 15.05, 2.2);
  put(F.mirror(M, 1.5, 0.85, { frame: lux ? M.accentMetal : M.frame }), 15.03, 1.35, -Math.PI / 2, 1.75);
  put(F.toilet(M), 13.3, 3.97, Math.PI); put(F.bidet(M), 14.1, 3.97, Math.PI); solid(12.95, 3.6, 14.45, 4.25);

  // Kitchen
  put(F.baseRun(M, { len: 3.3, lux }), 7.1, 7.375); solid(5.45, 7.05, 9.45, 7.7);
  put(F.tallUnit(M, { len: 0.7 }), 9.1, 7.375);
  if (lux) { hbox(5.45, 7.065, 8.75, 7.35, 1.6, 1.64, M.woodDark); hbox(5.45, 7.065, 8.75, 7.35, 2.05, 2.09, M.woodDark); for (let i = 0; i < 6; i++) put(F.plant(M, { h: 0.2, pot: 0.12, seed: 40 + i, kind: 'bush' }), 5.75 + i * 0.5, 7.22, 0, i % 2 ? 1.64 : 2.09); }
  else hbox(5.45, 7.05, 8.75, 7.4, 1.5, 2.3, M.kitchenCab);
  put(F.baseRun(M, { len: 3.55, sink: true, lux }), 7.225, 10.925, Math.PI); solid(5.45, 10.6, 9.0, 11.25);
  put(F.island(M, { len: 2.05, depth: 1.0, lux }), 7.43, 9.2); solid(6.4, 8.7, 8.45, 9.7);
  put(F.hood(M, { lux }), 7.43, 9.02, 0, 2.3);
  [6.9, 7.43, 7.96].forEach((x) => put(F.barStool(M, { lux }), x, 9.95, Math.PI));

  // Chambre P. + douche + cellier
  put(F.bed(M, { w: 0.95, l: 1.75, lux }), 11.47, 9.38, Math.PI / 2); solid(10.55, 8.9, 12.4, 9.85);
  put(F.wardrobe(M, { len: 1.2 }), 12.2, 7.35); solid(11.6, 7.05, 12.8, 7.65);
  put(F.art(M, 0.6, 0.8, lux ? 23 : 24), 10.56, 8.9, Math.PI / 2, 1.9);
  put(F.toilet(M), 12.9, 9.58, Math.PI); put(F.shower(M, { w: 0.85, d: 0.85 }), 14.62, 9.42);
  put(F.vanity(M, { len: 0.6, sinks: 1, lux }), 14.8, 8.65, -Math.PI / 2); solid(12.55, 9.0, 15.05, 9.85); solid(14.55, 8.3, 15.05, 9.0);
  put(F.shelves(M, { len: 3.0, depth: 0.4, seed: 25 }), 13.4, 10.2); put(F.shelves(M, { len: 0.9, depth: 0.4, seed: 26 }), 14.83, 10.75, -Math.PI / 2);
  solid(11.9, 10.0, 15.05, 10.4); solid(14.6, 10.3, 15.05, 11.2);

  // Lighting
  if (lux) {
    put(F.ringChandelier(M, { r: 0.9, ceil: H, drop: 1.25 }), 2.45, 8.8);
    put(F.ringChandelier(M, { r: 0.7, ceil: H, drop: 1.0 }), 7.05, 3.9);
    [[1.5, 2.6], [2.1, 3.3], [1.5, 4.0]].forEach(([x, z], i) => put(F.lantern(M, { h: 0.55 + i * 0.08, hanging: true }), x, z, i, H - 0.4 - i * 0.25));
    [6.75, 8.1].forEach((x) => put(F.pendant(M, { kind: 'dome', drop: 1.35, ceil: H }), x, 9.2));
    put(F.lantern(M, { h: 0.7, hanging: true }), 11.5, 1.6, 0, H - 0.3);
    put(F.lantern(M, { h: 0.5, hanging: true }), 13.9, 1.4, 0, H - 0.4);
    for (let x = 5.0; x < 10.2; x += 0.16) c.roofParts.push(hbox(x, 0.6, x + 0.06, 5.9, H - 0.06, H, M.woodDark));
    const curtain = (x1, z1, x2, z2) => {
      const len = Math.hypot(x2 - x1, z2 - z1), g = new THREE.PlaneGeometry(len, H - 0.15, 40, 1);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.045 + Math.sin(p.getX(i) * 9 + 1) * 0.025);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.curtain || new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 1, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      m.position.set((x1 + x2) / 2, (H - 0.15) / 2 + 0.02, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); house.add(m);
    };
    curtain(1.2, 0.47, 1.85, 0.47); curtain(9.25, 0.47, 9.9, 0.47); curtain(0.47, 1.3, 0.47, 1.9); curtain(0.47, 10.2, 0.47, 10.8); curtain(0.6, 11.13, 1.2, 11.13); curtain(3.6, 11.13, 4.2, 11.13);
  } else {
    put(F.pendant(M, { kind: 'rattan', drop: 1.1, ceil: H }), 1.85, 3.3);
    put(F.pendant(M, { kind: 'rattan', drop: 1.0, ceil: H }), 7.05, 3.9);
    put(F.linearPendant(M, { len: 2.2, ceil: H, drop: 1.6 }), 2.45, 8.8);
    [6.75, 8.1].forEach((x) => put(F.pendant(M, { kind: 'globe', drop: 1.3, ceil: H }), x, 9.2));
    put(F.pendant(M, { kind: 'rattan', drop: 0.8, ceil: H }), 11.5, 1.6);
  }
  const warm = 0xffd2a0;
  [[1.9, 3.3, 6], [7.05, 3.9, 6], [2.45, 8.8, 6], [11.5, 1.5, 3], [13.9, 1.4, 2.5], [13.9, 3.4, 2], [7.4, 9.1, 6], [11.5, 8.4, 2.5], [13.8, 9.0, 1.5], [12.8, 10.6, 1.5], [12.2, 5.6, 2.5]]
    .forEach(([x, z, p]) => addLight(x, z, 2.7, warm, p * (lux ? 1.1 : 1)));
}

function exterior(c) {
  const { put, putSite, solid, sbox, addLight, F, M, lux } = c;
  // planter kerbs along the entrance path
  sbox(18.1, 0.4, 18.3, 4.9, -0.05, 0.4, M.wallExt); sbox(20.6, 0.4, 20.8, 4.9, -0.05, 0.4, M.wallExt);
  solid(18.1, 0.4, 18.3, 4.9, false); solid(20.6, 0.4, 20.8, 4.9, false);
  const lav = lux ? new THREE.MeshStandardMaterial({ color: 0x8b7bb8, roughness: 1, flatShading: true }) : M.shrub;
  for (let z = 0.8; z < 4.7; z += 0.55) { putSite(F.shrub(M, { r: 0.28, seed: z * 10 | 0, mat: lav }), 17.85, z); putSite(F.shrub(M, { r: 0.22, seed: z * 13 | 0 }), 20.9, z); }

  // three loungers between the pool and the house (as drawn)
  [10.35, 11.1, 11.85].forEach((z) => { putSite(F.lounger(M, { lux }), 6.6, z, -Math.PI / 2); solid(5.6, z - 0.35, 7.6, z + 0.35, false); });
  putSite(F.parasol(M, { r: 1.4, h: 2.5 }), 6.6, 13.0);

  if (lux) {
    // pergola + dining on the north terrace
    putSite(F.pergola(M, { w: 5.4, d: 2.9 }), 4.6, 5.0);
    putSite(F.outdoorTable(M, { w: 1.0, l: 2.4 }), 4.6, 5.0, Math.PI / 2); solid(3.4, 4.5, 5.8, 5.5, false);
    [3.8, 4.6, 5.4].forEach((x) => { putSite(F.outdoorChair(M), x, 4.15, 0); putSite(F.outdoorChair(M), x, 5.85, Math.PI); });
    [3.9, 5.3].forEach((x) => putSite(F.lantern(M, { h: 0.5, hanging: true }), x, 5.0, 0, 2.75));
    putSite(F.outdoorSofa(M, { len: 2.0 }), 6.9, 15.2, -Math.PI / 2); solid(6.45, 14.2, 7.35, 16.2, false);
    [[1.3, 3.8], [7.5, 3.8], [5.6, 16.95], [1.3, 16.95]].forEach(([x, z], i) => putSite(F.lantern(M, { h: 0.7 }), x, z, i));
    putSite(F.fountain(M, { r: 0.95 }), 10.0, 2.3); solid(9.05, 1.35, 10.95, 3.25, false);
    for (let z = 4; z < 20; z += 2.2) putSite(F.cypress(M, { h: 4.2 + (z % 3) * 0.3 }), 0.55 - z * 0.0276, z);
    for (let x = 2; x < 25; x += 2.4) if (Math.abs(x - 12.8) > 2) putSite(F.cypress(M, { h: 4 }), x, 20.9 - x * 0.05);
    const bouga = new THREE.MeshStandardMaterial({ color: 0xc8327a, roughness: 1, flatShading: true });
    for (let x = 1; x < 18; x += 3.2) putSite(F.shrub(M, { r: 0.7, seed: x * 3 | 0, mat: bouga }), x, 0.5);
    [6, 8.5, 15.5].forEach((z) => putSite(F.palmTree(M, { h: 5 + z * 0.1, seed: z | 0 }), 26.6 - z * 0.08, z));
    putSite(F.firepit(M), 20.6, 19.0); addLight(20.6, 19.0, 0.9, 0xff9a4a, 4, false);
    putSite(F.outdoorSofa(M, { len: 2.2 }), 20.6, 20.1, Math.PI); putSite(F.outdoorSofa(M, { len: 2.2 }), 19.2, 18.8, Math.PI / 2);
    solid(19.5, 19.65, 21.7, 20.55, false); solid(18.75, 17.7, 19.65, 19.9, false); solid(20.0, 18.4, 21.2, 19.6, false);
    for (let z = 5.6; z < 16; z += 2.5) putSite(F.bollard(M), 24.45, z);
    addLight(19.1, 3.2, 2.8, 0xffd2a0, 3, false);
  } else {
    putSite(F.outdoorTable(M, { w: 0.95, l: 1.9 }), 4.6, 5.0, Math.PI / 2); solid(3.55, 4.5, 5.65, 5.5, false);
    [4.0, 5.2].forEach((x) => { putSite(F.outdoorChair(M), x, 4.25, 0); putSite(F.outdoorChair(M), x, 5.75, Math.PI); });
    putSite(F.parasol(M, { r: 1.5, h: 2.5 }), 4.6, 5.0);
    [[1.4, 3.9], [7.4, 3.9], [7.3, 16.8]].forEach(([x, z], i) => putSite(F.plant(M, { h: 1.5, pot: 0.5, seed: 50 + i, kind: 'olive' }), x, z));
    for (let x = 1.5; x < 18; x += 3) putSite(F.shrub(M, { r: 0.55, seed: x * 5 | 0 }), x, 0.6);
    for (let z = 4; z < 20; z += 4) putSite(F.shrub(M, { r: 0.5, seed: z * 7 | 0 }), 0.5 - z * 0.0276, z);
    putSite(F.outdoorSofa(M, { len: 1.6 }), 13.4, 4.1, Math.PI);
    addLight(19.1, 3.2, 2.8, 0xffd2a0, 2, false);
  }
  // façade lamps, cars, pool + terrace lights
  [[10.3, 0, Math.PI], [12.1, 0, Math.PI], [9.05, D, 0], [10.3, D, 0]].forEach(([x, z, r]) => put(F.wallLamp(M), x, z + (r ? -0.01 : 0.01), r, 2.3));
  putSite(F.car(M, M.carA, lux ? { suv: true, len: 4.9, w: 2.0 } : { len: 4.2, w: 1.8 }), 22.4, 2.5);
  putSite(F.car(M, M.carB, lux ? { len: 4.7, w: 1.95 } : { len: 4.3, w: 1.8 }), 24.9, 2.5);
  solid(21.35, 0.0, 23.45, 5.0, false); solid(23.9, 0.0, 25.9, 4.9, false);
  addLight(3.25, 13.5, -0.7, 0x5fd6ff, 6, false, 9);
  addLight(4.6, 5.0, 2.6, 0xffd2a0, lux ? 3 : 2, false);
}

export default {
  id: 'plan2', name: 'Plan 2', subtitle: 'Pool along the west terrace', photo: './ref/plan2_small.jpg',
  H, HX, HZ, PLOT, WALLS, FOOTPRINT, STAIR, PARAPET, FLOORS, ROOMS, SITE, VIEWS, LABELS, interior, exterior,
};
