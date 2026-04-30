import * as THREE from 'three';

// ─── Palette (closed, low-poly) ───────────────────────────────────────────

const PAL = {
  bg:        0xeee5d2,
  floor:     0xd9ccb3,
  floorAlt:  0xcfc1a4,
  grout:     0xb6a78b,
  carpet:    0x8e7762,
  carpetAlt: 0x6f5b48,
  wood:      0x9a7349,
  woodDark:  0x6e4f30,
  wallPaint: 0xeadbc1,
  wallTrim:  0xcdb997,
  wallAccent:0x4a5b80,
  wallBoss:  0x2e3656,
  metal:     0xa9a9b0,
  metalDark: 0x6c6c75,
  glass:     0xb6dde2,
  black:     0x252830,
  paper:     0xf3ead4,
  plant:     0x4f8a4a,
  plantDk:   0x305c2c,
  pot:       0x9d6849,
  brand:     0x6c63ff,
  teal:      0x4ab8b0,
  warm:      0xe8a857,
  pink:      0xe07a8e,
  screen:    0x1a2236,
};

const M = {
  floor:     new THREE.MeshStandardMaterial({ color: PAL.floor,     roughness: 0.95, flatShading: true }),
  floorAlt:  new THREE.MeshStandardMaterial({ color: PAL.floorAlt,  roughness: 0.95, flatShading: true }),
  carpet:    new THREE.MeshStandardMaterial({ color: PAL.carpet,    roughness: 1.0,  flatShading: true }),
  carpetAlt: new THREE.MeshStandardMaterial({ color: PAL.carpetAlt, roughness: 1.0,  flatShading: true }),
  wallPaint: new THREE.MeshStandardMaterial({ color: PAL.wallPaint, roughness: 0.92, flatShading: true }),
  wallTrim:  new THREE.MeshStandardMaterial({ color: PAL.wallTrim,  roughness: 0.92, flatShading: true }),
  wallAccent:new THREE.MeshStandardMaterial({ color: PAL.wallAccent,roughness: 0.85, flatShading: true }),
  wallBoss:  new THREE.MeshStandardMaterial({ color: PAL.wallBoss,  roughness: 0.85, flatShading: true }),
  wood:      new THREE.MeshStandardMaterial({ color: PAL.wood,      roughness: 0.7,  flatShading: true }),
  woodDark:  new THREE.MeshStandardMaterial({ color: PAL.woodDark,  roughness: 0.7,  flatShading: true }),
  metal:     new THREE.MeshStandardMaterial({ color: PAL.metal,     roughness: 0.4,  metalness: 0.5, flatShading: true }),
  metalDark: new THREE.MeshStandardMaterial({ color: PAL.metalDark, roughness: 0.5,  metalness: 0.4, flatShading: true }),
  glass:     new THREE.MeshStandardMaterial({ color: PAL.glass,     roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  black:     new THREE.MeshStandardMaterial({ color: PAL.black,     roughness: 0.6,  flatShading: true }),
  paper:     new THREE.MeshStandardMaterial({ color: PAL.paper,     roughness: 0.95, flatShading: true }),
  plant:     new THREE.MeshStandardMaterial({ color: PAL.plant,     roughness: 0.9,  flatShading: true }),
  plantDk:   new THREE.MeshStandardMaterial({ color: PAL.plantDk,   roughness: 0.9,  flatShading: true }),
  pot:       new THREE.MeshStandardMaterial({ color: PAL.pot,       roughness: 0.85, flatShading: true }),
  brand:     new THREE.MeshStandardMaterial({ color: PAL.brand,     roughness: 0.6,  flatShading: true }),
  teal:      new THREE.MeshStandardMaterial({ color: PAL.teal,      roughness: 0.65, flatShading: true }),
  warm:      new THREE.MeshStandardMaterial({ color: PAL.warm,      roughness: 0.75, flatShading: true }),
  pink:      new THREE.MeshStandardMaterial({ color: PAL.pink,      roughness: 0.75, flatShading: true }),
  screen:    new THREE.MeshStandardMaterial({ color: PAL.screen,    roughness: 0.5,  emissive: 0x1a2236, emissiveIntensity: 0.4, flatShading: true }),
};

// ─── Layout constants ──────────────────────────────────────────────────────

const FLOOR_W = 32, FLOOR_D = 20;
const WALL_H  = 3.0;
const WALL_T  = 0.3;

// ─── Zones (kept compatible with Agent.js) ────────────────────────────────

export const ZONES = {
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
  BOSS_OFFICE:  new THREE.Vector3(8.5, 0, -6.0),
  MEETING_ROOM: new THREE.Vector3(8.5, 0,  0.3),
  REST_ROOM:    new THREE.Vector3(8.5, 0,  6.5),
  WANDER: [
    new THREE.Vector3(-11, 0,  2),
    new THREE.Vector3(-7,  0,  3),
    new THREE.Vector3(-4,  0, -3),
    new THREE.Vector3(-9,  0, -2),
    new THREE.Vector3(-2,  0,  6),
  ]
};

export const ALL_DESK_SPOTS = [
  ...ZONES.DESK_ROW1, ...ZONES.DESK_ROW2, ...ZONES.DESK_ROW3
];

// ─── Build entry ───────────────────────────────────────────────────────────

export function buildOffice(scene) {
  buildFloor(scene);
  buildOuterWalls(scene);
  buildDividers(scene);
  buildWorkspace(scene);
  buildBossOffice(scene);
  buildMeetingRoom(scene);
  buildRestRoom(scene);
  buildSignage(scene);
}

// ─── Floor ─────────────────────────────────────────────────────────────────

function buildFloor(scene) {
  // Tile pattern via texture (1 draw call instead of hundreds)
  const tileMat = makeTileFloorMaterial();
  const base = mesh(new THREE.PlaneGeometry(FLOOR_W, FLOOR_D), tileMat);
  base.rotation.x = -Math.PI / 2;
  base.receiveShadow = true;
  scene.add(base);

  // Workspace carpet zone (left half)
  const carpet = mesh(new THREE.PlaneGeometry(15, 18), M.carpet);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(-7.5, 0.003, 0);
  carpet.receiveShadow = true;
  scene.add(carpet);

  // Carpet trim (slightly darker border)
  addCarpetTrim(scene, -7.5, 0, 15, 18, 0.15);

  // Boss office wood floor
  const bossFloor = mesh(new THREE.PlaneGeometry(13.4, 7.2), M.wood);
  bossFloor.rotation.x = -Math.PI / 2;
  bossFloor.position.set(8.85, 0.003, -6.25);
  bossFloor.receiveShadow = true;
  scene.add(bossFloor);
  addWoodPlanks(scene, 8.85, -6.25, 13.4, 7.2);

  // Rest room soft carpet
  const restFloor = mesh(new THREE.PlaneGeometry(13.4, 6.7), M.carpetAlt);
  restFloor.rotation.x = -Math.PI / 2;
  restFloor.position.set(8.85, 0.003, 6.5);
  restFloor.receiveShadow = true;
  scene.add(restFloor);
}

function makeTileFloorMaterial() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  // 2x2 tile pattern: light, dark, dark, light
  ctx.fillStyle = '#d9ccb3'; ctx.fillRect(0,  0, 32, 32);
  ctx.fillStyle = '#cfc1a4'; ctx.fillRect(32, 0, 32, 32);
  ctx.fillStyle = '#cfc1a4'; ctx.fillRect(0, 32, 32, 32);
  ctx.fillStyle = '#d9ccb3'; ctx.fillRect(32,32, 32, 32);
  // Grout lines
  ctx.fillStyle = '#b6a78b';
  ctx.fillRect(31, 0, 2, 64);
  ctx.fillRect(0, 31, 64, 2);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(FLOOR_W / 2, FLOOR_D / 2);  // 1 canvas = 2 floor units
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.anisotropy = 4;

  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
}

function addCarpetTrim(scene, cx, cz, w, d, t) {
  const stripMat = M.carpetAlt;
  // Four borders
  scene.add(boxAt(cx - w/2 + t/2, 0.004, cz, t, 0.005, d, stripMat));
  scene.add(boxAt(cx + w/2 - t/2, 0.004, cz, t, 0.005, d, stripMat));
  scene.add(boxAt(cx, 0.004, cz - d/2 + t/2, w, 0.005, t, stripMat));
  scene.add(boxAt(cx, 0.004, cz + d/2 - t/2, w, 0.005, t, stripMat));
}

function addWoodPlanks(scene, cx, cz, w, d) {
  // Subtle plank lines
  const lineMat = M.woodDark;
  const planks = 8;
  const step = d / planks;
  for (let i = 1; i < planks; i++) {
    scene.add(boxAt(cx, 0.005, cz - d/2 + i * step, w * 0.99, 0.003, 0.04, lineMat));
  }
}

// ─── Outer walls (only back + left visible from iso camera) ───────────────

function buildOuterWalls(scene) {
  const h = WALL_H;

  // Back wall (z = -10) — full width
  const back = boxAt(0, h/2, -FLOOR_D/2 + WALL_T/2, FLOOR_W, h, WALL_T, M.wallPaint);
  back.castShadow = true;
  scene.add(back);

  // Left wall (x = -16)
  const left = boxAt(-FLOOR_W/2 + WALL_T/2, h/2, 0, WALL_T, h, FLOOR_D, M.wallPaint);
  left.castShadow = true;
  scene.add(left);

  // Wall trims (baseboard)
  scene.add(boxAt(0, 0.12, -FLOOR_D/2 + WALL_T + 0.05, FLOOR_W - WALL_T*2, 0.24, 0.05, M.wallTrim));
  scene.add(boxAt(-FLOOR_W/2 + WALL_T + 0.05, 0.12, 0, 0.05, 0.24, FLOOR_D - WALL_T*2, M.wallTrim));

  // Crown molding at top
  scene.add(boxAt(0, h - 0.08, -FLOOR_D/2 + WALL_T + 0.04, FLOOR_W - WALL_T*2, 0.16, 0.04, M.wallTrim));
  scene.add(boxAt(-FLOOR_W/2 + WALL_T + 0.04, h - 0.08, 0, 0.04, 0.16, FLOOR_D - WALL_T*2, M.wallTrim));

  // Workspace back-wall accent (darker band behind desks)
  const accent = boxAt(-7.5, 1.6, -FLOOR_D/2 + WALL_T + 0.02, 13, 2, 0.04, M.wallAccent);
  scene.add(accent);

  // Three workspace windows on back wall
  buildBackWindows(scene);
}

function buildBackWindows(scene) {
  const z = -FLOOR_D/2 + WALL_T + 0.03;
  [-11, -7.5, -4].forEach(x => {
    // Frame
    scene.add(boxAt(x, 1.95, z, 2.4, 1.4, 0.04, M.wallTrim));
    // Glass
    scene.add(boxAt(x, 1.95, z + 0.025, 2.2, 1.2, 0.02, M.glass));
    // Cross mullion
    scene.add(boxAt(x, 1.95, z + 0.03, 2.2, 0.05, 0.01, M.wallTrim));
    scene.add(boxAt(x, 1.95, z + 0.03, 0.05, 1.2, 0.01, M.wallTrim));
    // Sill
    scene.add(boxAt(x, 1.22, z + 0.04, 2.5, 0.1, 0.16, M.wallTrim));
  });
}

// ─── Internal dividers ────────────────────────────────────────────────────

function buildDividers(scene) {
  const h = WALL_H;

  // Vertical divider between workspace and rooms (at x=2)
  // Top section z=-10 to z=-3 (length 7)
  scene.add(boxAt(2.0, h/2, -6.5, WALL_T, h, 7, M.wallPaint));
  // Bottom section z=3 to z=10 (length 7)
  scene.add(boxAt(2.0, h/2,  6.5, WALL_T, h, 7, M.wallPaint));
  // Door frame (top header + side stubs)
  scene.add(boxAt(2.0, h - 0.25, 0, WALL_T, 0.5, 6, M.wallTrim));

  // Horizontal divider between Boss Office and Meeting Room (z=-2.5)
  buildHalfWallWithGlass(scene, 2.0, FLOOR_W/2 - WALL_T, -2.5);
  // Horizontal divider between Meeting Room and Rest Room (z=3.0)
  buildHalfWallWithGlass(scene, 2.0, FLOOR_W/2 - WALL_T, 3.0);
}

function buildHalfWallWithGlass(scene, xStart, xEnd, z) {
  const len = xEnd - xStart;
  const cx  = (xStart + xEnd) / 2;
  // Solid kick bottom (0 to 1.0)
  scene.add(boxAt(cx, 0.5, z, len, 1.0, WALL_T, M.wallPaint));
  // Glass middle (1.0 to 2.4)
  scene.add(boxAt(cx, 1.7, z, len, 1.4, 0.04, M.glass));
  // Top trim (2.4 to 2.6)
  scene.add(boxAt(cx, 2.5, z, len, 0.2, WALL_T, M.wallTrim));
  // Vertical posts
  scene.add(boxAt(xStart + 0.05, 1.7, z, 0.08, 1.4, WALL_T, M.wallTrim));
  scene.add(boxAt(xEnd - 0.05,   1.7, z, 0.08, 1.4, WALL_T, M.wallTrim));
}

// ─── Workspace ─────────────────────────────────────────────────────────────

function buildWorkspace(scene) {
  const accents = [M.brand, M.teal, M.pink];

  [ZONES.DESK_ROW1, ZONES.DESK_ROW2, ZONES.DESK_ROW3].forEach((row, ri) => {
    row.forEach((pos, ci) => {
      const desk = buildDesk(accents[ri]);
      desk.position.copy(pos);
      // Alternate orientation per row so they face each other? keep facing back wall
      scene.add(desk);

      // Office chair behind desk (user side)
      const chair = buildChair();
      chair.position.set(pos.x, 0, pos.z + 0.85);
      chair.rotation.y = Math.PI;  // back of chair facing user away from desk
      scene.add(chair);
    });
  });

  // Plants in workspace corners
  buildPlant(scene, -14.3, -8.5, 0.55);
  buildPlant(scene, -14.3,  8.5, 0.55);

  // Trash bin in corner
  buildTrashBin(scene, -1, -8.5);

  // Whiteboard on left wall
  buildWallWhiteboard(scene, -FLOOR_W/2 + WALL_T + 0.04, 1.7, 7.5, 'left');

  // Floor lamp in workspace corner
  buildFloorLamp(scene, -1, 8);
}

// Desk: surface, legs, monitor with accent edge, keyboard, paper stack, mug
function buildDesk(accentMat) {
  const g = new THREE.Group();

  // Surface
  const top = mesh(new THREE.BoxGeometry(2.2, 0.07, 1.0), M.wood);
  top.position.y = 0.78;
  top.castShadow = top.receiveShadow = true;
  g.add(top);

  // Apron under top
  const apron = mesh(new THREE.BoxGeometry(2.1, 0.18, 0.05), M.woodDark);
  apron.position.set(0, 0.66, -0.45);
  g.add(apron);

  // Two trestle legs
  [-0.92, 0.92].forEach(lx => {
    const leg = mesh(new THREE.BoxGeometry(0.12, 0.74, 0.85), M.metalDark);
    leg.position.set(lx, 0.37, 0);
    leg.castShadow = true;
    g.add(leg);
    // Foot
    const foot = mesh(new THREE.BoxGeometry(0.18, 0.04, 0.95), M.metal);
    foot.position.set(lx, 0.02, 0);
    g.add(foot);
  });

  // Monitor
  const screen = mesh(new THREE.BoxGeometry(1.05, 0.6, 0.04), M.screen);
  screen.position.set(0, 1.25, -0.3);
  g.add(screen);
  const bezel = mesh(new THREE.BoxGeometry(1.1, 0.66, 0.05), M.black);
  bezel.position.set(0, 1.25, -0.32);
  g.add(bezel);
  // Accent strip on bezel
  const strip = mesh(new THREE.BoxGeometry(1.1, 0.025, 0.025), accentMat);
  strip.position.set(0, 0.94, -0.32);
  g.add(strip);
  // Stand
  const stand = mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), M.black);
  stand.position.set(0, 0.91, -0.3);
  g.add(stand);
  const standBase = mesh(new THREE.BoxGeometry(0.4, 0.025, 0.18), M.black);
  standBase.position.set(0, 0.825, -0.3);
  g.add(standBase);

  // Keyboard
  const kb = mesh(new THREE.BoxGeometry(0.78, 0.025, 0.24), M.black);
  kb.position.set(-0.05, 0.83, 0.15);
  g.add(kb);

  // Mouse
  const mouse = mesh(new THREE.BoxGeometry(0.1, 0.025, 0.16), M.black);
  mouse.position.set(0.5, 0.83, 0.15);
  g.add(mouse);

  // Paper stack
  const papers = mesh(new THREE.BoxGeometry(0.32, 0.05, 0.24), M.paper);
  papers.position.set(-0.85, 0.84, -0.05);
  g.add(papers);

  // Coffee mug (cylinder + handle)
  const mug = new THREE.Group();
  const cup = mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 12), accentMat);
  cup.position.y = 0.06;
  mug.add(cup);
  const handle = mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12, Math.PI), accentMat);
  handle.position.set(0.075, 0.06, 0);
  handle.rotation.y = Math.PI / 2;
  mug.add(handle);
  mug.position.set(0.85, 0.815, 0);
  g.add(mug);

  return g;
}

