const DESK_SPOTS = [
  { x: 240, y: 430 },
  { x: 640, y: 400 },
  { x: 1040, y: 430 }
];

const WANDER_SPOTS = [
  { x: 400, y: 500 },
  { x: 800, y: 480 },
  { x: 160, y: 510 },
  { x: 1100, y: 510 }
];

const ALL_SPOTS = [...DESK_SPOTS, ...WANDER_SPOTS];

const THEMES = {
  jarbas:  { body: 0x6c63ff, dark: 0x4a42cc, skin: 0xffd5a8, hair: 0x2a1a55 },
  agent2:  { body: 0x00b4d8, dark: 0x0088aa, skin: 0xffd5a8, hair: 0x1a2a3a },
  agent3:  { body: 0xff6b9d, dark: 0xcc4477, skin: 0xffd5a8, hair: 0x2a1a1a },
  default: { body: 0x44cc88, dark: 0x228855, skin: 0xffd5a8, hair: 0x1a2a1a }
};

export default class OfficeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OfficeScene' });
    this.agents = {};
    this.ws = null;
  }

  create() {
    this.drawBackground();
    this.drawCeiling();
    this.drawFloor();
    this.drawDecorations();
    this.drawDesks();
    this.drawUI();
    this.connectWebSocket();
  }

  // ─── Environment ───────────────────────────────────────────────────────────

  drawBackground() {
    const g = this.add.graphics();

    // Sky outside (window fill)
    g.fillGradientStyle(0x0a1628, 0x0a1628, 0x142040, 0x142040, 1);
    g.fillRect(0, 0, 1280, 720);

    // Wall
    g.fillStyle(0x0c1022);
    g.fillRect(0, 0, 1280, 230);

    // Floor
    g.fillStyle(0x0f1526);
    g.fillRect(0, 225, 1280, 495);

    // Wall-floor divider (baseboard)
    g.fillStyle(0x1a2040);
    g.fillRect(0, 222, 1280, 8);
  }

  drawCeiling() {
    const g = this.add.graphics();

    // Ceiling strip
    g.fillStyle(0x080d1a);
    g.fillRect(0, 0, 1280, 18);

    // Suspended light tracks
    const trackPositions = [200, 560, 920];
    trackPositions.forEach(cx => {
      // Track rail
      g.fillStyle(0x1a2040);
      g.fillRect(cx - 100, 18, 200, 6);

      // Light fixture
      g.fillStyle(0x2a3060);
      g.fillRect(cx - 12, 24, 24, 14);

      // Light bulb glow (rendered via circle with low alpha)
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(cx - 8, 32, 16, 6);

      // Floor light pool
      g.fillGradientStyle(0xffffff, 0xffffff, 0x0f1526, 0x0f1526, 0.04, 0.04, 0, 0);
      g.fillEllipse(cx, 400, 340, 180);
    });
  }

  drawFloor() {
    const g = this.add.graphics();

    // Tile grid
    g.lineStyle(1, 0x141928, 0.9);
    for (let x = 0; x <= 1280; x += 80) g.lineBetween(x, 230, x, 720);
    for (let y = 230; y <= 720; y += 80) g.lineBetween(0, y, 1280, y);

    // Central carpet
    g.fillStyle(0x131828);
    g.fillRoundedRect(260, 440, 760, 200, 10);
    g.lineStyle(2, 0x1e2540);
    g.strokeRoundedRect(260, 440, 760, 200, 10);
    // Carpet inner border
    g.lineStyle(1, 0x252d50, 0.6);
    g.strokeRoundedRect(275, 452, 730, 176, 8);

    // Wall windows
    this.drawWindows(g);

    // Wall art / logo strip
    g.fillStyle(0xff4444, 0.15);
    g.fillRect(540, 30, 200, 4);
  }

  drawWindows(g) {
    [[100, 60], [600, 60], [1100, 60]].forEach(([x, y]) => {
      // Window frame
      g.fillStyle(0x141e34);
      g.fillRoundedRect(x - 55, y, 110, 140, 4);

      // Window glass (night sky gradient)
      g.fillGradientStyle(0x0a1c40, 0x0a1c40, 0x050d20, 0x050d20, 1);
      g.fillRect(x - 48, y + 8, 96, 122);

      // City lights (tiny dots)
      g.fillStyle(0xffffff, 0.6);
      [[x-30, y+80], [x-10, y+100], [x+20, y+75], [x+35, y+95], [x-40, y+110], [x+10, y+115]].forEach(([px, py]) => {
        g.fillRect(px, py, 2, 2);
      });
      g.fillStyle(0xffaa44, 0.5);
      [[x-20, y+90], [x+30, y+85], [x-5, y+108]].forEach(([px, py]) => {
        g.fillRect(px, py, 3, 3);
      });

      // Window divider
      g.fillStyle(0x141e34);
      g.fillRect(x - 4, y + 8, 8, 122);
      g.fillRect(x - 48, y + 68, 96, 6);

      // Window sill
      g.fillStyle(0x1a2440);
      g.fillRoundedRect(x - 58, y + 130, 116, 10, 3);
    });
  }

  drawDecorations() {
    // Plants
    this.drawPlant(60, 500);
    this.drawPlant(1220, 500);
    this.drawPlant(640, 260);

    // Whiteboard on wall
    const g = this.add.graphics();
    g.fillStyle(0x141e30);
    g.fillRoundedRect(340, 50, 220, 130, 6);
    g.lineStyle(2, 0x253055);
    g.strokeRoundedRect(340, 50, 220, 130, 6);
    g.fillStyle(0x0f1520);
    g.fillRect(348, 58, 204, 114);
    // Whiteboard lines (content)
    g.lineStyle(1, 0x6c63ff, 0.4);
    [[360,85,500,85],[360,100,480,100],[360,115,520,115],[360,130,460,130]].forEach(([x1,y1,x2,y2]) => g.lineBetween(x1,y1,x2,y2));
    g.lineStyle(1, 0xff6b9d, 0.3);
    g.lineBetween(360, 148, 440, 148);
    // Whiteboard label
    this.add.text(450, 185, 'WHITEBOARD', { fontSize: '8px', color: '#1e2540', fontFamily: 'monospace', letterSpacing: 2 });

    // Company name on wall
    this.add.text(640, 185, 'NEUVO', {
      fontSize: '28px', color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold',
      alpha: 0.15
    }).setOrigin(0.5);

    // Couch / lounge area (bottom right)
    this.drawCouch(1050, 580);
  }

  drawPlant(x, y) {
    const g = this.add.graphics();
    // Pot
    g.fillStyle(0x2a3050);
    g.fillTrapezoid ? null : null;
    g.fillRect(x - 14, y - 10, 28, 22);
    g.fillStyle(0x1e2440);
    g.fillRect(x - 18, y + 10, 36, 8);
    // Soil
    g.fillStyle(0x0d1018);
    g.fillEllipse(x, y - 8, 24, 10);
    // Leaves
    const leafColor = 0x1a5c30;
    const leafLight = 0x226b3a;
    g.fillStyle(leafColor);
    g.fillEllipse(x, y - 28, 20, 36);
    g.fillStyle(leafLight);
    g.fillEllipse(x - 14, y - 22, 18, 28);
    g.fillStyle(leafColor);
    g.fillEllipse(x + 14, y - 22, 18, 28);
    g.fillStyle(leafLight);
    g.fillEllipse(x, y - 38, 16, 24);
  }

  drawCouch(x, y) {
    const g = this.add.graphics();
    // Back
    g.fillStyle(0x1a2040);
    g.fillRoundedRect(x - 80, y - 40, 160, 28, 8);
    // Seat
    g.fillStyle(0x1e2550);
    g.fillRoundedRect(x - 80, y - 14, 160, 50, 8);
    g.lineStyle(1, 0x2a3570);
    g.strokeRoundedRect(x - 80, y - 14, 160, 50, 8);
    // Cushion divider
    g.lineStyle(1, 0x2a3060);
    g.lineBetween(x, y - 14, x, y + 36);
    // Armrests
    g.fillStyle(0x1a2040);
    g.fillRoundedRect(x - 90, y - 14, 14, 46, 4);
    g.fillRoundedRect(x + 76, y - 14, 14, 46, 4);
    // Legs
    g.fillStyle(0x151c30);
    [[x - 70, y + 36], [x + 70, y + 36]].forEach(([lx, ly]) => {
      g.fillRect(lx - 4, ly, 8, 12);
    });
    // Small table in front
    g.fillStyle(0x131828);
    g.fillRoundedRect(x - 40, y + 52, 80, 20, 6);
    g.lineStyle(1, 0x1e2540);
    g.strokeRoundedRect(x - 40, y + 52, 80, 20, 6);
    // Coffee mug on table
    g.fillStyle(0x6c63ff, 0.8);
    g.fillRect(x + 10, y + 46, 12, 14);
    g.lineStyle(1, 0x9990ff);
    g.strokeRect(x + 10, y + 46, 12, 14);
  }

  drawDesks() {
    DESK_SPOTS.forEach((spot, i) => {
      const theme = Object.values(THEMES)[i] || THEMES.default;
      this.drawDesk(spot.x, spot.y, theme.body);
    });
  }

  drawDesk(x, y, accentColor) {
    const g = this.add.graphics();

    // Desk shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x, y + 45, 200, 16);

    // Desk surface
    g.fillStyle(0x141e34);
    g.fillRoundedRect(x - 95, y - 30, 190, 75, 6);
    g.lineStyle(1, 0x1e2d50);
    g.strokeRoundedRect(x - 95, y - 30, 190, 75, 6);

    // Desk edge highlight
    g.lineStyle(1, 0x253060, 0.5);
    g.lineBetween(x - 92, y - 28, x + 92, y - 28);

    // Monitor stand
    g.fillStyle(0x0d1220);
    g.fillRect(x - 4, y - 62, 8, 34);
    g.fillRect(x - 20, y - 30, 40, 5);

    // Monitor frame
    g.fillStyle(0x0a0f1c);
    g.fillRoundedRect(x - 52, y - 120, 104, 62, 4);
    g.lineStyle(2, 0x1e2845);
    g.strokeRoundedRect(x - 52, y - 120, 104, 62, 4);

    // Screen glow
    g.fillStyle(accentColor, 0.08);
    g.fillRect(x - 49, y - 117, 98, 56);

    // Screen content (code lines)
    g.lineStyle(1, accentColor, 0.6);
    g.lineBetween(x - 40, y - 108, x - 40 + Phaser.Math.Between(40, 85), y - 108);
    g.lineStyle(1, accentColor, 0.35);
    g.lineBetween(x - 40, y - 97, x - 40 + Phaser.Math.Between(30, 75), y - 97);
    g.lineBetween(x - 32, y - 86, x - 32 + Phaser.Math.Between(50, 80), y - 86);
    g.lineStyle(1, 0x00ff88, 0.4);
    g.lineBetween(x - 40, y - 75, x - 40 + 10, y - 75);

    // Blinking cursor (static for now)
    g.fillStyle(accentColor, 0.8);
    g.fillRect(x - 29, y - 78, 2, 9);

    // Keyboard
    g.fillStyle(0x0e1525);
    g.fillRoundedRect(x - 48, y + 22, 96, 16, 3);
    g.lineStyle(1, 0x1a2540);
    g.strokeRoundedRect(x - 48, y + 22, 96, 16, 3);
    // Key rows
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 10; col++) {
        g.fillStyle(0x141e35);
        g.fillRoundedRect(x - 44 + col * 9 + (row * 2), y + 24 + row * 4, 7, 3, 1);
      }
    }

    // Mouse
    g.fillStyle(0x0e1525);
    g.fillEllipse(x + 64, y + 28, 18, 26);
    g.lineStyle(1, 0x1a2540);
    g.strokeEllipse(x + 64, y + 28, 18, 26);
    g.lineStyle(1, 0x1a2540, 0.5);
    g.lineBetween(x + 64, y + 18, x + 64, y + 26);

    // Desk lamp
    g.fillStyle(0x1a2445);
    g.fillRect(x - 80, y + 18, 6, 22);
    g.fillRect(x - 90, y + 38, 22, 5);
    g.fillEllipse(x - 72, y + 14, 22, 10);
    g.fillStyle(accentColor, 0.2);
    g.fillEllipse(x - 72, y + 18, 20, 8);

    // Coffee cup
    g.fillStyle(0x1e2840);
    g.fillRect(x + 74, y - 14, 16, 18);
    g.lineStyle(1, 0x2a3860);
    g.strokeRect(x + 74, y - 14, 16, 18);
    g.lineStyle(2, 0x2a3860);
    g.strokeArc(x + 90, y - 5, 5, -90, 90);

    // Name plate
    g.fillStyle(0x0d1220);
    g.fillRoundedRect(x - 30, y + 42, 60, 14, 3);
    g.lineStyle(1, accentColor, 0.4);
    g.strokeRoundedRect(x - 30, y + 42, 60, 14, 3);
  }

  // ─── Agent Character ───────────────────────────────────────────────────────

  spawnAgent(data) {
    const { id, name, state } = data;
    const theme = THEMES[id] || THEMES.default;

    const spot = Phaser.Utils.Array.GetRandom(DESK_SPOTS);
    const x = spot.x;
    const y = spot.y - 120;

    const root = this.add.container(x, y);
    const visual = this.add.container(0, 0);

    // Shadow
    const shadow = this.add.ellipse(0, 60, 42, 12, 0x000000, 0.4);

    // Legs
    const legL = this.add.rectangle(-8, 44, 11, 22, theme.dark);
    const legR = this.add.rectangle(8, 44, 11, 22, theme.dark);

    // Feet
    const footL = this.add.ellipse(-9, 56, 14, 8, theme.dark);
    const footR = this.add.ellipse(9, 56, 14, 8, theme.dark);

    // Body
    const bodyG = this.add.graphics();
    bodyG.fillStyle(theme.body);
    bodyG.fillRoundedRect(-18, 8, 36, 36, 8);

    // Shirt collar (lighter)
    const collarG = this.add.graphics();
    collarG.fillStyle(0xffffff, 0.15);
    collarG.fillTriangle(-6, 8, 6, 8, 0, 20);

    // Arms
    const armL = this.add.graphics();
    armL.fillStyle(theme.body);
    armL.fillRoundedRect(-28, 10, 12, 26, 6);

    const armR = this.add.graphics();
    armR.fillStyle(theme.body);
    armR.fillRoundedRect(16, 10, 12, 26, 6);

    // Hands
    const handL = this.add.circle(-22, 38, 6, theme.skin);
    const handR = this.add.circle(22, 38, 6, theme.skin);

    // Head
    const head = this.add.circle(0, -8, 18, theme.skin);

    // Hair
    const hairG = this.add.graphics();
    hairG.fillStyle(theme.hair);
    hairG.fillEllipse(0, -18, 36, 22);
    hairG.fillRect(-18, -18, 36, 10);

    // Eyes white
    const eyeLW = this.add.ellipse(-7, -10, 10, 11, 0xffffff);
    const eyeRW = this.add.ellipse(7, -10, 10, 11, 0xffffff);

    // Pupils
    const eyeL = this.add.circle(-7, -9, 4, 0x0d1117);
    const eyeR = this.add.circle(7, -9, 4, 0x0d1117);

    // Eye shine
    const shineL = this.add.circle(-5, -11, 1.5, 0xffffff);
    const shineR = this.add.circle(9, -11, 1.5, 0xffffff);

    // Smile
    const mouthG = this.add.graphics();
    mouthG.lineStyle(2, 0x5a3020, 0.8);
    mouthG.strokeArc(0, -2, 6, 10, 170);

    // Cheeks
    const cheekL = this.add.ellipse(-12, -4, 10, 6, theme.body, 0.25);
    const cheekR = this.add.ellipse(12, -4, 10, 6, theme.body, 0.25);

    visual.add([
      shadow, legL, legR, footL, footR,
      armL, armR, bodyG, collarG,
      handL, handR,
      head, hairG,
      eyeLW, eyeRW, eyeL, eyeR, shineL, shineR,
      mouthG, cheekL, cheekR
    ]);

    // Name tag (outside visual, doesn't flip)
    const label = this.add.text(0, -38, name, {
      fontSize: '11px',
      color: '#ccccff',
      fontFamily: 'monospace',
      backgroundColor: '#080b1acc',
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5, 1);

    // Status dot
    const dot = this.add.circle(20, -32, 5, state === 'working' ? 0xffaa00 : 0x00ff88);

    // Glow ring behind dot
    const dotGlow = this.add.circle(20, -32, 8, state === 'working' ? 0xffaa00 : 0x00ff88, 0.2);

    root.add([visual, label, dotGlow, dot]);

    const agent = {
      id, name, theme, state,
      root, visual,
      legL, legR, footL, footR,
      eyeL, eyeR, dot, dotGlow, label,
      bobbingTween: null,
      legTweenL: null,
      legTweenR: null
    };

    this.agents[id] = agent;
    this.startBobbing(agent);
    this.scheduleNextMove(agent);

    return agent;
  }

  startBobbing(agent) {
    if (agent.bobbingTween) agent.bobbingTween.stop();
    const dur = agent.state === 'working' ? 350 : 1100;

    agent.bobbingTween = this.tweens.add({
      targets: agent.visual,
      y: -5,
      duration: dur,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  startLegAnimation(agent) {
    if (agent.legTweenL) agent.legTweenL.stop();
    if (agent.legTweenR) agent.legTweenR.stop();

    agent.legTweenL = this.tweens.add({
      targets: agent.legL,
      angle: 18,
      duration: 280,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    agent.legTweenR = this.tweens.add({
      targets: agent.legR,
      angle: -18,
      duration: 280,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 140
    });
  }

  stopLegAnimation(agent) {
    if (agent.legTweenL) { agent.legTweenL.stop(); agent.legL.setAngle(0); }
    if (agent.legTweenR) { agent.legTweenR.stop(); agent.legR.setAngle(0); }
  }

  scheduleNextMove(agent) {
    const delay = Phaser.Math.Between(2500, 7000);
    this.time.delayedCall(delay, () => this.moveAgent(agent));
  }

  moveAgent(agent) {
    if (agent.state === 'working') {
      this.scheduleNextMove(agent);
      return;
    }

    const spot = Phaser.Utils.Array.GetRandom(ALL_SPOTS);
    const targetX = spot.x + Phaser.Math.Between(-20, 20);
    const targetY = (spot.y || 430) - 120 + Phaser.Math.Between(-10, 10);

    const dist = Math.abs(targetX - agent.root.x);
    const duration = dist * 4;

    // Flip direction
    agent.visual.setScale(targetX < agent.root.x ? -1 : 1, 1);

    this.startLegAnimation(agent);

    this.tweens.add({
      targets: agent.root,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Linear',
      onComplete: () => {
        this.stopLegAnimation(agent);
        agent.visual.setScale(1, 1);
        this.scheduleNextMove(agent);
      }
    });
  }

  setAgentState(id, state) {
    const agent = this.agents[id];
    if (!agent || agent.state === state) return;

    agent.state = state;
    const color = state === 'working' ? 0xffaa00 : 0x00ff88;
    agent.dot.setFillStyle(color);
    agent.dotGlow.setFillStyle(color);

    this.tweens.add({
      targets: [agent.dot, agent.dotGlow],
      scaleX: 2, scaleY: 2,
      duration: 200,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    this.startBobbing(agent);
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  drawUI() {
    // Top bar
    const g = this.add.graphics();
    g.fillStyle(0x080c18, 0.85);
    g.fillRect(0, 0, 1280, 28);
    g.lineStyle(1, 0x1a2040);
    g.lineBetween(0, 28, 1280, 28);

    // Logo
    this.add.text(640, 14, 'NEUVO OFFICE', {
      fontSize: '12px', color: '#ff4444', fontFamily: 'monospace',
      fontStyle: 'bold', letterSpacing: 4
    }).setOrigin(0.5, 0.5);

    // Gateway status
    this.gatewayDot = this.add.circle(16, 14, 5, 0xff3333);
    this.gatewayLabel = this.add.text(28, 8, 'gateway offline', {
      fontSize: '11px', color: '#444', fontFamily: 'monospace'
    });

    // Time (decorative)
    this.clockText = this.add.text(1264, 8, '', {
      fontSize: '11px', color: '#333', fontFamily: 'monospace'
    }).setOrigin(1, 0);

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const now = new Date();
        this.clockText.setText(now.toLocaleTimeString('pt-BR'));
      }
    });
  }

  // ─── WebSocket ─────────────────────────────────────────────────────────────

  connectWebSocket() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}`;

    try { this.ws = new WebSocket(url); }
    catch (_) { this.time.delayedCall(3000, () => this.connectWebSocket()); return; }

    this.ws.onopen = () => this.setGatewayStatus(true);

    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === 'init') {
        msg.agents.forEach(a => { if (!this.agents[a.id]) this.spawnAgent(a); });
      } else if (msg.type === 'agent_state') {
        this.setAgentState(msg.agent, msg.state);
      } else if (msg.type === 'gateway') {
        // gateway status is separate from our WS connection
      }
    };

    this.ws.onclose = () => {
      this.setGatewayStatus(false);
      this.time.delayedCall(3000, () => this.connectWebSocket());
    };
  }

  setGatewayStatus(online) {
    this.gatewayDot?.setFillStyle(online ? 0x00ff88 : 0xff3333);
    this.gatewayLabel?.setText(online ? 'online' : 'offline');
    this.gatewayLabel?.setColor(online ? '#00ff88' : '#444');
  }
}
