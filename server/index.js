const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const LAYOUT_FILE = path.join(DATA_DIR, 'layout.json');
const ASSETS_DIR = path.join(__dirname, '../client/assets');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client')));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, ASSETS_DIR),
    filename:    (req, file, cb) => cb(null, file.originalname)
  }),
  fileFilter: (req, file, cb) => {
    const ok = ['.glb', '.gltf'].some(e => file.originalname.toLowerCase().endsWith(e));
    cb(null, ok);
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ─── API ───────────────────────────────────────────────────────────────────

app.get('/api/assets', (req, res) => {
  const SUPPORTED = ['.glb', '.gltf'];
  const files = fs.existsSync(ASSETS_DIR)
    ? fs.readdirSync(ASSETS_DIR).filter(f => SUPPORTED.some(e => f.toLowerCase().endsWith(e)))
    : [];
  res.json(files.map(f => ({
    name: f.replace(/\.[^.]+$/, ''),
    file: f,
    url: `/assets/${f}`
  })));
});

app.get('/api/layout', (req, res) => {
  if (!fs.existsSync(LAYOUT_FILE)) return res.json({ version: 1, objects: [] });
  try {
    res.json(JSON.parse(fs.readFileSync(LAYOUT_FILE, 'utf8')));
  } catch {
    res.json({ version: 1, objects: [] });
  }
});

app.post('/api/layout', (req, res) => {
  fs.writeFileSync(LAYOUT_FILE, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
  console.log(`Layout saved — ${req.body.objects?.length ?? 0} objects`);
});

app.post('/api/upload', upload.array('files'), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No valid files' });
  const saved = req.files.map(f => ({ name: f.originalname.replace(/\.[^.]+$/, ''), file: f.originalname, url: `/assets/${f.originalname}` }));
  console.log(`Assets uploaded: ${saved.map(f => f.file).join(', ')}`);
  res.json({ ok: true, files: saved });
});

// ─── In-memory state ───────────────────────────────────────────────────────

const activityLog = [];
const requests = [];
const stats = { messagesReceived: 0, tasksCompleted: 0 };
const startTime = Date.now();

function addActivity(agentId, agentName, text) {
  const entry = { ts: Date.now(), agent: agentId, name: agentName, text };
  activityLog.unshift(entry);
  if (activityLog.length > 100) activityLog.length = 100;
}

function createRequest(agentId, agentName) {
  const req = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    agent: agentId,
    name: agentName,
    state: 'Recebido',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  requests.unshift(req);
  if (requests.length > 50) requests.length = 50;
  return req;
}

function advanceRequest(agentId, toState) {
  const req = requests.find(r => r.agent === agentId && r.state !== 'Concluído');
  if (req) { req.state = toState; req.updatedAt = Date.now(); }
}

// ─── Dashboard API ─────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  const agentCount = Object.values(agentState).filter(a => a.state === 'working').length;
  res.json({
    messagesReceived: stats.messagesReceived,
    tasksCompleted: stats.tasksCompleted,
    agentsOnline: Object.keys(agentState).length,
    agentsWorking: agentCount,
    uptime: Math.floor((Date.now() - startTime) / 1000)
  });
});

app.get('/api/activity', (req, res) => {
  res.json({ events: activityLog });
});

app.get('/api/requests', (req, res) => {
  res.json({ requests });
});

// ─── WebSocket ─────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => console.log(`Neuvo Office running on port ${PORT}`));
const wss = new WebSocketServer({ server });
const clients = new Set();

const OPENCLAW_WS    = process.env.OPENCLAW_WS    || 'wss://n8n-dashboard-openclaw.ul4z9e.easypanel.host';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '9676df9685f924b552f7865808b705c5fbad35c27e4efc6d';

const agentState = {
  jarbas: { id: 'jarbas', name: 'Jarbas', state: 'idle', color: 0x6c63ff, lastAction: '' }
};

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const c of clients) if (c.readyState === WebSocket.OPEN) c.send(msg);
}

function connectToOpenClaw() {
  let ws;
  try {
    ws = new WebSocket(`${OPENCLAW_WS}?token=${OPENCLAW_TOKEN}`);
  } catch (e) {
    setTimeout(connectToOpenClaw, 10000);
    return;
  }

  ws.on('open', () => {
    console.log('Connected to OpenClaw gateway');
    broadcast({ type: 'gateway', status: 'connected' });
    addActivity('system', 'Sistema', 'Gateway OpenClaw conectado');
  });

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      console.log('[OpenClaw RAW]', JSON.stringify(msg));
      const id = msg.agentId || msg.agent || 'jarbas';
      const t = msg.type || '';
      const agentName = agentState[id]?.name || id;
      stats.messagesReceived++;

      if (t.includes('thinking') || t.includes('working') || t.includes('tool')) {
        const prevState = agentState[id]?.state;
        agentState[id] = { ...agentState[id], state: 'working', lastAction: t };
        broadcast({ type: 'agent_state', agent: id, state: 'working', lastAction: t });

        addActivity(id, agentName, `${t}`);

        if (prevState !== 'working') {
          const req = createRequest(id, agentName);
          setTimeout(() => advanceRequest(id, 'Analisando'), 500);
          setTimeout(() => advanceRequest(id, 'Tarefa Criada'), 1500);
          setTimeout(() => advanceRequest(id, 'Atribuído'), 2500);
          setTimeout(() => advanceRequest(id, 'Trabalhando'), 4000);
          broadcast({ type: 'new_request', request: req });
        }
      } else if (t.includes('done') || t.includes('idle') || t.includes('reply')) {
        agentState[id] = { ...agentState[id], state: 'idle', lastAction: t };
        broadcast({ type: 'agent_state', agent: id, state: 'idle', lastAction: t });
        addActivity(id, agentName, `concluído: ${t}`);
        advanceRequest(id, 'Concluído');
        stats.tasksCompleted++;
      }
    } catch (_) {}
  });

  ws.on('close', (code, reason) => {
    console.log(`OpenClaw disconnected — code: ${code}, reason: ${reason?.toString() || 'none'} — reconnecting in 10s`);
    broadcast({ type: 'gateway', status: 'disconnected' });
    addActivity('system', 'Sistema', 'Gateway desconectado — reconectando...');
    setTimeout(connectToOpenClaw, 10000);
  });

  ws.on('error', err => console.error('OpenClaw WS error:', err.message));
}

wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({
    type: 'init',
    agents: Object.values(agentState),
    gatewayStatus: 'connected'
  }));
  ws.on('close', () => clients.delete(ws));
});

connectToOpenClaw();
