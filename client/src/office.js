import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

async function tryLoadGLTF(path) {
  return new Promise((resolve) => {
    loader.load(path, resolve, undefined, () => resolve(null));
  });
}

export const DESK_POSITIONS = [
  new THREE.Vector3(-5, 0, -1),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(5, 0, -1)
];

export const WANDER_POSITIONS = [
  new THREE.Vector3(-4, 0, 2),
  new THREE.Vector3(0, 0, 3),
  new THREE.Vector3(4, 0, 2),
  new THREE.Vector3(-6, 0, 1),
  new THREE.Vector3(6, 0, 1)
];

export const ALL_POSITIONS = [...DESK_POSITIONS, ...WANDER_POSITIONS];

const ACCENT_COLORS = [0x6c63ff, 0x00b4d8, 0xff6b9d];

export async function buildOffice(scene) {
  buildFloor(scene);
  buildWalls(scene);
  buildLighting(scene);
  buildDesks(scene);
  buildDecorations(scene);
}

function buildFloor(scene) {
  // Main floor
  const geo = new THREE.PlaneGeometry(28, 18);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0f1628,
    roughness: 0.95,
    metalness: 0.05
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Grid overlay
  const grid = new THREE.GridHelper(28, 28, 0x151d35, 0x111828);
  grid.position.y = 0.001;
  scene.add(grid);

  // Carpet area
  const carpetGeo = new THREE.PlaneGeometry(10, 5);
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0x111530, roughness: 1 });
  const carpet = new THREE.Mesh(carpetGeo, carpetMat);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.002, 2);
  carpet.receiveShadow = true;
  scene.add(carpet);
}

function buildWalls(scene) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f1e, roughness: 0.9 });

  // Back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(28, 7, 0.15), wallMat);
  backWall.position.set(0, 3.5, -9);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Side walls
  [-14, 14].forEach(x => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 7, 18), wallMat);
    wall.position.set(x, 3.5, 0);
    scene.add(wall);
  });

  // Ceiling
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x080c18 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 7;
  scene.add(ceil);

  // Baseboard
  const baseGeo = new THREE.BoxGeometry(28, 0.15, 0.08);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a2245 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.075, -8.93);
  scene.add(base);

  // Windows
  buildWindows(scene);
}

function buildWindows(scene) {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x141e38 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a1830,
    transparent: true,
    opacity: 0.6,
    roughness: 0.05,
    metalness: 0.1
  });

  [-5, 0, 5].forEach(x => {
    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 0.08), frameMat);
    frame.position.set(x, 3.5, -8.96);
    scene.add(frame);

    // Glass
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.5), glassMat);
    glass.position.set(x, 3.5, -8.9);
    scene.add(glass);

    // Divider cross
    const divH = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.05), frameMat);
    divH.position.set(x, 3.5, -8.91);
    scene.add(divH);
    const divV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.5, 0.05), frameMat);
    divV.position.set(x, 3.5, -8.91);
    scene.add(divV);
  });
}

function buildLighting(scene) {
  // Ceiling light tracks
  [-4.5, 0, 4.5].forEach((x, i) => {
    // Track
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.06, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1e2845 })
    );
    track.position.set(x, 6.8, -1);
    scene.add(track);

    // Bulb housing
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.18, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1a2240 })
    );
    housing.position.set(x, 6.65, -1);
    scene.add(housing);

    // Emissive bulb
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffeedd,
        emissive: 0xffeedd,
        emissiveIntensity: 1
      })
    );
    bulb.position.set(x, 6.55, -1);
    scene.add(bulb);

    // Point light
    const light = new THREE.PointLight(0xfff0dd, 1.8, 12, 1.5);
    light.position.set(x, 6.5, -1);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    scene.add(light);
  });
}

function buildDesks(scene) {
  DESK_POSITIONS.forEach((pos, i) => {
    const accent = ACCENT_COLORS[i];
    const desk = createDesk(accent);
    desk.position.copy(pos);
    scene.add(desk);
  });
}

