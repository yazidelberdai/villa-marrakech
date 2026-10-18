import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { buildWorld } from './world.js';
import { loadReal, realMaterials, realKit } from './real.js';
import { PhotoMode } from './photo.js';

// Final colour grade for the photoreal mode (display-referred, after tone mapping):
// gentle S-curve, warm highlights / neutral shadows, a touch of saturation and a soft vignette.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, warmth: { value: 0.035 }, contrast: { value: 0.12 }, saturation: { value: 1.06 }, vignette: { value: 0.28 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float warmth, contrast, saturation, vignette; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv); vec3 col = clamp(c.rgb, 0.0, 1.0);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * col * (3.0 - 2.0 * col), contrast);
      col += warmth * smoothstep(0.25, 0.9, l) * vec3(1.0, 0.35, -0.6);
      l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, saturation);
      vec2 d = vUv - 0.5; col *= 1.0 - vignette * smoothstep(0.2, 0.85, dot(d, d) * 2.2);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`,
};
import plan1 from './plans/plan1.js';
import plan2 from './plans/plan2.js';

const qs = new URLSearchParams(location.search);
const styleKey = qs.get('style') === 'lux' ? 'lux' : 'mid';
const planKey = qs.get('plan') === '2' ? '2' : '1';
const PLAN = { 1: plan1, 2: plan2 }[planKey];
const real = qs.get('real') === '1';
const { VIEWS, PLOT } = PLAN;
const urlFor = (o = {}) => `?plan=${o.plan || planKey}&style=${o.style || styleKey}${(o.real ?? real) ? '&real=1' : ''}`;
const $ = (s) => document.querySelector(s);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, new URLSearchParams(location.search).get('real') === '1' ? 1.25 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2500);
camera.rotation.order = 'YXZ';
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;
scene.fog = new THREE.Fog(0xd8c8b4, 150, 900);

const sky = new Sky(); sky.scale.setScalar(1800); scene.add(sky);
const su = sky.material.uniforms;
su.turbidity.value = 3; su.rayleigh.value = 1.1; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.8;

const CENTER = new THREE.Vector3(13.5, 0, 10.5);
const sun = new THREE.DirectionalLight(0xfff0dc, 3.0);
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 52), THREE.MathUtils.degToRad(-35)); // high sun from the south-west
sun.position.copy(CENTER).addScaledVector(sunDir, 60);
sun.target.position.copy(CENTER);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 140 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
su.sunPosition.value.copy(sunDir);
const hemi = new THREE.HemisphereLight(0xd6e8ff, 0xb89a78, 1.0);
scene.add(hemi);

// ---------- world ----------
let R = null;
if (real) {
  $('#loading').textContent = 'Loading real furniture & materials… 0%';
  R = await loadReal((p) => { const el = $('#loading'); if (el) el.textContent = `Loading real furniture & materials… ${Math.round(p * 100)}%`; });
}
const world = buildWorld(PLAN, styleKey, real ? { real, materials: realMaterials(R), kit: realKit(R) } : {});
let composer = null;
const windowLights = [];
let realLook = null;
if (real) {
  const hdr = R.hdr.drakensberg_solitary_mountain_puresky;
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.background = hdr;
  sky.visible = false;
  world.root.traverse((o) => { if (o.isMesh && (o.material === world.materials.mountain || o.material === world.materials.snow)) o.visible = false; });
  sunDir.copy(R.sunDir); if (sunDir.y < 0.25) { sunDir.y = 0.25; sunDir.normalize(); }
  sun.position.copy(CENTER).addScaledVector(sunDir, 60);
  sun.shadow.radius = 3; sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.025;
  // Photographic look: Khronos PBR Neutral keeps saturated finishes (velvet, zellige) true to colour
  renderer.toneMapping = THREE.NeutralToneMapping;
  realLook = {
    day: { exposure: 0.95, sun: 4.2, sunColor: 0xffe2c0, hemi: 0.35, env: 1.15, bg: 1.35, win: 1.6, bounce: 0.2, curtain: 0.22 },
    night: { exposure: 1.0, sun: 0.15, sunColor: 0x9fb4ff, hemi: 0.12, env: 0.08, bg: 0.6, win: 0, bounce: 0, curtain: 0.02 },
  };
  hemi.color.set(0xfff2e2); hemi.groundColor.set(0xc9a27e);
  // clear glass: no diffuse "milk", only a Fresnel reflection added on top of a slight darkening
  const glass = world.materials.glass;
  Object.assign(glass, { opacity: 0.1, roughness: 0.02, envMapIntensity: 1.0, side: THREE.FrontSide, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation });
  glass.color.set(0x000000); glass.needsUpdate = true;
  scene.fog.color.set(0xdfe3e6);
  // cheap stand-in for indirect light: interior walls/ceilings glow faintly with their own colour by day
  // (AO still darkens corners), the way sunlit floors bounce light around real rooms
  for (const k of ['ceiling', 'wallInt']) {
    const m = world.materials[k]; if (!m || !m.isMeshStandardMaterial) continue;
    m.emissive.copy(m.color); m.emissiveMap = m.map; m.needsUpdate = true; m.userData.bounce = true;
  }
  // soft daylight spilling in through every large glazing (one-sided area lights facing into the rooms)
  RectAreaLightUniformsLib.init();
  for (const w of world.windows) {
    if (w.w * w.h < 1.2) continue;
    const l = new THREE.RectAreaLight(0xfff3e4, 1, w.w * 0.95, w.h * 0.95);
    l.position.set(w.x + w.nx * (w.th / 2 + 0.03), w.y, w.z + w.nz * (w.th / 2 + 0.03));
    l.lookAt(l.position.x + w.nx, w.y - 0.25, l.position.z + w.nz);
    l.userData.area = w.w * w.h; scene.add(l); windowLights.push(l);
  }
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  ao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.6, thickness: 1.2, scale: 1.25, samples: 12 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 8, rings: 2, samples: 16 });
  ao.blendIntensity = 1.0;
  // the AO normal/depth pre-pass must see through glass and water (but not through curtains)
  const seeThrough = []; world.root.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.transparent && o.material.opacity < 0.5) seeThrough.push(o); });
  const aoRender = ao.render.bind(ao);
  ao.render = (...a) => { const vis = seeThrough.map((m) => m.visible); seeThrough.forEach((m) => (m.visible = false)); aoRender(...a); seeThrough.forEach((m, i) => (m.visible = vis[i])); };
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.18, 0.55, 1.6);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass(GradeShader));
  composer.addPass(new SMAAPass());
}
function applyRealLook(night) {
  const L = realLook[night ? 'night' : 'day'];
  renderer.toneMappingExposure = L.exposure;
  sun.intensity = L.sun; sun.color.set(L.sunColor);
  hemi.intensity = L.hemi; scene.environmentIntensity = L.env; scene.backgroundIntensity = L.bg;
  windowLights.forEach((l) => { l.intensity = L.win; l.visible = L.win > 0; });
  for (const m of Object.values(world.materials)) if (m?.userData?.bounce) m.emissiveIntensity = L.bounce;
  if (world.materials.curtain) world.materials.curtain.emissiveIntensity = L.curtain;
}
if (real) applyRealLook(false);
window.__look = { realLook, applyRealLook, windowLights, grade: () => composer?.passes.find((p) => p.uniforms?.vignette)?.uniforms, bloom: () => composer?.passes.find((p) => p.constructor.name === 'UnrealBloomPass') };
scene.add(world.root);
renderer.shadowMap.needsUpdate = true;
document.title = `${PLAN.name} · ${world.name} · Villa Marrakech`;
$('#planLink').href = PLAN.photo;
$('#planName').textContent = `${PLAN.name} · ${PLAN.subtitle}`;
document.querySelectorAll('[data-plan]').forEach((b) => b.classList.toggle('on', b.dataset.plan === planKey));
document.querySelectorAll('[data-real]').forEach((b) => b.classList.toggle('on', (b.dataset.real === '1') === real));
$('#styleName').textContent = world.name;
$('#tagline').textContent = world.tagline;
document.querySelectorAll('[data-style]').forEach((b) => b.classList.toggle('on', b.dataset.style === styleKey));

// ---------- player ----------
const EYE = 1.62, RADIUS = 0.26;
const start = VIEWS[0];
const player = { x: start.x, z: start.z, yaw: start.yaw, pitch: -0.05 };
if (location.hash.length > 1) {
  const [x, z, yaw, pitch] = location.hash.slice(1).split(',').map(Number);
  if ([x, z, yaw, pitch].every(Number.isFinite)) Object.assign(player, { x, z, yaw, pitch });
}

function resolve(x, z) {
  for (let it = 0; it < 4; it++) {
    for (const [x1, z1, x2, z2] of world.colliders.boxes) {
      if (x > x1 - RADIUS && x < x2 + RADIUS && z > z1 - RADIUS && z < z2 + RADIUS) {
        const pens = [[x - (x1 - RADIUS), -1, 0], [(x2 + RADIUS) - x, 1, 0], [z - (z1 - RADIUS), 0, -1], [(z2 + RADIUS) - z, 0, 1]];
        pens.sort((a, b) => a[0] - b[0]);
        const [d, sx, sz] = pens[0]; x += sx * d; z += sz * d;
      }
    }
    for (const [ax, az, bx, bz, th] of world.colliders.segs) {
      const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      const cx = ax + dx * t, cz = az + dz * t, ex = x - cx, ez = z - cz, dist = Math.hypot(ex, ez), min = RADIUS + th;
      if (dist < min && dist > 1e-6) { x = cx + (ex / dist) * min; z = cz + (ez / dist) * min; }
    }
  }
  return [x, z];
}
const blocked = (x, z) => { const [rx, rz] = resolve(x, z); return Math.hypot(rx - x, rz - z) > 0.05; };
function insidePlot(x, z) { // keep walkers inside the boundary + the street in front
  return z > -14.5 && z < 23 && x > -2 && x < 29;
}

// ---------- input ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.code);
  if (e.code === 'Escape' && photo.active) { photo.stop(); return; }
  if (photo.active) return;
  if (e.code === 'KeyP') takePhoto();
  if (e.code === 'KeyO') toggleMode();
  if (e.code === 'KeyN') toggleNight();
  if (e.code === 'KeyM') location.href = `${urlFor({ style: styleKey === 'lux' ? 'mid' : 'lux' })}#${posHash()}`;
  if (e.code === 'KeyH') $('#help').classList.toggle('hide');
  if (/^Digit[1-9]$/.test(e.code)) goView(VIEWS[+e.code.slice(5) - 1]);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { if (mode !== 'walk' || photo.active) return; drag = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!drag || mode !== 'walk') return;
  player.yaw += (e.clientX - drag.x) * 0.0032; player.pitch += (e.clientY - drag.y) * 0.0032;
  player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch));
  drag = { x: e.clientX, y: e.clientY }; tween = null;
});
addEventListener('pointerup', () => (drag = null));
renderer.domElement.addEventListener('wheel', (e) => { if (mode !== 'walk') return; camera.fov = Math.max(40, Math.min(85, camera.fov + e.deltaY * 0.03)); camera.updateProjectionMatrix(); }, { passive: true });

