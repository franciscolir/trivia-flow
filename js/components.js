// ============================================================
//  js/components.js — Componentes reutilizables ULTRA ARENA
//  Tómbola incrustable, barra de palabra, selección de casilla
//  y modal de resultados. Se carga después de session.js
// ============================================================

// ---------- Overlay genérico ----------
function openOverlay(html, opts) {
  const ov = document.createElement('div');
  ov.id = 'arena-overlay';
  ov.className = 'modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto';
  ov.style.background = 'rgba(0,0,0,0.7)';
  ov.style.backdropFilter = 'blur(8px)';
  ov.innerHTML = `<div class="w-full max-w-2xl my-8">${html}</div>`;
  document.body.appendChild(ov);
  if (opts && opts.onClose) {
    ov.addEventListener('click', e => { if (e.target === ov) { ov.remove(); if (opts.onClose) opts.onClose(); } });
  }
  return ov;
}

function closeOverlay() {
  const ov = document.getElementById('arena-overlay');
  if (ov) ov.remove();
}

// ---------- Marcador de equipos (sidebar derecho / barra en móvil) ----------
function renderScoreboardTeams(containerId) {
  const c = $(containerId);
  if (!c) return;
  const bar = document.getElementById('scorebar');
  const sess = getSession();
  const teams = (sess && sess.teams) ? sess.teams : [];
  if (!teams.length) {
    c.innerHTML = '';
    if (bar) bar.classList.add('hidden');
    renderScoreboard();
    return;
  }
  if (bar) bar.classList.remove('hidden');
  c.innerHTML = teams.map(t => {
    const color = COLORS[t.color] || COLORS.rojo;
    return `
    <div class="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/40 shrink-0 min-w-0">
      <span class="w-3 h-3 md:w-4 md:h-4 rounded-full shrink-0" style="background:${color.hex}"></span>
      <div class="flex-1 min-w-0 flex flex-col justify-center">
        <span class="font-label-caps text-label-sm text-on-surface-variant uppercase truncate">${escapeHtml(t.name)}</span>
        <span class="font-headline-md text-headline-md md:font-display-lg-mobile md:text-display-lg-mobile leading-none ${color.text}" data-score="${t.id}">0</span>
      </div>
    </div>`;
  }).join('');
  renderCircuitProgress();
  renderScoreboard();
}

