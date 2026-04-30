import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ALL_POSITIONS } from './office.js';

const loader = new GLTFLoader();

const COLORS = {
  jarbas:  { body: 0x6c63ff, skin: 0xffd5a8, hair: 0x2a1a55 },
  agent2:  { body: 0x00b4d8, skin: 0xffd5a8, hair: 0x1a2a3a },
  agent3:  { body: 0xff6b9d, skin: 0xffd5a8, hair: 0x2a1a1a },
  default: { body: 0x44cc88, skin: 0xffd5a8, hair: 0x1a2a1a }
};

export default class Agent {
  constructor(data, scene) {
    this.id = data.id;
    this.name = data.name;
    this.state = data.state || 'idle';
    this.scene = scene;

    this.group = new THREE.Group();
    this.mixer = null;
    this.clips = {};
    this.speed = 2.2;
    this.isMoving = false;
    this.moveDelay = 2 + Math.random() * 5;

    this.targetPos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    // Random start
    const start = ALL_POSITIONS[Math.floor(Math.random() * ALL_POSITIONS.length)];
    this.group.position.set(start.x + (Math.random() - 0.5), 0, start.z + (Math.random() - 0.5));
    this.targetPos.copy(this.group.position);

    this.buildPlaceholder();
    this.buildLabel();
    scene.add(this.group);

    this.tryLoadGLTF();
  }

