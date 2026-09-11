import { clamp, lookup } from './renderer.js';
import bundledStudy from './study.json';

(() => {
  const $ = id => document.getElementById(id);
  let study = null, studyWorker = null;
  const assetBase = new URL(import.meta.env.BASE_URL, document.baseURI);
  const stage = $('stage');
  let active = 0, tool = 'pan', compare = false, toastTimer;
  const views = [];
  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2800);
  }
  function transformText(view) {
    const parts = [];
    if (view.rotation) parts.push(`${view.rotation * 90}° rotation`);
    if (view.flip) parts.push('Flipped horizontally');
    return parts.join(' · ');
  }
  class View {
    constructor(data, index) {
      this.data = data; this.index = index;
      this.pixels = data.pixels;
      this.center = data.center; this.width = data.width; this.invert = false;
      this.rotation = 0; this.flip = false; this.scale = 1; this.panX = 0; this.panY = 0;
      this.fitted = true; this.dirty = true; this.pending = false;
      this.raster = document.createElement('canvas');
      this.raster.width = data.columns; this.raster.height = data.rows;
      this.rasterCtx = this.raster.getContext('2d');
      this.panel = document.createElement('div');
      this.panel.className = 'viewport'; this.panel.tabIndex = 0;
      this.panel.setAttribute('aria-label', `${data.name} projection`);
      this.panel.dataset.tool = tool;
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('role', 'img');
      this.canvas.setAttribute('aria-label', `${data.description}, DICOM image`);
      this.ctx = this.canvas.getContext('2d');
      this.label = document.createElement('div'); this.label.className = 'viewport-label';
      const small = document.createElement('small'); small.textContent = String(index + 1).padStart(2, '0');
      const name = document.createElement('span'); name.textContent = data.name;
      this.label.append(small, name);
      this.side = document.createElement('span'); this.side.className = 'corner-tag'; this.side.textContent = data.laterality;
      this.stats = document.createElement('span'); this.stats.className = 'viewport-stats';
      this.orientation = document.createElement('span'); this.orientation.className = 'orientation';
      this.panel.append(this.canvas, this.label, this.side, this.stats, this.orientation);
      this.panel.hidden = index !== active;
      stage.append(this.panel);
      this.resizeObserver = new ResizeObserver(() => { if (this.fitted) this.fit(false); this.requestDraw(); });
      this.resizeObserver.observe(this.panel);
      this.panel.addEventListener('focus', () => select(index));
      this.bindGestures();
    }
    fit(draw = true) {
      const rect = this.panel.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const w = this.rotation % 2 ? this.data.rows : this.data.columns;
      const h = this.rotation % 2 ? this.data.columns : this.data.rows;
      this.scale = Math.min(Math.max(20, rect.width - 46) / w, Math.max(20, rect.height - 84) / h);
      this.panX = 0; this.panY = 0; this.fitted = true;
      if (draw) this.requestDraw();
    }
    rasterize() {
      if (!this.dirty) return;
      const table = lookup(this.center, this.width, this.invert !== this.data.baseInvert, this.data.slope, this.data.intercept);
      const image = this.rasterCtx.createImageData(this.data.columns, this.data.rows);
      for (let n = 0, offset = 0; n < this.pixels.length; n++, offset += 4) {
        const g = table[this.pixels[n]];
        image.data[offset] = g; image.data[offset + 1] = g; image.data[offset + 2] = g; image.data[offset + 3] = 255;
      }
      this.rasterCtx.putImageData(image, 0, 0); this.dirty = false;
    }
    requestDraw() {
      if (this.pending) return;
      this.pending = true;
      requestAnimationFrame(() => { this.pending = false; this.draw(); });
    }
    draw() {
      if (this.panel.hidden) return;
      const rect = this.panel.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      const w = this.panel.clientWidth, h = this.panel.clientHeight;
      if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
        this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      }
      this.rasterize();
      const ctx = this.ctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#151517'; ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2 + this.panX, h / 2 + this.panY);
      ctx.scale(this.scale * (this.flip ? -1 : 1), this.scale);
      ctx.rotate(this.rotation * Math.PI / 2);
      ctx.imageSmoothingEnabled = this.scale < 2;
      ctx.drawImage(this.raster, -this.data.columns / 2, -this.data.rows / 2);
      this.stats.textContent = `W ${Math.round(this.width)}  L ${Math.round(this.center)}  ·  ${Math.round(this.scale * 100)}%`;
      this.orientation.textContent = transformText(this);
      if (this.index === active) $('zoom-actual').textContent = `${Math.round(this.scale * 100)}%`;
    }
    zoom(factor, x, y) {
      const old = this.scale;
      this.scale = clamp(old * factor, 0.025, 8);
      const ratio = this.scale / old;
      const cx = this.panel.clientWidth / 2, cy = this.panel.clientHeight / 2;
      x = x ?? cx; y = y ?? cy;
      this.panX = x - cx - (x - cx - this.panX) * ratio;
      this.panY = y - cy - (y - cy - this.panY) * ratio;
      this.fitted = false; this.requestDraw();
    }
    setWindow(center, width) {
      this.center = clamp(center, this.data.centerMin, this.data.centerMax); this.width = clamp(width, 1, this.data.widthMax);
      this.dirty = true; syncControls(); this.requestDraw();
    }
    reset() {
      this.center = this.data.center; this.width = this.data.width; this.invert = false;
      this.rotation = 0; this.flip = false; this.dirty = true;
      this.fit(); syncControls();
    }
    bindGestures() {
      const pointers = new Map();
      this.panel.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        select(this.index); this.panel.focus({ preventScroll: true });
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.panel.setPointerCapture(event.pointerId); this.panel.classList.add('dragging');
      });
      this.panel.addEventListener('pointermove', event => {
        const old = pointers.get(event.pointerId);
        if (!old) return;
        if (pointers.size === 2) {
          const before = [...pointers.values()];
          const oldDistance = Math.hypot(before[0].x - before[1].x, before[0].y - before[1].y);
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const after = [...pointers.values()];
          const distance = Math.hypot(after[0].x - after[1].x, after[0].y - after[1].y);
          const r = this.panel.getBoundingClientRect();
          if (oldDistance > 0) this.zoom(distance / oldDistance, (after[0].x + after[1].x) / 2 - r.left, (after[0].y + after[1].y) / 2 - r.top);
        } else {
          const dx = event.clientX - old.x, dy = event.clientY - old.y;
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (tool === 'window') this.setWindow(this.center + dy * (this.data.centerMax - this.data.centerMin) / 800, this.width + dx * this.data.widthMax / 800);
          else { this.panX += dx; this.panY += dy; this.fitted = false; this.requestDraw(); }
        }
      });
      const end = event => { pointers.delete(event.pointerId); if (!pointers.size) this.panel.classList.remove('dragging'); };
      this.panel.addEventListener('pointerup', end);
      this.panel.addEventListener('pointercancel', end);
      this.panel.addEventListener('lostpointercapture', end);
      this.panel.addEventListener('wheel', event => {
        event.preventDefault(); select(this.index);
        const rect = this.panel.getBoundingClientRect();
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.panel.clientHeight : 1);
        this.zoom(Math.exp(-clamp(delta, -300, 300) * .002), event.clientX - rect.left, event.clientY - rect.top);
      }, { passive: false });
      this.panel.addEventListener('dblclick', () => this.fit());
    }
  }
  function setPressed(id, pressed) { $(id).classList.toggle('active', pressed); $(id).setAttribute('aria-pressed', String(pressed)); }
  function syncControls() {
    const view = views[active]; if (!view) return;
    $('selected-name').textContent = view.data.name;
    $('image-description').textContent = study.title;
    $('laterality').textContent = view.data.laterality;
    $('laterality').hidden = !view.data.laterality;
    $('center').min = view.data.centerMin; $('center').max = view.data.centerMax;
    $('center').step = 'any'; $('width').step = 'any'; $('width').max = view.data.widthMax;
    $('resolution').textContent = `${view.data.columns} × ${view.data.rows}`;
    $('bit-depth').textContent = `${view.data.bits}-bit DICOM`;
    $('center').value = Math.round(view.center); $('width').value = Math.round(view.width);
    for (const id of ['center', 'width']) {
      const input = $(id);
      input.style.setProperty('--fill', `${100 * (input.value - input.min) / (input.max - input.min)}%`);
    }
    $('center-value').textContent = Math.round(view.center); $('width-value').textContent = Math.round(view.width);
    setPressed('invert', view.invert); setPressed('flip', view.flip);
    const close = (a, b) => Math.abs(a - b) < 1;
    setPressed('original-preset', close(view.center, view.data.center) && close(view.width, view.data.width));
    setPressed('auto-preset', close(view.center, view.data.autoCenter) && close(view.width, view.data.autoWidth));
    $('transform-status').textContent = transformText(view) || 'Original orientation';
    $('zoom-actual').textContent = `${Math.round(view.scale * 100)}%`;
  }
  function select(index) {
    if (!views.length) return;
    active = (index + views.length) % views.length;
    views.forEach((view, n) => {
      const chosen = n === active;
      view.panel.hidden = compare ? Math.floor(n / 4) !== Math.floor(active / 4) : !chosen;
      view.panel.classList.toggle('selected', chosen);
      view.card.classList.toggle('active', chosen);
      view.card.setAttribute('aria-pressed', String(chosen));
      if (!view.panel.hidden) view.requestDraw();
    });
    syncControls();
  }
  function setLayout(value) {
    compare = value; stage.classList.toggle('compare', compare);
    setPressed('single-layout', !compare); setPressed('compare-layout', compare);
    views.forEach(view => { view.fitted = true; });
    select(active);
    views.forEach(view => { view.fit(); });
  }
  function setTool(value) {
    tool = value;
    setPressed('pan-tool', tool === 'pan'); setPressed('window-tool', tool === 'window');
    views.forEach(view => view.panel.dataset.tool = tool);
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function showStudy(nextStudy) {
    for (const view of views) view.resizeObserver.disconnect();
    views.length = 0; active = 0; compare = false; study = nextStudy;
    stage.replaceChildren(); $('image-list').replaceChildren();
    stage.classList.remove('compare'); setPressed('single-layout', true); setPressed('compare-layout', false);
    setLoadedControls(true);
    document.title = `${study.title} — Filmroom`;
    $('study-title').textContent = study.title;
    $('study-date').textContent = formatDate(study.date);
    $('image-count').textContent = study.images.length;
    study.images.forEach((data, index) => {
      const view = new View(data, index); views.push(view);
      const card = document.createElement('button'); card.className = 'image-card';
      card.setAttribute('aria-label', `View ${index + 1}: ${data.name}`);
      const thumbnail = document.createElement('div'); thumbnail.className = 'thumbnail';
      const img = new Image(); img.alt = '';
      view.rasterize();
      const thumb = document.createElement('canvas');
      const ratio = Math.min(100 / data.columns, 120 / data.rows);
      thumb.width = Math.max(1, Math.round(data.columns * ratio)); thumb.height = Math.max(1, Math.round(data.rows * ratio));
      thumb.getContext('2d').drawImage(view.raster, 0, 0, thumb.width, thumb.height);
      img.src = thumb.toDataURL('image/png');
      const number = document.createElement('span'); number.className = 'image-number'; number.textContent = String(index + 1).padStart(2, '0');
      const dot = document.createElement('i'); dot.className = 'selected-dot';
      thumbnail.append(img, number, dot);
      const label = document.createElement('div'); label.className = 'image-card-label';
      const name = document.createElement('span'); name.textContent = data.name;
      const meta = document.createElement('small'); meta.textContent = `${data.columns} × ${data.rows}`; label.append(name, meta);
      card.append(thumbnail, label); card.addEventListener('click', () => select(index));
      $('image-list').append(card); view.card = card;
    });
    select(0); views[0].fit();
    setTool('pan');
  }
  $('center').addEventListener('input', event => views[active].setWindow(Number(event.target.value), views[active].width));
  $('width').addEventListener('input', event => views[active].setWindow(views[active].center, Number(event.target.value)));
  $('original-preset').addEventListener('click', () => { const view = views[active]; view.setWindow(view.data.center, view.data.width); });
  $('auto-preset').addEventListener('click', () => { const view = views[active]; view.setWindow(view.data.autoCenter, view.data.autoWidth); });
  $('pan-tool').addEventListener('click', () => setTool('pan'));
  $('window-tool').addEventListener('click', () => setTool('window'));
  $('single-layout').addEventListener('click', () => setLayout(false));
  $('compare-layout').addEventListener('click', () => setLayout(true));
  for (const [button, panel, className] of [
    ['toggle-sidebar', 'study-sidebar', 'sidebar-hidden'],
    ['toggle-inspector', 'image-inspector', 'inspector-hidden']
  ]) {
    $(button).addEventListener('click', () => {
      const hidden = document.body.classList.toggle(className);
      $(panel).hidden = hidden;
      $(button).setAttribute('aria-pressed', String(!hidden));
      views.forEach(view => { if (view.fitted) view.fit(); view.requestDraw(); });
    });
  }
  $('zoom-in').addEventListener('click', () => views[active].zoom(1.25));
  $('zoom-out').addEventListener('click', () => views[active].zoom(.8));
  $('zoom-actual').addEventListener('click', () => views[active].zoom(1 / views[active].scale));
  $('fit').addEventListener('click', () => views[active].fit());
  $('reset').addEventListener('click', () => { views[active].reset(); toast('Selected image reset'); });
  $('rotate').addEventListener('click', () => { const view = views[active]; view.rotation = (view.rotation + 1) % 4; view.fit(); syncControls(); });
  $('flip').addEventListener('click', () => { const view = views[active]; view.flip = !view.flip; view.requestDraw(); syncControls(); });
  $('invert').addEventListener('click', () => { const view = views[active]; view.invert = !view.invert; view.dirty = true; view.requestDraw(); syncControls(); });
  $('export-png').addEventListener('click', () => {
    const view = views[active]; view.rasterize();
    const output = document.createElement('canvas');
    output.width = view.rotation % 2 ? view.data.rows : view.data.columns;
    output.height = view.rotation % 2 ? view.data.columns : view.data.rows;
    const ctx = output.getContext('2d'); ctx.translate(output.width / 2, output.height / 2);
    ctx.scale(view.flip ? -1 : 1, 1); ctx.rotate(view.rotation * Math.PI / 2);
    ctx.drawImage(view.raster, -view.data.columns / 2, -view.data.rows / 2);
    output.toBlob(blob => {
      if (!blob) { toast('Export failed. Try again.'); return; }
      download(blob, `right-shoulder-${view.data.name.toLowerCase().replaceAll(" ", "-")}.png`);
      toast(`PNG exported · ${output.width} × ${output.height}`);
    }, 'image/png');
  });
  $('export-dicom').addEventListener('click', async () => {
    const button = $('export-dicom'); button.disabled = true;
    toast('Preparing original DICOM archive…');
    try {
      const response = await fetch(new URL(bundledStudy.archive.file, assetBase));
      if (!response.ok) throw new Error('Archive unavailable');
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
      if (hash !== bundledStudy.archive.sha256) throw new Error('Archive checksum mismatch');
      download(new Blob([bytes], { type: 'application/zip' }), bundledStudy.archive.name);
      toast('Original DICOM archive exported');
    } catch {
      toast('The original archive could not be downloaded. Please try again.');
    } finally { button.disabled = false; }
  });
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  $('close-help').addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
  document.addEventListener('keydown', event => {
    if (!views.length || event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input,textarea,select') || $('help-dialog').open) return;
    const key = event.key.toLowerCase();
    const actions = { 'v': () => setTool('pan'), 'w': () => setTool('window'), 'f': () => views[active].fit(),
      'r': () => $('reset').click(), 'i': () => $('invert').click(), 'c': () => setLayout(!compare),
      '+': () => views[active].zoom(1.25), '=': () => views[active].zoom(1.25), '-': () => views[active].zoom(.8),
      'arrowright': () => select(active + 1), 'arrowleft': () => select(active - 1),
    };
    if (/^[1-9]$/.test(key) && Number(key) <= views.length) actions[key] = () => select(Number(key) - 1);
    if (actions[key]) { event.preventDefault(); actions[key](); }
  });
  function formatDate(date) {
    return new Date(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8))).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function setLoadedControls(enabled) {
    document.querySelectorAll('.toolbar button, .display-settings button, .display-settings input, #export-png').forEach(control => control.disabled = !enabled);
  }
  function finishLoading() { studyWorker?.terminate(); studyWorker = null; }
  function showLoadError(message) {
    finishLoading();
    $('load-title').textContent = 'Couldn’t open the study';
    $('load-message').textContent = message;
    $('retry-study').hidden = false;
  }
  function openBundledStudy() {
    if (studyWorker) return;
    $('retry-study').hidden = true;
    $('load-title').textContent = 'Opening your study';
    $('load-message').textContent = 'Loading four original projections…';
    studyWorker = new Worker(new URL('./study.worker.js', import.meta.url), { type: 'module' });
    studyWorker.onmessage = ({ data }) => {
      if (data.type === 'progress') $('load-message').textContent = data.message;
      else if (data.type === 'error') showLoadError(data.message);
      else if (data.type === 'study') { finishLoading(); showStudy(data.study); }
    };
    studyWorker.onerror = () => showLoadError('The image decoder could not start. Please try again.');
    studyWorker.postMessage({ baseUrl: assetBase.href });
  }
  document.title = `${bundledStudy.title} — Filmroom`;
  $('study-title').textContent = bundledStudy.title;
  $('study-date').textContent = formatDate(bundledStudy.date);
  $('image-count').textContent = bundledStudy.images.length;
  $('retry-study').addEventListener('click', openBundledStudy);
  setLoadedControls(false);
  openBundledStudy();
})();