function buildChair() {
  const g = new THREE.Group();
  // Seat
  const seat = mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), M.black);
  seat.position.y = 0.45;
  seat.castShadow = true;
  g.add(seat);
  // Back
  const back = mesh(new THREE.BoxGeometry(0.5, 0.7, 0.08), M.black);
  back.position.set(0, 0.85, -0.22);
  g.add(back);
  // Pillar
  const pillar = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), M.metalDark);
  pillar.position.y = 0.2;
  g.add(pillar);
  // Star base — 5 spokes
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = mesh(new THREE.BoxGeometry(0.32, 0.04, 0.05), M.metalDark);
    spoke.position.set(Math.cos(a) * 0.16, 0.04, Math.sin(a) * 0.16);
    spoke.rotation.y = -a;
    g.add(spoke);
  }
  return g;
}

// ─── Boss Office ──────────────────────────────────────────────────────────

function buildBossOffice(scene) {
  const cx = 8.5, cz = -6.0;

  // Accent wall (boss-only, dark navy)
  scene.add(boxAt(cx, 1.5, -FLOOR_D/2 + WALL_T + 0.04, 12.4, 2.4, 0.04, M.wallBoss));

  // Brand stripe at base of accent wall
  scene.add(boxAt(cx, 0.45, -FLOOR_D/2 + WALL_T + 0.07, 12.4, 0.05, 0.02, M.brand));

  // Executive L-desk
  const desk = buildExecDesk();
  desk.position.set(cx + 1, 0, cz);
  scene.add(desk);

  // Exec chair
  const chair = buildExecChair();
  chair.position.set(cx + 1, 0, cz + 1.0);
  chair.rotation.y = Math.PI;
  scene.add(chair);

  // Bookshelf along boss back wall
  buildBookshelf(scene, cx - 4.5, -FLOOR_D/2 + WALL_T + 0.5);

  // Framed art on accent wall
  buildFrame(scene, cx + 3.5, 2.0, -FLOOR_D/2 + WALL_T + 0.06, 1.4, 0.9, M.brand);

  // Two visitor chairs in front of desk
  const v1 = buildChair();
  v1.position.set(cx - 0.5, 0, cz - 0.6);
  v1.rotation.y = 0.3;
  scene.add(v1);
  const v2 = buildChair();
  v2.position.set(cx + 0.7, 0, cz - 0.7);
  v2.rotation.y = -0.4;
  scene.add(v2);

  // Plant
  buildPlant(scene, cx + 5, cz + 1.8, 0.5);

  // Floor lamp
  buildFloorLamp(scene, cx + 5.4, cz - 1.5);
}

