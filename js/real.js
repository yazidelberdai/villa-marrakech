// Photoreal layer: scanned CC0 models + PBR materials from Poly Haven, HDRI sky.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const HEAVY = ['island_tree_02'];

export async function loadReal(onProgress = () => {}) {
  const man = await fetch('./assets/manifest.json', { cache: 'no-cache' }).then((r) => r.json());
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, done, total) => onProgress(done / total);
  const gltf = new GLTFLoader(manager), texLoader = new THREE.TextureLoader(manager), hdrLoader = new HDRLoader(manager);
  hdrLoader.setDataType(THREE.FloatType);
  const models = {};
  // live view uses decimated copies of the heaviest scans (manifest.lod); ?full=1 loads the originals
  const full = new URLSearchParams(location.search).get('full') === '1';
  const jobs = Object.entries(man.models).map(async ([id, url]) => {
    try {
      const g = await gltf.loadAsync((!full && man.lod?.[id]) || url);
      const box = new THREE.Box3().setFromObject(g.scene);
      g.scene.traverse((m) => {
        if (!m.isMesh) return;
        m.castShadow = true; m.receiveShadow = true;
        // transmission forces an extra full-scene render every frame: fake it with plain transparency
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
          if (mat.transmission > 0) { mat.transmission = 0; mat.transparent = true; mat.opacity = 0.35; mat.depthWrite = false; m.castShadow = false; }
        }
      });
      models[id] = { scene: g.scene, box, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) };
    } catch (e) { console.warn('model failed', id, e); }
  });
  const hdr = {};
  const hdrJobs = Object.entries(man.hdri).map(async ([id, url]) => { hdr[id] = prepHDR(await hdrLoader.loadAsync(url)); });
  await Promise.all([...jobs, ...hdrJobs]);
  // split multi-plant sets into individual plants
  for (const id of ['shrub_02']) {
    const src = models[id]; if (!src) continue;
    src.scene.updateMatrixWorld(true);
    const parts = []; src.scene.traverse((o) => { if (/_[a-d]$/.test(o.name) && o.name.startsWith(id)) parts.push(o); });
    parts.forEach((child) => {
      const one = new THREE.Group(); const c = child.clone(true); child.updateWorldMatrix(true, false); c.matrix.copy(child.matrixWorld); c.matrix.decompose(c.position, c.quaternion, c.scale); one.add(c);
      const box = new THREE.Box3().setFromObject(one);
      models[child.name] = { scene: one, box, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) };
    });
  }

  // PBR material factory (textures load asynchronously through the same manager)
  const texCache = {};
  const tex = (url, size, srgb) => {
    const key = url + size;
    if (!texCache[key]) {
      const t = texLoader.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / size, 1 / size); t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace; texCache[key] = t;
    }
    return texCache[key];
  };
  const pbr = (id, size, o = {}) => {
    const t = man.textures[id]; if (!t) return null;
    const Mat = o.sheen != null ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const m = new Mat({ map: o.noMap ? null : tex(t.diff, size, true), color: o.color ?? 0xffffff, roughness: o.rough ?? 1, metalness: o.metal ?? 0 });
    if (o.sheen != null) { m.sheen = o.sheen; m.sheenRoughness = o.sheenRough ?? 0.45; m.sheenColor = new THREE.Color(o.sheenColor ?? 0xffffff); }
    if (t.nor) { m.normalMap = tex(t.nor, size, false); m.normalScale.setScalar(o.normal ?? 1); }
    const r = t.rough || t.arm; if (r) m.roughnessMap = tex(r, size, false);
    if (o.env != null) m.envMapIntensity = o.env;
    return m;
  };
  return { man, models, hdr, pbr, sunDir: hdr.drakensberg_solitary_mountain_puresky?.userData.sunDir || new THREE.Vector3(-0.4, 0.75, 0.5).normalize() };
}

