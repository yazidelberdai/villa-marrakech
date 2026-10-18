// Procedural canvas textures (no image downloads needed).
import * as THREE from 'three';

export function rng(seed = 1) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function cv(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function hex(h, d = 0) { // shade a hex colour by d (-1..1)
  const c = new THREE.Color(h); c.offsetHSL(0, 0, d); return '#' + c.getHexString();
}
function speckle(g, w, h, n, colors, r, seed, alpha = 0.25) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * R(); g.fillStyle = colors[(R() * colors.length) | 0];
    g.beginPath(); g.arc(R() * w, R() * h, r * (0.3 + R()), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

// sizeM = metres covered by one texture repeat (geometry uses metre-based UVs)
function finish(c, sizeM, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const [sx, sy] = Array.isArray(sizeM) ? sizeM : [sizeM, sizeM];
  t.repeat.set(1 / sx, 1 / sy);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const cache = new Map();
function memo(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

export function tileTex({ base = '#e9e1d3', grout = '#cfc6b6', n = 2, size = 1.2, vary = 0.03, seed = 3, pores = 0, groutW = 3 } = {}) {
  return memo('tile' + [base, grout, n, size, vary, seed, pores].join(), () => {
    const S = 1024, [c, g] = cv(S), R = rng(seed), t = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = hex(base, (R() - 0.5) * vary); g.fillRect(i * t, j * t, t, t);
    }
    speckle(g, S, S, 2500, [hex(base, -0.08), hex(base, 0.06)], 3, seed + 1, 0.18);
    if (pores) speckle(g, S, S, pores, [hex(base, -0.25)], 2.2, seed + 2, 0.5);
    g.fillStyle = grout;
    for (let i = 0; i <= n; i++) { g.fillRect(i * t - groutW / 2, 0, groutW, S); g.fillRect(0, i * t - groutW / 2, S, groutW); }
    return finish(c, size);
  });
}

// running-bond pavers (travertine / concrete)
export function paverTex({ base = '#dccbb0', grout = '#b9a98f', size = 2.4, cols = 4, rows = 6, vary = 0.05, seed = 7, pores = 900 } = {}) {
  return memo('paver' + [base, grout, size, cols, rows, seed].join(), () => {
    const S = 1024, [c, g] = cv(S), R = rng(seed), w = S / cols, h = S / rows;
    g.fillStyle = grout; g.fillRect(0, 0, S, S);
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * w / 2;
      for (let k = -1; k < cols; k++) {
        g.fillStyle = hex(base, (R() - 0.5) * vary);
        g.fillRect(k * w + off + 3, r * h + 3, w - 6, h - 6);
      }
    }
    speckle(g, S, S, pores, [hex(base, -0.2), hex(base, 0.08)], 2.5, seed + 1, 0.45);
    return finish(c, size);
  });
}

export function marbleTex({ base = '#f3f0ea', vein = '#8f8a84', gold = null, size = 1.6, seed = 11, slab = true, density = 1 } = {}) {
  return memo('marble' + [base, vein, gold, size, seed, slab, density].join(), () => {
    const S = 1024, [c, g] = cv(S), R = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    speckle(g, S, S, 1600, [hex(base, -0.05), hex(base, 0.03)], 26, seed, 0.12);
    const veins = (count, width, alpha, blur, col) => {
      g.filter = `blur(${blur}px)`; g.strokeStyle = col;
      for (let i = 0; i < count; i++) {
        g.globalAlpha = alpha * (0.4 + R()); g.lineWidth = width * (0.4 + R());
        let x = R() * S, y = R() * S, a = R() * Math.PI * 2;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 60; k++) { a += (R() - 0.5) * 0.7; x += Math.cos(a) * 22; y += Math.sin(a) * 22 + 6; g.lineTo(x, y); }
        g.stroke();
      }
      g.filter = 'none'; g.globalAlpha = 1;
    };
    veins(Math.round(5 * density), 9, 0.22, 6, vein);
    veins(Math.round(10 * density), 2.2, 0.55, 0.8, vein);
    veins(Math.round(18 * density), 0.8, 0.4, 0, hex(vein, 0.1));
    if (gold) veins(4, 1.6, 0.6, 0.6, gold);
    if (slab) { g.fillStyle = hex(base, -0.12); g.fillRect(0, 0, S, 2); g.fillRect(0, 0, 2, S); }
    return finish(c, size);
  });
}

export function woodTex({ base = '#c9a27a', dark = '#8d6643', size = 1.2, planks = 6, seed = 5, vertical = false, seams = true } = {}) {
  return memo('wood' + [base, dark, size, planks, seed, vertical, seams].join(), () => {
    const S = 1024, [c, g] = cv(S), R = rng(seed), pw = S / planks;
    for (let p = 0; p < planks; p++) {
      const shade = (R() - 0.5) * 0.08;
      g.fillStyle = hex(base, shade); g.fillRect(0, p * pw, S, pw);
      for (let k = 0; k < 40; k++) {
        g.globalAlpha = 0.08 + R() * 0.18; g.strokeStyle = hex(dark, (R() - 0.5) * 0.1);
        g.lineWidth = 0.6 + R() * 2.2; g.beginPath();
        const y0 = p * pw + R() * pw; g.moveTo(0, y0);
        for (let x = 0; x <= S; x += 64) g.lineTo(x, y0 + Math.sin(x * 0.01 + k) * (2 + R() * 3));
        g.stroke();
      }
      g.globalAlpha = 1;
      if (seams) {
        g.fillStyle = hex(dark, -0.15); g.fillRect(0, p * pw, S, 2);
        const cut = R() * S; g.fillRect(cut, p * pw, 2, pw);
      }
    }
    const t = finish(c, size);
    if (vertical) t.rotation = Math.PI / 2;
    return t;
  });
}

export function zelligeTex({ colors = ['#1f5f55', '#23695e', '#2a7468', '#1a5249'], grout = '#d8d2c4', n = 10, size = 1, seed = 13 } = {}) {
  return memo('zel' + [colors.join(), grout, n, size, seed].join(), () => {
    const S = 1024, [c, g] = cv(S), R = rng(seed), t = S / n;
    g.fillStyle = grout; g.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const col = colors[(R() * colors.length) | 0];
      const gr = g.createLinearGradient(i * t, j * t, i * t + t, j * t + t);
      gr.addColorStop(0, hex(col, 0.06 + R() * 0.05)); gr.addColorStop(0.5, hex(col, (R() - 0.5) * 0.06)); gr.addColorStop(1, hex(col, -0.06));
      g.fillStyle = gr; g.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
    }
    return finish(c, size);
  });
}

