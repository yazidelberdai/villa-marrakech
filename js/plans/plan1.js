// PLAN 1 — first floor-plan photo (Desktop/Plan House/IMG_0253.HEIC).
import * as THREE from 'three';

// Geometry transcribed from the floor plan photo (Desktop/Plan House/IMG_0253.HEIC).
// Units: metres. Plot coords: x → east (B.140 → B.141), z → south (toward B.143/B.142).
// House-local coords start at the house's north-west outer corner.

const H = 3.4;                 // clear ceiling height (22 risers × 0.174 = 3.83 floor-to-floor)
const HX = 5.47, HZ = 4.75;    // house origin inside the plot

// Plot corners from the survey: 27.471 / 20.440 / 26.451 / 21.727
const PLOT = [[0, 0], [27.47, 0], [25.82, 20.4], [-0.6, 21.72]];

// Walls in house-local coords. r = [x1,z1,x2,z2]; ext = side facing outside.
// ops along the wall's long axis: glass (fixed full height), win (sill/head), door (leaf), open (walk-through frame), lift.
const G = (a, b) => ({ a, b, t: 'glass', sill: 0, head: 3.1 });
const WALLS = [
  // North façade (street / front garden)
  { r: [0, 0, 18.22, 0.35], ext: 'n', ops: [G(0.45, 8.7), G(9.5, 13.2), { a: 13.5, b: 14.7, t: 'door', head: 2.9, hinge: 'a', swing: 1, main: true }, { a: 15.6, b: 16.9, t: 'win', sill: 1.5, head: 2.4 }] },
  // West façade (salon)
  { r: [0, 0.35, 0.35, 7.37], ext: 'w', ops: [G(0.9, 6.1)] },
  // South façade of the living block (to terrace) with an open sliding bay
  { r: [0.35, 7.02, 8.95, 7.37], ext: 's', ops: [G(0.9, 3.2), { a: 3.2, b: 5.6, t: 'open', head: 3.1 }, G(5.6, 8.6)] },
  // Kitchen west façade (to terrace) with a sliding opening
  { r: [8.95, 7.02, 9.3, 11.65], ext: 'w', ops: [{ a: 7.6, b: 9.1, t: 'open', head: 2.9 }, G(9.1, 10.9)] },
  // Kitchen / living partition with service door
  { r: [9.3, 7.02, 14.3, 7.2], ops: [{ a: 13.45, b: 14.25, t: 'door', head: 2.2, hinge: 'a', swing: 1 }] },
  // Ch P north wall (stair side)
  { r: [14.3, 7.02, 17.87, 7.2] },
  // South façade (kitchen block)
  { r: [8.95, 11.3, 18.22, 11.65], ext: 's', ops: [{ a: 10.0, b: 13.1, t: 'win', sill: 1.0, head: 2.3 }, { a: 13.45, b: 14.25, t: 'door', head: 2.3, hinge: 'b', swing: -1 }, { a: 14.7, b: 15.5, t: 'win', sill: 1.6, head: 2.3 }] },
  // East façade
  { r: [17.87, 0.35, 18.22, 11.3], ext: 'e', ops: [{ a: 3.0, b: 3.9, t: 'win', sill: 1.6, head: 2.4 }, { a: 4.95, b: 6.8, t: 'win', sill: 0.4, head: 3.1 }, { a: 7.35, b: 8.0, t: 'win', sill: 0.9, head: 2.3 }, { a: 8.6, b: 9.4, t: 'win', sill: 1.6, head: 2.3 }] },
  // Hall / VI
  { r: [15.37, 0.35, 15.52, 2.45], ops: [{ a: 1.45, b: 2.3, t: 'door', head: 2.2, hinge: 'b', swing: 1 }] },
  // VI / WC
  { r: [15.52, 2.45, 17.87, 2.6] },
  // WC west wall (door from hall)
  { r: [15.37, 2.45, 15.52, 4.55], ops: [{ a: 2.65, b: 3.4, t: 'door', head: 2.2, hinge: 'a', swing: 1 }] },
  // WC south / stair north
  { r: [14.2, 4.55, 17.87, 4.7] },
  // Lift (ASC) shaft
  { r: [14.2, 3.45, 15.37, 3.6], ops: [{ a: 14.45, b: 15.15, t: 'lift', head: 2.2 }] },
  { r: [14.2, 3.6, 14.35, 4.55] },
  // Ch P west wall: door to room + door to cellier
  { r: [14.3, 7.2, 14.45, 11.3], ops: [{ a: 8.0, b: 8.85, t: 'door', head: 2.2, hinge: 'a', swing: 1 }, { a: 10.2, b: 10.95, t: 'door', head: 2.2, hinge: 'b', swing: 1 }] },
  // Ch P bathroom
  { r: [16.3, 8.1, 17.87, 8.25], ops: [{ a: 16.55, b: 17.25, t: 'door', head: 2.2, hinge: 'a', swing: 1 }] },
  { r: [16.3, 8.25, 16.45, 9.85] },
  // Ch P / Cellier
  { r: [14.45, 9.85, 17.87, 10.0] },
];