// ---------- Progreso vertical del circuito (círculos junto al marcador) ----------
function renderCircuitProgress() {
  const el = document.getElementById('circuit-progress');
  if (!el) return;
  const s = getSession();
  const games = (s && s.mode === 'circuit' && Array.isArray(s.games) && s.games.length) ? s.games : [];
  if (!games.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  const gi = Math.max(0, (s.currentGameIndex || 0));
  el.innerHTML = `
    <div class="flex items-center gap-2 px-1 py-3">
      <span class="material-symbols-outlined text-secondary text-[20px]" style="font-variation-settings:'FILL' 1;">route</span>
      <span class="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Circuito</span>
    </div>
    <div class="flex flex-col pb-4">
      ${games.map((g, i) => {
        const state = i < gi ? 'done' : (i === gi ? 'current' : 'next');
        const label = (g && g.name) ? g.name : ((g && g.type) || ('Juego ' + (i + 1)));
        const marker = state === 'done'
          ? '<span class="material-symbols-outlined" style="font-size:13px">check</span>'
          : String(i + 1);
        return `
        <div class="cprogress-item flex items-center gap-3 min-w-0 py-0.5" data-i="${i}" title="${escapeHtml(label)}">
          <span class="cprogress-dot dot-${state} flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold shrink-0">${marker}</span>
          <span class="cprogress-label text-[11px] leading-tight truncate ${state === 'done' ? 'text-on-surface-variant' : state === 'current' ? 'text-primary font-bold' : 'text-on-surface-variant/60'}">${escapeHtml(label)}</span>
        </div>`;
      }).join('')}
    </div>`;
}

// ---------- TÓMBOLA INCRUSTABLE (compacta e interactiva) ----------
function renderTombola(container, opts) {
  const sess = opts.session || getSession();
  const team = opts.teamId ? ((sess && sess.teams || []).find(t => t.id === opts.teamId)) : null;
  const teamParticipants = team && sess.participants
    ? sess.participants.filter(p => p.teamId === team.id).map(p => p.name)
    : [];
  const fallback = (sess && sess.tombola && sess.tombola.pool) ? sess.tombola.pool.slice() : [];
  const pool = (team ? teamParticipants : fallback).slice();
  let excludeMode = 'excluir'; // 'mantener' | 'excluir'
  let collapsed = false;

  container.innerHTML = `
    <div class="glass-panel rounded-xl p-4 flex flex-col items-center gap-3 w-full">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-secondary" style="font-variation-settings:'FILL' 1;">casino</span>
          <span class="font-label-caps text-label-caps text-secondary">TÓMBOLA${team ? ' — ' + escapeHtml(team.name) : ''}</span>
        </div>
        ${opts.collapsible ? `<button class="tombola-collapse p-1 text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined text-[18px]">expand_more</span></button>` : ''}
      </div>
      <div class="tombola-body w-full flex flex-col items-center gap-3">
        <div class="tombola-display h-12 w-full bg-surface rounded-lg flex items-center justify-center overflow-hidden relative font-headline-md text-headline-md text-primary-fixed" style="background-image:linear-gradient(to bottom, rgba(14,20,23,0.9), rgba(14,20,23,0.3), rgba(14,20,23,0.9));">${team && !pool.length ? 'SIN INTEGRANTES' : '—'}</div>
        <div class="flex gap-2 w-full">
          <button class="tombola-spin glass-button-primary flex-1 px-4 py-2 rounded-lg font-label-caps text-label-caps">GIRAR</button>
          <button class="tombola-reset px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-label-caps text-label-caps hover:bg-surface-bright transition-colors" title="Reiniciar">
            <span class="material-symbols-outlined text-[18px] align-middle">restart_alt</span>
          </button>
        </div>
        <div class="flex items-center justify-between w-full">
          <select class="tombola-mode input-glow bg-surface-container py-1 px-2 text-label-sm text-label-sm">
            <option value="excluir">EXCLUIR</option>
            <option value="mantener">MANTENER</option>
          </select>
          <span class="tombola-pool font-label-sm text-label-sm text-on-surface-variant text-right truncate">${pool.length} participantes</span>
        </div>
      </div>
    </div>`;

  const display = $('.tombola-display', container);
  const spinBtn = $('.tombola-spin', container);
  const resetBtn = $('.tombola-reset', container);
  const poolEl = $('.tombola-pool', container);
  const body = $('.tombola-body', container);
  const modeSel = $('.tombola-mode', container);
  const collapseBtn = $('.tombola-collapse', container);
  const origPool = pool.slice();

  if (modeSel) modeSel.addEventListener('change', () => { excludeMode = modeSel.value; });
  if (collapseBtn) collapseBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    body.classList.toggle('hidden', collapsed);
    collapseBtn.querySelector('.material-symbols-outlined').textContent = collapsed ? 'expand_less' : 'expand_more';
  });

  let spinning = false, stopping = false, rollTimer = null;

  function updatePool() {
    poolEl.textContent = pool.length + ' participantes';
    if (typeof persistSession === 'function' && !team) persistSession();
  }

  function rollStart() {
    rollTimer = setInterval(() => {
      display.textContent = randomSelect(pool);
      display.style.color = '';
      display.style.textShadow = '';
    }, 80);
  }

  function spin() {
    if (!pool.length) { display.textContent = 'SIN NOMBRES'; return; }
    if (!spinning) {
      // PRIMER clic: comienza a girar
      spinning = true;
      spinBtn.textContent = 'PARAR';
      rollStart();
      return;
    }
    // SEGUNDO clic: decelera y se detiene
    if (stopping) return;
    stopping = true;
    clearInterval(rollTimer);
    spinBtn.disabled = true;
    const delays = [200, 320, 500, 760, 1100];
    let i = 0;
    const slow = () => {
      display.textContent = randomSelect(pool);
      i++;
      if (i < delays.length) setTimeout(slow, delays[i]);
      else finalize();
    };
    setTimeout(slow, delays[0]);
  }

  function finalize() {
    const winner = randomSelect(pool);
    display.textContent = winner;
    display.style.color = '#a5e7ff';
    display.style.textShadow = '0 0 20px rgba(71,214,255,0.5)';
    if (typeof playFinish === 'function') playFinish();
    if (!team && sess && sess.tombola) sess.tombola.history.unshift(winner);
    if (excludeMode === 'excluir') pool.splice(pool.indexOf(winner), 1);
    updatePool();
    spinning = false;
    stopping = false;
    spinBtn.disabled = false;
    spinBtn.textContent = 'GIRAR';
    if (opts.onSelect) opts.onSelect(winner);
    if (typeof logEvent === 'function') logEvent('RANDOM_SELECTION', { name: winner, teamId: team ? team.id : null });
  }

  spinBtn.addEventListener('click', spin);
  resetBtn.addEventListener('click', () => {
    if (rollTimer) clearInterval(rollTimer);
    spinning = false;
    stopping = false;
    spinBtn.disabled = false;
    spinBtn.textContent = 'GIRAR';
    pool.length = 0;
    pool.push(...origPool);
    updatePool();
    display.textContent = team && !pool.length ? 'SIN INTEGRANTES' : '—';
    display.style.color = '';
    display.style.textShadow = '';
  });

  if (opts.autoSpin) spin();
}

