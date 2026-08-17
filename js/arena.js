// ============================================================
//  js/arena.js — ULTRA ARENA: helpers, tema, circuito y marcador
//  Se carga en todas las páginas después de css/arena.css
// ============================================================

// ---------- Helpers de DOM ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

// ---------- Modo claro / oscuro ----------
function syncThemeIcon() {
  const dark = document.documentElement.classList.contains('dark');
  const icon = $('#theme-toggle .material-symbols-outlined');
  if (icon) icon.textContent = dark ? 'light_mode' : 'dark_mode';
}

function initTheme() {
  const saved = localStorage.getItem('arena_theme');
  const dark = saved ? saved === 'dark' : true;
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
  syncThemeIcon();
}

function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark');
  document.documentElement.classList.toggle('light', !dark);
  localStorage.setItem('arena_theme', dark ? 'dark' : 'light');
  syncThemeIcon();
}

// ---------- Equipos ----------
const TEAMS = [
  { id: 'rojo', label: 'RED TEAM', color: 'text-error' },
  { id: 'azul', label: 'BLUE TEAM', color: 'text-primary' },
  { id: 'verde', label: 'GREEN TEAM', color: 'text-tertiary' }
];

// ---------- Marcador persistente ----------
const SCORES_KEY = 'arena_scores';

function getScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORES_KEY) || '{}');
    return { rojo: raw.rojo || 0, azul: raw.azul || 0, verde: raw.verde || 0 };
  } catch (e) { return { rojo: 0, azul: 0, verde: 0 }; }
}

function addPoints(teamId, points) {
  const s = getScores();
  s[teamId] = Math.max(0, (s[teamId] || 0) + (Number(points) || 0));
  localStorage.setItem(SCORES_KEY, JSON.stringify(s));
  renderScoreboard();
  return s;
}

function resetScores() {
  localStorage.setItem(SCORES_KEY, JSON.stringify({ rojo: 0, azul: 0, verde: 0 }));
  renderScoreboard();
}

// Pinta todos los [data-score="equipo"] de la página (footer y barra móvil)
function renderScoreboard() {
  const s = getScores();
  TEAMS.forEach(t => {
    $$(`[data-score="${t.id}"]`).forEach(el => { el.textContent = fmt(s[t.id]); });
  });
}

function initScoreboard() {
  if ($('[data-score]')) renderScoreboard();
}

// ---------- Circuito (config persistente) ----------
const CIRCUIT_KEY = 'arena_circuit';

function getCircuit() {
  try {
    return JSON.parse(localStorage.getItem(CIRCUIT_KEY) || 'null');
  } catch (e) { return null; }
}

function saveCircuit(c) {
  localStorage.setItem(CIRCUIT_KEY, JSON.stringify(c));
}

function clearCircuit() {
  localStorage.removeItem(CIRCUIT_KEY);
}

// Índice de juego actual desde la URL (?gi=N)
function getGameIndex() {
  const gi = new URLSearchParams(window.location.search).get('gi');
  return gi == null ? 0 : Math.max(0, parseInt(gi, 10) || 0);
}

const GAME_PAGES = {
  trivia: 'play',
  timed: 'play?mode=timed',
  memorice: 'memorice',
  tombola: 'tombola',
  word: 'word'
};

// URL del siguiente juego del circuito (o winner si es el último)
function nextGameUrl() {
  const circuit = getCircuit();
  const gi = getGameIndex();
  if (circuit && Array.isArray(circuit.games) && circuit.games.length > 0) {
    const next = gi + 1;
    if (next >= circuit.games.length) return 'winner.html';
    const g = circuit.games[next];
    const base = GAME_PAGES[g.type] || GAME_PAGES.trivia;
    return `${base}${base.includes('?') ? '&' : '?'}gi=${next}`;
  }
  return 'index.html';
}

// ---------- Arranque ----------
const themeToggle = $('#theme-toggle');
if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
initTheme();
initScoreboard();
