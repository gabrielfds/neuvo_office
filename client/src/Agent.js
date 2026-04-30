import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ZONES, ALL_DESK_SPOTS } from './office.js';

const loader = new GLTFLoader();

const COLORS = {
  jarbas:  { body: 0x6c63ff, skin: 0xffd5a8, hair: 0x2a1a55 },
  agent2:  { body: 0x00b4d8, skin: 0xffd5a8, hair: 0x1a2a3a },
  agent3:  { body: 0xff6b9d, skin: 0xffd5a8, hair: 0x2a1a1a },
  default: { body: 0x44cc88, skin: 0xffd5a8, hair: 0x1a2a1a }
};

// Where each agent goes by default when idle
const IDLE_ZONE = {
  jarbas: () => randomAround(pickRandom(ZONES.WANDER), 0.5)
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAround(pos, radius) {
  return new THREE.Vector3(
    pos.x + (Math.random() - 0.5) * radius,
    0,
    pos.z + (Math.random() - 0.5) * radius
  );
}

export default class Agent {
  constructor(data, scene) {
    this.id    = data.id;
    this.name  = data.name;
    this.state = data.state || 'idle';
    this.scene = scene;

    this.group = new THREE.Group();
    this.mixer = null;
    this.clips = {};
    this.speed = 2.4;
    this.isMoving   = false;
    this.moveDelay  = 1.5 + Math.random() * 4;
    this.targetPos  = new THREE.Vector3();

    // Start at random desk
    const start = pickRandom(ALL_DESK_SPOTS);
    this.group.position.set(
      start.x + (Math.random() - 0.5) * 0.4,
      0,
      start.z + (Math.random() - 0.5) * 0.4
    );
    this.targetPos.copy(this.group.position);

    this.buildPlaceholder();
    this.buildLabel();
    scene.add(this.group);
    this.tryLoadGLTF();
  }

  // ─── Placeholder character ────────────────────────────────────────────────

  buildPlaceholder() {
    const c = COLORS[this.id] || COLORS.default;
    const bodyMat = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.7, flatShading: true });
    const skinMat = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.8, flatShading: true });
    const hairMat = new THREE.MeshStandardMaterial({ color: c.hair, roughness: 0.9, flatShading: true });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0d1117 });
    const eyeMat  = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const shineMat= new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });

    this.ph = new THREE.Group();

    // Legs
    this.legL = this.addMesh(this.ph, new THREE.BoxGeometry(0.15, 0.38, 0.15), bodyMat.clone(), -0.1, 0.19, 0);
    this.legR = this.addMesh(this.ph, new THREE.BoxGeometry(0.15, 0.38, 0.15), bodyMat.clone(),  0.1, 0.19, 0);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.14, 0.07, 0.2);
    this.addMesh(this.ph, footGeo, hairMat.clone(), -0.1, 0.04,  0.04);
    this.addMesh(this.ph, footGeo, hairMat.clone(),  0.1, 0.04,  0.04);

    // Body
    this.addMesh(this.ph, new THREE.BoxGeometry(0.38, 0.46, 0.26), bodyMat, 0, 0.65, 0);

    // Collar
    this.addMesh(this.ph, new THREE.BoxGeometry(0.12, 0.12, 0.27), skinMat.clone(), 0, 0.86, 0);

    // Arms
    this.armL = this.addMesh(this.ph, new THREE.BoxGeometry(0.13, 0.36, 0.13), bodyMat.clone(), -0.26, 0.64, 0);
    this.armR = this.addMesh(this.ph, new THREE.BoxGeometry(0.13, 0.36, 0.13), bodyMat.clone(),  0.26, 0.64, 0);

    // Hands
    const handGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    this.addMesh(this.ph, handGeo, skinMat.clone(), -0.26, 0.44, 0);
    this.addMesh(this.ph, handGeo, skinMat.clone(),  0.26, 0.44, 0);

    // Head
    this.addMesh(this.ph, new THREE.BoxGeometry(0.36, 0.36, 0.32), skinMat, 0, 1.12, 0);

    // Hair
    this.addMesh(this.ph, new THREE.BoxGeometry(0.38, 0.18, 0.34), hairMat, 0, 1.27, 0);
    this.addMesh(this.ph, new THREE.BoxGeometry(0.36, 0.32, 0.06), hairMat.clone(), 0, 1.14, -0.17);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.09, 0.09, 0.04);
    this.addMesh(this.ph, eyeGeo, eyeMat,  -0.1, 1.12, 0.16);
    this.addMesh(this.ph, eyeGeo, eyeMat,   0.1, 1.12, 0.16);
    this.addMesh(this.ph, new THREE.BoxGeometry(0.045, 0.045, 0.04), darkMat, -0.1, 1.12, 0.18);
    this.addMesh(this.ph, new THREE.BoxGeometry(0.045, 0.045, 0.04), darkMat,  0.1, 1.12, 0.18);
    this.addMesh(this.ph, new THREE.BoxGeometry(0.02, 0.02, 0.02), shineMat, -0.07, 1.14, 0.19);
    this.addMesh(this.ph, new THREE.BoxGeometry(0.02, 0.02, 0.02), shineMat,  0.13, 1.14, 0.19);

    // Shadow
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    this.ph.add(shadow);

    this.group.add(this.ph);
  }

  addMesh(parent, geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  // ─── Label ────────────────────────────────────────────────────────────────

  buildLabel() {
    const c = COLORS[this.id] || COLORS.default;
    const hex = '#' + c.body.toString(16).padStart(6, '0');

    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 56;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(8,11,20,0.88)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 56, 10);
    ctx.fill();

    ctx.fillStyle = hex;
    ctx.fillRect(0, 48, 256, 8);

    ctx.fillStyle = '#dde';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.name, 128, 26);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    this.labelSprite = new THREE.Sprite(mat);
    this.labelSprite.scale.set(1.0, 0.22, 1);
    this.labelSprite.position.y = 1.75;
    this.group.add(this.labelSprite);

    this.rebuildDot();
  }

  rebuildDot() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const color = this.state === 'working' ? '#ffaa00' : '#00ff88';
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(16, 16, 9, 0, Math.PI * 2); ctx.fill();

    if (this.dotSprite) this.group.remove(this.dotSprite);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    this.dotSprite = new THREE.Sprite(mat);
    this.dotSprite.scale.set(0.18, 0.18, 1);
    this.dotSprite.position.set(0.5, 1.78, 0);
    this.group.add(this.dotSprite);
  }

  // ─── GLTF ────────────────────────────────────────────────────────────────

  async tryLoadGLTF() {
    const gltf = await new Promise(r =>
      loader.load('/assets/character.glb', r, undefined, () => r(null))
    );
    if (!gltf) return;

    this.group.remove(this.ph);
    const model = gltf.scene;
    model.scale.setScalar(0.9);
    model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    this.group.add(model);

    if (gltf.animations?.length) {
      this.mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(clip => {
        this.clips[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
      });
      this.playClip('idle');
    }
  }

  playClip(name) {
    if (!this.mixer) return;
    Object.values(this.clips).forEach(c => c.fadeOut(0.25));
    const key = Object.keys(this.clips).find(k => k.includes(name));
    const action = this.clips[key] || Object.values(this.clips)[0];
    if (action) action.reset().fadeIn(0.25).play();
  }

  // ─── State ────────────────────────────────────────────────────────────────

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.rebuildDot();

    if (newState === 'working') {
      // Jarbas goes to boss office
      if (this.id === 'jarbas') {
        this.moveTo(ZONES.BOSS_OFFICE.clone().add(new THREE.Vector3((Math.random()-0.5)*0.4, 0, (Math.random()-0.5)*0.4)));
      } else {
        // Others go to desk
        this.moveTo(randomAround(pickRandom(ALL_DESK_SPOTS), 0.3));
      }
    } else if (newState === 'meeting') {
      this.moveTo(ZONES.MEETING_ROOM.clone().add(new THREE.Vector3((Math.random()-0.5)*1.5, 0, (Math.random()-0.5)*1.5)));
    } else {
      // idle — wander workspace
      this.moveDelay = 0.5;
    }
  }

  moveTo(target) {
    this.targetPos.copy(target);
    this.targetPos.y = 0;
    this.isMoving = true;
    this.playClip('walk');
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(delta, clock) {
    if (this.mixer) this.mixer.update(delta);

    // Idle bob (placeholder)
    if (!this.mixer && this.ph) {
      this.ph.position.y = Math.sin(clock.elapsedTime * 1.8) * 0.025;
    }

    // Leg/arm swing while walking
    if (!this.mixer && this.isMoving) {
      const t = clock.elapsedTime * 8;
      if (this.legL) this.legL.rotation.x = Math.sin(t) * 0.35;
      if (this.legR) this.legR.rotation.x = Math.sin(t + Math.PI) * 0.35;
      if (this.armL) this.armL.rotation.x = Math.sin(t + Math.PI) * 0.25;
      if (this.armR) this.armR.rotation.x = Math.sin(t) * 0.25;
    } else if (!this.mixer) {
      if (this.legL) this.legL.rotation.x = 0;
      if (this.legR) this.legR.rotation.x = 0;
      if (this.armL) this.armL.rotation.x = 0;
      if (this.armR) this.armR.rotation.x = 0;
    }

    // Movement
    if (this.isMoving) {
      const dir = new THREE.Vector3().subVectors(this.targetPos, this.group.position);
      dir.y = 0;
      const dist = dir.length();

      if (dist > 0.08) {
        dir.normalize();
        this.group.position.addScaledVector(dir, Math.min(this.speed * delta, dist));
        const targetAngle = Math.atan2(dir.x, dir.z);
        let diff = targetAngle - this.group.rotation.y;
        while (diff >  Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        this.group.rotation.y += diff * Math.min(10 * delta, 1);
      } else {
        this.group.position.copy(this.targetPos);
        this.group.position.y = 0;
        this.isMoving = false;
        this.playClip('idle');
        this.moveDelay = 2.5 + Math.random() * 5;
      }
    } else {
      this.moveDelay -= delta;
      if (this.moveDelay <= 0 && this.state !== 'working') {
        // Wander: workspace desks or wander spots
        const allSpots = [...ALL_DESK_SPOTS, ...ZONES.WANDER];
        const spot = pickRandom(allSpots);
        this.moveTo(randomAround(spot, 0.5));
      }
    }
  }
}
