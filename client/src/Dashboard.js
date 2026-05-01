export default class Dashboard {
  constructor() {
    this._open = false;
    this._tab = 0;
    this._activity = [];
    this._requests = [];
    this._stats = { messagesReceived: 0, tasksCompleted: 0, agentsOnline: 0, agentsWorking: 0, uptime: 0 };
    this._agents = {};
    this._gatewayStatus = 'desconectado';
    this._gatewayEvents = [];
    this._ws = null;

    this._build();
    this._poll();
    setInterval(() => this._poll(), 10000);
  }

  connectWS(ws) {
    this._ws = ws;
  }

  handleMessage(msg) {
    if (msg.type === 'init') {
      msg.agents.forEach(a => {
        this._agents[a.id] = { ...a, lastAction: a.lastAction || '' };
      });
      if (msg.gatewayStatus) this._setGateway(msg.gatewayStatus);
    } else if (msg.type === 'agent_state') {
      if (!this._agents[msg.agent]) this._agents[msg.agent] = { id: msg.agent, name: msg.agent };
      this._agents[msg.agent].state = msg.state;
      if (msg.lastAction) this._agents[msg.agent].lastAction = msg.lastAction;
    } else if (msg.type === 'gateway') {
      this._setGateway(msg.status);
    } else if (msg.type === 'new_request') {
      this._requests.unshift(msg.request);
      if (this._requests.length > 50) this._requests.length = 50;
    }
    this._render();
  }

  _setGateway(status) {
    this._gatewayStatus = status === 'connected' ? 'conectado' : 'desconectado';
    this._gatewayEvents.unshift({
      ts: Date.now(),
      text: status === 'connected' ? 'Gateway conectado' : 'Gateway desconectado'
    });
    if (this._gatewayEvents.length > 20) this._gatewayEvents.length = 20;
  }

  async _poll() {
    try {
      const [sRes, aRes, rRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/activity'),
        fetch('/api/requests')
      ]);
      if (sRes.ok) this._stats = await sRes.json();
      if (aRes.ok) { const d = await aRes.json(); this._activity = d.events || []; }
      if (rRes.ok) { const d = await rRes.json(); this._requests = d.requests || []; }
      this._render();
    } catch (_) {}
  }

  _build() {
    const style = document.createElement('style');
    style.textContent = `
      #dash-toggle {
        position: fixed; top: 4px; right: 12px;
        background: transparent; border: 1px solid #1a2040;
        color: #aab; font-family: monospace; font-size: 11px;
        padding: 2px 10px; cursor: pointer; z-index: 200;
        transition: border-color 0.2s, color 0.2s;
      }
      #dash-toggle:hover { border-color: #6c63ff; color: #6c63ff; }
      #dashboard {
        position: fixed; top: 32px; right: 0; bottom: 0;
        width: 320px; background: #080b14;
        border-left: 1px solid #1a2040;
        display: flex; flex-direction: column;
        z-index: 100; transform: translateX(100%);
        transition: transform 0.25s ease;
        font-family: monospace; font-size: 11px; color: #aab;
      }
      #dashboard.open { transform: translateX(0); }
      #dash-tabs {
        display: flex; border-bottom: 1px solid #1a2040;
        flex-shrink: 0; overflow-x: auto;
      }
      #dash-tabs::-webkit-scrollbar { height: 0; }
      .dash-tab {
        flex: 1; padding: 7px 4px; text-align: center; cursor: pointer;
        color: #556; font-size: 10px; border-bottom: 2px solid transparent;
        white-space: nowrap; transition: color 0.2s;
        user-select: none;
      }
      .dash-tab.active { color: #6c63ff; border-bottom-color: #6c63ff; }
      .dash-tab:hover { color: #aab; }
      #dash-body {
        flex: 1; overflow-y: auto; padding: 8px;
      }
      #dash-body::-webkit-scrollbar { width: 4px; }
      #dash-body::-webkit-scrollbar-track { background: #080b14; }
      #dash-body::-webkit-scrollbar-thumb { background: #2a3a5a; border-radius: 2px; }
      .dash-section { margin-bottom: 10px; }
      .dash-label {
        color: #556; font-size: 10px; text-transform: uppercase;
        letter-spacing: 1px; margin-bottom: 4px;
      }
      .dash-card {
        background: #0d1220; border: 1px solid #1a2040;
        border-radius: 3px; padding: 6px 8px; margin-bottom: 4px;
      }
      .dash-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 2px 0;
      }
      .dash-val { color: #6c63ff; font-weight: bold; }
      .dash-dot {
        width: 7px; height: 7px; border-radius: 50%; display: inline-block;
        margin-right: 5px; flex-shrink: 0;
      }
      .state-badge {
        font-size: 10px; padding: 1px 5px; border-radius: 2px;
        display: inline-block;
      }
      .req-item { border-left: 2px solid #1a2040; padding: 4px 6px; margin-bottom: 4px; }
      .req-agent { color: #556; font-size: 10px; }
      .log-entry { padding: 2px 0; border-bottom: 1px solid #0d1220; line-height: 1.5; }
      .log-time { color: #556; margin-right: 4px; }
      .log-agent { color: #6c63ff; margin-right: 4px; }
      .log-text { color: #889; }
      .stat-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
      }
      .stat-box {
        background: #0d1220; border: 1px solid #1a2040;
        border-radius: 3px; padding: 8px; text-align: center;
      }
      .stat-num { font-size: 22px; color: #6c63ff; font-weight: bold; display: block; }
      .stat-lbl { color: #556; font-size: 10px; margin-top: 2px; }
      .agent-card {
        background: #0d1220; border: 1px solid #1a2040;
        border-radius: 3px; padding: 8px; margin-bottom: 6px;
      }
      .agent-header { display: flex; align-items: center; margin-bottom: 4px; }
      .agent-name { font-weight: bold; color: #ccd; }
      .agent-state-text { color: #556; font-size: 10px; margin-left: auto; }
      .agent-last { color: #667; font-size: 10px; margin-top: 3px; word-break: break-all; }
      .sec-row { display: flex; align-items: center; padding: 3px 0; }
      .sec-key { color: #556; flex: 1; }
      .sec-val { color: #aab; }
      .sec-ok { color: #00ff88; }
      .sec-err { color: #ff3333; }
      .uptime { color: #00ff88; }
    `;
    document.head.appendChild(style);

    const toggle = document.createElement('button');
    toggle.id = 'dash-toggle';
    toggle.textContent = '▶ Dashboard';
    toggle.onclick = () => this._toggle();
    document.body.appendChild(toggle);

    const panel = document.createElement('div');
    panel.id = 'dashboard';
    panel.innerHTML = `
      <div id="dash-tabs">
        <div class="dash-tab active" data-i="0">Pedidos</div>
        <div class="dash-tab" data-i="1">Log</div>
        <div class="dash-tab" data-i="2">Stats</div>
        <div class="dash-tab" data-i="3">Agentes</div>
        <div class="dash-tab" data-i="4">Segurança</div>
      </div>
      <div id="dash-body"></div>
    `;
    document.body.appendChild(panel);

    panel.querySelectorAll('.dash-tab').forEach(tab => {
      tab.onclick = () => {
        this._tab = +tab.dataset.i;
        panel.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._render();
      };
    });

    this._panel = panel;
    this._body = panel.querySelector('#dash-body');
    this._toggleBtn = toggle;
    this._render();
  }

  _toggle() {
    this._open = !this._open;
    this._panel.classList.toggle('open', this._open);
    this._toggleBtn.textContent = this._open ? '◀ Dashboard' : '▶ Dashboard';
    if (this._open) this._render();
  }

  _fmt(ts) {
    return new Date(ts).toLocaleTimeString('pt-BR');
  }

  _fmtUptime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }

  _stateColor(state) {
    const map = {
      'Recebido':     '#6c63ff',
      'Analisando':   '#ffaa00',
      'Tarefa Criada':'#ff9500',
      'Atribuído':    '#ff6b35',
      'Trabalhando':  '#ff6b35',
      'Concluído':    '#00ff88'
    };
    return map[state] || '#556';
  }

  _agentDot(agent) {
    const col = agent.color ? `#${agent.color.toString(16).padStart(6,'0')}` : '#6c63ff';
    return `<span class="dash-dot" style="background:${col}"></span>`;
  }

  _renderRequests() {
    if (!this._requests.length) return '<div style="color:#556;padding:8px 0">Nenhum pedido ainda.</div>';
    return this._requests.map(r => {
      const col = this._stateColor(r.state);
      return `<div class="req-item" style="border-color:${col}">
        <div class="dash-row">
          <span style="color:#ccd">${r.name || r.agent}</span>
          <span class="state-badge" style="background:${col}22;color:${col}">${r.state}</span>
        </div>
        <div class="req-agent">${this._fmt(r.createdAt)}</div>
      </div>`;
    }).join('');
  }

  _renderLog() {
    if (!this._activity.length) return '<div style="color:#556;padding:8px 0">Sem atividade registrada.</div>';
    return this._activity.map(e => `
      <div class="log-entry">
        <span class="log-time">[${this._fmt(e.ts)}]</span>
        <span class="log-agent">${e.name || e.agent}:</span>
        <span class="log-text">${e.text}</span>
      </div>`).join('');
  }

  _renderStats() {
    const s = this._stats;
    return `<div class="stat-grid">
      <div class="stat-box">
        <span class="stat-num">${s.messagesReceived}</span>
        <div class="stat-lbl">Mensagens</div>
      </div>
      <div class="stat-box">
        <span class="stat-num">${s.tasksCompleted}</span>
        <div class="stat-lbl">Concluídas</div>
      </div>
      <div class="stat-box">
        <span class="stat-num">${s.agentsOnline}</span>
        <div class="stat-lbl">Agentes Online</div>
      </div>
      <div class="stat-box">
        <span class="stat-num" style="color:#ff6b35">${s.agentsWorking}</span>
        <div class="stat-lbl">Trabalhando</div>
      </div>
    </div>
    <div class="dash-card" style="margin-top:8px">
      <div class="dash-row">
        <span class="dash-label" style="margin:0">Uptime</span>
        <span class="uptime">${this._fmtUptime(s.uptime)}</span>
      </div>
    </div>`;
  }

  _renderAgents() {
    const agents = Object.values(this._agents);
    if (!agents.length) return '<div style="color:#556;padding:8px 0">Nenhum agente conectado.</div>';
    return agents.map(a => {
      const isWorking = a.state === 'working';
      const stateLabel = isWorking ? 'trabalhando' : 'inativo';
      const stateColor = isWorking ? '#ff6b35' : '#556';
      return `<div class="agent-card">
        <div class="agent-header">
          ${this._agentDot(a)}
          <span class="agent-name">${a.name || a.id}</span>
          <span class="agent-state-text" style="color:${stateColor}">● ${stateLabel}</span>
        </div>
        ${a.lastAction ? `<div class="agent-last">↳ ${a.lastAction}</div>` : ''}
      </div>`;
    }).join('');
  }

  _renderSecurity() {
    const isConn = this._gatewayStatus === 'conectado';
    const connColor = isConn ? 'sec-ok' : 'sec-err';
    const events = this._gatewayEvents.slice(0, 8);
    return `<div class="dash-card">
      <div class="sec-row">
        <span class="sec-key">WebSocket</span>
        <span class="${connColor}">${this._gatewayStatus}</span>
      </div>
      <div class="sec-row">
        <span class="sec-key">Gateway OpenClaw</span>
        <span class="${connColor}">${isConn ? 'ativo' : 'inativo'}</span>
      </div>
      <div class="sec-row">
        <span class="sec-key">Clientes conectados</span>
        <span class="sec-val">—</span>
      </div>
    </div>
    <div class="dash-label" style="margin-top:8px">Últimos Eventos</div>
    ${events.length
      ? events.map(e => `<div class="log-entry">
          <span class="log-time">[${this._fmt(e.ts)}]</span>
          <span class="log-text">${e.text}</span>
        </div>`).join('')
      : '<div style="color:#556">Sem eventos recentes.</div>'
    }`;
  }

  _render() {
    if (!this._open && this._tab !== -1) {
      // still render so data is ready when opened
    }
    const tabs = [
      this._renderRequests,
      this._renderLog,
      this._renderStats,
      this._renderAgents,
      this._renderSecurity
    ];
    const titles = [
      'Fila de Pedidos',
      'Log de Atividades',
      'Estatísticas',
      'Pensamentos dos Agentes',
      'Segurança'
    ];
    this._body.innerHTML = `
      <div class="dash-label" style="margin-bottom:6px">${titles[this._tab]}</div>
      ${tabs[this._tab].call(this)}
    `;
  }
}
