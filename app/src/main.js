// Neon Coast Cover Studio — editor wiring.
// Uploads photos, edits panels / caption / grade, exports PNGs. Works offline.

import { GRADES, LAYOUTS, SIZES, layoutGeometry, renderCover } from './cover.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot'); // 'cover' | 'editor' | null

const defaultPanels = (n) => Array.from({ length: n }, (_, i) => ({ photo: 0, zoom: 1, ox: 0, oy: 0, flip: false }));

const state = {
  photos: [],          // HTMLImageElements (samples + uploads)
  photoNames: [],
  panels: defaultPanels(8),
  title: 'NEON COAST',
  subtitle: 'sunset shores',
  grade: 'vice-sunset',
  layout: 'hero3',
  size: '1080x1080',
  grain: true, vignette: true, halftone: true, frame: true, badge: true,
  heat: 3,
};

let selectedPanel = 0;
let history = [];
let historyIndex = -1;
let fontsReady = false;

const preview = $('preview');
const pctx = preview.getContext('2d');

function snapshotState() {
  return JSON.stringify({
    panels: state.panels, title: state.title, subtitle: state.subtitle,
    grade: state.grade, layout: state.layout, size: state.size,
    grain: state.grain, vignette: state.vignette, halftone: state.halftone,
    frame: state.frame, badge: state.badge, heat: state.heat,
    photoSlots: state.panels.map((p) => p.photo),
  });
}

function pushHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(snapshotState());
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  updateUndoButtons();
}

function applySnapshot(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  state.panels = s.panels;
  syncControls();
  render();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  applySnapshot(history[historyIndex]);
  updateUndoButtons();
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex += 1;
  applySnapshot(history[historyIndex]);
  updateUndoButtons();
}

function updateUndoButtons() {
  $('undo').disabled = historyIndex <= 0;
  $('redo').disabled = historyIndex >= history.length - 1;
}

function panelCount() {
  return layoutGeometry(state.layout, 100, 100).panels.length;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push({ photo: 0, zoom: 1, ox: 0, oy: 0, flip: false });
  state.panels.length = n;
  if (selectedPanel >= n) selectedPanel = 0;
}

// Preview is drawn at a fixed working width; the export canvas renders full-size.
function render() {
  ensurePanels();
  const [W, H] = SIZES[state.size];
  const scale = 880 / W;
  preview.width = Math.round(W * scale);
  preview.height = Math.round(H * scale);
  // Render full-size offscreen, then downscale for a crisp preview.
  const off = document.createElement('canvas');
  renderCover(off, state);
  pctx.clearRect(0, 0, preview.width, preview.height);
  pctx.drawImage(off, 0, 0, preview.width, preview.height);
  drawSelection();
  updatePanelInfo();
}

function drawSelection() {
  if (SHOT === 'cover') return;
  const geo = layoutGeometry(state.layout, preview.width, preview.height);
  const rect = geo.panels[selectedPanel];
  if (!rect) return;
  pctx.save();
  pctx.lineWidth = 3;
  pctx.strokeStyle = '#ff2e88';
  pctx.setLineDash([10, 6]);
  pctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  pctx.setLineDash([]);
  const label = `Panel ${selectedPanel + 1} — drag to move, slider to zoom`;
  pctx.font = 'bold 13px system-ui, sans-serif';
  const tw = pctx.measureText(label).width;
  pctx.fillStyle = 'rgba(10,6,24,0.85)';
  pctx.fillRect(rect.x + 4, rect.y + 4, tw + 16, 24);
  pctx.fillStyle = '#ffd76b';
  pctx.fillText(label, rect.x + 12, rect.y + 21);
  pctx.restore();
}

