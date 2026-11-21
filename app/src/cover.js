// Neon Coast Cover Studio — cover render engine.
// Original art: multi-panel GTA-style poster covers drawn on a 2D canvas.
// No Rockstar logo, artwork or fonts. Lettering is Anton + Pacifico (OFL).

export const GRADES = [
  {
    id: 'vice-sunset', name: 'Vice Sunset',
    stops: [[0, 26, 12, 46], [0.35, 122, 32, 86], [0.6, 226, 84, 66], [0.8, 255, 176, 92], [1, 255, 240, 200]],
    sat: 1.35, con: 1.12, tint: 'rgba(255,110,60,0.10)',
  },
  {
    id: 'neon-night', name: 'Neon Night',
    stops: [[0, 8, 8, 34], [0.35, 52, 16, 96], [0.6, 168, 32, 150], [0.8, 255, 84, 178], [1, 150, 240, 255]],
    sat: 1.5, con: 1.15, tint: 'rgba(40,220,255,0.08)',
  },
  {
    id: 'palm-teal', name: 'Palm Teal',
    stops: [[0, 6, 34, 40], [0.35, 16, 96, 104], [0.6, 42, 178, 150], [0.8, 150, 224, 150], [1, 255, 244, 190]],
    sat: 1.3, con: 1.1, tint: 'rgba(20,200,160,0.08)',
  },
  {
    id: 'hot-pink', name: 'Hot Pink',
    stops: [[0, 30, 6, 40], [0.35, 130, 20, 96], [0.6, 232, 44, 130], [0.8, 255, 120, 170], [1, 255, 220, 235]],
    sat: 1.45, con: 1.12, tint: 'rgba(255,60,160,0.10)',
  },
  {
    id: 'noir-gold', name: 'Noir Gold',
    stops: [[0, 10, 10, 12], [0.35, 74, 60, 44], [0.6, 168, 128, 62], [0.8, 232, 188, 96], [1, 255, 238, 200]],
    sat: 1.15, con: 1.18, tint: 'rgba(255,200,90,0.06)',
  },
];

export const LAYOUTS = [
  { id: 'hero3', name: 'Hero + 3' },
  { id: 'grid9', name: 'Nine Panel' },
  { id: 'fullbleed', name: 'Full Bleed' },
  { id: 'tilted', name: 'Tilted Snaps' },
  { id: 'duo', name: 'Split Duo' },
  { id: 'stack', name: 'Poster Stack' },
];

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// Panel rects as fractions of [W, H]. Title zone likewise.
export function layoutGeometry(layoutId, W, H) {
  const F = (x, y, w, h, rot = 0) => ({ x: x * W, y: y * H, w: w * W, h: h * H, rot });
  switch (layoutId) {
    case 'grid9': {
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if (r === 1 && c === 1) continue; // centre cell is the title block
        panels.push(F(0.02 + c * 0.32, 0.02 + r * 0.32, 0.30, 0.30));
      }
      return { panels, title: F(0.34, 0.34, 0.32, 0.30), titleMode: 'block', bg: 'sky' };
    }
    case 'fullbleed':
      return { panels: [F(0, 0, 1, 1)], title: F(0.05, 0.74, 0.9, 0.22), titleMode: 'band', bg: 'plain' };
    case 'tilted':
      return {
        panels: [F(0.06, 0.10, 0.42, 0.52, -0.06), F(0.52, 0.06, 0.42, 0.52, 0.05), F(0.28, 0.52, 0.44, 0.36, -0.02)],
        title: F(0.05, 0.02, 0.9, 0.12), titleMode: 'top', bg: 'sky',
      };
    case 'duo':
      return { panels: [F(0.02, 0.02, 0.47, 0.72), F(0.51, 0.02, 0.47, 0.72)], title: F(0.05, 0.78, 0.9, 0.18), titleMode: 'band', bg: 'plain' };
    case 'stack':
      return { panels: [F(0.02, 0.02, 0.96, 0.56), F(0.02, 0.60, 0.47, 0.36), F(0.51, 0.60, 0.47, 0.36)], title: F(0.05, 0.44, 0.9, 0.14), titleMode: 'band', bg: 'plain' };
    case 'hero3':
    default:
      return {
        panels: [F(0.02, 0.02, 0.60, 0.96), F(0.64, 0.02, 0.34, 0.30), F(0.64, 0.35, 0.34, 0.30), F(0.64, 0.68, 0.34, 0.30)],
        title: F(0.04, 0.80, 0.56, 0.16), titleMode: 'band', bg: 'plain',
      };
  }
}

function buildLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const f = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(a[1 + c] + (b[1 + c] - a[1 + c]) * f);
  }
  return lut;
}

const lutCache = {};
export function gradeLut(gradeId) {
  if (!lutCache[gradeId]) {
    const g = GRADES.find((x) => x.id === gradeId) || GRADES[0];
    lutCache[gradeId] = buildLut(g);
  }
  return lutCache[gradeId];
}

// Draw one photo into a rect, cover-fit, with per-panel zoom / pan / flip.
export function drawPhotoInto(ctx, img, rect, panel) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (rect.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rect.rot);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const base = Math.max(w / iw, h / ih) * (panel.zoom || 1);
  const dw = iw * base, dh = ih * base;
  const dx = x + (w - dw) / 2 + (panel.ox || 0) * w;
  const dy = y + (h - dh) / 2 + (panel.oy || 0) * h;
  if (panel.flip) {
    ctx.translate(x + w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(x + w / 2), 0);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Gradient-map the pixels of the given rect in place (called on the export canvas).
export function gradeRect(ctx, rect, gradeId) {
  const grade = GRADES.find((x) => x.id === gradeId) || GRADES[0];
  const lut = gradeLut(gradeId);
  const x = Math.max(0, Math.floor(rect.x)), y = Math.max(0, Math.floor(rect.y));
  const w = Math.min(ctx.canvas.width - x, Math.ceil(rect.w)), h = Math.min(ctx.canvas.height - y, Math.ceil(rect.h));
  if (w <= 0 || h <= 0) return;
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const mix = 0.55; // keep some of the photo's own colour
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const li = lum * 3;
    d[i] = Math.round(d[i] * (1 - mix) + lut[li] * mix);
    d[i + 1] = Math.round(d[i + 1] * (1 - mix) + lut[li + 1] * mix);
    d[i + 2] = Math.round(d[i + 2] * (1 - mix) + lut[li + 2] * mix);
  }
  ctx.putImageData(img, x, y);
  ctx.fillStyle = grade.tint;
  ctx.fillRect(x, y, w, h);
}

