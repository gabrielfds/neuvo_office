import * as THREE from 'three';
import { buildOffice } from './office.js';
import Agent from './Agent.js';
import Editor from './Editor.js';

// ─── Renderer ──────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ─── Scene ─────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeee5d2);   // soft cream backdrop

// ─── Camera (orthographic isometric) ──────────────────────────────────────

const VIEW_SIZE = 13;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -VIEW_SIZE * aspect, VIEW_SIZE * aspect,
   VIEW_SIZE,         -VIEW_SIZE,
  -100, 200
);
camera.position.set(24, 22, 24);
camera.lookAt(-2, 0, 0);

// ─── Lighting ──────────────────────────────────────────────────────────────

scene.add(new THREE.HemisphereLight(0xffeed1, 0x4a4860, 0.7));
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const sun = new THREE.DirectionalLight(0xfff2d8, 1.7);
sun.position.set(18, 36, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 100;
sun.shadow.camera.left   = -22;
sun.shadow.camera.right  =  22;
sun.shadow.camera.top    =  22;
sun.shadow.camera.bottom = -22;
sun.shadow.bias       = -0.0008;
sun.shadow.normalBias = 0.04;
sun.shadow.radius     = 3;
scene.add(sun);

// ─── Build Office ──────────────────────────────────────────────────────────

buildOffice(scene);

// ─── Agents ────────────────────────────────────────────────────────────────

const agents = {};

function spawnAgent(data) {
  if (agents[data.id]) return;
  agents[data.id] = new Agent(data, scene);
}

// ─── Editor ────────────────────────────────────────────────────────────────

const editor = new Editor({
  scene, camera, renderer,
  onFreezeAgents: freeze => {
    Object.values(agents).forEach(a => { a.frozen = freeze; });
  }
});

// ─── WebSocket ─────────────────────────────────────────────────────────────

const dot = document.getElementById('dot');
const statusText = document.getElementById('status-text');

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  let ws;
  try {
    ws = new WebSocket(`${proto}//${location.host}`);
  } catch (_) {
    setTimeout(connectWS, 3000);
    return;
  }

  ws.onopen = () => {
    dot.classList.add('online');
    statusText.textContent = 'online';
    statusText.classList.add('online');
  };

  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.type === 'init') {
      msg.agents.forEach(spawnAgent);
    } else if (msg.type === 'agent_state') {
      agents[msg.agent]?.setState(msg.state);
    }
  };

  ws.onclose = () => {
    dot.classList.remove('online');
    statusText.textContent = 'offline';
    statusText.classList.remove('online');
    setTimeout(connectWS, 3000);
  };
}

connectWS();

// ─── Clock UI ──────────────────────────────────────────────────────────────

const clockEl = document.getElementById('clock');
setInterval(() => {
  clockEl.textContent = new Date().toLocaleTimeString('pt-BR');
}, 1000);

// ─── Resize ────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  const a = window.innerWidth / window.innerHeight;
  camera.left   = -VIEW_SIZE * a;
  camera.right  =  VIEW_SIZE * a;
  camera.top    =  VIEW_SIZE;
  camera.bottom = -VIEW_SIZE;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Loop ──────────────────────────────────────────────────────────────────

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  editor.update();
  Object.values(agents).forEach(a => a.update(delta, clock));
  renderer.render(scene, camera);
}

animate();
