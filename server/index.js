const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const LAYOUT_FILE = path.join(DATA_DIR, 'layout.json');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
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

app.get('/api/agents', (req, res) => {
  const defaultFile = path.join(__dirname, '../data/agents.json');
  const file = fs.existsSync(AGENTS_FILE) ? AGENTS_FILE : defaultFile;
  try {
    res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    res.json({});
  }
});

app.post('/api/agents', (req, res) => {
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
  console.log('Agents config saved');
});

app.post('/api/upload', upload.array('files'), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No valid files' });
  const saved = req.files.map(f => ({ name: f.originalname.replace(/\.[^.]+$/, ''), file: f.originalname, url: `/assets/${f.originalname}` }));
  console.log(`Assets uploaded: ${saved.map(f => f.file).join(', ')}`);
  res.json({ ok: true, files: saved });
});

// ─── WebSocket ─────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => console.log(`Neuvo Office running on port ${PORT}`));
const wss = new WebSocketServer({ server });
const clients = new Set();

const OPENCLAW_WS    = process.env.OPENCLAW_WS    || 'wss://n8n-dashboard-openclaw.ul4z9e.easypanel.host';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '9676df9685f924b552f7865808b705c5fbad35c27e4efc6d';

const agentState = {
  jarbas: { id: 'jarbas', name: 'Jarbas', state: 'idle', color: 0x6c63ff }
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

  ws.on('open', () => { console.log('Connected to OpenClaw gateway'); broadcast({ type: 'gateway', status: 'connected' }); });

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      const id = msg.agentId || msg.agent || 'jarbas';
      const t = msg.type || '';
      if (t.includes('thinking') || t.includes('working') || t.includes('tool')) {
        agentState[id] = { ...agentState[id], state: 'working' };
        broadcast({ type: 'agent_state', agent: id, state: 'working' });
      } else if (t.includes('done') || t.includes('idle') || t.includes('reply')) {
        agentState[id] = { ...agentState[id], state: 'idle' };
        broadcast({ type: 'agent_state', agent: id, state: 'idle' });
      }
    } catch (_) {}
  });

  ws.on('close', (code, reason) => {
    console.log(`OpenClaw disconnected — code: ${code}, reason: ${reason?.toString() || 'none'} — reconnecting in 10s`);
    broadcast({ type: 'gateway', status: 'disconnected' });
    setTimeout(connectToOpenClaw, 10000);
  });

  ws.on('error', err => console.error('OpenClaw WS error:', err.message));
}

wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'init', agents: Object.values(agentState) }));
  ws.on('close', () => clients.delete(ws));
});

connectToOpenClaw();
