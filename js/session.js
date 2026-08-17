// ============================================================
//  js/session.js — Estado central de la partida (modo individual
//  y circuito). Marcador central, eventos, palabras y persistencia.
//  Se carga después de arena.js y, en páginas con Firebase,
//  después de firestore.js (usa db de forma opcional).
// ============================================================

const COLORS = {
  rojo:     { label: 'ROJO',     text: 'text-error',      hex: '#ef4444' },
  azul:     { label: 'AZUL',     text: 'text-primary',    hex: '#3b82f6' },
  verde:    { label: 'VERDE',    text: 'text-tertiary',   hex: '#22c55e' },
  amarillo: { label: 'AMARILLO', text: 'text-yellow-400', hex: '#eab308' },
  naranja:  { label: 'NARANJA',  text: 'text-orange-400', hex: '#f97316' },
  morado:   { label: 'MORADO',   text: 'text-purple-400', hex: '#a855f7' },
  cian:     { label: 'CIAN',     text: 'text-cyan-400',   hex: '#06b6d4' },
  rosa:     { label: 'ROSA',     text: 'text-pink-400',   hex: '#ec4899' }
};

const SESSION_KEY = 'arena_session';
const SESSION_STATUS = { DRAFT: 'draft', READY: 'ready', RUNNING: 'running', PAUSED: 'paused', FINISHED: 'finished' };

let session = null;

