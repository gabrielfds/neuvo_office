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

// Pontos nos corredores — entre as fileiras, nunca em cima de mesas
// ROW1 z=-5, ROW2 z=0, ROW3 z=5  →  corredores em z=-2.5, z=2.5, z=-7.5, z=7.5
const CORRIDOR = [
  new THREE.Vector3(-10,  0, -2.5), new THREE.Vector3(-6.5, 0, -2.5), new THREE.Vector3(-3, 0, -2.5),
  new THREE.Vector3(-10,  0,  2.5), new THREE.Vector3(-6.5, 0,  2.5), new THREE.Vector3(-3, 0,  2.5),
  new THREE.Vector3(-7,   0, -7.5), new THREE.Vector3(-7,   0,  7.5),
  new THREE.Vector3(-13,  0, -4),   new THREE.Vector3(-13,  0,  0),   new THREE.Vector3(-13, 0,  4),
  new THREE.Vector3(-1.5, 0, -4),   new THREE.Vector3(-1.5, 0,  0),   new THREE.Vector3(-1.5, 0,  4),
];

const v = (x, y, z) => new THREE.Vector3(x, y, z);

// Config carregada do servidor (/api/agents)
let AGENT_CONFIG = {};
fetch('/api/agents').then(r => r.json()).then(data => { AGENT_CONFIG = data; }).catch(() => {});

function resolveStateDest(stateCfg, desk) {
  if (!stateCfg) return null;
  if (stateCfg.type === 'fixed') return v(stateCfg.x, 0, stateCfg.z);
  if (stateCfg.type === 'zone') {
    const zone = ZONES[stateCfg.zone];
    if (!zone) return null;
    const point = Array.isArray(zone) ? pickRandom(zone) : zone;
    return randomAround(point, stateCfg.radius ?? 1.0);
  }
  if (stateCfg.type === 'desk') return desk ? randomAround(desk, 0.4) : null;
  return null;
}

function getConfig(id) {
  const raw = AGENT_CONFIG[id];
  if (raw) {
    const desk = raw.desk ? v(raw.desk.x, 0, raw.desk.z) : pickRandom(ALL_DESK_SPOTS);
    const seat = raw.seat ? v(raw.seat.x, 0, raw.seat.z) : desk;
    return {
      desk, seat,
      states: {
        working: () => resolveStateDest(raw.states?.working, desk) ?? randomAround(desk, 0.4),
        meeting: () => resolveStateDest(raw.states?.meeting, desk) ?? randomAround(ZONES.MEETING_ROOM, 1.2),
        idle:    () => resolveStateDest(raw.states?.idle,    desk) ?? randomAround(pickRandom(CORRIDOR), 0.4),
      }
    };
  }
  const desk = pickRandom(ALL_DESK_SPOTS);
  return {
    desk, seat: null,
    states: {
      working: () => randomAround(desk, 0.4),
      meeting: () => randomAround(ZONES.MEETING_ROOM, 1.2),
      idle:    () => randomAround(pickRandom(CORRIDOR), 0.4)
    }
  };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAround(pos, radius) {
  return new THREE.Vector3(
    pos.x + (Math.random() - 0.5) * radius * 2,
    0,
    pos.z + (Math.random() - 0.5) * radius * 2
  );
}

export default class Agent {
  constructor(data, scene) {
    this.id    = data.id;
    this.name  = data.name;
    this.state = data.state || 'idle';
    this.scene = scene;
    this.cfg   = getConfig(data.id);

    this.group = new THREE.Group();
    this.mixer = null;
    this.clips = {};
    this.speed = 2.4;
    this.isMoving  = false;
    this.moveDelay = 1.5 + Math.random() * 4;
    this.targetPos = new THREE.Vector3();

    // Começa na cadeira da mesa atribuída
    const start = this.cfg.seat ?? this.cfg.desk;
    this.group.position.set(start.x, 0, start.z);
    this.targetPos.copy(this.group.position);

    this.buildPlaceholder();
    this.buildLabel();
    scene.add(this.group);
    this.tryLoadGLTF();
  }

  // ─── Placeholder character ────────────────────────────────────────────────

  buildPlaceholder() {
    const c = COLORS[this.id] || COLORS.default;
    const bodyMat = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.75, flatShading: true });
    const skinMat = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.85, flatShading: true });
    const hairMat = new THREE.MeshStandardMaterial({ color: c.hair, roughness: 0.95, flatShading: true });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x252830, roughness: 0.6, flatShading: true });

    this.ph = new THREE.Group();

    // Body — single capsule (low-poly)
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 8), bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    this.ph.add(body);

    // Pants — short cylinder under body
    const pants = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.18, 8), darkMat);
    pants.position.y = 0.27;
    pants.castShadow = true;
    this.ph.add(pants);

    // Legs (so we can swing them while walking)
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.13), darkMat);
    this.legL.position.set(-0.09, 0.13, 0);
    this.ph.add(this.legL);
    this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.13), darkMat);
    this.legR.position.set(0.09, 0.13, 0);
    this.ph.add(this.legR);

    // Head — sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), skinMat);
    head.position.y = 1.05;
    head.castShadow = true;
    this.ph.add(head);

    // Hair cap
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat);
    hair.position.y = 1.05;
    this.ph.add(hair);

    // Two simple eye dots
    const eyeGeo = new THREE.SphereGeometry(0.025, 6, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x252830 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.07, 1.06, 0.18);
    this.ph.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.07, 1.06, 0.18);
    this.ph.add(eyeR);

    // Soft contact shadow
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    this.ph.add(shadow);

    // Arm references kept null — capsule body has no separate arms
    this.armL = null;
    this.armR = null;

    this.group.add(this.ph);
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

    const dest = this.cfg.states[newState]?.call(this.cfg);
    if (dest) {
      this.moveTo(dest);
    } else {
      // estado desconhecido → wander no corredor
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
    if (this.frozen) return;
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
        const dest = this.cfg.states.idle?.call(this.cfg) ?? randomAround(pickRandom(CORRIDOR), 0.4);
        this.moveTo(dest);
      }
    }
  }
}
