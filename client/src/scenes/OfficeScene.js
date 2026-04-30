const DESK_SPOTS = [
  { x: 260, y: 420 },
  { x: 640, y: 380 },
  { x: 1020, y: 420 }
];

const AGENT_COLORS = {
  jarbas: 0x6c63ff,
  default: 0x00b4d8
};

export default class OfficeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OfficeScene' });
    this.agents = {};
    this.ws = null;
    this.gatewayConnected = false;
  }

  create() {
    this.drawFloor();
    this.drawDesks();
    this.drawUI();
    this.connectWebSocket();
  }

  // ─── Office Drawing ────────────────────────────────────────────────────────

  drawFloor() {
    const g = this.add.graphics();

    // Main floor
    g.fillStyle(0x111428);
    g.fillRect(0, 200, 1280, 520);

    // Floor grid
    g.lineStyle(1, 0x1a1f3a, 0.8);
    for (let x = 0; x <= 1280; x += 64) g.lineBetween(x, 200, x, 720);
    for (let y = 200; y <= 720; y += 64) g.lineBetween(0, y, 1280, y);

    // Back wall
    g.fillStyle(0x0d1020);
    g.fillRect(0, 0, 1280, 210);

    // Wall-floor divider
    g.lineStyle(2, 0x2a2f55);
    g.lineBetween(0, 208, 1280, 208);

    // Wall lights (ambient glow strips)
    for (let x = 160; x < 1280; x += 300) {
      g.fillStyle(0x1e2040);
      g.fillRect(x, 30, 180, 6);
      g.fillStyle(0x4040aa, 0.15);
      g.fillRect(x, 36, 180, 40);
    }

    // Carpet / area rug in center
    g.fillStyle(0x13172e);
    g.fillRoundedRect(280, 480, 720, 180, 8);
    g.lineStyle(1, 0x222644);
    g.strokeRoundedRect(280, 480, 720, 180, 8);
  }

  drawDesks() {
    DESK_SPOTS.forEach((spot, i) => {
      const g = this.add.graphics();
      const { x, y } = spot;

      // Desk surface
      g.fillStyle(0x1e2240);
      g.fillRoundedRect(x - 90, y - 40, 180, 80, 6);
      g.lineStyle(1, 0x353b6a);
      g.strokeRoundedRect(x - 90, y - 40, 180, 80, 6);

      // Monitor base
      g.fillStyle(0x0d1117);
      g.fillRect(x - 5, y - 55, 10, 18);
      g.fillRect(x - 18, y - 38, 36, 5);

      // Monitor screen
      g.fillStyle(0x0a0e1a);
      g.fillRect(x - 48, y - 110, 96, 58);
      g.lineStyle(1, 0x2a3060);
      g.strokeRect(x - 48, y - 110, 96, 58);

      // Screen glow (agent color)
      const color = i === 0 ? 0x6c63ff : i === 1 ? 0x00b4d8 : 0xff6b9d;
      g.fillStyle(color, 0.07);
      g.fillRect(x - 46, y - 108, 92, 54);

      // Screen content (fake code lines)
      g.fillStyle(color, 0.5);
      for (let l = 0; l < 4; l++) {
        const lineW = Phaser.Math.Between(30, 80);
        g.fillRect(x - 40, y - 102 + l * 12, lineW, 3);
      }

      // Keyboard
      g.fillStyle(0x181c30);
      g.fillRoundedRect(x - 45, y + 20, 90, 14, 3);
      g.lineStyle(1, 0x252a45);
      g.strokeRoundedRect(x - 45, y + 20, 90, 14, 3);

      // Mouse
      g.fillStyle(0x181c30);
      g.fillEllipse(x + 60, y + 25, 20, 28);
      g.lineStyle(1, 0x252a45);
      g.strokeEllipse(x + 60, y + 25, 20, 28);
    });
  }

  drawUI() {
    // Logo top-right
    this.add.text(1264, 20, 'NEUVO', {
      fontSize: '18px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.add.text(1264, 42, 'OFFICE', {
      fontSize: '10px',
      color: '#444',
      fontFamily: 'monospace',
      letterSpacing: 4
    }).setOrigin(1, 0);

    // Gateway status
    this.gatewayDot = this.add.circle(20, 24, 5, 0xff4444);
    this.gatewayLabel = this.add.text(32, 18, 'gateway offline', {
      fontSize: '11px',
      color: '#555',
      fontFamily: 'monospace'
    });
  }

  // ─── Agent Character ───────────────────────────────────────────────────────

  spawnAgent(data) {
    const { id, name, state } = data;
    const color = AGENT_COLORS[id] || AGENT_COLORS.default;

    const startSpot = Phaser.Utils.Array.GetRandom(DESK_SPOTS);
    const x = startSpot.x + Phaser.Math.Between(-30, 30);
    const y = startSpot.y - 80;

    // Root container (handles X movement)
    const root = this.add.container(x, y);

    // Visual container (handles flip + bob)
    const visual = this.add.container(0, 0);

    // Shadow
    const shadow = this.add.ellipse(0, 52, 36, 10, 0x000000, 0.35);

    // Body
    const body = this.add.rectangle(0, 20, 28, 38, color);
    body.setStrokeStyle(1, 0xffffff, 0.15);

    // Head
    const head = this.add.circle(0, -8, 15, color);
    head.setStrokeStyle(1, 0xffffff, 0.2);

    // Eyes
    const eyeL = this.add.circle(-5, -10, 3, 0xffffff);
    const eyeR = this.add.circle(5, -10, 3, 0xffffff);
    const pupilL = this.add.circle(-5, -10, 1.5, 0x0d1117);
    const pupilR = this.add.circle(5, -10, 1.5, 0x0d1117);

    visual.add([shadow, body, head, eyeL, eyeR, pupilL, pupilR]);

    // Label (outside visual so it doesn't flip)
    const label = this.add.text(0, -32, name, {
      fontSize: '11px',
      color: '#ddd',
      fontFamily: 'monospace',
      backgroundColor: '#080b14cc',
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5, 1);

    // Status dot
    const dot = this.add.circle(14, -28, 4, state === 'working' ? 0xffaa00 : 0x00ff88);

    root.add([visual, label, dot]);

    const agent = {
      id, name, color, state,
      root, visual, body, head, label, dot,
      bobbingTween: null,
      walkingTween: null,
      currentSpotIdx: 0,
      isWalking: false
    };

    this.agents[id] = agent;

    this.startBobbing(agent);
    this.scheduleNextWalk(agent);

    return agent;
  }

  startBobbing(agent) {
    if (agent.bobbingTween) agent.bobbingTween.stop();
    const speed = agent.state === 'working' ? 300 : 900;
    agent.bobbingTween = this.tweens.add({
      targets: agent.visual,
      y: -5,
      duration: speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  scheduleNextWalk(agent) {
    const delay = Phaser.Math.Between(2000, 7000);
    this.time.delayedCall(delay, () => this.walkToNextSpot(agent));
  }

  walkToNextSpot(agent) {
    if (agent.state === 'working') {
      this.scheduleNextWalk(agent);
      return;
    }

    const spotIdx = Phaser.Math.Between(0, DESK_SPOTS.length - 1);
    const spot = DESK_SPOTS[spotIdx];
    const targetX = spot.x + Phaser.Math.Between(-30, 30);
    const targetY = spot.y - 80;
    const dist = Math.abs(targetX - agent.root.x);
    const duration = dist * 3.5;

    // Flip based on direction
    agent.visual.setScale(targetX < agent.root.x ? -1 : 1, 1);

    agent.isWalking = true;
    agent.walkingTween = this.tweens.add({
      targets: agent.root,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Linear',
      onComplete: () => {
        agent.isWalking = false;
        agent.visual.setScale(1, 1);
        this.scheduleNextWalk(agent);
      }
    });
  }

  setAgentState(id, state) {
    const agent = this.agents[id];
    if (!agent || agent.state === state) return;

    agent.state = state;
    agent.dot.setFillStyle(state === 'working' ? 0xffaa00 : 0x00ff88);

    // Pulse dot
    this.tweens.add({
      targets: agent.dot,
      scaleX: 2.5, scaleY: 2.5,
      duration: 150,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    this.startBobbing(agent);
  }

  // ─── WebSocket ─────────────────────────────────────────────────────────────

  connectWebSocket() {
    const url = `ws://${window.location.host}`;
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.time.delayedCall(3000, () => this.connectWebSocket());
      return;
    }

    this.ws.onopen = () => {
      this.setGatewayStatus(true);
    };

    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);

      if (msg.type === 'init') {
        msg.agents.forEach(a => {
          if (!this.agents[a.id]) this.spawnAgent(a);
        });
      } else if (msg.type === 'agent_state') {
        this.setAgentState(msg.agent, msg.state);
      } else if (msg.type === 'gateway') {
        this.setGatewayStatus(msg.status === 'connected');
      }
    };

    this.ws.onclose = () => {
      this.setGatewayStatus(false);
      this.time.delayedCall(3000, () => this.connectWebSocket());
    };
  }

  setGatewayStatus(online) {
    this.gatewayConnected = online;
    this.gatewayDot?.setFillStyle(online ? 0x00ff88 : 0xff4444);
    this.gatewayLabel?.setText(online ? 'gateway online' : 'gateway offline');
    this.gatewayLabel?.setColor(online ? '#00ff88' : '#555');
  }
}
