import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── Zone definitions (world positions) ───────────────────────────────────

export const ZONES = {
  // Left workspace - desk rows
  DESK_ROW1: [
    new THREE.Vector3(-10, 0, -5),
    new THREE.Vector3(-6.5, 0, -5),
    new THREE.Vector3(-3, 0, -5)
  ],
  DESK_ROW2: [
    new THREE.Vector3(-10, 0, 0),
    new THREE.Vector3(-6.5, 0, 0),
    new THREE.Vector3(-3, 0, 0)
  ],
  DESK_ROW3: [
    new THREE.Vector3(-10, 0, 5),
    new THREE.Vector3(-6.5, 0, 5),
    new THREE.Vector3(-3, 0, 5)
  ],

  // Right side rooms (center positions)
  BOSS_OFFICE:  new THREE.Vector3(8.5, 0, -5.5),
  MEETING_ROOM: new THREE.Vector3(8.5, 0,  0.5),
  REST_ROOM:    new THREE.Vector3(8.5, 0,  5.5),

  // Wander spots in workspace
  WANDER: [
    new THREE.Vector3(-11, 0, 2),
    new THREE.Vector3(-7,  0, 3),
    new THREE.Vector3(-4,  0, -3),
    new THREE.Vector3(-9,  0, -2),
    new THREE.Vector3(-2,  0,  6),
  ]
};

export const ALL_DESK_SPOTS = [
  ...ZONES.DESK_ROW1,
  ...ZONES.DESK_ROW2,
  ...ZONES.DESK_ROW3
];

// ─── Build ─────────────────────────────────────────────────────────────────

export function buildOffice(scene) {
  buildFloor(scene);
  buildWorkspace(scene);
  buildRooms(scene);
  buildLighting(scene);
}

// ─── Floor ─────────────────────────────────────────────────────────────────

function buildFloor(scene) {
  // Main floor
  const geo = new THREE.PlaneGeometry(32, 20);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0e1528, roughness: 0.95 });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Grid
  const grid = new THREE.GridHelper(32, 32, 0x14203a, 0x111a30);
  grid.position.y = 0.001;
  scene.add(grid);

  // Workspace carpet
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0x101425, roughness: 1 });
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(15, 18), carpetMat);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(-7, 0.002, 0);
  carpet.receiveShadow = true;
  scene.add(carpet);

  // Rooms carpet (right side)
  const roomCarpet = new THREE.Mesh(new THREE.PlaneGeometry(12, 18), new THREE.MeshStandardMaterial({ color: 0x0c1020, roughness: 1 }));
  roomCarpet.rotation.x = -Math.PI / 2;
  roomCarpet.position.set(8.5, 0.002, 0);
  roomCarpet.receiveShadow = true;
  scene.add(roomCarpet);
}

// ─── Workspace ──────────────────────────────────────────────────────────────

function buildWorkspace(scene) {
  // Outer walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f1e, roughness: 0.9 });

  // Back wall (left side)
  addBox(scene, new THREE.BoxGeometry(15.5, 6, 0.15), wallMat, -7, 3, -9.92);

  // Left wall
  addBox(scene, new THREE.BoxGeometry(0.15, 6, 20), wallMat, -15.07, 3, 0);

  // Front wall (partial - opening toward rooms)
  addBox(scene, new THREE.BoxGeometry(15.5, 6, 0.15), wallMat, -7, 3, 9.92);

  // Ceiling
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x080c18 });
  addBox(scene, new THREE.PlaneGeometry(15.5, 20), ceilMat, -7, 6, 0, -Math.PI / 2);

  // Windows on back wall
  buildBackWindows(scene);

  // Workspace label on back wall
  buildWallText(scene, 'LOCAL DE TRABALHO', -7, 5.2, -9.85, 0x6c63ff);

  // 3 rows of desks
  const ACCENT = [0x6c63ff, 0x00b4d8, 0xff6b9d];
  [ZONES.DESK_ROW1, ZONES.DESK_ROW2, ZONES.DESK_ROW3].forEach((row, ri) => {
    row.forEach(pos => {
      const desk = buildDesk(ACCENT[ri % ACCENT.length]);
      desk.position.copy(pos);
      scene.add(desk);
    });
  });

  // Plants in workspace corners
  buildPlant(scene, -14, -8.5);
  buildPlant(scene, -14,  8.5);
}