export function plasterTex({ base = '#efe9df', vary = 0.04, size = 3, seed = 17, blobs = 900 } = {}) {
  return memo('pl' + [base, vary, size, seed, blobs].join(), () => {
    const S = 512, [c, g] = cv(S), R = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    for (let i = 0; i < blobs; i++) {
      const x = R() * S, y = R() * S, r = 10 + R() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const col = hex(base, (R() - 0.5) * vary * 2);
      gr.addColorStop(0, col + '40');
      gr.addColorStop(1, col + '00');
      g.fillStyle = gr;
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(dx, dy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
    }
    return finish(c, size);
  });
}

export function grassTex({ size = 3, seed = 19 } = {}) {
  return memo('grass' + size + seed, () => {
    const S = 1024, [c, g] = cv(S), R = rng(seed);
    g.fillStyle = '#5d7f37'; g.fillRect(0, 0, S, S);
    const cols = ['#4c6e2c', '#6d9142', '#7aa04b', '#557a33', '#86a85a', '#45652a'];
    for (let i = 0; i < 26000; i++) {
      g.strokeStyle = cols[(R() * cols.length) | 0]; g.globalAlpha = 0.5;
      const x = R() * S, y = R() * S; g.lineWidth = 1 + R() * 1.4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 6, y - 4 - R() * 8); g.stroke();
    }
    g.globalAlpha = 1;
    return finish(c, size);
  });
}