// double-click: walk to the clicked spot (walk) or jump inside (overview)
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('dblclick', (e) => {
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hits = ray.intersectObject(world.root, true).filter((h) => h.object.visible && h.face && h.face.normal.y > 0.5 && h.point.y < 0.6);
  if (!hits.length) return;
  const p = hits[0].point;
  if (mode === 'orbit') { toggleMode(); player.x = p.x; player.z = p.z; [player.x, player.z] = resolve(player.x, player.z); return; }
  const [rx, rz] = resolve(p.x, p.z);
  tween = { from: { ...player }, to: { ...player, x: rx, z: rz }, t: 0, dur: Math.min(1.6, Math.hypot(rx - player.x, rz - player.z) / 3 + 0.3) };
});

// touch pad
document.querySelectorAll('[data-key]').forEach((b) => {
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(b.dataset.key); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => keys.delete(b.dataset.key)));
});

// ---------- views / tween ----------
let tween = null;
function goView(v) {
  if (!v) return;
  if (mode === 'orbit') toggleMode();
  let dy = v.yaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  tween = { from: { ...player }, to: { x: v.x, z: v.z, yaw: player.yaw + dy, pitch: -0.05 }, t: 0, dur: 1.0 };
}
const viewsEl = $('#views');
VIEWS.forEach((v, i) => {
  const b = document.createElement('button'); b.innerHTML = `<span>${i < 9 ? i + 1 : ''}</span>${v.name}`; b.onclick = () => goView(v); viewsEl.appendChild(b);
});
document.querySelectorAll('[data-style]').forEach((b) => (b.onclick = () => { if (b.dataset.style !== styleKey) location.href = `${urlFor({ style: b.dataset.style })}#${posHash()}`; }));
document.querySelectorAll('[data-plan]').forEach((b) => (b.onclick = () => { if (b.dataset.plan !== planKey) location.href = urlFor({ plan: b.dataset.plan }); }));
document.querySelectorAll('[data-real]').forEach((b) => (b.onclick = () => { const r = b.dataset.real === '1'; if (r !== real) location.href = `${urlFor({ real: r })}#${posHash()}`; }));
const posHash = () => [player.x, player.z, player.yaw, player.pitch].map((n) => n.toFixed(2)).join(',');