function createDesk(accentColor) {
  const group = new THREE.Group();

  const darkMat = new THREE.MeshStandardMaterial({ color: 0x141e34, roughness: 0.8 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x0f1528, roughness: 0.9 });

  // Surface
  const surface = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 1.2), darkMat);
  surface.position.y = 0.82;
  surface.castShadow = true;
  surface.receiveShadow = true;
  group.add(surface);

  // Edge strip (accent)
  const edgeMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.15 });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 0.02), edgeMat);
  edge.position.set(0, 0.865, -0.59);
  group.add(edge);

  // Legs
  [[-1.2, -0.5], [1.2, -0.5], [-1.2, 0.5], [1.2, 0.5]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.82, 0.07), legMat);
    leg.position.set(lx, 0.41, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Monitor
  const screenMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.35,
    roughness: 0.2
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.04), screenMat);
  screen.position.set(0, 1.62, -0.38);
  group.add(screen);

  // Screen frame
  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.89, 0.03), new THREE.MeshStandardMaterial({ color: 0x0a0f1c }));
  screenFrame.position.set(0, 1.62, -0.4);
  group.add(screenFrame);

  // Stand
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), legMat);
  stand.position.set(0, 1.06, -0.38);
  group.add(stand);
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.25), legMat);
  standBase.position.set(0, 0.87, -0.38);
  group.add(standBase);

  // Monitor glow light
  const monLight = new THREE.PointLight(accentColor, 0.6, 3);
  monLight.position.set(0, 1.62, 0);
  group.add(monLight);

  // Keyboard
  const kbMat = new THREE.MeshStandardMaterial({ color: 0x0e1525, roughness: 0.9 });
  const kb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.36), kbMat);
  kb.position.set(0, 0.87, 0.2);
  group.add(kb);

  // Mouse
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.2), kbMat);
  mouse.position.set(0.66, 0.87, 0.2);
  group.add(mouse);

  // Desk lamp
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x1a2445 });
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 8), lampMat);
  lampBase.position.set(-1.0, 0.87, 0.2);
  group.add(lampBase);
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), lampMat);
  lampPole.position.set(-1.0, 1.12, 0.2);
  group.add(lampPole);
  const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.12, 8), lampMat);
  lampHead.position.set(-1.0, 1.4, 0.05);
  lampHead.rotation.x = 0.4;
  group.add(lampHead);

  // Coffee mug
  const mugMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.7 });
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 10), mugMat);
  mug.position.set(0.95, 0.91, -0.1);
  group.add(mug);

  return group;
}

function buildDecorations(scene) {
  // Plants in corners
  [[-12, -7], [12, -7], [-12, 7], [12, 7]].forEach(([x, z]) => {
    buildPlant(scene, x, z);
  });

  // Couch area
  buildCouch(scene, 9, 4);

  // Company logo on back wall
  buildWallLogo(scene);
}

function buildPlant(scene, x, z) {
  const potMat = new THREE.MeshStandardMaterial({ color: 0x2a3555, roughness: 0.8 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.35, 8), potMat);
  pot.position.set(x, 0.175, z);
  pot.castShadow = true;
  scene.add(pot);

  const soilMat = new THREE.MeshStandardMaterial({ color: 0x0d1018 });
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 8), soilMat);
  soil.position.set(x, 0.365, z);
  scene.add(soil);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1a5c30, roughness: 0.9, flatShading: true });
  [0, 1, 2, 3].forEach(i => {
    const leafGeo = new THREE.ConeGeometry(0.22 - i * 0.03, 0.4, 6);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(x + (Math.random() - 0.5) * 0.15, 0.5 + i * 0.25, z + (Math.random() - 0.5) * 0.15);
    leaf.castShadow = true;
    scene.add(leaf);
  });
}

function buildCouch(scene, x, z) {
  const couchMat = new THREE.MeshStandardMaterial({ color: 0x1a2050, roughness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111530, roughness: 0.9 });

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.0), couchMat);
  seat.position.set(x, 0.35, z);
  seat.castShadow = true;
  scene.add(seat);

  // Back
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.22), couchMat);
  back.position.set(x, 0.7, z - 0.44);
  back.castShadow = true;
  scene.add(back);

  // Armrests
  [-1.25, 1.25].forEach(dx => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 1.0), couchMat);
    arm.position.set(x + dx, 0.52, z);
    arm.castShadow = true;
    scene.add(arm);
  });

  // Legs
  [[-1.0, -0.35], [1.0, -0.35], [-1.0, 0.35], [1.0, 0.35]].forEach(([dx, dz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), darkMat);
    leg.position.set(x + dx, 0.11, z + dz);
    scene.add(leg);
  });

  // Coffee table
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x141e30, roughness: 0.7 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.6), tableMat);
  table.position.set(x, 0.43, z + 0.8);
  table.castShadow = true;
  table.receiveShadow = true;
  scene.add(table);

  const tLegMat = new THREE.MeshStandardMaterial({ color: 0x6c63ff, roughness: 0.6 });
  [[-0.42, 0.22], [0.42, 0.22], [-0.42, -0.22], [0.42, -0.22]].forEach(([dx, dz]) => {
    const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), tLegMat);
    tl.position.set(x + dx, 0.21, z + 0.8 + dz);
    scene.add(tl);
  });
}

function buildWallLogo(scene) {
  // Logo bar (accent stripe)
  const barMat = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    emissive: 0xff4444,
    emissiveIntensity: 0.4
  });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(3, 0.06, 0.04), barMat);
  bar.position.set(0, 5.8, -8.92);
  scene.add(bar);

  // Subtle wall light behind logo
  const logoLight = new THREE.PointLight(0xff4444, 0.4, 4);
  logoLight.position.set(0, 5.5, -8.5);
  scene.add(logoLight);
}