  buildPlaceholder() {
    const c = COLORS[this.id] || COLORS.default;

    const bodyMat  = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.7, flatShading: true });
    const skinMat  = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.8, flatShading: true });
    const hairMat  = new THREE.MeshStandardMaterial({ color: c.hair, roughness: 0.9, flatShading: true });
    const darkMat  = new THREE.MeshStandardMaterial({ color: 0x0d1117 });
    const eyeMat   = new THREE.MeshStandardMaterial({ color: 0xffffff });

    this.placeholder = new THREE.Group();

    // Legs
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.38, 0.15), bodyMat.clone());
    this.legL.position.set(-0.1, 0.19, 0);
    this.legL.castShadow = true;
    this.placeholder.add(this.legL);

    this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.38, 0.15), bodyMat.clone());
    this.legR.position.set(0.1, 0.19, 0);
    this.legR.castShadow = true;
    this.placeholder.add(this.legR);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.14, 0.07, 0.2);
    const footL = new THREE.Mesh(footGeo, hairMat.clone());
    footL.position.set(-0.1, 0.04, 0.04);
    this.placeholder.add(footL);
    const footR = new THREE.Mesh(footGeo, hairMat.clone());
    footR.position.set(0.1, 0.04, 0.04);
    this.placeholder.add(footR);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.26), bodyMat);
    body.position.y = 0.65;
    body.castShadow = true;
    this.placeholder.add(body);

    // Collar
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.27), skinMat.clone());
    collar.position.set(0, 0.86, 0);
    this.placeholder.add(collar);

    // Arms
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.13), bodyMat.clone());
    this.armL.position.set(-0.26, 0.64, 0);
    this.armL.castShadow = true;
    this.placeholder.add(this.armL);

    this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.13), bodyMat.clone());
    this.armR.position.set(0.26, 0.64, 0);
    this.armR.castShadow = true;
    this.placeholder.add(this.armR);

    // Hands
    const handGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const handL = new THREE.Mesh(handGeo, skinMat.clone());
    handL.position.set(-0.26, 0.44, 0);
    this.placeholder.add(handL);
    const handR = new THREE.Mesh(handGeo, skinMat.clone());
    handR.position.set(0.26, 0.44, 0);
    this.placeholder.add(handR);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.32), skinMat);
    head.position.y = 1.12;
    head.castShadow = true;
    this.placeholder.add(head);

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.34), hairMat);
    hair.position.set(0, 1.27, 0);
    this.placeholder.add(hair);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.06), hairMat.clone());
    hairBack.position.set(0, 1.14, -0.17);
    this.placeholder.add(hairBack);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.09, 1.12, 0.16);
    this.placeholder.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.09, 1.12, 0.16);
    this.placeholder.add(eyeR);

    const pupilGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const pupilMat = new THREE.MeshStandardMaterial({ color: darkMat.color });
    const pupilL = new THREE.Mesh(pupilGeo, darkMat);
    pupilL.position.set(-0.09, 1.12, 0.18);
    this.placeholder.add(pupilL);
    const pupilR = new THREE.Mesh(pupilGeo, darkMat.clone());
    pupilR.position.set(0.09, 1.12, 0.18);
    this.placeholder.add(pupilR);

    // Shadow blob
    const shadowGeo = new THREE.CircleGeometry(0.28, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    this.placeholder.add(shadow);

    this.group.add(this.placeholder);
  }

  buildLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 56;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(8,11,20,0.88)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 56, 10);
    ctx.fill();

    const c = COLORS[this.id] || COLORS.default;
    const hex = '#' + c.body.toString(16).padStart(6, '0');
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
    this.labelSprite.position.y = 1.7;
    this.group.add(this.labelSprite);

    // Status dot sprite
    this.updateStatusDot();
  }

  updateStatusDot() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);

    const color = this.state === 'working' ? '#ffaa00' : '#00ff88';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(16, 16, 8, 0, Math.PI * 2);
    ctx.fill();

    if (this.dotSprite) this.group.remove(this.dotSprite);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    this.dotSprite = new THREE.Sprite(mat);
    this.dotSprite.scale.set(0.18, 0.18, 1);
    this.dotSprite.position.set(0.48, 1.72, 0);
    this.group.add(this.dotSprite);
  }

  async tryLoadGLTF() {
    const gltf = await new Promise(resolve =>
      loader.load('/assets/character.glb', resolve, undefined, () => resolve(null))
    );
    if (!gltf) return;

    this.group.remove(this.placeholder);
    const model = gltf.scene;
    model.scale.setScalar(0.9);
    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.group.add(model);

    if (gltf.animations?.length) {
      this.mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(clip => {
        const name = clip.name.toLowerCase();
        this.clips[name] = this.mixer.clipAction(clip);
      });
      this.playClip('idle');
    }
  }

  playClip(name) {
    if (!this.mixer) return;
    Object.values(this.clips).forEach(c => c.fadeOut(0.25));
    const action = this.clips[name]
      || this.clips[Object.keys(this.clips).find(k => k.includes(name))]
      || Object.values(this.clips)[0];
    if (action) action.reset().fadeIn(0.25).play();
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.updateStatusDot();

    if (newState === 'working') {
      this.isMoving = false;
      this.targetPos.copy(this.group.position);
      this.playClip('idle');
    } else {
      this.playClip('idle');
    }
  }

  update(delta, clock) {
    // GLTF animation mixer
    if (this.mixer) this.mixer.update(delta);

    // Idle bob (placeholder only)
    if (!this.mixer && this.placeholder) {
      const t = clock.elapsedTime;
      this.placeholder.position.y = Math.sin(t * 1.8) * 0.025;
    }

    // Leg swing while walking (placeholder)
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

        // Smooth rotation toward movement dir
        const targetAngle = Math.atan2(dir.x, dir.z);
        const currentAngle = this.group.rotation.y;
        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        this.group.rotation.y += diff * Math.min(10 * delta, 1);
      } else {
        this.group.position.copy(this.targetPos);
        this.group.position.y = 0;
        this.isMoving = false;
        this.playClip('idle');
        this.moveDelay = 2 + Math.random() * 6;
      }
    } else if (this.state !== 'working') {
      this.moveDelay -= delta;
      if (this.moveDelay <= 0) {
        const spot = ALL_POSITIONS[Math.floor(Math.random() * ALL_POSITIONS.length)];
        this.targetPos.set(
          spot.x + (Math.random() - 0.5) * 0.6,
          0,
          spot.z + (Math.random() - 0.5) * 0.6
        );
        this.isMoving = true;
        this.playClip('walk');
      }
    }
  }
}