// Floor footprint of the house (house-local)
const FOOTPRINT = [[0, 0, 18.22, 7.02], [0, 7.02, 18.22, 7.37], [8.95, 7.37, 18.22, 11.65]];
const STAIRWELL = [13.75, 4.7, 17.87, 7.02];

const ROOMS = [
  { id: 'salon', name: 'Salon', r: [0.35, 0.35, 5.6, 7.02], area: '58,26 m² (salon + séjour)' },
  { id: 'sejour', name: 'Séjour', r: [5.6, 0.35, 9.6, 7.02] },
  { id: 'sam', name: 'Salle à manger', r: [9.6, 0.35, 13.32, 7.02], area: '28,39 m²' },
  { id: 'hall', name: "Hall d'entrée", r: [13.32, 0.35, 15.37, 3.45], area: '5,41 m²' },
  { id: 'vi', name: 'Vestiaire', r: [15.52, 0.35, 17.87, 2.45], wet: true, area: '8,63 m²' },
  { id: 'wc', name: 'WC', r: [15.52, 2.6, 17.87, 4.55], wet: true },
  { id: 'asc', name: 'Ascenseur', r: [14.35, 3.6, 15.37, 4.55] },
  { id: 'stairs', name: 'Escalier', r: [13.32, 4.7, 17.87, 7.02] },
  { id: 'cuisine', name: 'Cuisine', r: [9.3, 7.2, 14.3, 11.3], area: '20,20 m²' },
  { id: 'chp', name: 'Chambre P.', r: [14.45, 7.2, 17.87, 9.85], area: '8,75 m²' },
  { id: 'bath', name: 'Douche Ch. P', r: [16.45, 8.25, 17.87, 9.85], wet: true },
  { id: 'cellier', name: 'Cellier', r: [14.45, 10.0, 17.87, 11.3] },
];

// Site (plot coords)
const SITE = {
  terrace: [0.9, 12.12, 14.42, 19.4],
  pool: [1.2, 15.05, 9.2, 19.1],          // Piscine 8.00 m
  plage: [9.2, 15.05, 11.0, 19.1],        // Plage / Bassin (shallow beach)
  jacuzzi: [11.25, 16.0, 12.8, 19.0],
  jacuzziSteps: [11.25, 15.1, 12.8, 16.0],
  entryPath: [18.95, 0, 20.6, 4.75],
  parking: [21.0, 0, 26.75, 4.75],
  sidePath: [23.69, 4.75, 24.9, 16.4],
  servicePath: [14.42, 16.4, 24.9, 17.4],
  pedGate: [18.95, 20.6],
  carGate: [21.2, 26.65],
  trees: [
    { x: 13.96, z: 2.35, r: 2.5, kind: 'olive' },  // "5 M"
    { x: 2.4, z: 10.8, r: 2.5, kind: 'olive' },    // "5 M"
    { x: 25.25, z: 12.3, r: 2.0, kind: 'palm' },   // "4 M"
    { x: 18.0, z: 19.1, r: 2.0, kind: 'palm' },    // "4 M"
  ],
};