function buildExecDesk() {
  const g = new THREE.Group();

  // Main slab
  const main = mesh(new THREE.BoxGeometry(2.8, 0.09, 1.2), M.woodDark);
  main.position.y = 0.78;
  main.castShadow = main.receiveShadow = true;
  g.add(main);

  // Cabinet on left
  const cab = mesh(new THREE.BoxGeometry(0.9, 0.7, 1.2), M.wood);
  cab.position.set(-1.4, 0.35, 0);
  cab.castShadow = true;
  g.add(cab);
  // Drawer lines
  for (let i = 0; i < 3; i++) {
    const line = mesh(new THREE.BoxGeometry(0.86, 0.01, 0.01), M.woodDark);
    line.position.set(-1.4, 0.16 + i * 0.22, 0.61);
    g.add(line);
    const handle = mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), M.metal);
    handle.position.set(-1.4, 0.16 + i * 0.22 + 0.11, 0.62);
    g.add(handle);
  }

  // Front panel
  const panel = mesh(new THREE.BoxGeometry(2.8, 0.5, 0.05), M.woodDark);
  panel.position.set(0, 0.5, -0.55);
  g.add(panel);
  // Brand stripe
  const stripe = mesh(new THREE.BoxGeometry(2.0, 0.025, 0.02), M.brand);
  stripe.position.set(0.4, 0.7, -0.575);
  g.add(stripe);

  // Right side leg
  const leg = mesh(new THREE.BoxGeometry(0.08, 0.74, 1.1), M.woodDark);
  leg.position.set(1.36, 0.37, 0);
  g.add(leg);

  // Dual monitors
  [-0.6, 0.6].forEach(ox => {
    const sc = mesh(new THREE.BoxGeometry(0.95, 0.58, 0.04), M.screen);
    sc.position.set(ox, 1.22, -0.32);
    g.add(sc);
    const bz = mesh(new THREE.BoxGeometry(1.0, 0.62, 0.05), M.black);
    bz.position.set(ox, 1.22, -0.34);
    g.add(bz);
    const st = mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), M.black);
    st.position.set(ox, 0.91, -0.32);
    g.add(st);
  });
  // Brand strip on monitor bezels
  const bs = mesh(new THREE.BoxGeometry(2.1, 0.022, 0.022), M.brand);
  bs.position.set(0, 0.92, -0.34);
  g.add(bs);

  // Keyboard, mouse, mug, papers
  const kb = mesh(new THREE.BoxGeometry(0.78, 0.025, 0.24), M.black);
  kb.position.set(0.1, 0.83, 0.18);
  g.add(kb);
  const mouse = mesh(new THREE.BoxGeometry(0.1, 0.025, 0.16), M.black);
  mouse.position.set(0.65, 0.83, 0.18);
  g.add(mouse);

  // Desk lamp (articulated arm style — simplified)
  const lampBase = mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.04, 12), M.metal);
  lampBase.position.set(-0.85, 0.84, 0.0);
  g.add(lampBase);
  const lampArm = mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), M.metalDark);
  lampArm.position.set(-0.85, 1.06, 0);
  g.add(lampArm);
  const lampHead = mesh(new THREE.ConeGeometry(0.12, 0.18, 8), M.warm);
  lampHead.position.set(-0.78, 1.28, 0);
  lampHead.rotation.z = -0.6;
  g.add(lampHead);

  return g;
}