// ---------- overview (orbit) mode ----------
let mode = 'walk';
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false; orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * 0.47; orbit.minDistance = 6; orbit.maxDistance = 90;
const labelsEl = $('#labels');
const labelEls = world.labels.map((l) => { const d = document.createElement('div'); d.className = 'label'; d.textContent = l.name; labelsEl.appendChild(d); return { ...l, el: d }; });
function toggleMode() {
  mode = mode === 'walk' ? 'orbit' : 'walk';
  const ov = mode === 'orbit';
  world.roofParts.forEach((m) => (m.visible = !ov));
  renderer.shadowMap.needsUpdate = true;
  orbit.enabled = ov; labelsEl.style.display = ov ? 'block' : 'none';
  $('#modeBtn').textContent = ov ? 'Walk inside' : 'Overview (no roof)';
  $('#dot').style.display = ov ? 'none' : 'block';
  if (ov) {
    camera.fov = 50; camera.updateProjectionMatrix();
    orbit.target.copy(CENTER); camera.position.set(CENTER.x - 6, 26, CENTER.z + 30); orbit.update();
  } else { camera.fov = 70; camera.updateProjectionMatrix(); }
}
$('#modeBtn').onclick = toggleMode;

// ---------- day / night ----------
let night = false;
function toggleNight() {
  night = !night;
  world.setNight(night);
  sky.visible = !night && !real;
  scene.background = real ? (night ? R.hdr.dikhololo_night : R.hdr.drakensberg_solitary_mountain_puresky) : night ? new THREE.Color(0x0a1020) : null;
  scene.fog.color.set(night ? 0x0a1020 : real ? 0xdfe3e6 : 0xd8c8b4);
  if (real) applyRealLook(night);
  else {
    sun.intensity = night ? 0.18 : 3.0; sun.color.set(night ? 0x9fb4ff : 0xfff0dc);
    hemi.intensity = night ? 0.25 : 1.0;
    scene.environmentIntensity = night ? 0.08 : 0.6;
    renderer.toneMappingExposure = night ? 1.25 : 1.0;
  }
  $('#nightBtn').textContent = night ? 'Day' : 'Night';
  renderer.shadowMap.needsUpdate = true;
}
$('#nightBtn').onclick = toggleNight;
$('#helpBtn').onclick = () => $('#help').classList.toggle('hide');