function drawSunsetSky(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2b1055');
  g.addColorStop(0.45, '#c6427a');
  g.addColorStop(0.7, '#ff7a4d');
  g.addColorStop(1, '#ffc46b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // low sun
  const sx = W * 0.72, sy = H * 0.42, sr = Math.min(W, H) * 0.16;
  const sg = ctx.createRadialGradient(sx, sy, sr * 0.1, sx, sy, sr * 1.6);
  sg.addColorStop(0, 'rgba(255,240,190,0.95)');
  sg.addColorStop(0.4, 'rgba(255,190,110,0.55)');
  sg.addColorStop(1, 'rgba(255,150,90,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - sr * 2, sy - sr * 2, sr * 4, sr * 4);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  // low skyline: a dark ground band with a short, varied rooftop edge.
  // Seeded so the skyline is stable across preview redraws.
  let seed = 20261121;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  ctx.fillStyle = '#1d0b33';
  ctx.fillRect(0, H * 0.90, W, H * 0.10);
  ctx.fillStyle = '#241040';
  let bx = 0;
  while (bx < W) {
    const bw = W * (0.06 + rnd() * 0.07), bh = H * (0.015 + rnd() * 0.05);
    ctx.fillRect(bx, H * 0.90 - bh, bw, bh + H * 0.10);
    bx += bw + W * 0.015;
  }
  // palm silhouettes
  drawPalm(ctx, W * 0.03, H * 0.92, H * 0.20);
  drawPalm(ctx, W * 0.97, H * 0.93, H * 0.16);
}

function drawPalm(ctx, x, y, s) {
  ctx.strokeStyle = '#1c0b33';
  ctx.lineWidth = Math.max(4, s * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.05, y - s * 0.5, x + s * 0.16, y - s * 0.82);
  ctx.stroke();
  const tx = x + s * 0.16, ty = y - s * 0.82;
  ctx.lineWidth = Math.max(3, s * 0.035);
  for (let i = 0; i < 7; i++) {
    // fronds fan out from the crown and droop down at the tips
    const a = -Math.PI * (0.08 + i * 0.14);
    const ex = tx + Math.cos(a) * s * 0.52;
    const ey = ty + Math.sin(a) * s * 0.30 + s * 0.22;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * s * 0.30, ty + Math.sin(a) * s * 0.22 - s * 0.10, ex, ey);
    ctx.stroke();
  }
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.strokeStyle = '#111';
  ctx.stroke();
}

let noiseCanvas = null;
function noisePattern(ctx) {
  if (!noiseCanvas) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 140; noiseCanvas.height = 140;
    const nctx = noiseCanvas.getContext('2d');
    const img = nctx.createImageData(140, 140);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 28;
    }
    nctx.putImageData(img, 0, 0);
  }
  return ctx.createPattern(noiseCanvas, 'repeat');
}

function drawCoverTitle(ctx, state, zone, W, H) {
  const title = (state.title || 'NEON COAST').toUpperCase();
  const sub = state.subtitle || '';
  const pad = zone.w * 0.02;
  if (zone.mode === 'block') {
    ctx.fillStyle = '#fdfdf8';
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
    // halftone dots along the block edge
    if (state.halftone) {
      ctx.fillStyle = '#ff5e8a';
      const step = Math.max(8, W * 0.012);
      for (let dx = zone.x + step; dx < zone.x + zone.w - step; dx += step * 2) {
        ctx.beginPath(); ctx.arc(dx, zone.y + zone.h - step * 0.8, step * 0.22, 0, Math.PI * 2); ctx.fill();
      }
    }
    const fs = Math.min(zone.w / Math.max(4, title.length) * 1.9, zone.h * 0.42);
    ctx.font = `${fs}px Anton, 'Arial Black', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const grad = ctx.createLinearGradient(zone.x, zone.y, zone.x + zone.w, zone.y + zone.h);
    grad.addColorStop(0, '#ff7a3c'); grad.addColorStop(0.5, '#ff2e88'); grad.addColorStop(1, '#7a2bff');
    ctx.fillStyle = grad;
    ctx.fillText(title, zone.x + zone.w / 2, zone.y + zone.h * 0.42, zone.w - pad * 2);
    if (sub) {
      ctx.font = `${Math.max(12, zone.h * 0.17)}px Pacifico, cursive`;
      ctx.fillStyle = '#191233';
      ctx.fillText(sub, zone.x + zone.w / 2, zone.y + zone.h * 0.78, zone.w - pad * 2);
    }
    return;
  }
  // band / top modes: bold letters with black keyline over a scrim
  const scrim = ctx.createLinearGradient(0, zone.y, 0, zone.y + zone.h);
  scrim.addColorStop(0, 'rgba(10,6,24,0)');
  scrim.addColorStop(0.35, 'rgba(10,6,24,0.72)');
  scrim.addColorStop(1, 'rgba(10,6,24,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(zone.x - pad, zone.y, zone.w + pad * 2, zone.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(zone.x, zone.y + zone.h * 0.06, zone.w, Math.max(3, H * 0.004));
  const fs = Math.min(zone.w / Math.max(4, title.length) * 1.75, zone.h * 0.52);
  ctx.save();
  ctx.translate(zone.x + zone.w / 2, zone.y + zone.h * 0.52);
  if (zone.mode === 'top') ctx.rotate(-0.015);
  ctx.font = `${fs}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, fs * 0.14);
  ctx.strokeStyle = '#12081f';
  ctx.strokeText(title, 0, 0, zone.w - pad);
  const grad = ctx.createLinearGradient(-zone.w / 2, 0, zone.w / 2, 0);
  grad.addColorStop(0, '#ffd76b'); grad.addColorStop(0.5, '#fff6e0'); grad.addColorStop(1, '#ff7ad9');
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0, zone.w - pad);
  ctx.restore();
  if (sub) {
    ctx.font = `${Math.max(14, zone.h * 0.2)}px Pacifico, cursive`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = Math.max(8, W * 0.012);
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(sub, zone.x + zone.w / 2, zone.y + zone.h * 0.86, zone.w - pad);
    ctx.shadowBlur = 0;
  }
}