function buildExecChair() {
  const g = new THREE.Group();
  const seat = mesh(new THREE.BoxGeometry(0.6, 0.1, 0.55), M.wallBoss);
  seat.position.y = 0.5; seat.castShadow = true; g.add(seat);
  const back = mesh(new THREE.BoxGeometry(0.6, 1.0, 0.1), M.wallBoss);
  back.position.set(0, 1.0, -0.22); g.add(back);
  // Headrest accent
  const headrest = mesh(new THREE.BoxGeometry(0.55, 0.1, 0.08), M.brand);
  headrest.position.set(0, 1.42, -0.21); g.add(headrest);
  // Pillar
  const pillar = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), M.metalDark);
  pillar.position.y = 0.25; g.add(pillar);
  // Star base
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = mesh(new THREE.BoxGeometry(0.36, 0.05, 0.06), M.metalDark);
    spoke.position.set(Math.cos(a) * 0.18, 0.05, Math.sin(a) * 0.18);
    spoke.rotation.y = -a;
    g.add(spoke);
  }
  return g;
}

function buildBookshelf(scene, x, z) {
  // Carcass
  scene.add(boxAt(x, 1.1, z, 0.4, 2.2, 1.6, M.woodDark));
  // Shelves
  for (let i = 0; i < 4; i++) {
    scene.add(boxAt(x + 0.04, 0.3 + i * 0.55, z, 0.32, 0.04, 1.5, M.wood));
  }
  // Book spines
  const spineColors = [M.brand, M.teal, M.pink, M.warm, M.paper, M.wallBoss];
  for (let row = 0; row < 4; row++) {
    let bz = z - 0.65;
    while (bz < z + 0.6) {
      const w = 0.08 + Math.random() * 0.05;
      const h = 0.32 + Math.random() * 0.08;
      const mat = spineColors[Math.floor(Math.random() * spineColors.length)];
      scene.add(boxAt(x + 0.15, 0.5 + row * 0.55 + h/2 - 0.04, bz + w/2, 0.1, h, w, mat));
      bz += w + 0.005;
    }
  }
  // Decorative items on top
  const vase = mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.25, 10), M.wallBoss);
  vase.position.set(x + 0.05, 2.32, z - 0.3);
  scene.add(vase);
  const stack = mesh(new THREE.BoxGeometry(0.32, 0.16, 0.24), M.paper);
  stack.position.set(x + 0.05, 2.28, z + 0.4);
  scene.add(stack);
}

