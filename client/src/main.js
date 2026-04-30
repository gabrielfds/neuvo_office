import * as THREE from 'three';
import { buildOffice } from './office.js';
import Agent from './Agent.js';

// ─── Renderer ──────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
document.body.appendChild(renderer.domElement);

// ─── Scene ─────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);
scene.fog = new THREE.FogExp2(0x0a0e1a, 0.035);

// ─── Camera ────────────────────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, 11, 14);
camera.lookAt(0, 0.5, -1);

// ─── Lighting ──────────────────────────────────────────────────────────────

// Ambient (cool blue tone)
const ambient = new THREE.AmbientLight(0x6688cc, 0.5);
scene.add(ambient);

// Main directional (warm fill)
const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
dirLight.position.set(4, 10, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 40;
dirLight.shadow.camera.left = -15;
dirLight.shadow.camera.right = 15;
dirLight.shadow.camera.top = 12;
dirLight.shadow.camera.bottom = -12;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

// Rim light from back
const rimLight = new THREE.DirectionalLight(0x4466ff, 0.3);
rimLight.position.set(-3, 5, -8);
scene.add(rimLight);

// ─── Build Office ──────────────────────────────────────────────────────────

buildOffice(scene);

// ─── Agents ────────────────────────────────────────────────────────────────

const agents = {};

function spawnAgent(data) {
  if (agents[data.id]) return;
  agents[data.id] = new Agent(data, scene);
}

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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Loop ──────────────────────────────────────────────────────────────────

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  Object.values(agents).forEach(a => a.update(delta, clock));
  renderer.render(scene, camera);
}

animate();
