const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../client')));

const server = app.listen(PORT, () => {
  console.log(`Neuvo Office running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });
const clients = new Set();

const OPENCLAW_WS = process.env.OPENCLAW_WS || 'wss://n8n-dashboard-openclaw.ul4z9e.easypanel.host';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '9676df9685f924b552f7865808b705c5fbad35c27e4efc6d';

const agentState = {
  jarbas: { id: 'jarbas', name: 'Jarbas', state: 'idle', color: 0x6c63ff }
};

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

function connectToOpenClaw() {
  let clawWs;
  try {
    clawWs = new WebSocket(OPENCLAW_WS, {
      headers: { Authorization: `Bearer ${OPENCLAW_TOKEN}` }
    });
  } catch (e) {
    console.error('OpenClaw WS error:', e.message);
    setTimeout(connectToOpenClaw, 10000);
    return;
  }

  clawWs.on('open', () => {
    console.log('Connected to OpenClaw gateway');
    broadcast({ type: 'gateway', status: 'connected' });
  });

  clawWs.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      const agentId = msg.agentId || msg.agent || 'jarbas';
      const type = msg.type || '';

      if (type.includes('thinking') || type.includes('working') || type.includes('tool')) {
        agentState[agentId] = { ...agentState[agentId], state: 'working' };
        broadcast({ type: 'agent_state', agent: agentId, state: 'working' });
      } else if (type.includes('done') || type.includes('idle') || type.includes('reply')) {
        agentState[agentId] = { ...agentState[agentId], state: 'idle' };
        broadcast({ type: 'agent_state', agent: agentId, state: 'idle' });
      }
    } catch (_) {}
  });

  clawWs.on('close', () => {
    console.log('OpenClaw disconnected — reconnecting in 10s');
    broadcast({ type: 'gateway', status: 'disconnected' });
    setTimeout(connectToOpenClaw, 10000);
  });

  clawWs.on('error', (err) => {
    console.error('OpenClaw WS error:', err.message);
  });
}

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({
    type: 'init',
    agents: Object.values(agentState)
  }));
  ws.on('close', () => clients.delete(ws));
});

connectToOpenClaw();