// ---------- BARRA DE PALABRA (título permanente) ----------
function mountWordBar(containerId) {
  const c = $(containerId);
  if (!c) return;
  c.innerHTML = `
    <div class="wordbar glass-panel rounded-xl px-6 py-3 flex flex-col sm:flex-row items-center justify-center gap-2 border border-primary/30 w-full max-w-4xl mx-auto">
      <span class="flex items-center gap-2 font-label-caps text-label-caps text-secondary whitespace-nowrap">
        <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">search</span> DESCUBRE LA PALABRA
      </span>
      <span class="wordbar-letters font-display-lg-mobile text-display-lg-mobile text-primary tracking-[0.25em]"></span>
      <span class="wordbar-count font-label-sm text-label-sm text-on-surface-variant"></span>
    </div>`;
  updateWordBar();
}

function updateWordBar() {
  const el = document.querySelector('.wordbar-letters');
  const count = document.querySelector('.wordbar-count');
  if (!el) return;
  const s = getSession();
  if (!s || !s.word || !s.word.text) { el.textContent = ''; if (count) count.textContent = ''; return; }
  el.textContent = wordProgressText();
  if (count) count.textContent = s.word.revealed.length + '/' + s.word.text.length + ' letras';
}

// ---------- RESULTADO DE JUEGO (modal) ----------
function showGameResult(opts) {
  // opts: { title, subtitle, rankings, nextLabel, onNext, onHome }
  const ranks = opts.rankings || [];
  const rows = ranks.map((t, i) => `
    <div class="flex items-center justify-between px-4 py-3 rounded-lg ${i === 0 ? 'bg-primary/10 border border-primary/40' : 'bg-surface-container/50'}">
      <div class="flex items-center gap-3">
        <span class="font-headline-md text-headline-md ${COLORS[t.color] ? COLORS[t.color].text : 'text-on-surface'}">${i + 1}</span>
        <span class="font-headline-md text-headline-md text-on-surface uppercase">${escapeHtml(t.name)}</span>
      </div>
      <span class="font-headline-md text-headline-md ${COLORS[t.color] ? COLORS[t.color].text : 'text-on-surface'}">${fmt(t.score)}</span>
    </div>`).join('');

  openOverlay(`
    <div class="glass-panel rounded-2xl p-8 text-center">
      <div class="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-4">
        <span class="material-symbols-outlined text-primary text-4xl" style="font-variation-settings:'FILL' 1;">emoji_events</span>
      </div>
      <h2 class="font-label-caps text-label-caps text-primary tracking-widest uppercase mb-1">${escapeHtml(opts.title || 'RESULTADO')}</h2>
      <h3 class="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface uppercase mb-6">${escapeHtml(opts.subtitle || '')}</h3>
      <div class="flex flex-col gap-2 mb-8 text-left">${rows}</div>
      <div class="flex flex-wrap justify-center gap-4">
        ${opts.onNext ? `<button id="result-next" class="btn-primary rounded-xl px-10 py-4 font-label-caps text-label-caps uppercase tracking-wider">${escapeHtml(opts.nextLabel || 'SIGUIENTE')}</button>` : ''}
        ${opts.onHome ? `<button id="result-home" class="px-8 py-4 rounded-xl border border-outline-variant text-on-surface font-label-caps transition-colors hover:bg-surface-bright">INICIO</button>` : ''}
      </div>
    </div>`);
  if (opts.onNext) $('#result-next').addEventListener('click', () => { closeOverlay(); opts.onNext(); });
  if (opts.onHome) $('#result-home').addEventListener('click', () => { closeOverlay(); opts.onHome(); });
}