function buildFrame(scene, x, y, z, w, h, accent) {
  scene.add(boxAt(x, y, z, w, h, 0.04, M.wood));
  scene.add(boxAt(x, y, z + 0.025, w * 0.9, h * 0.88, 0.015, accent));
  scene.add(boxAt(x, y + h * 0.3, z + 0.03, w * 0.55, 0.025, 0.005, M.paper));
  scene.add(boxAt(x, y - h * 0.1, z + 0.03, w * 0.7, 0.025, 0.005, M.paper));
  scene.add(boxAt(x, y - h * 0.3, z + 0.03, w * 0.4, 0.025, 0.005, M.paper));
}

// ─── Meeting Room ─────────────────────────────────────────────────────────

function buildMeetingRoom(scene) {
  const cx = 8.5, cz = 0.3;

  // Round table
  const top = mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 24), M.wood);
  top.position.set(cx, 0.78, cz);
  top.castShadow = top.receiveShadow = true;
  scene.add(top);
  // Pedestal
  const ped = mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.74, 12), M.metalDark);
  ped.position.set(cx, 0.37, cz);
  scene.add(ped);
  const baseFoot = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.06, 16), M.metalDark);
  baseFoot.position.set(cx, 0.03, cz);
  scene.add(baseFoot);

  // 6 chairs around
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const ch = buildMeetingChair();
    ch.position.set(cx + Math.cos(a) * 2.1, 0, cz + Math.sin(a) * 2.1);
    ch.rotation.y = -a + Math.PI / 2;
    scene.add(ch);
  }

  // Centerpiece on table — laptop + papers
  const laptop = mesh(new THREE.BoxGeometry(0.55, 0.03, 0.4), M.metal);
  laptop.position.set(cx, 0.835, cz);
  scene.add(laptop);
  const screen = mesh(new THREE.BoxGeometry(0.55, 0.4, 0.025), M.screen);
  screen.position.set(cx, 1.05, cz - 0.18);
  screen.rotation.x = -0.15;
  scene.add(screen);

  // Whiteboard on back wall
  scene.add(boxAt(cx, 1.7, -FLOOR_D/2 + WALL_T + 0.04, 3.4, 1.6, 0.05, M.paper));
  scene.add(boxAt(cx, 1.7, -FLOOR_D/2 + WALL_T + 0.06, 3.5, 1.7, 0.04, M.wallTrim));
  // Marker tray
  scene.add(boxAt(cx, 0.9, -FLOOR_D/2 + WALL_T + 0.08, 3.4, 0.04, 0.1, M.wallTrim));
  // Marker
  scene.add(boxAt(cx - 1.0, 0.93, -FLOOR_D/2 + WALL_T + 0.12, 0.12, 0.025, 0.025, M.brand));
  scene.add(boxAt(cx - 0.6, 0.93, -FLOOR_D/2 + WALL_T + 0.12, 0.12, 0.025, 0.025, M.teal));
  // Whiteboard "writing" — diagonal lines
  const lineMat = M.wallAccent;
  scene.add(boxAt(cx - 0.7, 2.1, -FLOOR_D/2 + WALL_T + 0.07, 1.6, 0.025, 0.005, lineMat));
  scene.add(boxAt(cx - 0.5, 1.85, -FLOOR_D/2 + WALL_T + 0.07, 2.0, 0.025, 0.005, lineMat));
  scene.add(boxAt(cx + 0.4, 1.6, -FLOOR_D/2 + WALL_T + 0.07, 1.2, 0.025, 0.005, lineMat));

  // Water cooler in corner
  buildWaterCooler(scene, cx - 5.2, cz - 1.8);

  // Pendant light hanging over table (visual only)
  const pendant = mesh(new THREE.CylinderGeometry(0.4, 0.32, 0.12, 16), M.warm);
  pendant.position.set(cx, 2.7, cz);
  scene.add(pendant);
  const cord = mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), M.metalDark);
  cord.position.set(cx, 2.85, cz);
  scene.add(cord);
}