function buildBackWindows(scene) {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x141e38 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1830, transparent: true, opacity: 0.55 });
  [-11, -7, -3].forEach(x => {
    addBox(scene, new THREE.BoxGeometry(2, 2.6, 0.06), frameMat, x, 3.2, -9.86);
    addBox(scene, new THREE.PlaneGeometry(1.7, 2.3), glassMat, x, 3.2, -9.8);
    // City lights
    for (let i = 0; i < 6; i++) {
      const dot = new THREE.Mesh(
        new THREE.PlaneGeometry(0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xffeedd : 0x88ccff })
      );
      dot.position.set(x + (Math.random() - 0.5) * 1.4, 2.8 + Math.random() * 0.9, -9.78);
      scene.add(dot);
    }
  });
}

// ─── Rooms (right side) ─────────────────────────────────────────────────────

function buildRooms(scene) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f1e, roughness: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e3060,
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
    side: THREE.DoubleSide
  });

  // Outer right wall
  addBox(scene, new THREE.BoxGeometry(0.15, 6, 20), wallMat, 15.07, 3, 0);
  // Back (right side)
  addBox(scene, new THREE.BoxGeometry(12.5, 6, 0.15), wallMat, 8.5, 3, -9.92);
  addBox(scene, new THREE.BoxGeometry(12.5, 6, 0.15), wallMat, 8.5, 3,  9.92);

  // Ceiling (right side)
  addBox(scene, new THREE.PlaneGeometry(12.5, 20), new THREE.MeshStandardMaterial({ color: 0x060a16 }), 8.5, 6, 0, -Math.PI / 2);

  // Central divider wall (between workspace and rooms)
  // With opening/door
  addBox(scene, new THREE.BoxGeometry(0.15, 6, 6), wallMat, 2.0, 3, -7);
  addBox(scene, new THREE.BoxGeometry(0.15, 6, 6), wallMat, 2.0, 3,  7);
  // Door header
  addBox(scene, new THREE.BoxGeometry(0.15, 2.5, 5.8), wallMat, 2.0, 4.75, 0);
  // Glass door
  addBox(scene, new THREE.PlaneGeometry(5.8, 2.3), glassMat, 2.0, 3.35, 0);

  // Horizontal dividers between rooms (z = -2 and z = 3.5)
  buildRoomDivider(scene, 2.0, -2.5, wallMat, glassMat);
  buildRoomDivider(scene, 2.0,  3.2, wallMat, glassMat);

  // ── Boss Office (top right, z: -9.9 to -2.5) ──
  buildBossOffice(scene, glassMat);

  // ── Meeting Room (middle right, z: -2.5 to 3.2) ──
  buildMeetingRoom(scene, glassMat);

  // ── Rest Room (bottom right, z: 3.2 to 9.9) ──
  buildRestRoom(scene, glassMat);
}

function buildRoomDivider(scene, x, z, wallMat, glassMat) {
  // Solid part + glass panel
  addBox(scene, new THREE.BoxGeometry(13.2, 6, 0.12), wallMat, 8.5, 3, z);
  // Glass panel in divider
  addBox(scene, new THREE.PlaneGeometry(6, 1.8), glassMat, 8.5, 3.8, z + 0.07);
}