// ---------- SELECCIÓN DE CASILLA (tras ganar o a demanda del conductor) ----------
function openCellPicker(opts) {
  const sess = getSession();
  const w = sess.word;
  if (!w || !w.cells || !w.cells.length) { if (opts && opts.onDone) opts.onDone(); return; }
  // Límite de casillas abiertas
  if (w.maxReveals > 0 && (w.revealsUsed || 0) >= w.maxReveals) {
    if (opts && opts.onDone) opts.onDone();
    return;
  }
  let winnerTeam = opts ? opts.winnerTeam : null;
  const teams = sess.teams || [];

  function cellContentHTML(c) {
    if (c.type === 'letter') return `<span class="font-display-xl text-display-xl text-primary">${c.letter}</span>`;
    if (c.type === 'clue') return `<span class="material-symbols-outlined text-secondary text-3xl">lightbulb</span>`;
    if (c.type === 'prize') return `<span class="material-symbols-outlined text-tertiary text-3xl">stars</span>`;
    if (c.type === 'bonus') return `<span class="material-symbols-outlined text-secondary-container text-3xl">add_circle</span>`;
    if (c.type === 'via') return `<span class="material-symbols-outlined text-tertiary-fixed text-3xl">route</span>`;
    return `<span class="material-symbols-outlined text-outline-variant text-3xl">block</span>`;
  }

  function renderGrid(overlay) {
    const grid = overlay.querySelector('#cell-grid');
    const disabled = !winnerTeam;
    grid.innerHTML = w.cells.map((c, i) => `
      <button data-i="${i}" ${c.discovered || disabled ? 'disabled' : ''} class="cell tile glass-panel border ${c.discovered ? (c.type === 'letter' ? 'border-primary/60' : c.type === 'empty' ? 'border-outline-variant' : 'border-secondary/50') : 'border-outline-variant hover:border-primary/60 hover:shadow-[0_0_15px_rgba(165,231,255,0.2)]'} rounded-xl flex flex-col items-center justify-center aspect-square transition-all ${c.discovered ? '' : 'cursor-pointer'}">
        ${c.discovered ? cellContentHTML(c) : `<span class="font-display-lg text-display-lg-mobile md:text-display-lg text-surface-variant font-bold">${String(i + 1).padStart(2, '0')}</span>`}
      </button>`).join('');
    grid.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => pick(overlay, +b.dataset.i)));
  }

  function pick(overlay, i) {
    const c = w.cells[i];
    if (c.discovered || !winnerTeam) return;
    if (w.maxReveals > 0 && (w.revealsUsed || 0) >= w.maxReveals) { overlay.remove(); if (opts.onDone) opts.onDone(); return; }
    c.discovered = true;
    w.revealsUsed = (w.revealsUsed || 0) + 1;
    if (c.type === 'letter') {
      revealWordLetter(c.letter);
      if (typeof playCorrect === 'function') playCorrect();
    } else if (c.type === 'prize') {
      if (winnerTeam) addScore(winnerTeam.id, 5, 'Premio de casilla', 'word');
      if (typeof playFinish === 'function') playFinish();
    } else if (c.type === 'bonus') {
      if (winnerTeam) addScore(winnerTeam.id, 5, 'Bonus de casilla', 'word');
      if (typeof playFinish === 'function') playFinish();
    } else if (c.type === 'via') {
      const hidden = getUndiscoveredLetters();
      if (hidden.length) { revealWordLetter(hidden[Math.floor(Math.random() * hidden.length)]); if (typeof playCorrect === 'function') playCorrect(); }
    } else if (c.type === 'clue') {
      if (typeof playTick === 'function') playTick();
    } else {
      if (typeof playWrong === 'function') playWrong();
    }
    renderGrid(overlay);
    updateWordBar();
    logEvent('CELL_REVEALED', { cellIndex: i, type: c.type, teamId: winnerTeam ? winnerTeam.id : null });
    if (typeof persistSession === 'function') persistSession();
    if (isWordComplete()) {
      overlay.remove();
      showWordCompleted(winnerTeam, opts.onDone);
    } else {
      overlay.remove();
      if (opts.onDone) opts.onDone();
    }
  }

  const teamSelector = !winnerTeam && teams.length
    ? `<div class="flex flex-wrap justify-center gap-2 mb-4">
        ${teams.map(t => `<button data-team="${t.id}" class="px-4 py-2 rounded-lg border border-outline-variant font-label-caps text-label-caps hover:border-primary transition-colors ${COLORS[t.color] ? COLORS[t.color].text : ''}">${escapeHtml(t.name)}</button>`).join('')}
      </div>`
    : '';

  openOverlay(`
    <div class="glass-panel rounded-2xl p-8 text-center">
      <h2 class="font-label-caps text-label-caps text-primary tracking-widest uppercase mb-1">${winnerTeam ? 'GANADOR' : 'DESCUBRIR CASILLA'}</h2>
      <h3 class="font-display-lg text-display-lg-mobile md:text-display-lg text-secondary uppercase mb-1">${winnerTeam ? escapeHtml(winnerTeam.name) : 'ELIGE EL EQUIPO'}</h3>
      <p class="font-body-lg text-body-lg text-on-surface-variant mb-4">${winnerTeam ? 'ELIGE UNA CASILLA' : 'Luego selecciona la casilla para este equipo.'}</p>
      ${teamSelector}
      <div id="cell-grid" class="grid grid-cols-4 gap-3 w-full max-w-xl mx-auto mb-2"></div>
      <p class="wordbar-letters font-display-lg-mobile text-display-lg-mobile text-primary tracking-[0.25em] mt-4"></p>
    </div>`);
  const ov = document.getElementById('arena-overlay');
  ov.querySelectorAll('#pick-team, [data-team]').forEach(() => {});
  if (teamSelector) {
    ov.querySelectorAll('[data-team]').forEach(b => b.addEventListener('click', () => {
      winnerTeam = teams.find(t => t.id === b.dataset.team) || null;
      ov.querySelectorAll('[data-team]').forEach(x => x.classList.remove('border-primary'));
      b.classList.add('border-primary');
      renderGrid(ov);
    }));
  }
  renderGrid(ov);
  updateWordBar();
}