function buildMeetingChair() {
  const g = new THREE.Group();
  const seat = mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), M.wallAccent);
  seat.position.y = 0.46; seat.castShadow = true; g.add(seat);
  const back = mesh(new THREE.BoxGeometry(0.46, 0.5, 0.05), M.wallAccent);
  back.position.set(0, 0.74, -0.21); g.add(back);
  // 4 wood legs
  [[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]].forEach(([lx,lz]) => {
    const leg = mesh(new THREE.BoxGeometry(0.04, 0.46, 0.04), M.woodDark);
    leg.position.set(lx, 0.23, lz); g.add(leg);
  });
  return g;
}

function buildWaterCooler(scene, x, z) {
  // Bottle
  const bottle = mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.5, 12), M.glass);
  bottle.position.set(x, 1.2, z);
  scene.add(bottle);
  // Cap
  scene.add(boxAt(x, 1.48, z, 0.18, 0.06, 0.18, M.brand));
  // Body
  scene.add(boxAt(x, 0.55, z, 0.42, 0.95, 0.42, M.wallTrim));
  // Tap area
  scene.add(boxAt(x, 0.75, z + 0.21, 0.3, 0.18, 0.04, M.metalDark));
  scene.add(boxAt(x, 0.78, z + 0.24, 0.05, 0.05, 0.06, M.brand));
}

