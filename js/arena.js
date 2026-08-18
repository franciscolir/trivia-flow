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

// ---------- Contenido por juego (sets de Firestore) ----------
function contentCollectionFor(type) {
  return type === 'memorice' ? 'memorySets'
    : type === 'synonyms' ? 'synonymSets'
    : type === 'sentence' ? 'sentenceSets' : null;
}

// Retorna los items del set configurado (settings.contentId) o null si no aplica.
async function loadGameContent(cfg) {
  if (typeof db === 'undefined') return null;
  const cid = cfg && cfg.settings && cfg.settings.contentId;
  if (!cid) return null;
  try {
    const d = await db.collection(contentCollectionFor(cfg.type)).doc(cid).get();
    if (!d.exists) return null;
    const items = (d.data() && d.data().items) || [];
    return Array.isArray(items) ? items : null;
  } catch (e) { console.warn('loadGameContent', e); return null; }
}

const ArenaSync = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('arena-sync') : null;

if (ArenaSync) {
  ArenaSync.onmessage = e => {
    if (!e.data) return;
    if (isPublic() && e.data.type === 'nav') {
      const u = new URL(e.data.url, window.location.href);
      u.searchParams.set('public', '1');
      const name = (u.pathname || '/').replace(/\/+$/, '').split('/').pop() || '';
      const isHub = name === '' || name === 'index' || name === 'index.html';
      if (isWaitingScreen() && isHub) return; // en la espera: ignorar la vuelta al hub
      window.location.href = u.href;
      return;
    }
    if (isPublic() && e.data.type === 'mirror') {
      applyMirror(e.data.html);
      return;
    }
    if (e.data.type === 'session' && isPublic()) {
      if (e.data.session == null) {
        // El conductor cerró la sesión: la pantalla pública pasa a la espera.
        try { localStorage.removeItem('arena_session'); } catch (err) { /* noop */ }
        if (!isWaitingScreen()) goToWait();
        return;
      }
      try { localStorage.setItem('arena_session', JSON.stringify(e.data.session)); } catch (err) { /* noop */ }
      if (isWaitingScreen()) { redirectFromWait(e.data.session); return; }
      if (typeof loadSession === 'function') loadSession();
      if (typeof updateWordBar === 'function') updateWordBar();
      if (typeof renderScoreboard === 'function') renderScoreboard();
    }
  };
}

// ---------- Espejo público (proyección) ----------
// El conductor publica periódicamente el HTML de su body; la pantalla
// pública lo reemplaza por el suyo, así refleja el progreso real del juego.
function mirrorEligible() { return !!ArenaSync && !isPublic() && !isWaitingScreen(); }
function sendMirrorSnapshot() {
  if (!mirrorEligible()) return;
  try {
    if (typeof getSession === 'function' && !getSession()) return;
    if (!document.body) return;
    ArenaSync.postMessage({ type: 'mirror', html: document.body.innerHTML });
  } catch (err) { /* noop */ }
}
function startMirror() {
  if (!mirrorEligible()) return;
  sendMirrorSnapshot();
  setInterval(sendMirrorSnapshot, 1200);
}
function applyMirror(html) {
  if (!html || !document.body) return;
  if (document.body.innerHTML === html) return;
  document.body.innerHTML = html;
  if (isPublic()) { ensurePublicBadge(); ensureCompanion(); }
}
function ensurePublicBadge() {
  if (!document.body || document.querySelector('.public-badge')) return;
  const badge = document.createElement('div');
  badge.className = 'public-badge hidden fixed top-2 left-2 z-[80] px-3 py-1 rounded-full bg-tertiary/20 border border-tertiary/50 text-tertiary font-label-caps text-label-caps';
  badge.textContent = '● PANTALLA PÚBLICA';
  document.body.appendChild(badge);
}
// Navegación que también sigue a la pantalla pública.
function mirrorGo(url) {
  if (mirrorEligible()) {
    try { ArenaSync.postMessage({ type: 'nav', url: String(url) }); } catch (err) { /* noop */ }
  }
  window.location.href = url;
}

function applyPublicMode() {
  if (!isPublic()) return;
  document.documentElement.classList.add('public-mode');
  const tb = $('#theme-toggle');
  if (tb) tb.classList.add('hidden');
  const mb = $('#mute-toggle');
  if (mb) mb.classList.add('hidden');
  ensurePublicBadge();
  ensureCompanion();
}

function openPublicScreen() {
  const u = new URL(window.location.href);
  u.searchParams.set('public', '1');
  window.open(u.href, '_blank');
}

// ---------- Sala de espera (salvapantallas) ----------
function isWaitingScreen() {
  return /(^|\/)espera(\.html)?$/.test(window.location.pathname || '');
}

// Abre la pantalla pública en la sala de espera (espera.html). Se usa desde
// el hub / vista del conductor para encender la pantalla cuando aún no hay
// juego en curso o para dejarla descansando.
function openWaitingScreen() {
  const u = new URL('espera.html', window.location.href);
  u.searchParams.set('public', '1');
  if (typeof window.open === 'function') window.open(u.href, '_blank');
}

// El capibara guardián acompaña las pantallas públicas de los juegos.
function companionEligible() {
  if (!isPublic() || isWaitingScreen()) return false;
  let name = (window.location.pathname || '/').split('/').pop() || '';
  name = name.replace(/\.html$/, '');
  return !!name && name !== 'index';
}