// The whole cover. state: {photos, panels, title, subtitle, grade, layout,
// size, grain, vignette, halftone, frame, heat, badge}
export function renderCover(canvas, state) {
  const [W, H] = SIZES[state.size] || SIZES['1080x1080'];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const geo = layoutGeometry(state.layout, W, H);
  const grade = GRADES.find((x) => x.id === state.grade) || GRADES[0];

  // background
  if (geo.bg === 'sky') drawSunsetSky(ctx, W, H);
  else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1b0b2e'); g.addColorStop(1, '#3d1040');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // panels
  const photos = state.photos || [];
  geo.panels.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = photos[panel.photo] || photos[0];
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    if (img) {
      ctx.filter = `saturate(${grade.sat}) contrast(${grade.con})`;
      drawPhotoInto(ctx, img, rect, panel);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#2a1745';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
    // grade the panel pixels, then its white poster border
    if (img) gradeRect(ctx, rect, state.grade);
    const bw = Math.max(4, W * 0.006);
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    ctx.lineWidth = bw;
    ctx.strokeStyle = '#fdfdf8';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = Math.max(1.5, bw * 0.3);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeRect(rect.x + bw, rect.y + bw, rect.w - bw * 2, rect.h - bw * 2);
    ctx.restore();
  });

  // title
  drawCoverTitle(ctx, state, { ...geo.title, mode: geo.titleMode }, W, H);

  // badge ribbon, top-right (skipped when it would cover the title block)
  if (state.badge && geo.titleMode !== 'block') {
    const bw2 = W * 0.30, bh = H * 0.045;
    ctx.save();
    ctx.translate(W - bw2 / 2 - W * 0.02, bh);
    ctx.rotate(0.06);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(-bw2 / 2, -bh / 2, bw2, bh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(-bw2 / 2 + 3, -bh / 2 + 3, bw2 - 6, bh - 6);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(11, bh * 0.42)}px Anton, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★ EST. 2026 ★ NEON COAST', 0, 1);
    ctx.restore();
  }

  // wanted-star heat meter, bottom-left above the frame
  if (state.heat > 0) {
    const r = Math.max(10, W * 0.016);
    const y = H - r * 2.4;
    for (let i = 0; i < 5; i++) {
      drawStar(ctx, W * 0.05 + i * r * 2.6, y, r, i < state.heat ? '#ffd76b' : 'rgba(255,255,255,0.25)');
    }
  }

  // vignette + grain
  if (state.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,4,24,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain) {
    ctx.fillStyle = noisePattern(ctx);
    ctx.fillRect(0, 0, W, H);
  }

  // outer poster frame
  if (state.frame) {
    ctx.lineWidth = Math.max(10, W * 0.014);
    ctx.strokeStyle = '#fdfdf8';
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  }
  return { W, H };
}