export function fabricTex({ size = 0.3, seed = 23, boucle = false } = {}) {
  return memo('fab' + size + seed + boucle, () => {
    const S = 256, [c, g] = cv(S), R = rng(seed);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
    if (boucle) speckle(g, S, S, 3000, ['#d6d6d6', '#ffffff', '#c4c4c4'], 3, seed, 0.6);
    else {
      for (let y = 0; y < S; y += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + R() * 0.05})`; g.fillRect(0, y, S, 1); }
      for (let x = 0; x < S; x += 2) { g.fillStyle = `rgba(0,0,0,${0.02 + R() * 0.04})`; g.fillRect(x, 0, 1, S); }
    }
    return finish(c, size);
  });
}

export function rugTex(kind = 'beni', seed = 29) {
  return memo('rug' + kind + seed, () => {
    const W = 1024, H = 1024, [c, g] = cv(W, H), R = rng(seed);
    if (kind === 'beni') {
      g.fillStyle = '#efe8da'; g.fillRect(0, 0, W, H);
      speckle(g, W, H, 9000, ['#e2d9c6', '#f7f2e8', '#d9cfba'], 4, seed, 0.5);
      g.strokeStyle = '#2b2622'; g.lineWidth = 7; g.globalAlpha = 0.85;
      const step = 170;
      for (let k = -6; k < 12; k++) {
        g.beginPath();
        for (let y = 0; y <= H; y += 16) { const x = k * step + (y % (step * 2) < step ? y % step : step - (y % step)) + (R() - 0.5) * 6; y === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
        g.stroke();
      }
      g.globalAlpha = 1;
    } else if (kind === 'persian') {
      g.fillStyle = '#7d1f24'; g.fillRect(0, 0, W, H);
      const band = (m, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.strokeRect(m, m, W - 2 * m, H - 2 * m); };
      band(40, '#1d2a4a', 60); band(95, '#c9a45c', 10); band(125, '#1d2a4a', 22);
      g.save(); g.translate(W / 2, H / 2);
      for (let r = 5; r > 0; r--) { g.fillStyle = r % 2 ? '#1d2a4a' : '#c9a45c'; g.beginPath(); g.moveTo(0, -r * 60); g.lineTo(r * 45, 0); g.lineTo(0, r * 60); g.lineTo(-r * 45, 0); g.closePath(); g.fill(); }
      g.restore();
      g.fillStyle = '#c9a45c';
      for (let i = 0; i < 160; i++) { const x = 160 + R() * (W - 320), y = 160 + R() * (H - 320); g.globalAlpha = 0.55; g.fillRect(x, y, 10, 10); }
      g.globalAlpha = 1;
      speckle(g, W, H, 7000, ['#00000033', '#ffffff22'], 3, seed, 0.35);
    } else if (kind === 'kilim') { // terracotta flatweave
      g.fillStyle = '#c56c47'; g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 128) {
        g.fillStyle = y % 256 ? '#e7d7bd' : '#3a2b25';
        for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, y + 64); g.lineTo(x + 32, y + 30); g.lineTo(x + 64, y + 64); g.lineTo(x + 32, y + 98); g.fill(); }
      }
      speckle(g, W, H, 7000, ['#00000033', '#ffffff22'], 3, seed, 0.3);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  });
}

export function artTex(seed = 31, palette = ['#c4663f', '#e2b45a', '#7d8f6a', '#23395b', '#efe6d6']) {
  return memo('art' + seed + palette.join(), () => {
    const W = 512, H = 640, [c, g] = cv(W, H), R = rng(seed);
    g.fillStyle = palette[4]; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = palette[(R() * 4) | 0]; g.globalAlpha = 0.85;
      const k = R();
      if (k < 0.4) { g.beginPath(); g.arc(R() * W, R() * H, 40 + R() * 160, 0, Math.PI * (1 + R())); g.fill(); }
      else if (k < 0.7) g.fillRect(R() * W * 0.7, R() * H * 0.7, 60 + R() * 200, 30 + R() * 260);
      else { g.beginPath(); g.ellipse(R() * W, R() * H, 30 + R() * 140, 20 + R() * 90, R() * 3, 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
    speckle(g, W, H, 3000, ['#00000022', '#ffffff22'], 2, seed, 0.4);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}

// Tileable water normal map built from integer-frequency sine waves.
export function waterNormal() {
  return memo('water', () => {
    const S = 256, [c, g] = cv(S), img = g.createImageData(S, S), R = rng(41);
    const waves = Array.from({ length: 9 }, () => ({ fx: ((R() * 6) | 0) - 3, fy: ((R() * 6) | 0) + 1, p: R() * 6.28, a: 0.4 + R() }));
    const h = (x, y) => waves.reduce((s, w) => s + w.a * Math.sin(2 * Math.PI * (w.fx * x + w.fy * y) / S + w.p), 0);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
      const n = new THREE.Vector3(-dx * 0.6, -dy * 0.6, 1).normalize(), i = (y * S + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return finish(c, 2.5, false);
  });
}

// Fluted / slatted panel look
export function slatTex({ base = '#5a3d2b', size = 0.6, n = 12, seed = 43 } = {}) {
  return memo('slat' + base + size + n, () => {
    const S = 512, [c, g] = cv(S), w = S / n;
    for (let i = 0; i < n; i++) {
      const gr = g.createLinearGradient(i * w, 0, i * w + w, 0);
      gr.addColorStop(0, hex(base, -0.12)); gr.addColorStop(0.5, hex(base, 0.06)); gr.addColorStop(1, hex(base, -0.12));
      g.fillStyle = gr; g.fillRect(i * w, 0, w, S);
    }
    speckle(g, S, S, 1500, [hex(base, -0.1)], 2, seed, 0.3);
    return finish(c, size);
  });
}