// ─── Rest Room ────────────────────────────────────────────────────────────

function buildRestRoom(scene) {
  const cx = 8.5, cz = 6.5;

  // L-shaped couch
  buildCouch(scene, cx - 0.5, cz - 1.2);

  // Coffee table
  scene.add(boxAt(cx, 0.32, cz, 1.6, 0.06, 0.8, M.wood));
  // Table legs
  [[-0.7,-0.3],[0.7,-0.3],[-0.7,0.3],[0.7,0.3]].forEach(([lx,lz]) => {
    scene.add(boxAt(cx + lx, 0.15, cz + lz, 0.06, 0.3, 0.06, M.woodDark));
  });
  // Magazines
  scene.add(boxAt(cx - 0.4, 0.36, cz, 0.5, 0.012, 0.32, M.brand));
  scene.add(boxAt(cx - 0.4, 0.375, cz - 0.05, 0.5, 0.012, 0.32, M.warm));
  // Plant pot on table
  buildSmallPlant(scene, cx + 0.5, cz, 0.36);

  // Kitchenette: fridge + microwave + counter
  buildKitchenette(scene, cx + 4.5, cz + 1.5);

  // TV on divider wall (z=3 side)
  buildWallTV(scene, cx, 1.7, 3.0 - WALL_T/2 - 0.04);

  // Floor lamp
  buildFloorLamp(scene, cx - 5.5, cz + 2);

  // Bean bag
  const bag = mesh(new THREE.SphereGeometry(0.5, 12, 8), M.warm);
  bag.position.set(cx - 4.5, 0.4, cz);
  bag.scale.set(1, 0.65, 1);
  bag.castShadow = true;
  scene.add(bag);

  // Plant
  buildPlant(scene, cx - 4, cz + 2.5, 0.5);
}

function buildCouch(scene, x, z) {
  // Long part
  scene.add(boxAt(x, 0.35, z, 2.6, 0.4, 0.8, M.wallAccent));
  // Backrest
  scene.add(boxAt(x, 0.7, z - 0.36, 2.6, 0.5, 0.18, M.wallAccent));
  // Cushions
  for (let i = -1; i <= 1; i++) {
    scene.add(boxAt(x + i * 0.83, 0.6, z, 0.78, 0.18, 0.7, M.wallBoss));
  }
  // Arm rests
  scene.add(boxAt(x - 1.34, 0.5, z, 0.12, 0.4, 0.8, M.wallAccent));
  scene.add(boxAt(x + 1.34, 0.5, z, 0.12, 0.4, 0.8, M.wallAccent));
  // Throw pillows
  const pillow1 = mesh(new THREE.BoxGeometry(0.32, 0.32, 0.12), M.warm);
  pillow1.position.set(x - 0.9, 0.78, z - 0.12);
  pillow1.rotation.z = 0.3;
  scene.add(pillow1);
  const pillow2 = mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), M.brand);
  pillow2.position.set(x + 0.9, 0.78, z - 0.1);
  pillow2.rotation.z = -0.2;
  scene.add(pillow2);
  // Legs
  [[-1.2,-0.3],[1.2,-0.3],[-1.2,0.3],[1.2,0.3]].forEach(([lx,lz]) => {
    scene.add(boxAt(x + lx, 0.08, z + lz, 0.06, 0.16, 0.06, M.woodDark));
  });
}

function buildKitchenette(scene, x, z) {
  // Counter
  scene.add(boxAt(x, 0.5, z, 1.6, 1.0, 0.7, M.wallTrim));
  // Counter top
  scene.add(boxAt(x, 1.02, z, 1.65, 0.05, 0.75, M.woodDark));
  // Fridge (smaller, beside)
  scene.add(boxAt(x + 1.4, 0.85, z, 0.7, 1.7, 0.7, M.wallPaint));
  // Fridge handle
  scene.add(boxAt(x + 1.4, 0.95, z + 0.36, 0.4, 0.04, 0.04, M.metalDark));
  scene.add(boxAt(x + 1.4, 1.45, z + 0.36, 0.04, 0.18, 0.04, M.metalDark));
  // Microwave on counter
  scene.add(boxAt(x - 0.4, 1.22, z, 0.6, 0.34, 0.5, M.metal));
  scene.add(boxAt(x - 0.4, 1.22, z + 0.26, 0.4, 0.24, 0.02, M.screen));
  // Coffee machine
  scene.add(boxAt(x + 0.5, 1.22, z - 0.05, 0.3, 0.4, 0.3, M.black));
  scene.add(boxAt(x + 0.5, 1.34, z + 0.12, 0.18, 0.16, 0.04, M.brand));
  // Mug on counter
  const mug = mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 10), M.warm);
  mug.position.set(x + 0.5, 1.1, z + 0.2);
  scene.add(mug);
}