// Clamp the sun (half-float overflow in the path tracer) and give the empty lower half of a "pure sky" HDRI
// a warm ground colour so ceilings and undersides receive bounce light.
export function prepHDR(t, max = 20000) {
  t.mapping = THREE.EquirectangularReflectionMapping;
  const { data, width, height } = t.image;
  if (!(data instanceof Float32Array) || t.userData.prepped) return t;
  t.userData.sunDir = sunFromHDR(t);
  let sum = [0, 0, 0], n = 0;
  for (let y = Math.floor(height * 0.3); y < height * 0.48; y++) for (let x = 0; x < width; x++) { const i = (y * width + x) * 4; for (let c = 0; c < 3; c++) sum[c] += Math.min(data[i + c], 50); n++; }
  const lum = (sum[0] + sum[1] + sum[2]) / 3 / n, ground = [0.62 * lum, 0.5 * lum, 0.4 * lum];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, below = y > height * 0.5;
    for (let c = 0; c < 3; c++) {
      if (below) { const k = Math.min(1, (y / height - 0.5) * 12); data[i + c] = data[i + c] * (1 - k) + ground[c] * k; }
      data[i + c] = Math.min(data[i + c], max);
    }
  }
  t.needsUpdate = true; t.userData.prepped = true;
  return t;
}

// direction of the brightest pixel in an equirect HDR (three.js convention)
function sunFromHDR(t) {
  if (!t) return new THREE.Vector3(-0.4, 0.75, 0.5).normalize();
  const { data, width, height } = t.image; let best = 0, bi = 0;
  for (let i = 0; i < width * height; i++) { const l = data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]; if (l > best) { best = l; bi = i; } }
  const u = ((bi % width) + 0.5) / width, v = (Math.floor(bi / width) + 0.5) / height;
  const phi = (u - 0.5) * 2 * Math.PI, el = (0.5 - v) * Math.PI;
  // three samples equirect with u = atan(dir.z, dir.x) / 2π + 0.5 ; DataTexture rows start at the top when flipY=false
  return new THREE.Vector3(Math.cos(el) * Math.cos(phi), Math.sin(el), Math.cos(el) * Math.sin(phi)).normalize().multiply(new THREE.Vector3(1, t.flipY ? -1 : 1, 1)).normalize();
}