function capybaraMarkup() {
  return '<div class="capy">' +
    '<span class="capy-zzz"><i>z</i><i>Z</i><i>z</i></span>' +
    '<span class="capy-ear left"></span><span class="capy-ear right"></span>' +
    '<span class="capy-head">' +
      '<span class="capy-eye left"></span><span class="capy-eye right"></span>' +
      '<span class="capy-nose"></span><span class="capy-mouth"></span>' +
    '</span>' +
    '<span class="capy-body"><span class="capy-belly"></span></span>' +
    '<span class="capy-paw l1"></span><span class="capy-paw l2"></span>' +
    '<span class="capy-paw r1"></span><span class="capy-paw r2"></span>' +
  '</div>';
}

function ensureCompanion() {
  if (!companionEligible() || !document.body) return;
  if (document.getElementById('capy-companion')) return;
  const el = document.createElement('div');
  el.id = 'capy-companion';
  el.className = 'capy-companion';
  el.innerHTML = capybaraMarkup();
  document.body.appendChild(el);
}

// Navega la pantalla pública a la sala de espera.
function goToWait() {
  try {
    const u = new URL('espera.html', window.location.href);
    u.searchParams.set('public', '1');
    window.location.href = u.href;
  } catch (e) { /* noop */ }
}

// La pantalla pública ociosa (sin sesión activa) pasa sola a la sala de
// espera para que no quede una página muerta al terminar un juego.
// Hay un margen inicial para darle tiempo a que llegue la sesión
// (BroadcastChannel) antes de decidir que no hay juego.
function startPublicIdleRedirect() {
  if (!isPublic() || isWaitingScreen()) return;
  if (typeof navigator === 'undefined') return; // entorno de pruebas
  const hasSession = () => {
    try { return !!localStorage.getItem('arena_session'); } catch (e) { return false; }
  };
  const tick = () => {
    if (hasSession()) { setTimeout(tick, 4000); return; }
    goToWait();
  };
  try { setTimeout(tick, 6000); } catch (e) { /* noop */ }
}

// Si la sala de espera recibe una sesión activa (arrancó un juego), salta a
// la página de ese juego siguiendo al conductor.
function redirectFromWait(s) {
  if (!isPublic() || !isWaitingScreen() || !s) return;
  const games = Array.isArray(s.games) ? s.games : null;
  if (!games || !games.length) return;
  const gi = Math.min(s.currentGameIndex || 0, games.length - 1);
  const g = games[gi];
  if (!g || !g.type) return;
  let page = (typeof GameRegistry !== 'undefined' && GameRegistry.gamePage) ? GameRegistry.gamePage(g.type) : 'play';
  const sep = page.indexOf('?') >= 0 ? '&' : '?';
  const target = new URL(page + sep + 'gi=' + gi + '&public=1', window.location.href);
  window.location.href = target.href;
}

// ---------- Recuperación de sesión desde Firestore ----------
// Deferred hook: lo invocan hub / winner / páginas de juego cuando NO hay
// sesión local pero existe un respaldo activo en Firestore.
function recoverableSession() {
  if (typeof db === 'undefined') return false;
  try { return !!localStorage.getItem('arena_session'); } catch (e) { return false; }
}

async function maybeRecoverSession() {
  if (recoverableSession()) return null;
  if (typeof recoverSessionFromFirestore !== 'function' || typeof db === 'undefined') return null;
  try {
    const recovered = await recoverSessionFromFirestore();
    if (recovered) {
      if (typeof loadSession === 'function') loadSession();
      if (typeof renderScoreboard === 'function') renderScoreboard();
      if (typeof updateWordBar === 'function') updateWordBar();
    }
    return recovered;
  } catch (e) { console.warn('maybeRecoverSession', e); return null; }
}

// Muestra una barra de confirmación si hay una sesión activa recuperable.
function offerRecovery(builder) {
  const run = () => {
    if (recoverableSession()) return;
    maybeRecoverSession().then(recovered => {
      if (!recovered || !recovered.teams || recovered.mode === 'individual') return;
      if (typeof builder === 'function') { builder(recovered); return; }
      showRecoveryBar(recovered);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}

function showRecoveryBar(s) {
  if (document.getElementById('recovery-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'recovery-bar';
  bar.className = 'recovery-bar fixed top-2 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-4 py-2 rounded-full glass-panel border-primary/40';
  bar.innerHTML = `<span class="font-body-md text-body-md text-on-surface">Sesión activa encontrada: <b class="text-primary">${escapeHtml(s.name || 'Circuito')}</b> · ${s.teams.length} equipos</span>
    <button id="recovery-accept" class="btn-primary px-4 py-1 rounded-full font-label-caps text-label-caps">RECUPERAR</button>
    <button id="recovery-dismiss" class="px-3 py-1 rounded-full border border-outline-variant text-on-surface-variant font-label-caps text-label-caps">IGNORAR</button>`;
  document.body.appendChild(bar);
  $('#recovery-accept', bar).addEventListener('click', () => {
    bar.remove();
    if (typeof recoverSessionFromFirestore === 'function') {
      recoverSessionFromFirestore().then(() => {
        if (s.games && s.games.length && window.location.pathname.indexOf('index') === -1) {
          mirrorGo((typeof getGamePage === 'function' ? getGamePage(s.games[0].type) : 'index') + '?gi=0');
        } else {
          location.reload();
        }
      });
    }
  });
  $('#recovery-dismiss', bar).addEventListener('click', () => bar.remove());
}

// ---------- Silencio (mute) global ----------
let muted = false;
try { muted = localStorage.getItem('arena_muted') === '1'; } catch (e) { /* noop */ }

function isMuted() { return muted || isPublic(); }
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
startMirror();
startPublicIdleRedirect();