const STAIR = { well: STAIRWELL, f1x: 13.75, land: 16.83, n1: 11, n2: 11 };
const PARAPET = [[0, 0, 18.22, 0.2], [0, 0.2, 0.2, 7.37], [0.2, 7.17, 8.95, 7.37], [8.95, 7.17, 9.15, 11.65], [9.15, 11.45, 18.22, 11.65], [18.02, 0.2, 18.22, 11.45]];
const FLOORS = [{ r: [14.45, 7.2, 17.87, 8.1], mat: 'floorChp' }, { r: [14.45, 8.1, 16.3, 9.85], mat: 'floorChp' }];
Object.assign(SITE, {
  poolHole: [SITE.pool[0], SITE.pool[1], SITE.plage[2], SITE.plage[3]],
  basins: [{ r: SITE.pool, depth: 1.6 }, { r: SITE.plage, depth: 0.3 }, { r: [1.2, 15.05, 2.25, 16.25], depth: 1.2 }, { r: [1.2, 15.05, 1.9, 16.25], depth: 0.8 }, { r: [1.2, 15.05, 1.55, 16.25], depth: 0.4 }],
  paths: [SITE.entryPath, SITE.parking, SITE.sidePath, SITE.servicePath],
  raisedJacuzzi: SITE.jacuzzi,
});
const LABELS = [{ name: 'Terrasse', x: 7, z: 13.4 }, { name: 'Piscine', x: 5, z: 17.1 }, { name: 'Jacuzzi', x: 12.0, z: 17.5 }, { name: 'Parking', x: 23.8, z: 2.4 }, { name: 'Jardin', x: 4, z: 2.4 }];

// Viewpoints (plot coords). yaw: 0 = looking north, π/2 = west, π = south, -π/2 = east
const P = Math.PI;
const VIEWS = [
  { id: 'gate', name: 'Portail', x: 19.8, z: 0.8, yaw: P },
  { id: 'hall', name: "Hall d'entrée", ...xy(14.9, 2.9), yaw: P * 0.42 },
  { id: 'salon', name: 'Salon', ...xy(5.3, 3.7), yaw: P / 2 },
  { id: 'sejour', name: 'Séjour', ...xy(5.3, 6.5), yaw: -P * 0.3 },
  { id: 'sam', name: 'Salle à manger', ...xy(13.1, 6.4), yaw: P * 0.25 },
  { id: 'cuisine', name: 'Cuisine', ...xy(13.8, 9.9), yaw: P * 0.42 },
  { id: 'vi', name: 'Vestiaire / WC', ...xy(15.0, 2.0), yaw: -P / 2 },
  { id: 'chp', name: 'Chambre P.', ...xy(16.9, 7.65), yaw: P * 0.75 },
  { id: 'terrasse', name: 'Terrasse', x: 9.6, z: 12.6, yaw: P * 0.72 },
  { id: 'piscine', name: 'Piscine', x: 13.6, z: 19.0, yaw: P * 0.25 },
  { id: 'jardin', name: 'Jardin', x: 1.2, z: 1.0, yaw: -P * 0.78 },
  { id: 'parking', name: 'Parking', x: 25.9, z: 0.7, yaw: P * 0.82 },
];
function xy(x, z) { return { x: x + HX, z: z + HZ }; }