// ---------- minimap ----------
const mm = $('#minimap'), mg = mm.getContext('2d');
const MB = { x0: -1.5, z0: -2, x1: 29, z1: 23 };
const mmScale = Math.min(mm.width / (MB.x1 - MB.x0), mm.height / (MB.z1 - MB.z0));
const toMM = (x, z) => [(x - MB.x0) * mmScale, (z - MB.z0) * mmScale];
const fromMM = (px, py) => [px / mmScale + MB.x0, py / mmScale + MB.z0];
function drawMinimap() {
  mg.clearRect(0, 0, mm.width, mm.height);
  mg.fillStyle = '#6f8f4e'; mg.beginPath(); PLOT.forEach(([x, z], i) => { const [a, b] = toMM(x, z); i ? mg.lineTo(a, b) : mg.moveTo(a, b); }); mg.closePath(); mg.fill();
  const rect = (r, c) => { const [a, b] = toMM(r[0], r[1]), [c2, d] = toMM(r[2], r[3]); mg.fillStyle = c; mg.fillRect(a, b, c2 - a, d - b); };
  rect(world.minimap.terrace, '#d9c9ad'); world.minimap.paths.forEach((r) => rect(r, '#b0a89c'));
  world.minimap.footprint.forEach((r) => rect(r, '#efe7da'));
  if (world.minimap.pool) rect(world.minimap.pool, '#3fb3cc');
  if (world.minimap.jacuzzi) rect(world.minimap.jacuzzi, '#3fb3cc');
  world.minimap.glass.forEach((r) => rect(r, '#7fd0ff'));
  world.minimap.walls.forEach((w) => {
    if (w.seg) { const [a, b] = toMM(w.seg[0], w.seg[1]), [c, d] = toMM(w.seg[2], w.seg[3]); mg.strokeStyle = '#c98a6a'; mg.lineWidth = 2; mg.beginPath(); mg.moveTo(a, b); mg.lineTo(c, d); mg.stroke(); }
    else rect(w, '#2b2724');
  });
  const [px, py] = toMM(player.x, player.z);
  mg.save(); mg.translate(px, py); mg.rotate(-player.yaw);
  mg.fillStyle = 'rgba(255,90,60,0.25)'; mg.beginPath(); mg.moveTo(0, 0); mg.arc(0, 0, 26, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); mg.closePath(); mg.fill();
  mg.fillStyle = '#ff4d2e'; mg.beginPath(); mg.arc(0, 0, 4, 0, 7); mg.fill();
  mg.restore();
}
mm.addEventListener('click', (e) => {
  const r = mm.getBoundingClientRect(); const [x, z] = fromMM((e.clientX - r.left) * (mm.width / r.width), (e.clientY - r.top) * (mm.height / r.height));
  if (mode === 'orbit') toggleMode();
  const [rx, rz] = resolve(x, z);
  tween = { from: { ...player }, to: { ...player, x: rx, z: rz }, t: 0, dur: 0.8 };
});