// Real-world finishes per style (keys match styles.js)
export function realMaterials(R) {
  return (M, styleKey) => {
    const lux = styleKey === 'lux', P = R.pbr;
    const common = {
      lawn: P('leafy_grass', 2.5, { color: 0xd8e8c0 }),
      sand: P('red_sand', 4, { color: 0xe0b896 }),
      asphalt: P('asphalt_02', 4),
      wallExt: P('white_stucco_02', 2.5, { color: 0xe2a592, normal: 0.7 }),
      boundary: P('white_stucco_02', 2.5, { color: 0xdc9f8c, normal: 0.7 }),
      neighbour: P('white_stucco_02', 3, { color: 0xd8a08c, normal: 0.5 }),
      paver: P('rectangular_paving', 2.2, { color: lux ? 0xf2e2c8 : 0xe0dcd4 }),
      curtain: new THREE.MeshStandardMaterial({ color: 0xf2ebdf, roughness: 1, emissive: 0xfff3e2, emissiveIntensity: 0.22 }),
      water: (() => { // clear water: the pool tiles show through, with sky reflections and soft ripples
        const w = M.water.clone();
        Object.assign(w, { opacity: 0.3, roughness: 0.03, envMapIntensity: 0.9 });
        w.color.set(lux ? 0x46c2b8 : 0x4cc0d0); w.normalScale.set(0.1, 0.1); return w;
      })(),
    };
    Object.assign(common.curtain, { transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
    const mid = {
      floorWet: P('marble_mosaic_tiles', 1.0, { color: 0xf0ede8, rough: 0.6 }),
      floorChp: P('herringbone_parquet', 1.6, { color: 0xf5e6d0 }),
      wallInt: P('plastered_wall_02', 2.5, { color: 0xfbf7f0, normal: 0.35 }),
      wallWet: P('rounded_square_tiled_wall', 0.8, { color: 0xf6f3ee, rough: 0.4 }),
      ceiling: P('white_plaster_02', 3, { color: 0xfbfaf7, normal: 0.25, noMap: true, rough: 0.95, env: 1.6 }),
      terrace: P('patio_tiles', 2.4, { color: 0xf7efe2 }),
      coping: P('patio_tiles', 1.6, { color: 0xffffff }),
      poolTile: P('square_tiles_03', 1.0, { color: 0xa6e0ea, rough: 0.4 }),
      wood: P('oak_veneer_01', 1.2), kitchenCab2: P('oak_veneer_01', 1.2), tableTop: P('oak_veneer_01', 1.4),
      woodDark: P('walnut_veneer', 1.2), doorLeaf: P('oak_veneer_01', 1.2, { color: 0xf3e6d2 }), mainDoor: P('walnut_veneer', 1.0),
 splash: P('rounded_square_tiled_wall', 0.6, { color: 0xf6f3ee, rough: 0.35 }),
      sofa1: P('rough_linen', 0.1, { color: 0xe9e2d6, noMap: true, rough: 0.95, normal: 1.4, sheen: 0.6, sheenRough: 0.8 }), sofa2: P('rough_linen', 0.1, { color: 0xcfc6b8, noMap: true, rough: 0.95, normal: 1.4, sheen: 0.6, sheenRough: 0.8 }),
      chairFab: P('rough_linen', 0.12, { color: 0xddd1bc, noMap: true, rough: 0.95, normal: 1.3, sheen: 0.5, sheenRough: 0.8 }), linen: P('rough_linen', 0.6, { color: 0xffffff, noMap: true, rough: 0.95 }), bed: P('rough_linen', 0.6, { color: 0xd8d2c6, noMap: true, rough: 0.95 }),
      cushA: P('rough_linen', 0.15, { color: 0xd4974a, noMap: true, rough: 0.95, normal: 1.3, sheen: 0.5, sheenRough: 0.7 }), cushB: P('rough_linen', 0.15, { color: 0xc06a48, noMap: true, rough: 0.95, normal: 1.3, sheen: 0.5, sheenRough: 0.7 }), outdoorFab: P('rough_linen', 0.6, { color: 0xf5f2ea, noMap: true, rough: 0.95 }),
      teak: P('oak_veneer_01', 1.0, { color: 0xd9b48c }), outdoorFrame: P('oak_veneer_01', 1.0, { color: 0xf0ece4 }),
    };
    const luxM = {
      floorWet: P('marble_mosaic_tiles', 0.9, { color: 0x8a8f86, rough: 0.3 }),
      floorChp: P('herringbone_parquet', 1.6, { color: 0xb88a63 }),
      wallInt: P('plastered_wall_02', 2.5, { color: 0xf2d7b8, rough: 0.55, normal: 0.3 }),
      wallWet: P('rounded_square_tiled_wall', 0.8, { color: 0x3f9a8a, rough: 0.15, env: 1.4 }),
      ceiling: P('white_plaster_02', 3, { color: 0xf4ebdf, normal: 0.25, noMap: true, rough: 0.95, env: 1.6 }),
      terrace: P('sandstone_blocks_08', 2.8, { color: 0xfff4e4 }),
      coping: P('sandstone_blocks_08', 1.8, { color: 0xffffff }),
      poolTile: P('rounded_square_tiled_wall', 0.7, { color: 0x7fd4c2, rough: 0.15 }),
      wood: P('walnut_veneer', 1.2), kitchenCab2: P('walnut_veneer', 1.2), woodDark: P('smoked_walnut_veneer', 1.2),
      doorLeaf: P('walnut_veneer', 1.2), mainDoor: P('smoked_walnut_veneer', 1.0),
      stone: P('marble_01', 1.2, { color: 0xeadbc6, rough: 0.3 }),
      sofa1: P('velour_velvet', 0.15, { color: 0x14503c, noMap: true, rough: 0.95, sheen: 1, sheenRough: 0.35, sheenColor: 0x7fc8a4 }), sofa2: P('curly_teddy_natural', 0.5, { color: 0xffffff }),
      chairFab: P('fabric_leather_02', 0.6), bed: P('velour_velvet', 0.5, { color: 0x8a6b50, noMap: true, rough: 0.95, sheen: 1, sheenRough: 0.4, sheenColor: 0xe0c4a4 }), linen: P('rough_linen', 0.6, { color: 0xffffff, noMap: true, rough: 0.95 }),
      cushA: P('velour_velvet', 0.4, { color: 0xc08532, noMap: true, rough: 0.95, sheen: 1, sheenRough: 0.4, sheenColor: 0xf5d08a }), cushB: P('velour_velvet', 0.4, { color: 0x7a1f2c, noMap: true, rough: 0.95, sheen: 1, sheenRough: 0.4, sheenColor: 0xd8707e }), cushC: P('curly_teddy_natural', 0.4),
      throw: P('velour_velvet', 0.4, { color: 0x14503c, noMap: true, rough: 0.95, sheen: 1, sheenRough: 0.35, sheenColor: 0x7fc8a4 }), outdoorFab: P('rough_linen', 0.6, { color: 0xefe6d4, noMap: true, rough: 0.95 }),
      teak: P('walnut_veneer', 1.0, { color: 0xe0b48a }), outdoorFrame: P('walnut_veneer', 1.0, { color: 0xe0b48a }),
    };
    const out = { ...common, ...(lux ? luxM : mid) };
    if (lux) { out.rugMain = persianRug(111); out.rugHall = persianRug(113, true); out.rugSecond = beniRug(112); }
    else { out.rugMain = beniRug(81); out.rugSecond = beniRug(82); }
    for (const k of Object.keys(out)) if (!out[k]) delete out[k];
    return out;
  };
}

// Swap procedural pieces for scanned models where a good match exists. Models face +z like the procedural ones.
export function realKit(R) {
  const fit = (id, w, d, h, { stretch = false, rot = 0 } = {}) => {
    const src = R.models[id]; if (!src) return null;
    const o = src.scene.clone(true), s = src.size.clone();
    if (rot) [s.x, s.z] = [s.z, s.x];
    let sx, sy, sz;
    if (stretch) { sx = w / s.x; sz = d / s.z; sy = h ? h / s.y : Math.min(sx, sz); }
    else { const k = Math.min(w ? w / s.x : Infinity, d ? d / s.z : Infinity, h ? h / s.y : Infinity); sx = sy = sz = k; }
    const inner = new THREE.Group(); inner.add(o); o.position.set(-src.center.x, -src.box.min.y, -src.center.z);
    inner.rotation.y = rot; inner.scale.set(rot ? sz : sx, sy, rot ? sx : sz);
    const g = new THREE.Group(); g.add(inner); g.userData.top = src.size.y * sy; return g;
  };
  const onTop = (g, id, h, dx = 0, dz = 0, ry = 0) => { const it = fit(id, null, null, h); if (it) { it.position.set(dx, g.userData.top ?? 0.75, dz); it.rotation.y = ry; g.add(it); } return g; };
  return (FB, M, styleKey) => {
    const lux = styleKey === 'lux', K = { ...FB };
    K.armchair = (m, o = {}) => fit(o.round ? 'mid_century_lounge_chair' : lux ? 'GreenChair_01' : 'modern_arm_chair_01', 0.85, 0.9) || FB.armchair(m, o);
    K.pouf = (m, mat, r = 0.28, h = 0.4) => (lux ? fit('Ottoman_01', r * 2.4, r * 2.4) : null) || FB.pouf(m, mat, r, h);
    K.coffeeTable = (m, o = {}) => {
      const w = o.w ?? 1.2, d = o.d ?? (o.round ? w : 0.7);
      const g = o.round ? fit('coffee_table_round_01', w, w) : fit('modern_coffee_table_01', w, d, null, { rot: w > d ? Math.PI / 2 : 0 });
      if (!g) return FB.coffeeTable(m, o);
      if (o.round && lux) onTop(g, 'tea_set_01', 0.16, 0, 0, 0.4); else onTop(g, lux ? 'brass_vase_03' : 'ceramic_vase_02', lux ? 0.2 : 0.25, 0.15, 0.05);
      return g;
    };
    K.sideTable = (m, o) => (lux ? null : fit('side_table_01', 0.5, 0.5)) || FB.sideTable(m, o);
    K.diningChair = (m, o = {}) => (o.lux ? fit('dining_chair_02', 0.5, 0.62) : null) || FB.diningChair(m, o);
    K.sideboard = (m, o = {}) => {
      const len = o.len ?? 3, depth = o.depth ?? 0.45, h = o.h ?? 0.75, k = len / 2.44;
      if (k < 0.7 || k > 1.45) return FB.sideboard(m, o);
      const g = fit('modern_wooden_cabinet', len, depth, h, { stretch: true }); if (!g) return FB.sideboard(m, o);
      if (h > 0.6) { onTop(g, lux ? 'brass_vase_01' : 'ceramic_vase_01', lux ? 0.6 : 0.4, -len * 0.3, 0); onTop(g, lux ? 'brass_pot_01' : 'ceramic_vase_04', 0.3, len * 0.28, 0); }
      return g;
    };
    K.plant = (m, o = {}) => {
      const h = o.h ?? 1.5;
      const id = h < 0.45 ? 'potted_plant_04' : o.kind === 'bush' ? 'potted_plant_02' : 'potted_plant_01';
      return fit(id, null, null, h < 0.45 ? 0.3 : Math.max(0.9, h * 0.95)) || FB.plant(m, o);
    };
    K.lantern = (m, o = {}) => {
      const h = o.h ?? 0.6;
      if (o.hanging) { const g = fit('lantern_chandelier_01', null, null, h * 1.3); if (g) { g.children[0].position.y = -h * 1.3; return g; } }
      else { const g = fit('brass_diya_lantern', null, null, h); if (g) return g; }
      return FB.lantern(m, o);
    };
    K.pendant = (m, o = {}) => {
      if (o.kind === 'globe') { const g = fit('modern_ceiling_lamp_01', null, null, Math.min(1.0, o.drop ?? 1)); if (g) { g.position.y = 0; g.children[0].position.y = (o.ceil ?? 3.4) - g.userData.top; return g; } }
      return FB.pendant(m, o);
    };
    K.mirror = (m, w, h, o = {}) => {
      if (o.arch) { const g = fit('ornate_mirror_01', w * 1.2, null, h * 1.1); if (g) { g.children[0].position.y = -g.userData.top / 2; return g; } }
      return FB.mirror(m, w, h, o);
    };
    K.oliveTree = (m, o = {}) => {
      const g = fit('island_tree_02', null, null, (o.r ?? 2.5) * 1.7); if (!g) return FB.oliveTree(m, o);
      // lightweight stand-in used by the path tracer (the scan is ~1M triangles)
      const proxy = FB.oliveTree(m, o); proxy.visible = false; g.children[0].userData.heavy = proxy; g.add(proxy);
      return g;
    };
    K.shrub = (m, o = {}) => fit(`shrub_02_${'abcd'[Math.abs(o.seed | 0) % 4]}`, null, null, Math.max(0.5, (o.r ?? 0.5) * 2.2)) || FB.shrub(m, o);
    const rugNor = R.man.textures.curly_teddy_natural ? new THREE.TextureLoader().load(R.man.textures.curly_teddy_natural.nor) : null;
    K.rug = (tex, w, d) => {
      const g = FB.rug(tex, w, d), m = g.children[0];
      let nor = null; if (rugNor) { nor = rugNor.clone(); nor.wrapS = nor.wrapT = THREE.RepeatWrapping; nor.repeat.set(w / 0.25, d / 0.25); nor.needsUpdate = true; }
      m.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, normalMap: nor, normalScale: new THREE.Vector2(0.5, 0.5) });
      m.receiveShadow = true; return g;
    };
    let cypN = 0;
    K.cypress = (m, o = {}) => cypressTree(o.h ?? 4.5, o.seed ?? cypN++);
    K.firepit = (m) => { const g = fit('stone_fire_pit', 1.4, 1.4); if (!g) return FB.firepit(m); const f = FB.firepit(m); f.children.slice(-1).forEach((c) => { c.position.y = 0.25; g.add(c); }); return g; };
    return K;
  };
}

