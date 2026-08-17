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

// ---------- Marcador de equipos (dinámico desde sesión) ----------
function renderScoreboardTeams(containerId) {
  const c = $(containerId);
  if (!c) return;
  const sess = getSession();
  const teams = (sess && sess.teams) ? sess.teams : [];
  if (!teams.length) { c.innerHTML = ''; return; }
  c.innerHTML = teams.map(t => {
    const color = COLORS[t.color] || COLORS.rojo;
    return `
    <div class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2">
      <span class="material-symbols-outlined ${color.text} mb-1" style="font-variation-settings:'FILL' 1;">groups</span>
      <span class="font-label-caps ${teams.length > 4 ? 'text-[10px]' : 'text-label-caps'} text-center">${escapeHtml(t.name)}<br/><span class="${color.text}" data-score="${t.id}">0</span></span>
    </div>`;
  }).join('');
  renderScoreboard();
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
  let spinning = false;

  container.innerHTML = `
    <div class="glass-panel rounded-xl p-4 flex flex-col items-center gap-3 w-full">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-secondary" style="font-variation-settings:'FILL' 1;">casino</span>
        <span class="font-label-caps text-label-caps text-secondary">TÓMBOLA${team ? ' — ' + escapeHtml(team.name) : ''}</span>
      </div>
      <div class="tombola-display h-12 w-full bg-surface rounded-lg flex items-center justify-center overflow-hidden relative font-headline-md text-headline-md text-primary-fixed" style="background-image:linear-gradient(to bottom, rgba(14,20,23,0.9), rgba(14,20,23,0.3), rgba(14,20,23,0.9));">${team && !pool.length ? 'SIN INTEGRANTES' : '—'}</div>
      <div class="flex gap-2 w-full">
        <button class="tombola-spin glass-button-primary flex-1 px-4 py-2 rounded-lg font-label-caps text-label-caps">GIRAR</button>
        <button class="tombola-reset px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-label-caps text-label-caps hover:bg-surface-bright transition-colors" title="Reiniciar">
          <span class="material-symbols-outlined text-[18px] align-middle">restart_alt</span>
        </button>
      </div>
      <div class="tombola-pool font-label-sm text-label-sm text-on-surface-variant text-center w-full truncate">${pool.length} participantes</div>
    </div>`;

  const display = $('.tombola-display', container);
  const spinBtn = $('.tombola-spin', container);
  const resetBtn = $('.tombola-reset', container);
  const poolEl = $('.tombola-pool', container);
  const origPool = pool.slice();

  function updatePool() {
    poolEl.textContent = pool.length + ' participantes';
    if (typeof persistSession === 'function' && !team) persistSession();
  }

  function spin() {
    if (spinning || !pool.length) { if (!pool.length) display.textContent = 'SIN NOMBRES'; return; }
    spinning = true;
    spinBtn.disabled = true;
    let t = 0;
    const total = 2200;
    const iv = setInterval(() => {
      t += 90;
      if (t >= total) {
        clearInterval(iv);
        const winner = randomSelect(pool);
        display.textContent = winner;
        display.style.color = '#a5e7ff';
        display.style.textShadow = '0 0 20px rgba(71,214,255,0.5)';
        if (typeof playFinish === 'function') playFinish();
        if (!team) {
          if (sess.tombola) sess.tombola.history.unshift(winner);
          pool.splice(pool.indexOf(winner), 1);
        } else {
          pool.splice(pool.indexOf(winner), 1);
        }
        updatePool();
        spinning = false;
        spinBtn.disabled = false;
        if (opts.onSelect) opts.onSelect(winner);
        if (typeof logEvent === 'function') logEvent('RANDOM_SELECTION', { name: winner, teamId: team ? team.id : null });
      } else {
        setTimeout(() => { display.textContent = randomSelect(pool); }, t * 0.6);
      }
    }, 90);
  }

  spinBtn.addEventListener('click', spin);
  resetBtn.addEventListener('click', () => {
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

// ---------- SELECCIÓN DE CASILLA (tras ganar) ----------
function openCellPicker(opts) {
  const sess = getSession();
  const w = sess.word;
  const winnerTeam = opts.winnerTeam;

  function renderGrid(overlay) {
    const grid = overlay.querySelector('#cell-grid');
    grid.innerHTML = w.cells.map((c, i) => `
      <button data-i="${i}" ${c.discovered ? 'disabled' : ''} class="cell tile glass-panel border ${c.discovered ? (c.type === 'letter' ? 'border-primary/60' : c.type === 'empty' ? 'border-outline-variant' : 'border-secondary/50') : 'border-outline-variant hover:border-primary/60 hover:shadow-[0_0_15px_rgba(165,231,255,0.2)]'} rounded-xl flex flex-col items-center justify-center aspect-square transition-all ${c.discovered ? '' : 'cursor-pointer'}">
        ${c.discovered ? cellContentHTML(c) : `<span class="font-display-lg text-display-lg-mobile md:text-display-lg text-surface-variant font-bold">${String(i + 1).padStart(2, '0')}</span>`}
      </button>`).join('');
    grid.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => pick(overlay, +b.dataset.i)));
  }

  function cellContentHTML(c) {
    if (c.type === 'letter') return `<span class="font-display-xl text-display-xl text-primary">${c.letter}</span>`;
    if (c.type === 'clue') return `<span class="material-symbols-outlined text-secondary text-3xl">lightbulb</span>`;
    if (c.type === 'prize') return `<span class="material-symbols-outlined text-tertiary text-3xl">stars</span>`;
    if (c.type === 'bonus') return `<span class="material-symbols-outlined text-secondary-container text-3xl">add_circle</span>`;
    if (c.type === 'via') return `<span class="material-symbols-outlined text-tertiary-fixed text-3xl">route</span>`;
    return `<span class="material-symbols-outlined text-outline-variant text-3xl">block</span>`;
  }

  function pick(overlay, i) {
    const c = w.cells[i];
    if (c.discovered) return;
    c.discovered = true;
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
    logEvent('CELL_REVEALED', { cellIndex: i, type: c.type });
    if (isWordComplete()) {
      overlay.remove();
      showWordCompleted(winnerTeam, opts.onDone);
    } else {
      overlay.remove();
      if (opts.onDone) opts.onDone();
    }
  }

  openOverlay(`
    <div class="glass-panel rounded-2xl p-8 text-center">
      <h2 class="font-label-caps text-label-caps text-primary tracking-widest uppercase mb-1">GANADOR</h2>
      <h3 class="font-display-lg text-display-lg-mobile md:text-display-lg text-secondary uppercase mb-1">${winnerTeam ? escapeHtml(winnerTeam.name) : ''}</h3>
      <p class="font-body-lg text-body-lg text-on-surface-variant mb-6">ELIGE UNA CASILLA</p>
      <div id="cell-grid" class="grid grid-cols-4 gap-3 w-full max-w-xl mx-auto mb-2"></div>
      <p class="wordbar-letters font-display-lg-mobile text-display-lg-mobile text-primary tracking-[0.25em] mt-4"></p>
    </div>`);
  const ov = document.getElementById('arena-overlay');
  renderGrid(ov);
  updateWordBar();
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
