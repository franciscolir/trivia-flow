// ============================================================
//  js/arena.js — ULTRA ARENA: helpers, tema y marcador
//  Se carga en todas las páginas. El estado central vive en
//  session.js (cargar después de este archivo).
// ============================================================

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

function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

// ---------- Tema ----------
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

// ---------- Marcador (desde sesión) ----------
function renderScoreboard() {
  if (typeof renderSessionScoreboard === 'function') renderSessionScoreboard();
}
function initScoreboard() {
  if ($('[data-score]')) renderScoreboard();
}

// ---------- Arranque ----------
const themeToggle = $('#theme-toggle');
if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
initTheme();