// ---------- hand-knotted Persian rug (dark field, floral arabesques, mirrored medallion, borders) ----------
const RUGS = {};
function persianRug(seed, runner = false) {
  if (RUGS[seed]) return RUGS[seed];
  const W = 1024, H = runner ? 1536 : 1152, R = rng(seed);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const field = '#211d22', pal = ['#8c3a2e', '#a85a3c', '#c9a77a', '#e6d6b8', '#6e7a5a', '#9b4a52', '#3c4a63', '#b88a4e'];
  g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, W, H);                // fringe-side cream guard
  const B = 22; g.fillStyle = '#3a1f1d'; g.fillRect(B, B, W - 2 * B, H - 2 * B);
  // quadrant of floral field drawn once, mirrored 4x
  const q = document.createElement('canvas'); q.width = W / 2; q.height = H / 2; const h = q.getContext('2d');
  h.fillStyle = field; h.fillRect(0, 0, q.width, q.height);
  const vine = (x, y, n, ang) => {
    h.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const nx = x + Math.cos(ang) * 18, ny = y + Math.sin(ang) * 18;
      h.strokeStyle = '#4d5a44'; h.lineWidth = 2.2; h.beginPath(); h.moveTo(x, y); h.quadraticCurveTo((x + nx) / 2 + (R() - 0.5) * 10, (y + ny) / 2 + (R() - 0.5) * 10, nx, ny); h.stroke();
      if (R() < 0.45) { // leaf
        h.fillStyle = R() < 0.6 ? '#5e6a4c' : '#7b845e'; h.save(); h.translate(nx, ny); h.rotate(ang + (R() < 0.5 ? 1 : -1) * 1.1);
        h.beginPath(); h.ellipse(7, 0, 8, 3.2, 0, 0, 7); h.fill(); h.restore();
      }
      if (R() < 0.18) { // flower / rosette
        const r = 5 + R() * 8, col = pal[(R() * pal.length) | 0];
        for (let p = 0; p < 6; p++) { h.fillStyle = col; h.beginPath(); h.arc(nx + Math.cos(p * 1.047) * r * 0.6, ny + Math.sin(p * 1.047) * r * 0.6, r * 0.45, 0, 7); h.fill(); }
        h.fillStyle = R() < 0.5 ? '#e6d6b8' : '#c9a77a'; h.beginPath(); h.arc(nx, ny, r * 0.32, 0, 7); h.fill();
      }
      x = nx; y = ny; ang += (R() - 0.5) * 0.9;
    }
  };
  for (let i = 0; i < 70; i++) vine(R() * q.width, R() * q.height, 10 + R() * 20, R() * 6.28);
  // medallion lobes at the centre corner of the quadrant (= rug centre)
  const mx = q.width, my = q.height;
  [[150, '#6b2a26'], [128, '#c9a77a'], [118, '#8c3a2e'], [70, '#2b3550'], [40, '#c9a77a'], [22, '#8c3a2e']].forEach(([r, col]) => {
    h.fillStyle = col; h.beginPath();
    for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2, rr = r * (1 + 0.12 * Math.cos(t * 8)) * (runner ? 1 : 1); const px = mx + Math.cos(t) * rr * 0.8, py = my + Math.sin(t) * rr; a ? h.lineTo(px, py) : h.moveTo(px, py); }
    h.fill();
  });
  for (let i = 0; i < 26; i++) { const a = R() * 6.28, r = 30 + R() * 90; vine(mx + Math.cos(a) * r * 0.8, my + Math.sin(a) * r, 4, a); }
  // corner spandrels
  h.fillStyle = '#5a2723'; h.beginPath(); h.moveTo(0, 0); h.lineTo(170, 0); h.quadraticCurveTo(120, 60, 0, 150); h.fill();
  for (let i = 0; i < 10; i++) vine(R() * 110, R() * 90, 5, R() * 6.28);
  const F0 = 120; // inner field origin (inside borders)
  g.save(); g.beginPath(); g.rect(F0, F0, W - 2 * F0, H - 2 * F0); g.clip();
  const fw = (W - 2 * F0) / 2, fh = (H - 2 * F0) / 2;
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.save(); g.translate(W / 2, H / 2); g.scale(sx, sy); g.drawImage(q, -fw, -fh, fw, fh); g.restore(); }
  g.restore();
  // borders: main band with rosettes between guard stripes
  const band = (m, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.strokeRect(m + w / 2, m + w / 2, W - 2 * m - w, H - 2 * m - w); };
  band(B, 18, '#c9a77a'); band(B + 18, 6, '#2b3550'); band(B + 24, 62, '#5a2723'); band(B + 86, 6, '#2b3550'); band(B + 92, 6, '#c9a77a');
  const ros = (x, y) => { for (let p = 0; p < 8; p++) { g.fillStyle = p % 2 ? '#c9a77a' : '#a85a3c'; g.beginPath(); g.arc(x + Math.cos(p * 0.785) * 11, y + Math.sin(p * 0.785) * 11, 6, 0, 7); g.fill(); } g.fillStyle = '#e6d6b8'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); };
  const bm = B + 24 + 31;
  for (let x = bm; x <= W - bm; x += 56) { ros(x, bm); ros(x, H - bm); }
  for (let y = bm + 56; y <= H - bm - 56; y += 56) { ros(bm, y); ros(W - bm, y); }
  // pile: knot grain + abrash (colour banding) + wear
  for (let i = 0; i < 60000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,240,220,0.06)'; g.fillRect(R() * W, R() * H, 2, 2); }
  for (let y = 0; y < H; y += 3) { g.fillStyle = `rgba(0,0,0,${0.04 + 0.04 * Math.sin(y * 0.02 + R())})`; g.fillRect(0, y, W, 1); }
  for (let i = 0; i < 14; i++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(255,235,210,0.10)'); gr.addColorStop(1, 'rgba(255,235,210,0)');
    g.save(); g.translate(R() * W, R() * H); g.scale(80 + R() * 160, 60 + R() * 120); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (RUGS[seed] = t);
}