// Apertura a demanda desde el panel del conductor (elige equipo y casilla)
function openConductorCellPicker(onDone) {
  openCellPicker({ winnerTeam: null, onDone: onDone || function () {} });
}

// ---------- RECOMPENSA DEL GANADOR ----------
function resolveGameReward(winnerTeam, onDone) {
  const sess = getSession();
  const mode = (sess && sess.rewardMode) || 'cell';
  const cellActive = !!(sess && sess.word && sess.word.active && !isWordComplete());
  const awardPoints = () => {
    if (winnerTeam) addScore(winnerTeam.id, (sess.word.rewardWinner || 10), 'Ganó el juego', 'reward');
    logEvent('REWARD_GRANTED', { teamId: winnerTeam ? winnerTeam.id : null, type: 'points' });
  };
  const doCell = () => {
    if (cellActive) openCellPicker({ winnerTeam, onDone });
    else onDone();
  };
  if (!cellActive) { onDone(); return; }
  if (mode === 'points') { awardPoints(); onDone(); return; }
  if (mode === 'cell') { doCell(); return; }
  if (mode === 'both') { awardPoints(); doCell(); return; }
  // choice: elige entre +puntos o descubrir casilla
  openOverlay(`
    <div class="glass-panel rounded-2xl p-8 text-center">
      <span class="material-symbols-outlined text-6xl text-secondary" style="font-variation-settings:'FILL' 1;">card_giftcard</span>
      <h2 class="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface uppercase mt-3 mb-1">Recompensa del ganador</h2>
      <h3 class="font-label-caps text-label-caps text-secondary uppercase mb-6">${winnerTeam ? escapeHtml(winnerTeam.name) : ''}</h3>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button id="rew-points" class="btn-primary rounded-xl px-10 py-4 font-label-caps text-label-caps uppercase">+${sess.word.rewardWinner || 10} PUNTOS</button>
        <button id="rew-cell" class="px-10 py-4 rounded-xl border border-secondary/50 text-secondary font-label-caps text-label-caps hover:bg-secondary/10 transition-colors">DESCUBRIR CASILLA</button>
      </div>
    </div>`);
  $('#rew-points').addEventListener('click', () => {
    if (winnerTeam) addScore(winnerTeam.id, (sess.word.rewardWinner || 10), 'Ganó el juego', 'reward');
    logEvent('REWARD_GRANTED', { teamId: winnerTeam ? winnerTeam.id : null, type: 'points' });
    closeOverlay();
    onDone();
  });
  $('#rew-cell').addEventListener('click', () => { closeOverlay(); doCell(); });
}