function interior(c) {
  const { put, putSite, solid, hbox, sbox, planeXZ, addLight, F, M, lux, house, root, minimap, roofParts } = c;
  const H = c.H;
  // ---------- wall cladding in wet rooms + kitchen splash ----------
  const cladH = lux ? H : 1.35;
  const clad = (x1, z1, x2, z2, y0, y1, mat = M.wallWet) => hbox(x1, z1, x2, z2, y0, y1, mat);
  clad(17.855, 0.35, 17.87, 2.45, 0, lux ? H : 1.9);                 // VI behind vanity
  clad(15.52, 0.35, 17.87, 0.365, 0, Math.min(cladH, 1.45));         // VI north (below window)
  clad(15.52, 4.535, 17.87, 4.55, 0, cladH);                         // WC behind pans
  clad(17.855, 2.6, 17.87, 4.55, 0, Math.min(cladH, 1.55));          // WC east (below window)
  clad(17.855, 8.25, 17.87, 9.85, 0, Math.min(cladH, 1.55));         // shower east
  clad(16.45, 9.835, 17.87, 9.85, 0, lux ? H : 2.1);                 // shower south
  clad(9.4, 7.2, 12.55, 7.215, 0.92, lux ? 2.35 : 1.5, M.splash);    // kitchen splash


  // downlights
  const dl = (x, z) => { const d = F.downlight(M); d.position.set(x, H - 0.005, z); house.add(d); };
  [[2.8, 1.5], [2.8, 6], [7.5, 1], [7.5, 6.3], [11.4, 1.2], [11.4, 6.2], [14.3, 1.0], [16.7, 1.4], [16.7, 3.6], [10, 8], [12.6, 8], [10, 10.3], [12.6, 10.3], [13.8, 9.2], [15.4, 8.6], [17.1, 9.0], [16.2, 10.6], [14.3, 2.6]].forEach(([x, z]) => dl(x, z));

  // ---------- interior furniture (layout from the plan) ----------
  // Salon: two facing L-sofas + two armchairs
  const cushA = [M.cushA, M.cushC, M.cushB];
  put(F.lSofa(M, { len: 3.86, legLen: 2.0, fab: M.sofa1, lux, cushions: cushA }), 0.74, 1.0);
  const sB = put(F.lSofa(M, { len: 3.95, legLen: 2.3, fab: M.sofa1, lux, cushions: cushA }), 0.5, 6.6); sB.scale.z = -1;
  solid(0.74, 1.0, 4.6, 1.95); solid(0.74, 1.95, 1.69, 3.0); solid(0.5, 5.65, 4.45, 6.6); solid(0.5, 4.3, 1.45, 5.65);
  [3.3, 4.4].forEach((z) => { put(F.armchair(M, { fab: lux ? M.sofa2 : M.sofa2, lux }), 4.45, z, -Math.PI / 2); solid(4.05, z - 0.4, 4.85, z + 0.4); });
  put(F.rug(M.rugMain, 3.0, 3.3), 2.75, 3.8);
  put(F.coffeeTable(M, lux ? { w: 1.1, round: true, lux } : { w: 0.8, d: 1.3, lux }), 2.8, 3.8); solid(2.25, 3.2, 3.35, 4.4);
  put(F.sideTable(M, { lux }), 4.85, 1.5); put(F.sideTable(M, { lux }), 4.75, 6.2);
  put(F.floorLamp(M, { lux }), 0.62, 0.62);
  put(F.plant(M, { h: 1.9, pot: 0.5, seed: 3, kind: lux ? 'olive' : 'ficus' }), 5.15, 0.85);
  put(F.plant(M, { h: 1.6, pot: 0.45, seed: 4, kind: 'ficus' }), 0.75, 3.65);

  // Séjour: corner sofa, coffee table, 2 armchairs, TV wall
  put(F.lSofa(M, { len: 2.9, legLen: 3.46, depth: 0.9, fab: M.sofa2, lux, cushions: [M.cushB, M.cushA] }), 5.9, 1.44);
  solid(5.9, 1.44, 8.8, 2.34); solid(5.9, 2.34, 6.8, 4.9);
  put(F.rug(M.rugSecond, 2.6, 3.0), 7.75, 3.6);
  put(F.coffeeTable(M, lux ? { w: 1.0, round: true, lux } : { w: 0.95, d: 0.95, lux }), 8.07, 3.7); solid(7.6, 3.22, 8.55, 4.2);
  [7.35, 8.35].forEach((x) => { put(F.armchair(M, { fab: lux ? M.cushB : M.chairFab, lux, round: lux }), x, 5.75, Math.PI); solid(x - 0.42, 5.35, x + 0.42, 6.15); });
  if (lux) {
    hbox(9.45, 2.1, 9.62, 5.6, 0, 2.7, M.featureWall);
    hbox(9.43, 2.1, 9.45, 5.6, 2.62, 2.64, M.accentMetal);
  }
  put(F.sideboard(M, { len: 2.9, depth: 0.38, h: 0.5, lux }), 9.27, 3.85, -Math.PI / 2); solid(9.07, 2.4, 9.62, 5.3);
  put(F.tv(M, 1.65), lux ? 9.42 : 9.27, 3.85, -Math.PI / 2, lux ? 1.0 : 0.62);
  if (!lux) hbox(9.22, 3.7, 9.32, 4.0, 0.5, 0.62, M.metal);
  put(F.plant(M, { h: 1.2, pot: 0.35, seed: 8, kind: 'bush' }), 9.3, 6.4);

  // Salle à manger: table for 8 + sideboard
  put(F.diningTable(M, { w: 1.0, l: 2.6, lux }), 11.4, 3.7);
  [[11.4, 2.15, 0], [11.4, 5.25, Math.PI]].forEach(([x, z, r]) => put(F.diningChair(M, { lux }), x, z, r));
  [2.95, 3.7, 4.45].forEach((z) => { put(F.diningChair(M, { lux }), 10.6, z, Math.PI / 2); put(F.diningChair(M, { lux }), 12.2, z, -Math.PI / 2); });
  solid(10.45, 1.9, 12.35, 5.5);
  if (lux) hbox(9.62, 6.995, 13.3, 7.02, 0, H, M.featureWall);
  put(F.sideboard(M, { len: 3.0, depth: 0.45, lux }), 11.1, 6.77, Math.PI); solid(9.6, 6.55, 12.6, 7.02);
  put(F.art(M, 1.3, 0.95, lux ? 7 : 3), 11.1, 6.985, Math.PI, 1.7);
  if (lux) [9.95, 12.25].forEach((x) => put(F.lantern(M, { h: 0.45 }), x, 6.77, 0, 0.75));
  put(F.plant(M, { h: 1.7, pot: 0.45, seed: 9, kind: 'olive' }), 12.95, 0.8);

  // Hall
  put(F.sideboard(M, { len: 1.0, depth: 0.35, h: 0.8, lux }), 15.19, 0.9, -Math.PI / 2); solid(15.0, 0.4, 15.37, 1.4);
  put(F.mirror(M, lux ? 0.8 : 0.7, lux ? 1.4 : 1.0, { arch: lux, frame: lux ? M.accentMetal : M.woodDark }), 15.36, 0.9, -Math.PI / 2, lux ? 1.6 : 1.55);
  put(F.wardrobe(M, { len: 0.95, h: 2.3, depth: 0.5 }), 13.95, 4.07, -Math.PI / 2); solid(13.7, 3.6, 14.2, 4.55);
  put(F.rug(M.rugHall, 1.3, 2.0), 14.35, 1.7);

  // Vestiaire (2 basins) + WC
  put(F.vanity(M, { len: 1.65, sinks: 2, lux }), 17.62, 1.42, -Math.PI / 2); solid(17.35, 0.6, 17.87, 2.25);
  put(F.mirror(M, 1.5, 0.85, { frame: lux ? M.accentMetal : M.frame }), 17.85, 1.42, -Math.PI / 2, 1.75);
  put(F.toilet(M), 16.35, 4.25, Math.PI); put(F.bidet(M), 17.1, 4.25, Math.PI); solid(16.0, 3.9, 17.45, 4.55);

  // Kitchen
  put(F.baseRun(M, { len: 3.15, lux }), 10.975, 7.525); solid(9.4, 7.2, 13.3, 7.85);
  put(F.tallUnit(M, { len: 0.75 }), 12.925, 7.525);
  if (lux) { hbox(9.4, 7.215, 12.55, 7.5, 1.6, 1.64, M.woodDark); hbox(9.4, 7.215, 12.55, 7.5, 2.05, 2.09, M.woodDark); for (let i = 0; i < 6; i++) put(F.plant(M, { h: 0.2, pot: 0.12, seed: 30 + i, kind: 'bush' }), 9.7 + i * 0.5, 7.38, 0, i % 2 ? 1.64 : 2.09); }
  else hbox(9.4, 7.2, 12.55, 7.55, 1.5, 2.3, M.kitchenCab);
  put(F.baseRun(M, { len: 3.8, sink: true, lux }), 11.3, 10.975, Math.PI); solid(9.4, 10.65, 13.2, 11.3);
  put(F.island(M, { len: 2.0, depth: 1.05, lux }), 11.33, 9.1); solid(10.33, 8.57, 12.33, 9.65);
  put(F.hood(M, { lux }), 11.33, 8.95, 0, 2.3);
  [10.75, 11.33, 11.91].forEach((x) => put(F.barStool(M, { lux }), x, 9.92, Math.PI));
  put(F.plant(M, { h: 1.3, pot: 0.38, seed: 12, kind: 'bush' }), 9.6, 10.35);

  // Chambre P. + douche + cellier
  put(F.bed(M, { w: 0.95, l: 1.75, lux }), 15.4, 9.35, Math.PI / 2); solid(14.45, 8.85, 16.3, 9.85);
  put(F.wardrobe(M, { len: 1.2 }), 15.85, 7.5); solid(15.25, 7.2, 16.45, 7.8);
  put(F.art(M, 0.6, 0.8, lux ? 21 : 22), 14.46, 8.9, Math.PI / 2, 1.9);
  put(F.toilet(M), 16.72, 9.58, Math.PI); put(F.shower(M, { w: 0.85, d: 0.85 }), 17.44, 9.42);
  put(F.vanity(M, { len: 0.6, sinks: 1, lux }), 17.62, 8.65, -Math.PI / 2); solid(16.45, 9.0, 17.87, 9.85); solid(17.35, 8.3, 17.87, 9.0);
  put(F.shelves(M, { len: 2.7, depth: 0.4, seed: 14 }), 16.4, 10.2); put(F.shelves(M, { len: 1.0, depth: 0.4, seed: 15 }), 17.65, 10.75, -Math.PI / 2);
  solid(15.05, 10.0, 17.87, 10.4); solid(17.45, 10.25, 17.87, 11.25);

  // Lighting fixtures
  if (lux) {
    put(F.ringChandelier(M, { r: 0.8, ceil: H, drop: 1.25 }), 11.4, 3.7);
    put(F.ringChandelier(M, { r: 0.65, ceil: H, drop: 1.0 }), 2.8, 3.8);
    put(F.ringChandelier(M, { r: 0.5, ceil: H, drop: 0.9 }), 7.8, 3.6);
    [10.6, 12.05].forEach((x) => put(F.pendant(M, { kind: 'dome', drop: 1.35, ceil: H }), x, 9.1));
    put(F.lantern(M, { h: 0.7, hanging: true }), 14.35, 1.7, 0, H - 0.3);
    put(F.lantern(M, { h: 0.5, hanging: true }), 16.7, 1.4, 0, H - 0.4);
    // slatted walnut ceiling panel over salon/séjour with a warm cove
    for (let x = 0.6; x < 9.3; x += 0.16) roofParts.push(hbox(x, 0.6, x + 0.06, 6.8, H - 0.06, H, M.woodDark));
    // sheer curtains gathered at the glazing ends
    const curtain = (x1, z1, x2, z2) => {
      const len = Math.hypot(x2 - x1, z2 - z1), g = new THREE.PlaneGeometry(len, H - 0.15, 40, 1);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.045 + Math.sin(p.getX(i) * 9 + 1) * 0.025);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.curtain || new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 1, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      m.position.set((x1 + x2) / 2, (H - 0.15) / 2 + 0.02, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); house.add(m);
    };
    curtain(0.45, 0.47, 1.1, 0.47); curtain(7.9, 0.47, 8.6, 0.47); curtain(9.5, 0.47, 10.2, 0.47);
    curtain(0.47, 0.9, 0.47, 1.5); curtain(0.47, 5.5, 0.47, 6.1); curtain(1.0, 6.9, 1.6, 6.9); curtain(7.9, 6.9, 8.5, 6.9);
  } else {
    put(F.pendant(M, { kind: 'rattan', drop: 1.1, ceil: H }), 2.8, 3.8);
    put(F.pendant(M, { kind: 'rattan', drop: 1.0, ceil: H }), 7.9, 3.6);
    put(F.linearPendant(M, { len: 1.9, ceil: H, drop: 1.6 }), 11.4, 3.7).rotation.y = Math.PI / 2;
    [10.6, 12.05].forEach((x) => put(F.pendant(M, { kind: 'globe', drop: 1.3, ceil: H }), x, 9.1));
    put(F.pendant(M, { kind: 'rattan', drop: 0.8, ceil: H }), 14.35, 1.7);
  }

  // Night lights inside
  const warm = 0xffd2a0;
  [[2.8, 3.8, 6], [7.6, 3.6, 5], [11.4, 3.7, 6], [14.3, 1.7, 3], [16.7, 1.4, 2.5], [16.7, 3.6, 2], [11.3, 9.2, 6], [15.4, 8.5, 2.5], [17.1, 9.0, 1.5], [16.2, 10.6, 1.5], [15.8, 5.9, 2.5]]
    .forEach(([x, z, p]) => addLight(x, z, 2.7, warm, p * (lux ? 1.1 : 1)));
}