function buildWallTV(scene, x, y, z) {
  scene.add(boxAt(x, y, z, 2.0, 1.1, 0.06, M.black));
  scene.add(boxAt(x, y, z - 0.005, 1.9, 1.0, 0.04, M.screen));
  // Mount
  scene.add(boxAt(x, y - 0.6, z + 0.03, 0.12, 0.18, 0.04, M.metalDark));
}

// ─── Decor helpers ─────────────────────────────────────────────────────────

function buildPlant(scene, x, z, scale = 1) {
  const g = new THREE.Group();
  // Pot
  const pot = mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 12), M.pot);
  pot.position.y = 0.25;
  pot.castShadow = true;
  g.add(pot);
  const rim = mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.06, 12), M.woodDark);
  rim.position.y = 0.5;
  g.add(rim);
  // Soil
  const soil = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), M.woodDark);
  soil.position.y = 0.52;
  g.add(soil);
  // Foliage layered cones
  for (let i = 0; i < 5; i++) {
    const cone = mesh(new THREE.ConeGeometry(0.32 - i * 0.04, 0.4, 6), i % 2 ? M.plant : M.plantDk);
    cone.position.y = 0.7 + i * 0.22;
    cone.position.x = (Math.random() - 0.5) * 0.06;
    cone.position.z = (Math.random() - 0.5) * 0.06;
    cone.castShadow = true;
    g.add(cone);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  scene.add(g);
}

function buildSmallPlant(scene, x, z, y = 0) {
  const g = new THREE.Group();
  const pot = mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.16, 8), M.pot);
  pot.position.y = 0.08;
  g.add(pot);
  for (let i = 0; i < 3; i++) {
    const cone = mesh(new THREE.ConeGeometry(0.14 - i * 0.03, 0.16, 6), i % 2 ? M.plant : M.plantDk);
    cone.position.y = 0.18 + i * 0.1;
    g.add(cone);
  }
  g.position.set(x, y, z);
  scene.add(g);
}

function buildTrashBin(scene, x, z) {
  const bin = mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.4, 10), M.metal);
  bin.position.set(x, 0.2, z);
  bin.castShadow = true;
  scene.add(bin);
  scene.add(boxAt(x, 0.4, z, 0.4, 0.04, 0.4, M.metalDark));
}

function buildFloorLamp(scene, x, z) {
  // Base
  scene.add(boxAt(x, 0.04, z, 0.32, 0.08, 0.32, M.metalDark));
  // Pole
  scene.add(boxAt(x, 1.05, z, 0.05, 2.0, 0.05, M.metalDark));
  // Shade
  const shade = mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.32, 14), M.warm);
  shade.position.set(x, 2.2, z);
  scene.add(shade);
}

function buildWallWhiteboard(scene, x, y, z, side = 'left') {
  const w = 2.4, h = 1.4, t = 0.05;
  if (side === 'left') {
    // mounted on left wall (faces +x)
    scene.add(boxAt(x + 0.04, y, z, t, h, w, M.paper));
    scene.add(boxAt(x + 0.06, y, z, 0.04, h + 0.1, w + 0.1, M.wallTrim));
    // Diagonal markings
    const lineMat = M.brand;
    scene.add(boxAt(x + 0.08, y + 0.4, z - 0.5, 0.005, 0.025, 0.8, lineMat));
    scene.add(boxAt(x + 0.08, y + 0.1, z + 0.2, 0.005, 0.025, 1.0, M.teal));
    scene.add(boxAt(x + 0.08, y - 0.3, z - 0.3, 0.005, 0.025, 0.6, M.warm));
  }
}

// ─── Signage ──────────────────────────────────────────────────────────────

function buildSignage(scene) {
  // Workspace label on accent strip
  const ws = makeTextMesh('LOCAL DE TRABALHO', 256, PAL.wallTrim, 'rgba(74,91,128,0)');
  ws.scale.set(3.6, 0.34, 1);
  ws.position.set(-7.5, 2.7, -FLOOR_D/2 + WALL_T + 0.06);
  scene.add(ws);

  // Boss office sign (above door, on divider)
  buildRoomSign(scene, 'SALA DO CHEFE', 8.5, 2.65, -2.5 - WALL_T/2 - 0.03, PAL.brand);
  buildRoomSign(scene, 'REUNIÃO',       8.5, 2.65,  3.0 - WALL_T/2 - 0.03, PAL.teal);
  buildRoomSign(scene, 'DESCANSO',      8.5, 2.65,  3.0 + WALL_T/2 + 0.03, PAL.warm, true);
}

function buildRoomSign(scene, text, x, y, z, color, faceFront = false) {
  const sign = makeTextMesh(text, 256, color, 'rgba(0,0,0,0)', true);
  sign.scale.set(2.6, 0.32, 1);
  sign.position.set(x, y, z);
  if (faceFront) sign.rotation.y = Math.PI;
  scene.add(sign);
}

function makeTextMesh(text, fontSize, color, bg, bold = false) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color;
  ctx.font = (bold ? 'bold ' : '') + '64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.95;
  ctx.fillText(text, c.width / 2, c.height / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), mat);
}

// ─── Util ──────────────────────────────────────────────────────────────────

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function boxAt(x, y, z, w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
