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

// ---------- Pantalla pública vs conductor ----------
function isPublic() {
  return new URLSearchParams(window.location.search).get('public') === '1';
}

const ArenaSync = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('arena-sync') : null;

if (ArenaSync) {
  ArenaSync.onmessage = e => {
    if (e.data && e.data.type === 'session' && isPublic()) {
      try { localStorage.setItem('arena_session', JSON.stringify(e.data.session)); } catch (err) { /* noop */ }
      if (typeof loadSession === 'function') loadSession();
      if (typeof updateWordBar === 'function') updateWordBar();
      if (typeof renderScoreboard === 'function') renderScoreboard();
    }
  };
}

function applyPublicMode() {
  if (!isPublic()) return;
  document.documentElement.classList.add('public-mode');
  const tb = $('#theme-toggle');
  if (tb) tb.classList.add('hidden');
  const mb = $('#mute-toggle');
  if (mb) mb.classList.add('hidden');
  const badge = document.createElement('div');
  badge.className = 'public-badge hidden fixed top-2 left-2 z-[80] px-3 py-1 rounded-full bg-tertiary/20 border border-tertiary/50 text-tertiary font-label-caps text-label-caps';
  badge.textContent = '● PANTALLA PÚBLICA';
  document.body.appendChild(badge);
}

function openPublicScreen() {
  const u = new URL(window.location.href);
  u.searchParams.set('public', '1');
  window.open(u.href, '_blank');
}

// ---------- Silencio (mute) global ----------
let muted = false;
try { muted = localStorage.getItem('arena_muted') === '1'; } catch (e) { /* noop */ }

function isMuted() { return muted; }
function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem('arena_muted', muted ? '1' : '0'); } catch (e) { /* noop */ }
  syncMuteBtn();
}
function toggleMuted() { setMuted(!muted); }

function syncMuteBtn() {
  const btn = document.getElementById('mute-toggle');
  if (!btn) return;
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = muted ? 'volume_off' : 'volume_up';
  btn.title = muted ? 'Activar sonido' : 'Silenciar sonido';
}

// ---------- Arranque ----------
const themeToggle = $('#theme-toggle');
if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
const muteBtn = document.getElementById('mute-toggle');
if (muteBtn) muteBtn.addEventListener('click', toggleMuted);
initTheme();
applyPublicMode();
syncMuteBtn();