function updatePanelInfo() {
  const p = state.panels[selectedPanel];
  if (!p) return;
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${panelCount()}`;
  $('zoom').value = p.zoom;
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  $('flip').checked = p.flip;
  renderPhotoChips();
}

function renderPhotoChips() {
  const box = $('photoChips');
  box.innerHTML = '';
  state.photoNames.forEach((name, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.panels[selectedPanel] && state.panels[selectedPanel].photo === i ? ' active' : '');
    b.textContent = `${i + 1} · ${name}`;
    b.title = `Put photo ${i + 1} in the selected panel`;
    b.addEventListener('click', () => {
      state.panels[selectedPanel].photo = i;
      pushHistory();
      render();
    });
    box.appendChild(b);
  });
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'chip';
  all.textContent = 'All panels ← this photo';
  all.addEventListener('click', () => {
    const pi = state.panels[selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = pi; });
    pushHistory();
    render();
  });
  box.appendChild(all);
}

function loadImage(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  const want = params.get('photo') === 'pier' ? ['pier', 'boulevard'] : ['boulevard', 'pier'];
  for (const name of want) {
    try {
      const img = await loadImage(`./samples/${name}.jpg`, name);
      state.photos.push(img);
      state.photoNames.push(name === 'boulevard' ? 'Boulevard' : 'Pier');
    } catch (e) { /* sample missing: editor still works with uploads */ }
  }
  if (state.photos.length === 0) {
    $('status').textContent = 'Add a photo to begin — samples did not load.';
  } else {
    // Spread the loaded photos across the panels so the first cover already
    // shows more than one photo.
    state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  }
  render();
}

function bindControls() {
  // layout buttons
  const lg = $('layouts');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pill'; b.dataset.layout = l.id; b.textContent = l.name;
    b.addEventListener('click', () => {
      state.layout = l.id;
      selectedPanel = 0;
      pushHistory(); render(); syncControls();
    });
    lg.appendChild(b);
  });
  // grade swatches
  const gg = $('grades');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pill'; b.dataset.grade = g.id; b.textContent = g.name;
    b.addEventListener('click', () => { state.grade = g.id; pushHistory(); render(); syncControls(); });
    gg.appendChild(b);
  });
  // sizes
  const sg = $('sizes');
  Object.keys(SIZES).forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pill'; b.dataset.size = key; b.textContent = key.replace('x', ' × ');
    b.addEventListener('click', () => { state.size = key; pushHistory(); render(); syncControls(); });
    sg.appendChild(b);
  });

  $('title').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('title').addEventListener('change', pushHistory);
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('subtitle').addEventListener('change', pushHistory);
  $('zoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    render();
  });
  $('zoom').addEventListener('change', pushHistory);
  $('flip').addEventListener('change', (e) => {
    state.panels[selectedPanel].flip = e.target.checked;
    pushHistory(); render();
  });
  $('heat').addEventListener('input', (e) => { state.heat = Number(e.target.value); $('heatVal').textContent = state.heat; render(); });
  $('heat').addEventListener('change', pushHistory);

  const toggle = (id, key) => $(id).addEventListener('change', (e) => {
    state[key] = e.target.checked; pushHistory(); render();
  });
  toggle('grain', 'grain'); toggle('vignette', 'vignette'); toggle('halftone', 'halftone');
  toggle('frame', 'frame'); toggle('badge', 'badge');

  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('resetPanels').addEventListener('click', () => {
    state.panels = defaultPanels(panelCount());
    selectedPanel = 0;
    pushHistory(); render();
  });

  $('photo').addEventListener('change', async (e) => {
    const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
    for (const f of files) {
      const url = URL.createObjectURL(f);
      try {
        const img = await loadImage(url, f.name);
        state.photos.push(img);
        state.photoNames.push(f.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo');
      } catch (err) { /* skip unreadable file */ }
    }
    if (files.length) {
      state.panels.forEach((p) => { if (p.photo >= state.photos.length) p.photo = 0; });
      pushHistory();
      render();
      $('status').textContent = `${files.length} photo${files.length > 1 ? 's' : ''} loaded — click a panel, drag to reposition.`;
    }
    e.target.value = '';
  });

  // panel picking + dragging on the preview
  let drag = null;
  const toCanvas = (e) => {
    const r = preview.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (preview.width / r.width), y: (e.clientY - r.top) * (preview.height / r.height) };
  };
  preview.addEventListener('pointerdown', (e) => {
    const pt = toCanvas(e);
    const geo = layoutGeometry(state.layout, preview.width, preview.height);
    const hit = geo.panels.findIndex((r) => pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h);
    if (hit < 0) return;
    selectedPanel = hit;
    const p = state.panels[hit];
    drag = { x: pt.x, y: pt.y, ox: p.ox, oy: p.oy };
    preview.setPointerCapture(e.pointerId);
    render();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = toCanvas(e);
    const geo = layoutGeometry(state.layout, preview.width, preview.height);
    const rect = geo.panels[selectedPanel];
    const p = state.panels[selectedPanel];
    p.ox = drag.ox + (pt.x - drag.x) / rect.w;
    p.oy = drag.oy + (pt.y - drag.y) / rect.h;
    render();
  });
  preview.addEventListener('pointerup', () => {
    if (drag) { drag = null; pushHistory(); }
  });

  $('export').addEventListener('click', () => exportPng(state.size));
  $('exportAll').addEventListener('click', async () => {
    for (const key of Object.keys(SIZES)) {
      // eslint-disable-next-line no-await-in-loop
      await exportPng(key);
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
}

function syncControls() {
  document.querySelectorAll('#layouts .pill').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades .pill').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes .pill').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('halftone').checked = state.halftone;
  $('frame').checked = state.frame;
  $('badge').checked = state.badge;
  $('heat').value = state.heat;
  $('heatVal').textContent = state.heat;
}

function exportPng(sizeKey) {
  return new Promise((resolve) => {
    const saved = state.size;
    state.size = sizeKey;
    const off = document.createElement('canvas');
    renderCover(off, state);
    state.size = saved;
    render();
    off.toBlob((blob) => {
      if (!blob) { $('status').textContent = 'Export failed — try again.'; resolve(0); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = (state.title || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
      a.href = url;
      a.download = `neon-coast-${slug}-${sizeKey}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      $('status').textContent = `Exported ${sizeKey} PNG (${Math.round(blob.size / 1024)} KB) — share it anywhere.`;
      resolve(blob.size);
    }, 'image/png');
  });
}