function exterior(c) {
  const { put, putSite, solid, hbox, sbox, planeXZ, addLight, F, M, lux, house, root, minimap, roofParts } = c;

  // raised jacuzzi with steps
  { const [jx1, jz1, jx2, jz2] = SITE.jacuzzi, jh = 0.55, w = 0.18, jm = lux ? M.wallWet : M.coping;
    sbox(jx1, jz1, jx2, jz1 + w, 0, jh, jm); sbox(jx1, jz2 - w, jx2, jz2, 0, jh, jm); sbox(jx1, jz1, jx1 + w, jz2, 0, jh, jm); sbox(jx2 - w, jz1, jx2, jz2, 0, jh, jm);
    sbox(jx1 + w, jz1 + w, jx2 - w, jz2 - w, 0, 0.05, M.poolTile);
    planeXZ(jx1 + w, jz1 + w, jx2 - w, jz2 - w, jh - 0.1, M.water, root);
    const [sx, sz, sx2_, sz2_] = SITE.jacuzziSteps;
    sbox(sx, sz, sx2_, sz2_, 0, 0.18, M.coping); sbox(sx, sz + 0.3, sx2_, sz2_, 0.18, 0.36, M.coping);
    solid(jx1, jz1, jx2, jz2, false); minimap.jacuzzi = SITE.jacuzzi;
  }
  sbox(18.75, 0.4, 18.95, 4.55, -0.05, 0.4, M.wallExt); sbox(20.6, 0.4, 20.8, 4.55, -0.05, 0.4, M.wallExt); // planter kerbs
  solid(18.75, 0.4, 18.95, 4.55, false); solid(20.6, 0.4, 20.8, 4.55, false);
  for (let z = 0.8; z < 4.4; z += 0.55) { putSite(F.shrub(M, { r: 0.28, seed: z * 10 | 0, mat: lux ? new THREE.MeshStandardMaterial({ color: 0x8b7bb8, roughness: 1, flatShading: true }) : M.shrub }), 18.5, z); putSite(F.shrub(M, { r: 0.22, seed: z * 13 | 0 }), 20.9, z); }

  // ---------- exterior furniture ----------
  if (lux) {
    // loungers + parasols along the pool
    [2.0, 3.0, 4.2, 5.2].forEach((x, i) => { putSite(F.lounger(M, { lux }), x, 13.75); solid(x - 0.35, 12.75, x + 0.35, 14.75, false); });
    putSite(F.parasol(M, { r: 1.6, h: 2.6 }), 3.6, 13.4);
    // outdoor lounge facing the pool
    putSite(F.outdoorSofa(M, { len: 2.6 }), 7.3, 12.75); solid(6.0, 12.3, 8.6, 13.2, false);
    putSite(F.coffeeTable(M, { w: 1.1, d: 0.6, lux }), 7.3, 13.75);
    [6.4, 8.2].forEach((x) => putSite(F.pouf(M, M.cushC, 0.3, 0.38), x, 14.45));
    // pergola + dining for 8
    putSite(F.pergola(M, { w: 4.4, d: 2.7 }), 12.15, 13.55);
    putSite(F.outdoorTable(M, { w: 1.0, l: 2.4 }), 12.15, 13.55, Math.PI / 2); solid(10.95, 13.05, 13.35, 14.05, false);
    [11.35, 12.15, 12.95].forEach((x) => { putSite(F.outdoorChair(M), x, 12.7, 0); putSite(F.outdoorChair(M), x, 14.4, Math.PI); });
    [11.4, 12.9].forEach((x) => putSite(F.lantern(M, { h: 0.5, hanging: true }), x, 13.55, 0, 2.75));
    [[1.1, 12.3], [9.4, 12.3], [13.0, 15.4], [14.1, 19.1]].forEach(([x, z], i) => putSite(F.lantern(M, { h: 0.7 }), x, z, i));
    // fountain in the front garden + cypress rows + bougainvillea
    putSite(F.fountain(M, { r: 0.95 }), 8.5, 2.4); solid(7.55, 1.45, 9.45, 3.35, false);
    for (let z = 3; z < 20; z += 2.2) putSite(F.cypress(M, { h: 4.2 + (z % 3) * 0.3 }), 0.75 - z * 0.0276, z);
    for (let x = 2; x < 25; x += 2.4) if (x < 13 || x > 15.5) putSite(F.cypress(M, { h: 4 }), x, 20.9 - x * 0.05);
    const bouga = new THREE.MeshStandardMaterial({ color: 0xc8327a, roughness: 1, flatShading: true });
    for (let x = 1; x < 18; x += 3.2) putSite(F.shrub(M, { r: 0.7, seed: x * 3 | 0, mat: bouga }), x, 0.5);
    for (let z = 6; z < 12; z += 2.5) putSite(F.palmTree(M, { h: 5 + z * 0.1, seed: z | 0 }), 26.6 - z * 0.08, z);
    // fire-pit lounge on the south lawn
    putSite(F.firepit(M), 21.6, 18.6); addLight(21.6, 18.6, 0.9, 0xff9a4a, 4, false);
    putSite(F.outdoorSofa(M, { len: 2.2 }), 21.6, 19.75, Math.PI); putSite(F.outdoorSofa(M, { len: 2.2 }), 20.25, 18.4, Math.PI / 2);
    solid(20.5, 19.3, 22.7, 20.2, false); solid(19.8, 17.3, 20.7, 19.5, false); solid(21.0, 18.0, 22.2, 19.2, false);
    // bollards along paths
    for (let z = 5.5; z < 16; z += 2.5) putSite(F.bollard(M), 24.95, z);
    addLight(19.7, 3.2, 2.8, 0xffd2a0, 3, false);
  } else {
    [2.2, 3.3, 5.0, 6.1].forEach((x) => { putSite(F.lounger(M, { lux }), x, 13.75); solid(x - 0.35, 12.75, x + 0.35, 14.75, false); });
    [4.15].forEach((x) => putSite(F.parasol(M, { r: 1.3 }), x, 13.4));
    putSite(F.outdoorTable(M, { w: 0.95, l: 1.9 }), 12.0, 13.6, Math.PI / 2); solid(10.95, 13.1, 13.05, 14.1, false);
    [11.4, 12.6].forEach((x) => { putSite(F.outdoorChair(M), x, 12.85, 0); putSite(F.outdoorChair(M), x, 14.35, Math.PI); });
    putSite(F.parasol(M, { r: 1.5, h: 2.5 }), 12.0, 13.6);
    [[1.2, 12.4], [9.0, 12.4]].forEach(([x, z], i) => putSite(F.plant(M, { h: 1.5, pot: 0.5, seed: 40 + i, kind: 'olive' }), x, z));
    for (let x = 1.5; x < 18; x += 3) putSite(F.shrub(M, { r: 0.55, seed: x * 5 | 0 }), x, 0.6);
    for (let z = 4; z < 20; z += 4) putSite(F.shrub(M, { r: 0.6, seed: z * 7 | 0 }), 0.7 - z * 0.0276, z);
    // bench under the front olive tree
    putSite(F.outdoorSofa(M, { len: 1.6 }), 13.96, 3.7, Math.PI);
    addLight(19.7, 3.2, 2.8, 0xffd2a0, 2, false);
  }
  // façade wall lamps by the doors
  [[13.3, 0.0, Math.PI], [14.9, 0.0, Math.PI], [13.1, 11.65, 0], [14.6, 11.65, 0]].forEach(([x, z, r]) => put(F.wallLamp(M), x, z + (r ? -0.01 : 0.01), r, 2.3));
  // cars
  putSite(F.car(M, M.carA, lux ? { suv: true, len: 4.9, w: 2.0 } : { len: 4.2, w: 1.8 }), 22.55, 2.45);
  putSite(F.car(M, M.carB, lux ? { len: 4.7, w: 1.95 } : { len: 4.3, w: 1.8 }), 25.1, 2.4);
  solid(21.5, 0.0, 23.6, 4.9, false); solid(24.1, 0.0, 26.1, 4.8, false);
  // pool light + terrace light
  addLight(5.2, 17.1, -0.7, 0x5fd6ff, 6, false, 9);
  addLight(7.0, 13.4, 2.6, 0xffd2a0, lux ? 3 : 2, false);
}

export default {
  id: 'plan1', name: 'Plan 1', subtitle: 'Pool across the south terrace', photo: './ref/plan_small.jpg',
  H, HX, HZ, PLOT, WALLS, FOOTPRINT, STAIR, PARAPET, FLOORS, ROOMS, SITE, VIEWS, LABELS, interior, exterior,
};