function buildBossOffice(scene, glassMat) {
  const cx = 8.5, cz = -6.2;
  // Accent wall panel (purple)
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x6c63ff, emissive: 0x6c63ff, emissiveIntensity: 0.08 });
  addBox(scene, new THREE.BoxGeometry(12.4, 0.08, 0.08), accentMat, cx, 0.3, -9.88);

  buildWallText(scene, 'SALA DO CHEFE', cx, 5.2, -9.85, 0x6c63ff);

  // Executive desk (larger)
  const exDesk = buildExecDesk(0x6c63ff);
  exDesk.position.set(cx + 1, 0, cz);
  scene.add(exDesk);

  // Bookcase on back wall
  buildBookcase(scene, cx - 4, cz - 0.5);

  // Name plate on desk area
  buildNamePlate(scene, cx + 1, cz, 'JARBAS', 0x6c63ff);

  // Room light (purple tint)
  const light = new THREE.PointLight(0x8878ff, 0.6, 10);
  light.position.set(cx, 5, cz);
  scene.add(light);
}

function buildMeetingRoom(scene, glassMat) {
  const cx = 8.5, cz = 0.35;
  buildWallText(scene, 'SALA DE REUNIÃO', cx, 5.2, -9.85 + 0, 0x00b4d8);

  // Round meeting table
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x141e34, roughness: 0.6 });
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.5, 0.09, 16), tableMat);
  table.position.set(cx, 0.82, cz);
  table.castShadow = true;
  table.receiveShadow = true;
  scene.add(table);

  // Table edge glow
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x00b4d8, emissive: 0x00b4d8, emissiveIntensity: 0.2 });
  const edge = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.025, 8, 32), edgeMat);
  edge.position.set(cx, 0.87, cz);
  edge.rotation.x = Math.PI / 2;
  scene.add(edge);

  // Chairs around table
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const chair = buildChair(0x1a2445);
    chair.position.set(cx + Math.cos(angle) * 2.2, 0, cz + Math.sin(angle) * 2.2);
    chair.rotation.y = -angle + Math.PI;
    scene.add(chair);
  }

  // Whiteboard on back wall
  buildWhiteboard(scene, cx - 4, cz - 0.5);

  // Room label
  buildWallText(scene, 'REUNIÃO', cx, 5.2, -9.85, 0x00b4d8);

  // Light (blue tint)
  const light = new THREE.PointLight(0x44aaff, 0.5, 10);
  light.position.set(cx, 5, cz);
  scene.add(light);
}

function buildRestRoom(scene, glassMat) {
  const cx = 8.5, cz = 6.5;
  buildWallText(scene, 'DESCANSO', cx, 5.2, -9.85, 0xff9944);

  // Couch
  buildCouch(scene, cx, cz - 1.5);

  // Coffee table
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x141e30 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.7), tableMat);
  table.position.set(cx, 0.44, cz + 0.5);
  table.castShadow = true;
  scene.add(table);

  // Fridge
  buildFridge(scene, cx + 5, cz - 2);

  // Plant
  buildPlant(scene, cx + 5, cz + 2);

  // Light (warm)
  const light = new THREE.PointLight(0xffcc88, 0.5, 10);
  light.position.set(cx, 5, cz);
  scene.add(light);
}

// ─── Lighting ──────────────────────────────────────────────────────────────

function buildLighting(scene) {
  // Workspace ceiling lights
  [[-11, -3], [-7, -3], [-3, -3], [-11, 2], [-7, 2], [-3, 2], [-7, 7]].forEach(([x, z]) => {
    addCeilingLight(scene, x, z, 0xfff0dd, 1.2, 10);
  });

  // Room ceiling lights
  [[8.5, -6], [8.5, 0.5], [8.5, 6.5]].forEach(([x, z]) => {
    addCeilingLight(scene, x, z, 0xffeedd, 1.0, 8);
  });
}

function addCeilingLight(scene, x, z, color, intensity, dist) {
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.12, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x1a2040 })
  );
  housing.position.set(x, 5.92, z);
  scene.add(housing);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 6, 6),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 })
  );
  bulb.position.set(x, 5.84, z);
  scene.add(bulb);

  const light = new THREE.PointLight(color, intensity, dist, 2);
  light.position.set(x, 5.8, z);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  scene.add(light);
}

// ─── Furniture helpers ─────────────────────────────────────────────────────