// ---------- loop ----------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
let lastHash = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (photo.active) { requestAnimationFrame(frame); return; }
  if (mode === 'walk') {
    if (tween) {
      tween.t += dt / tween.dur; const k = Math.min(1, tween.t), e = k * k * (3 - 2 * k);
      for (const p of ['x', 'z', 'yaw', 'pitch']) player[p] = tween.from[p] + (tween.to[p] - tween.from[p]) * e;
      if (k >= 1) tween = null;
    } else {
      const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.2 : 1;
      const sp = 1.7 * run * dt;
      let f = 0, s = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp') || keys.has('KeyZ')) f += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyA') || keys.has('KeyQ')) s -= 1;
      if (keys.has('KeyD')) s += 1;
      if (keys.has('ArrowLeft')) player.yaw += 1.8 * dt;
      if (keys.has('ArrowRight')) player.yaw -= 1.8 * dt;
      if (f || s) {
        const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
        const nx = player.x + (fx * f - fz * s) * sp, nz = player.z + (fz * f + fx * s) * sp;
        if (insidePlot(nx, nz)) [player.x, player.z] = resolve(nx, nz);
      }
    }
    camera.position.set(player.x, EYE, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    if (t - lastHash > 1) { history.replaceState(null, '', `${urlFor()}#${posHash()}`); lastHash = t; }
  } else {
    orbit.update();
    const v = new THREE.Vector3();
    labelEls.forEach((l) => {
      v.set(l.x, 1.2, l.z).project(camera);
      const vis = v.z < 1; l.el.style.display = vis ? 'block' : 'none';
      l.el.style.transform = `translate(-50%,-50%) translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px)`;
    });
  }
  world.update(t);
  drawMinimap();
  if (composer) composer.render(); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight); });

// ---------- photo (high-resolution capture) ----------
const photoUI = {
  show(text, ready) { $('#photoBar').style.display = 'flex'; $('#photoText').textContent = text; $('#photoSave').disabled = !ready; ['#side', '#mmwrap', '#help', '#dot', '#pad', '#labels'].forEach((s) => $(s)?.classList.add('photoHide')); },
  hide() { $('#photoBar').style.display = 'none'; ['#side', '#mmwrap', '#help', '#dot', '#pad', '#labels'].forEach((s) => $(s)?.classList.remove('photoHide')); },
};
function renderView() {
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); composer.render(); }
  else renderer.render(scene, camera);
}
const photo = new PhotoMode({ renderer, render: renderView, ui: photoUI });
async function takePhoto() {
  if (photo.active) return;
  tween = null; keys.clear();
  await photo.start(devicePixelRatio >= 2 ? 2.4 : 2);
}
$('#photoBtn').onclick = takePhoto;
$('#photoSave').onclick = () => photo.download();
$('#photoClose').onclick = () => photo.stop();
$('#loading').remove();
frame();
window.__real = R;
window.__app = { views: VIEWS, getComposer: () => composer, setComposer: (c) => (composer = c), player, world, toggleMode, toggleNight, goView, renderer, scene, camera, photo, takePhoto,
  // render one frame on demand (used when the tab is in the background)
  renderOnce() { camera.position.set(player.x, EYE, player.z); camera.rotation.set(player.pitch, player.yaw, 0); renderView(); } };