// ---------- Beni Ourain: thick cream wool with hand-drawn dark lozenge lines ----------
function beniRug(seed) {
  if (RUGS[seed]) return RUGS[seed];
  const W = 1024, H = 1024, R = rng(seed), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#ece3d2'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26000; i++) { // wool tufts
    const x = R() * W, y = R() * H, r = 2 + R() * 6, k = R();
    g.fillStyle = k < 0.4 ? 'rgba(214,201,178,0.55)' : k < 0.8 ? 'rgba(248,243,233,0.6)' : 'rgba(190,176,152,0.45)';
    g.beginPath(); g.ellipse(x, y, r, r * (0.6 + R() * 0.6), R() * 3, 0, 7); g.fill();
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  const step = 150, amp = 70;
  for (let k = -2; k < 9; k++) { // zigzag columns, wobbly like hand-knotted lines
    g.strokeStyle = 'rgba(38,33,29,0.88)'; g.lineWidth = 9 + R() * 3; g.beginPath();
    for (let y = -20; y <= H + 20; y += 8) {
      const ph = (y % (amp * 2)) / amp, zz = ph < 1 ? ph : 2 - ph;
      const x = k * step + 40 + zz * amp * 0.9 + (R() - 0.5) * 7;
      y < -10 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(236,227,210,0.55)' : 'rgba(255,252,245,0.35)'; const x = R() * W, y = R() * H; g.beginPath(); g.arc(x, y, 1.5 + R() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (RUGS[seed] = t);
}

// ---------- Italian cypress (Cupressus sempervirens): clumpy column + alpha-tested sprays ----------
const CYP = { variants: [], mats: null };
function cypMaterials() {
  if (CYP.mats) return CYP.mats;
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const R = rng(91);
  // body: dense scale-leaf texture
  const a = cv(256, 512), g = a.getContext('2d');
  g.fillStyle = '#26361d'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 5200; i++) {
    const x = R() * 256, y = R() * 512, l = 4 + R() * 9, k = R();
    g.strokeStyle = k < 0.45 ? `rgba(18,28,14,${0.5 + R() * 0.4})` : k < 0.85 ? `rgba(${70 + R() * 30},${92 + R() * 30},${48 + R() * 16},0.75)` : `rgba(${118 + R() * 30},${128 + R() * 25},${70 + R() * 20},0.7)`;
    g.lineWidth = 1 + R() * 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 4, y - l); g.stroke();
  }
  const body = new THREE.CanvasTexture(a); body.wrapS = body.wrapT = THREE.RepeatWrapping; body.repeat.set(3, 7); body.colorSpace = THREE.SRGBColorSpace; body.anisotropy = 4;
  // sprays: upward-pointing fronds with transparent background
  const b = cv(128, 256), h = b.getContext('2d');
  const frond = (x, y, len, ang, w) => {
    const ex = x + Math.sin(ang) * len, ey = y - Math.cos(ang) * len;
    h.strokeStyle = '#2b3d20'; h.lineWidth = w; h.beginPath(); h.moveTo(x, y); h.lineTo(ex, ey); h.stroke();
    for (let t = 0.15; t < 1; t += 0.07) {
      const px = x + (ex - x) * t, py = y + (ey - y) * t, s = (1 - t) * len * 0.28 + 3;
      for (const side of [-1, 1]) {
        const k = R(); h.strokeStyle = k < 0.5 ? '#2f4424' : k < 0.85 ? '#4d6436' : '#6d8048';
        h.lineWidth = 2 + R() * 2; h.beginPath(); h.moveTo(px, py); h.lineTo(px + Math.sin(ang + side * 0.45) * s, py - Math.cos(ang + side * 0.45) * s); h.stroke();
      }
    }
  };
  h.lineCap = 'round';
  for (let i = 0; i < 6; i++) frond(64 + (R() - 0.5) * 40, 252, 120 + R() * 120, (R() - 0.5) * 0.5, 2.5);
  const spray = new THREE.CanvasTexture(b); spray.colorSpace = THREE.SRGBColorSpace; spray.anisotropy = 4;
  CYP.mats = {
    body: new THREE.MeshStandardMaterial({ map: body, bumpMap: body, bumpScale: 2.5, vertexColors: true, roughness: 0.92 }),
    spray: new THREE.MeshStandardMaterial({ map: spray, alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.9 }),
  };
  return CYP.mats;
}
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function noise3(seed) { // cheap smooth 3D value noise
  const R = rng(seed), P = new Float32Array(512); for (let i = 0; i < 512; i++) P[i] = R();
  const hsh = (x, y, z) => P[((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 511];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    let v = 0;
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++)
      v += hsh(xi + dx, yi + dy, zi + dz) * (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf);
    return v * 2 - 1;
  };
}
const H0 = 4.5;
function cypressVariant(seed) {
  const R = rng(seed), N = noise3(seed), maxR = 0.4 + R() * 0.06, lean = (R() - 0.5) * 0.06;
  const profile = (t) => (t < 0.05 ? 0.6 + 0.4 * Math.sqrt(t / 0.05) : t < 0.22 ? 1 : Math.pow(Math.max(0, 1 - (t - 0.22) / 0.78), 0.75)) * maxR;
  const fbm = (x, y, z) => N(x, y, z) * 0.6 + N(x * 2.3, y * 2.3, z * 2.3) * 0.3 + N(x * 5.1, y * 5.1, z * 5.1) * 0.15;
  // body
  const geo = new THREE.CylinderGeometry(1, 1, 1, 28, 56, false); geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), t = y, ang = Math.atan2(z, x);
    const top = t > 0.999 || (Math.abs(x) < 1e-4 && Math.abs(z) < 1e-4);
    const n = fbm(Math.cos(ang) * 1.6, t * 14, Math.sin(ang) * 1.6), r = top ? 0 : profile(t) * (1 + 0.22 * n);
    pos.setXYZ(i, Math.cos(ang) * r + lean * t * H0, t * H0 + 0.25, Math.sin(ang) * r);
    const sh = THREE.MathUtils.clamp(0.62 + 0.45 * n, 0.3, 1.05); col.set([sh, sh, sh * 0.95], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  // sprays sticking out of the surface, pointing up
  const n = 520, P = new Float32Array(n * 4 * 3), Nn = new Float32Array(n * 4 * 3), U = new Float32Array(n * 4 * 2), C = new Float32Array(n * 4 * 3), I = [];
  const v = new THREE.Vector3(), up = new THREE.Vector3(), side = new THREE.Vector3(), out = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    const t = Math.pow(R(), 0.9) * 0.95 + 0.02, ang = R() * Math.PI * 2, nn = fbm(Math.cos(ang) * 1.6, t * 14, Math.sin(ang) * 1.6);
    const r = profile(t) * (1 + 0.22 * nn) * (0.8 + R() * 0.15);
    out.set(Math.cos(ang), 0, Math.sin(ang));
    const base = new THREE.Vector3(out.x * r + lean * t * H0, t * H0 + 0.25, out.z * r);
    const len = (0.22 + R() * 0.2) * (1 - t * 0.45), wid = len * 0.55;
    up.set(out.x * (0.12 + R() * 0.2), 1, out.z * (0.12 + R() * 0.2)).normalize();
    side.crossVectors(up, out).normalize().applyAxisAngle(up, (R() - 0.5) * 1.2);
    const corners = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]];
    const sh = THREE.MathUtils.clamp(0.75 + 0.4 * nn + (R() - 0.5) * 0.2, 0.45, 1.1);
    corners.forEach(([sx, sy], j) => {
      v.copy(base).addScaledVector(side, sx * wid).addScaledVector(up, sy * len - 0.05);
      P.set([v.x, v.y, v.z], (k * 4 + j) * 3); Nn.set([out.x, 0.35, out.z], (k * 4 + j) * 3);
      U.set([sx + 0.5, sy], (k * 4 + j) * 2); C.set([sh, sh, sh * 0.95], (k * 4 + j) * 3);
    });
    const o = k * 4; I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(P, 3)); sg.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  sg.setAttribute('uv', new THREE.BufferAttribute(U, 2)); sg.setAttribute('color', new THREE.BufferAttribute(C, 3)); sg.setIndex(I);
  sg.normalizeNormals();
  return { body: geo, spray: sg };
}
function cypressTree(h, seed) {
  const mats = cypMaterials(), k = Math.abs(seed | 0) % 4;
  if (!CYP.variants[k]) CYP.variants[k] = cypressVariant(17 + k * 31);
  const V = CYP.variants[k], g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 7), new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 1 }));
  trunk.position.y = 0.25; g.add(trunk);
  const s = h / H0, inner = new THREE.Group(); inner.scale.set(s * (0.92 + (seed % 5) * 0.03), s, s * (0.92 + (seed % 5) * 0.03)); inner.rotation.y = seed * 1.7; g.add(inner);
  const b = new THREE.Mesh(V.body, mats.body), sp = new THREE.Mesh(V.spray, mats.spray);
  [b, sp, trunk].forEach((m) => { m.castShadow = true; m.receiveShadow = true; }); inner.add(b, sp);
  return g;
}

export { HEAVY };
