import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SNAP = 0.5;

export default class Editor {
  constructor({ scene, camera, renderer, onFreezeAgents }) {
    this.scene          = scene;
    this.camera         = camera;
    this.renderer       = renderer;
    this.onFreezeAgents = onFreezeAgents;

    this.active         = false;
    this.placedObjects  = [];
    this.selectedMesh   = null;
    this.pendingAsset   = null;
    this.snapEnabled    = true;
    this.transformMode  = 'translate';
    this.loader         = new GLTFLoader();
    this.thumbCache     = {};
    this.raycaster      = new THREE.Raycaster();
    this.mouse          = new THREE.Vector2();

    // Invisible floor for raycasting
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    this.floor.rotation.x = -Math.PI / 2;
    scene.add(this.floor);

    // Ghost preview
    this.ghost = new THREE.Group();
    scene.add(this.ghost);

    // Transform gizmo
    this.tc = new TransformControls(camera, renderer.domElement);
    this.tc.setSize(0.75);
    this.tc.visible = false;
    scene.add(this.tc);

    // Suppress orbit while dragging gizmo
    this.tc.addEventListener('dragging-changed', e => {
      this.orbit.enabled = !e.value;
    });

    // Orbit (edit mode only)
    this.orbit = new OrbitControls(camera, renderer.domElement);
    this.orbit.enabled = false;
    this.orbit.target.set(0, 0, -1);
    this.orbit.maxPolarAngle = Math.PI / 2.1;
    this.orbit.minDistance = 5;
    this.orbit.maxDistance = 40;
    this.orbit.update();

    this.buildUI();
    this.bindEvents();
    this.loadLayout();
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  buildUI() {
    const style = document.createElement('style');
    style.textContent = `
      #edit-toggle {
        position: fixed; top: 4px; right: 56px;
        background: #1e2a44; border: 1px solid #2a3a5a;
        color: #aab; font: 11px monospace; padding: 4px 12px;
        border-radius: 4px; cursor: pointer; z-index: 100;
        transition: all .2s;
      }
      #edit-toggle.active { background: #6c63ff; border-color: #9990ff; color: #fff; }

      #asset-panel {
        position: fixed; left: 0; top: 32px; bottom: 0;
        width: 220px; background: rgba(8,11,20,0.95);
        border-right: 1px solid #1a2040;
        display: none; flex-direction: column;
        z-index: 90; overflow: hidden;
      }
      #asset-panel.open { display: flex; }
      #asset-panel h3 {
        margin: 0; padding: 10px 12px;
        font: bold 11px monospace; color: #6c63ff;
        border-bottom: 1px solid #1a2040; letter-spacing: 2px;
      }
      #asset-list {
        flex: 1; overflow-y: auto; padding: 8px;
        display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
      }
      #asset-list::-webkit-scrollbar { width: 4px; }
      #asset-list::-webkit-scrollbar-thumb { background: #2a3a5a; }
      .asset-item {
        background: #111828; border: 1px solid #1e2a44;
        border-radius: 6px; padding: 6px; cursor: pointer;
        transition: all .15s; text-align: center;
      }
      .asset-item:hover { border-color: #6c63ff; background: #1a1f35; }
      .asset-item.selected { border-color: #6c63ff; background: #1e1a40; box-shadow: 0 0 8px #6c63ff44; }
      .asset-item canvas { display: block; margin: 0 auto 4px; border-radius: 3px; }
      .asset-item span { font: 9px monospace; color: #778; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      #asset-empty { color: #446; font: 11px monospace; text-align: center; padding: 20px 10px; grid-column: 1/-1; }

      #editor-toolbar {
        position: fixed; bottom: 0; left: 0; right: 0;
        height: 44px; background: rgba(8,11,20,0.95);
        border-top: 1px solid #1a2040;
        display: none; align-items: center; gap: 8px;
        padding: 0 12px; z-index: 90;
      }
      #editor-toolbar.open { display: flex; }
      .tb-btn {
        background: #111828; border: 1px solid #1e2a44;
        color: #778; font: 11px monospace; padding: 4px 10px;
        border-radius: 4px; cursor: pointer; transition: all .15s;
      }
      .tb-btn:hover { border-color: #4455aa; color: #aab; }
      .tb-btn.active { background: #1e2a55; border-color: #6c63ff; color: #9990ff; }
      .tb-sep { width: 1px; height: 24px; background: #1a2040; margin: 0 4px; }
      #tb-status { margin-left: auto; font: 10px monospace; color: #445; }
      #tb-save { margin-left: 4px; background: #1a3520; border-color: #2a6040; color: #4ca; }
      #tb-save:hover { background: #1f4028; border-color: #3a8058; }

      #placement-hint {
        position: fixed; bottom: 52px; left: 50%; transform: translateX(-50%);
        background: rgba(108,99,255,0.15); border: 1px solid #6c63ff44;
        color: #9990ff; font: 11px monospace; padding: 6px 16px;
        border-radius: 4px; display: none; pointer-events: none; z-index: 91;
      }
      #placement-hint.show { display: block; }

      body.edit-mode { cursor: default; }
      body.placing { cursor: crosshair; }
    `;
    document.head.appendChild(style);

    // Toggle button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.id = 'edit-toggle';
    this.toggleBtn.textContent = '✏ Editar';
    this.toggleBtn.onclick = () => this.toggle();
    document.body.appendChild(this.toggleBtn);

    // Asset panel
    this.panel = document.createElement('div');
    this.panel.id = 'asset-panel';
    this.panel.innerHTML = '<h3>ASSETS</h3><div id="asset-list"></div>';
    document.body.appendChild(this.panel);

    // Toolbar
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'editor-toolbar';
    this.toolbar.innerHTML = `
      <button class="tb-btn active" id="tb-translate" title="Mover (G)">↔ Mover</button>
      <button class="tb-btn" id="tb-rotate"    title="Rotacionar (R)">↻ Rotacionar</button>
      <button class="tb-btn" id="tb-scale"     title="Escalar (S)">⤢ Escalar</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" id="tb-snap"      title="Grid Snap">⊞ Snap: ON</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" id="tb-delete"    title="Deletar (Del)" style="color:#e66">✕ Deletar</button>
      <span id="tb-status">Nenhum objeto selecionado</span>
      <button class="tb-btn" id="tb-save">💾 Salvar layout</button>
    `;
    document.body.appendChild(this.toolbar);

    // Placement hint
    this.hint = document.createElement('div');
    this.hint.id = 'placement-hint';
    this.hint.textContent = 'Clique no cenário para posicionar • ESC para cancelar';
    document.body.appendChild(this.hint);

    // Toolbar button events
    document.getElementById('tb-translate').onclick = () => this.setTransformMode('translate');
    document.getElementById('tb-rotate').onclick    = () => this.setTransformMode('rotate');
    document.getElementById('tb-scale').onclick     = () => this.setTransformMode('scale');
    document.getElementById('tb-snap').onclick      = () => this.toggleSnap();
    document.getElementById('tb-delete').onclick    = () => this.deleteSelected();
    document.getElementById('tb-save').onclick      = () => this.saveLayout();
  }

  // ─── Toggle ────────────────────────────────────────────────────────────────

  toggle() {
    this.active = !this.active;
    this.toggleBtn.classList.toggle('active', this.active);
    this.panel.classList.toggle('open', this.active);
    this.toolbar.classList.toggle('open', this.active);
    document.body.classList.toggle('edit-mode', this.active);

    this.orbit.enabled = this.active;
    this.onFreezeAgents?.(this.active);

    if (this.active) {
      this.loadAssets();
      this.deselect();
    } else {
      this.cancelPlacement();
      this.deselect();
    }
  }

  // ─── Assets ────────────────────────────────────────────────────────────────

  async loadAssets() {
    const list = document.getElementById('asset-list');
    list.innerHTML = '<div id="asset-empty">Carregando...</div>';

    let assets = [];
    try {
      const res = await fetch('/api/assets');
      assets = await res.json();
    } catch (_) {}

    list.innerHTML = '';

    if (!assets.length) {
      list.innerHTML = '<div id="asset-empty">Nenhum asset em<br>/assets/*.glb</div>';
      return;
    }

    for (const asset of assets) {
      const item = document.createElement('div');
      item.className = 'asset-item';
      item.dataset.url = asset.url;
      item.dataset.name = asset.name;

      const thumbCanvas = await this.renderThumbnail(asset.url);
      item.appendChild(thumbCanvas);

      const label = document.createElement('span');
      label.textContent = asset.name;
      label.title = asset.file;
      item.appendChild(label);

      item.onclick = () => this.selectAsset(item);
      list.appendChild(item);
    }
  }

  async renderThumbnail(url) {
    if (this.thumbCache[url]) return this.thumbCache[url].cloneNode();

    const canvas = document.createElement('canvas');
    canvas.width = 80; canvas.height = 80;

    try {
      const tr = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      tr.setSize(80, 80);
      tr.setClearColor(0x111828, 1);

      const ts = new THREE.Scene();
      ts.add(new THREE.AmbientLight(0xffffff, 1.5));
      const dl = new THREE.DirectionalLight(0xffffff, 2);
      dl.position.set(3, 5, 3);
      ts.add(dl);

      const tc = new THREE.PerspectiveCamera(45, 1, 0.01, 100);

      const gltf = await new Promise(r => this.loader.load(url, r, undefined, () => r(null)));
      if (gltf) {
        const model = gltf.scene.clone();
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.4 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += size.y * scale * 0.5;
        ts.add(model);

        tc.position.set(maxDim * scale * 1.8, maxDim * scale * 1.4, maxDim * scale * 1.8);
        tc.lookAt(0, size.y * scale * 0.4, 0);
      } else {
        // Fallback cube
        ts.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: 0x6c63ff })));
        tc.position.set(2, 1.5, 2);
        tc.lookAt(0, 0, 0);
      }

      tr.render(ts, tc);
      tr.dispose();
    } catch (_) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#111828';
      ctx.fillRect(0, 0, 80, 80);
      ctx.fillStyle = '#6c63ff';
      ctx.font = '28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('📦', 40, 50);
    }

    this.thumbCache[url] = canvas;
    return canvas.cloneNode();
  }

  selectAsset(item) {
    document.querySelectorAll('.asset-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    this.pendingAsset = { url: item.dataset.url, name: item.dataset.name };
    this.deselect();
    document.body.classList.add('placing');
    this.hint.classList.add('show');
    this.loadGhost(item.dataset.url);
  }

  async loadGhost(url) {
    this.ghost.clear();
    const gltf = await new Promise(r => this.loader.load(url, r, undefined, () => r(null)));
    if (!gltf) return;
    const model = gltf.scene.clone();
    model.traverse(c => {
      if (c.isMesh) {
        c.material = c.material.clone();
        c.material.transparent = true;
        c.material.opacity = 0.5;
      }
    });
    this.ghost.add(model);
  }

  cancelPlacement() {
    this.pendingAsset = null;
    this.ghost.clear();
    document.body.classList.remove('placing');
    this.hint.classList.remove('show');
    document.querySelectorAll('.asset-item').forEach(i => i.classList.remove('selected'));
  }

  // ─── Placement ─────────────────────────────────────────────────────────────

  async placeObject(point) {
    if (!this.pendingAsset) return;

    const snapped = this.snapEnabled
      ? new THREE.Vector3(
          Math.round(point.x / SNAP) * SNAP,
          0,
          Math.round(point.z / SNAP) * SNAP
        )
      : new THREE.Vector3(point.x, 0, point.z);

    const { url, name } = this.pendingAsset;

    const group = new THREE.Group();
    group.position.copy(snapped);
    group.userData = { type: 'placed', asset: url, name };

    const gltf = await new Promise(r => this.loader.load(url, r, undefined, () => r(null)));
    if (gltf) {
      const model = gltf.scene.clone();
      model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      group.add(model);
    } else {
      group.add(new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x6c63ff })
      ));
    }

    this.scene.add(group);
    this.placedObjects.push(group);
    this.selectMesh(group);
    this.cancelPlacement();
    this.setStatus(`Posicionado: ${name}`);
  }

  // ─── Selection ─────────────────────────────────────────────────────────────

  selectMesh(mesh) {
    this.deselect();
    this.selectedMesh = mesh;
    this.tc.attach(mesh);
    this.tc.visible = true;
    this.tc.setMode(this.transformMode);
    this.setStatus(mesh.userData.name || 'Objeto');
  }

  deselect() {
    this.selectedMesh = null;
    this.tc.detach();
    this.tc.visible = false;
    this.setStatus('Nenhum objeto selecionado');
  }

  deleteSelected() {
    if (!this.selectedMesh) return;
    this.tc.detach();
    this.scene.remove(this.selectedMesh);
    this.placedObjects = this.placedObjects.filter(o => o !== this.selectedMesh);
    this.selectedMesh = null;
    this.tc.visible = false;
    this.setStatus('Objeto removido');
  }

  // ─── Transform mode ────────────────────────────────────────────────────────

  setTransformMode(mode) {
    this.transformMode = mode;
    this.tc.setMode(mode);
    ['translate', 'rotate', 'scale'].forEach(m => {
      document.getElementById(`tb-${m}`)?.classList.toggle('active', m === mode);
    });
  }

  toggleSnap() {
    this.snapEnabled = !this.snapEnabled;
    const btn = document.getElementById('tb-snap');
    if (btn) btn.textContent = `⊞ Snap: ${this.snapEnabled ? 'ON' : 'OFF'}`;
  }

  setStatus(msg) {
    const el = document.getElementById('tb-status');
    if (el) el.textContent = msg;
  }

  // ─── Save / Load ───────────────────────────────────────────────────────────

  async saveLayout() {
    const objects = this.placedObjects.map(o => ({
      asset: o.userData.asset,
      name:  o.userData.name,
      position: o.position.toArray(),
      rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
      scale:    o.scale.toArray()
    }));

    try {
      await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 1, objects })
      });
      this.setStatus(`✓ Salvo — ${objects.length} objeto(s)`);
      setTimeout(() => this.setStatus('Nenhum objeto selecionado'), 2000);
    } catch (e) {
      this.setStatus('Erro ao salvar');
    }
  }

  async loadLayout() {
    try {
      const data = await (await fetch('/api/layout')).json();
      for (const obj of (data.objects || [])) {
        await this.restoreObject(obj);
      }
    } catch (_) {}
  }

  async restoreObject(obj) {
    const group = new THREE.Group();
    group.position.fromArray(obj.position);
    group.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
    group.scale.fromArray(obj.scale);
    group.userData = { type: 'placed', asset: obj.asset, name: obj.name };

    const gltf = await new Promise(r => this.loader.load(obj.asset, r, undefined, () => r(null)));
    if (gltf) {
      const model = gltf.scene.clone();
      model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      group.add(model);
    } else {
      group.add(new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x6c63ff })
      ));
    }

    this.scene.add(group);
    this.placedObjects.push(group);
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  bindEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', e => {
      if (!this.active) return;
      const rect = canvas.getBoundingClientRect();
      this.mouse.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      if (this.pendingAsset && this.ghost.children.length) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObject(this.floor);
        if (hits.length) {
          const p = hits[0].point;
          if (this.snapEnabled) {
            this.ghost.position.set(
              Math.round(p.x / SNAP) * SNAP, 0,
              Math.round(p.z / SNAP) * SNAP
            );
          } else {
            this.ghost.position.set(p.x, 0, p.z);
          }
        }
      }
    });

    canvas.addEventListener('click', e => {
      if (!this.active || this.tc.dragging) return;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      if (this.pendingAsset) {
        const hits = this.raycaster.intersectObject(this.floor);
        if (hits.length) this.placeObject(hits[0].point);
        return;
      }

      // Try selecting a placed object
      const meshes = this.placedObjects.flatMap(g => {
        const kids = [];
        g.traverse(c => { if (c.isMesh) kids.push(c); });
        return kids;
      });
      const hits = this.raycaster.intersectObjects(meshes, true);
      if (hits.length) {
        let obj = hits[0].object;
        while (obj.parent && !obj.userData.type) obj = obj.parent;
        this.selectMesh(obj.userData.type === 'placed' ? obj : hits[0].object.parent || obj);
      } else {
        this.deselect();
      }
    });

    window.addEventListener('keydown', e => {
      if (!this.active) return;
      if (e.key === 'Escape')  { this.pendingAsset ? this.cancelPlacement() : this.deselect(); }
      if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
      if (e.key === 'g' || e.key === 'G') this.setTransformMode('translate');
      if (e.key === 'r' || e.key === 'R') this.setTransformMode('rotate');
      if (e.key === 's' || e.key === 'S') this.setTransformMode('scale');
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); this.saveLayout(); }
    });
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update() {
    if (this.active) this.orbit.update();
  }
}