function buildDesk(accentColor) {
  const group = new THREE.Group();
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x141e34, roughness: 0.8 });
  const legMat  = new THREE.MeshStandardMaterial({ color: 0x0f1528, roughness: 0.9 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.2 });
  const screenMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.4 });

  // Surface
  const surface = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 1.0), darkMat);
  surface.position.y = 0.82; surface.castShadow = true; surface.receiveShadow = true;
  group.add(surface);

  // Accent edge
  const edge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 0.02), accentMat);
  edge.position.set(0, 0.862, -0.49); group.add(edge);

  // Legs
  [[-1.0,-0.4],[1.0,-0.4],[-1.0,0.4],[1.0,0.4]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.82, 0.07), legMat);
    leg.position.set(lx, 0.41, lz); leg.castShadow = true; group.add(leg);
  });

  // Monitor
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.04), screenMat);
  screen.position.set(0, 1.5, -0.32); group.add(screen);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.74, 0.03), new THREE.MeshStandardMaterial({ color: 0x0a0f1c }));
  frame.position.set(0, 1.5, -0.335); group.add(frame);

  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), legMat);
  stand.position.set(0, 0.97, -0.32); group.add(stand);
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.2), legMat);
  standBase.position.set(0, 0.865, -0.32); group.add(standBase);

  // Monitor glow
  const monLight = new THREE.PointLight(accentColor, 0.5, 2.5);
  monLight.position.set(0, 1.5, 0.1); group.add(monLight);

  // Keyboard
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.03, 0.28), new THREE.MeshStandardMaterial({ color: 0x0e1525 }));
  kb.position.set(0, 0.865, 0.18); group.add(kb);

  return group;
}

function buildExecDesk(accentColor) {
  const group = new THREE.Group();
  const darkMat   = new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.7 });
  const legMat    = new THREE.MeshStandardMaterial({ color: 0x0f1528 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.15 });
  const screenMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.4 });

  // L-shaped desk surface
  const main = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.09, 1.2), darkMat);
  main.position.set(0, 0.85, 0); main.castShadow = true; group.add(main);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 1.8), darkMat);
  wing.position.set(-1.8, 0.85, 0.9); wing.castShadow = true; group.add(wing);

  // Edge accent
  const edge = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.025, 0.025), accentMat);
  edge.position.set(0, 0.912, -0.59); group.add(edge);

  // Legs
  [[-1.4,-0.5],[1.4,-0.5],[1.4,0.5],[-2.4,1.7],[-1.2,1.7]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.85,0.08), legMat);
    leg.position.set(lx, 0.425, lz); group.add(leg);
  });

  // Dual monitors
  [-0.6, 0.6].forEach(ox => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.65, 0.04), screenMat);
    s.position.set(ox, 1.48, -0.3); group.add(s);
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.69, 0.03), new THREE.MeshStandardMaterial({ color: 0x0a0f1c }));
    f.position.set(ox, 1.48, -0.315); group.add(f);
  });

  const monLight = new THREE.PointLight(accentColor, 0.8, 3);
  monLight.position.set(0, 1.5, 0.2); group.add(monLight);

  // Keyboard + mouse
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.28), new THREE.MeshStandardMaterial({ color: 0x0e1525 }));
  kb.position.set(0.2, 0.9, 0.15); group.add(kb);

  return group;
}

function buildChair(color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat);
  seat.position.y = 0.48; group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.07), mat);
  back.position.set(0, 0.77, -0.22); group.add(back);
  [[-0.2,-0.2],[0.2,-0.2],[-0.2,0.2],[0.2,0.2]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.47,0.04), new THREE.MeshStandardMaterial({ color: 0x0d1220 }));
    leg.position.set(lx, 0.235, lz); group.add(leg);
  });
  return group;
}

function buildWhiteboard(scene, x, z) {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x141e30 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 2.8), frameMat);
  board.position.set(x + 0.5, 2.8, z);
  scene.add(board);

  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f1520, roughness: 0.8 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), screenMat);
  screen.position.set(x + 0.55, 2.8, z);
  screen.rotation.y = Math.PI / 2;
  scene.add(screen);

  // Lines on whiteboard
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00b4d8, transparent: true, opacity: 0.4 });
  [0.3, 0.1, -0.1, -0.3].forEach((dy, i) => {
    const pts = [new THREE.Vector3(x + 0.6, 2.8 + dy, z - 0.9 + i * 0.1), new THREE.Vector3(x + 0.6, 2.8 + dy, z + 0.6)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  });
}