// ---------- Creación ----------
function newId(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function createSession(config) {
  session = {
    id: newId('ses'),
    name: (config && config.name) || 'Gran Desafío',
    mode: (config && config.mode) || 'circuit',
    status: SESSION_STATUS.READY,
    difficulty: (config && config.difficulty) || 1.5,
    timeBonus: !config || config.timeBonus !== false,
    teams: (config && config.teams) || defaultTeams(3),
    participants: (config && config.participants) || [],
    games: (config && config.games) || [],
    currentGameIndex: 0,
    word: (config && config.word) || { active: false, text: '', revealed: [], cells: [], rewardAll: 5, rewardWinner: 10, completed: false, guessEnabled: false, guessPenalty: 0 },
    tombola: (config && config.tombola) || { active: false, pool: [], history: [] },
    scoreHistory: [],
    events: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  persistSession();
  return session;
}

function defaultTeams(count) {
  const keys = Object.keys(COLORS).slice(0, 8);
  const names = ['Tigres', 'Leones', 'Cóndores', 'Águilas', 'Panteras', 'Lobos', 'Halcones', 'Dragones'];
  return Array.from({ length: count }, (_, i) => ({
    id: 'team_' + (i + 1),
    name: names[i] || ('Equipo ' + (i + 1)),
    color: keys[i % keys.length],
    score: 0
  }));
}

// ---------- Acceso ----------
function getSession() { return session; }
function getCurrentGame() {
  if (!session || !Array.isArray(session.games) || !session.games.length) return null;
  return session.games[session.currentGameIndex] || null;
}

function getGameIndexFromUrl() {
  const gi = new URLSearchParams(window.location.search).get('gi');
  return gi == null ? 0 : Math.max(0, parseInt(gi, 10) || 0);
}

const GAME_PAGES = {
  trivia: 'play', timed: 'play?mode=timed', memorice: 'memorice', tombola: 'tombola', word: 'word'
};

function nextGameUrl() {
  if (session && Array.isArray(session.games) && session.games.length) {
    const next = session.currentGameIndex + 1;
    if (next >= session.games.length) return 'winner';
    const g = session.games[next];
    const base = GAME_PAGES[g.type] || GAME_PAGES.trivia;
    return base + (base.includes('?') ? '&' : '?') + 'gi=' + next;
  }
  return 'index';
}

function setCurrentGameIndex(i) {
  if (session) { session.currentGameIndex = i; persistSession(); }
}

// ---------- Marcador central ----------
function getTeamScore(teamId) {
  const t = session && session.teams ? session.teams.find(x => x.id === teamId) : null;
  return t ? (t.score || 0) : 0;
}

function addScore(teamId, points, reason, gameId) {
  if (!session) return 0;
  const t = session.teams.find(x => x.id === teamId);
  if (!t) return 0;
  points = Math.round((points || 0) * (session.difficulty || 1));
  t.score = (t.score || 0) + points;
  session.scoreHistory.push({ teamId, points, reason: reason || 'SCORE', gameId: gameId || null, ts: Date.now() });
  logEvent('SCORE_ADDED', { teamId, points, reason: reason || 'SCORE', gameId: gameId || null });
  persistSession();
  renderScoreboard();
  return t.score;
}

function subtractScore(teamId, points, reason, gameId) {
  if (!session) return 0;
  const t = session.teams.find(x => x.id === teamId);
  if (!t) return 0;
  const d = Math.round((points || 0));
  t.score = Math.max(0, (t.score || 0) - d);
  session.scoreHistory.push({ teamId, points: -d, reason: reason || 'SCORE_REMOVED', gameId: gameId || null, ts: Date.now() });
  logEvent('SCORE_REMOVED', { teamId, points: -d, reason: reason || 'SCORE_REMOVED' });
  persistSession();
  renderScoreboard();
  return t.score;
}

function getRanking() {
  if (!session || !session.teams) return [];
  return session.teams.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
}

// ---------- Eventos ----------
function logEvent(type, data) {
  if (!session) return;
  session.events.push({ type, teamId: (data && data.teamId) || null, data: data || {}, ts: Date.now() });
}

function getEvents(type) {
  if (!session) return [];
  return type ? session.events.filter(e => e.type === type) : session.events;
}

// ---------- Tómbola ----------
function randomSelect(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// ---------- Descubre la Palabra ----------
function buildWordCells(word, cellsCount) {
  // Una casilla "letra" por cada aparición + especiales hasta llenar 16
  const letters = word.toUpperCase().split('');
  const cells = letters.map((l, i) => ({ id: 'cell_' + i, type: 'letter', letter: l, pos: i, discovered: false }));
  const specials = [
    { type: 'clue' }, { type: 'clue' }, { type: 'prize' }, { type: 'bonus' },
    { type: 'via' }, { type: 'empty' }, { type: 'prize' }, { type: 'bonus' },
    { type: 'empty' }, { type: 'via' }
  ];
  let s = 0;
  const total = cellsCount || 16;
  while (cells.length < total) cells.push({ id: 'cell_' + cells.length, ...specials[s++ % specials.length], discovered: false });
  return shuffleArray(cells);
}

function setWord(word, opts) {
  if (!session) return;
  session.word = Object.assign({}, session.word, {
    active: true,
    text: (word || '').toUpperCase(),
    revealed: [],
    cells: buildWordCells(word || '', (opts && opts.cells) || 16),
    rewardAll: (opts && opts.rewardAll) || 5,
    rewardWinner: (opts && opts.rewardWinner) || 10,
    completed: false,
    guessEnabled: !opts || opts.guessEnabled !== false,
    guessPenalty: (opts && opts.guessPenalty) || 0
  });
  persistSession();
}

function revealWordLetter(letter) {
  if (!session || !session.word || session.word.completed) return;
  const w = session.word;
  w.text.split('').forEach((l, p) => { if (l === letter) w.revealed.push(p); });
  w.revealed = Array.from(new Set(w.revealed));
  logEvent('LETTER_REVEALED', { letter });
  if (w.revealed.length >= w.text.length) completeWord();
  else persistSession();
  return w;
}

function wordProgressText() {
  const w = session && session.word;
  if (!w || !w.text) return '';
  return w.text.split('').map((l, i) => w.revealed.includes(i) ? l : '_').join(' ');
}

function isWordComplete() { return !!(session && session.word && session.word.completed); }

function completeWord() {
  const w = session.word;
  w.completed = true;
  logEvent('WORD_COMPLETED', {});
  session.teams.forEach(t => addScore(t.id, w.rewardAll, 'Palabra descubierta', 'word'));
  persistSession();
  return w;
}

function guessWord(teamId, attempt) {
  const w = session.word;
  const ok = (attempt || '').trim().toUpperCase() === w.text;
  if (ok) { w.revealed = Array.from({ length: w.text.length }, (_, i) => i); logEvent('WORD_GUESS', { teamId, ok: true }); completeWord(); }
  else {
    logEvent('WORD_GUESS', { teamId, ok: false });
    if (w.guessPenalty) subtractScore(teamId, w.guessPenalty, 'Intento fallido de palabra', 'word');
  }
  return ok;
}

function getUndiscoveredLetters() {
  const w = session.word;
  if (!w) return [];
  return w.text.split('').filter((l, i) => !w.revealed.includes(i) && w.text.indexOf(l) === i);
}

// ---------- Persistencia ----------
function persistSession() {
  if (!session) return;
  session.updatedAt = Date.now();
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { console.warn('localStorage', e); }
  // Firestore best-effort (solo si el SDK está disponible)
  if (typeof db !== 'undefined') {
    try {
      db.collection('sessions').doc(session.id).set(serializableSession())
        .catch(err => console.warn('Firestore persist', err));
    } catch (e) { console.warn('Firestore persist', e); }
  }
}

function serializableSession() {
  return JSON.parse(JSON.stringify(session));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) { session = JSON.parse(raw); return session; }
  } catch (e) { console.warn('load local', e); }
  return null;
}

function clearSession() {
  session = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* noop */ }
  if (typeof db !== 'undefined') { /* se conserva en Firestore como historial */ }
}

// Reinicia el marcador (sin borrar la sesión)
function resetSessionScores() {
  if (!session) return;
  session.teams.forEach(t => { t.score = 0; });
  session.scoreHistory = [];
  persistSession();
  renderScoreboard();
}

// ---------- Estado de sesión por URL ----------
function initSessionFromUrlOrLocal() {
  if (!session) loadSession();
  if (!session) {
    // Modo individual desde el hub
    createSession({ name: 'Partida individual', mode: 'individual', teams: defaultTeams(3), games: [] });
  }
  const gi = getGameIndexFromUrl();
  if (session.games && session.games.length) session.currentGameIndex = gi;
  return session;
}

// Renderiza marcador desde la sesión (los [data-score=teamId])
function renderSessionScoreboard() {
  if (!session || !session.teams) return;
  session.teams.forEach(t => {
    $$(`[data-score="${t.id}"]`).forEach(el => { el.textContent = fmt(t.score || 0); });
  });
}