// Headless self-test: ?selftest=1 exports a PNG and reports its byte size in the DOM.
async function selfTest() {
  const off = document.createElement('canvas');
  renderCover(off, state);
  const bytes = await new Promise((resolve) => off.toBlob((b) => resolve(b ? b.size : 0), 'image/png'));
  const el = $('selftest');
  el.textContent = `SELFTEST PNG ${state.size} ${bytes} bytes layout=${state.layout} grade=${state.grade} panels=${panelCount()}`;
  document.title = el.textContent;
  window.__selftest = { bytes, size: state.size, layout: state.layout, grade: state.grade };
}

async function init() {
  // Query overrides for screenshots: layout / grade / size / caption.
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('size') && SIZES[params.get('size')]) state.size = params.get('size');
  if (params.get('caption')) { state.title = params.get('caption'); }
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');

  if (SHOT === 'cover') {
    document.body.classList.add('shot-cover');
    const w = Number(params.get('w') || 1920), h = Number(params.get('h') || 1080);
    preview.style.width = '100vw';
    preview.style.height = '100vh';
    preview.dataset.shotW = w; preview.dataset.shotH = h;
  }

  try {
    await Promise.race([
      Promise.all([document.fonts.load('80px Anton'), document.fonts.load('40px Pacifico')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    fontsReady = true;
  } catch (e) { fontsReady = false; }

  bindControls();
  syncControls();
  await loadSamples();
  pushHistory();

  if (SHOT === 'cover') {
    // Full-frame cover: render at the requested size, shown edge to edge.
    const off = document.createElement('canvas');
    const saved = state.size;
    const w = Number(preview.dataset.shotW || 1920), h = Number(preview.dataset.shotH || 1080);
    const key = `${w}x${h}`;
    state.size = SIZES[key] ? key : saved;
    renderCover(off, state);
    state.size = saved;
    preview.width = off.width; preview.height = off.height;
    pctx.drawImage(off, 0, 0);
  }

  if (params.get('selftest') === '1') await selfTest();
  if (SHOT === 'cover') document.title = `Neon Coast cover — ${state.layout} / ${state.grade}`;
}

init();