// ---------- HISTORIAL DE EVENTOS ----------
function showEventsModal() {
  const sess = getSession();
  const events = sess && sess.events ? sess.events.slice().reverse() : [];
  const teams = (sess && sess.teams) || [];
  const list = events.slice(0, 60).map(e => {
    const team = e.teamId ? teams.find(t => t.id === e.teamId) : null;
    const color = team && COLORS[team.color] ? COLORS[team.color].text : '';
    return `<div class="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container/40">
      <span class="font-label-sm text-label-sm text-on-surface-variant opacity-60 font-mono">${new Date(e.ts || Date.now()).toLocaleTimeString()}</span>
      <span class="font-label-caps text-label-caps ${color || 'text-primary'}">${escapeHtml(e.type)}</span>
      ${team ? `<span class="font-label-sm text-label-sm text-on-surface-variant">${escapeHtml(team.name)}</span>` : ''}
      <span class="ml-auto font-label-sm text-label-sm text-on-surface-variant truncate max-w-[40%]">${escapeHtml(JSON.stringify(e.data || {}).slice(0, 40))}</span>
    </div>`;
  }).join('') || '<p class="font-body-md text-body-md text-on-surface-variant text-center py-6">Sin eventos todavía.</p>';
  openOverlay(`
    <div class="glass-panel rounded-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-label-caps text-label-caps text-secondary uppercase">HISTORIAL DE EVENTOS (${events.length})</h2>
        <span class="material-symbols-outlined text-secondary">history</span>
      </div>
      <div class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">${list}</div>
      <button id="ev-close" class="mt-4 w-full py-3 rounded-lg border border-outline-variant text-on-surface-variant font-label-caps text-label-caps hover:bg-surface-bright transition-colors">CERRAR</button>
    </div>`);
  $('#ev-close').addEventListener('click', closeOverlay);
}

// ---------- PALABRA DESCUBIERTA ----------
function showWordCompleted(winnerTeam, onDone) {
  const w = getSession().word;
  openOverlay(`
    <div class="glass-panel border-2 border-tertiary/50 rounded-2xl p-10 text-center flash-animation">
      <span class="material-symbols-outlined text-7xl text-tertiary" style="font-variation-settings:'FILL' 1;">celebration</span>
      <h2 class="font-display-xl text-display-lg-mobile md:text-display-xl text-tertiary uppercase tracking-widest mt-4 mb-2">¡Palabra Descubierta!</h2>
      <div class="font-display-xl text-display-xl text-on-surface tracking-[0.3em] mb-4">${w.text.split('').join(' ')}</div>
      <p class="font-body-lg text-body-lg text-on-surface-variant">Todos los equipos reciben <span class="text-tertiary font-bold">+${w.rewardAll}</span> puntos</p>
      <button id="word-done" class="btn-primary rounded-xl px-10 py-4 font-label-caps text-label-caps uppercase tracking-wider mt-6">CONTINUAR</button>
    </div>`);
  $('#word-done').addEventListener('click', () => { closeOverlay(); if (onDone) onDone(); });
  if (typeof playFinish === 'function') playFinish();
}