function buildBookcase(scene, x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x141e2a, roughness: 0.9 });
  const bc = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.8, 1.6), mat);
  bc.position.set(x, 1.4, z);
  bc.castShadow = true;
  scene.add(bc);

  // Book spines (colored)
  [0x6c63ff, 0xff6b9d, 0x00b4d8, 0x44cc88, 0xff9944, 0x6c63ff].forEach((c, i) => {
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.35, 0.28),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.1 })
    );
    book.position.set(x + 0.18, 0.5 + Math.floor(i / 3) * 0.8, z - 0.55 + (i % 3) * 0.42);
    scene.add(book);
  });
}

function buildNamePlate(scene, x, z, name, color) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x0d1220 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.25), mat);
  plate.position.set(x, 0.9, z + 0.6);
  scene.add(plate);

  const edgeMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.015, 0.015), edgeMat);
  edge.position.set(x, 0.917, z + 0.6 - 0.12);
  scene.add(edge);
}

function buildCouch(scene, x, z) {
  const mat  = new THREE.MeshStandardMaterial({ color: 0x1a2050, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111530 });

  addBox(scene, new THREE.BoxGeometry(2.8, 0.35, 0.9), mat, x, 0.35, z);
  addBox(scene, new THREE.BoxGeometry(2.8, 0.65, 0.22), mat, x, 0.72, z - 0.44);
  [-1.35, 1.35].forEach(dx => addBox(scene, new THREE.BoxGeometry(0.22, 0.5, 0.9), mat, x + dx, 0.58, z));
  [[-1.1,-0.35],[1.1,-0.35],[-1.1,0.35],[1.1,0.35]].forEach(([dx,dz]) =>
    addBox(scene, new THREE.BoxGeometry(0.08,0.22,0.08), dark, x + dx, 0.11, z + dz));
}

function buildFridge(scene, x, z) {
  const mat  = new THREE.MeshStandardMaterial({ color: 0x1a2240, roughness: 0.5, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0d1020 });
  addBox(scene, new THREE.BoxGeometry(0.7, 1.8, 0.6), mat, x, 0.9, z);
  addBox(scene, new THREE.BoxGeometry(0.68, 0.85, 0.02), dark, x, 1.4, z + 0.3);
  addBox(scene, new THREE.BoxGeometry(0.68, 0.88, 0.02), dark, x, 0.48, z + 0.3);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x6c63ff, emissive: 0x6c63ff, emissiveIntensity: 0.3 });
  addBox(scene, new THREE.BoxGeometry(0.06, 0.3, 0.06), handleMat, x + 0.3, 1.5, z + 0.3);
  addBox(scene, new THREE.BoxGeometry(0.06, 0.3, 0.06), handleMat, x + 0.3, 0.5, z + 0.3);
}

function buildPlant(scene, x, z) {
  const potMat  = new THREE.MeshStandardMaterial({ color: 0x2a3555, roughness: 0.8 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1a5c30, roughness: 0.9, flatShading: true });

  addBox(scene, new THREE.CylinderGeometry(0.22, 0.18, 0.35, 8), potMat, x, 0.175, z);
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22 - i * 0.03, 0.4, 6), leafMat);
    cone.position.set(x + (Math.random() - 0.5) * 0.1, 0.5 + i * 0.28, z + (Math.random() - 0.5) * 0.1);
    cone.castShadow = true;
    scene.add(cone);
  }
}

function buildWallText(scene, text, x, y, z, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.3;
  ctx.fillText(text, 256, 32);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), mat);
  mesh.position.set(x, y, z + 0.1);
  scene.add(mesh);
}

// ─── Util ──────────────────────────────────────────────────────────────────

function addBox(scene, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
