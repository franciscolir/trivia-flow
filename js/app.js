// ============================================================
//  js/app.js — Inicialización de Firebase y helpers globales
//  Se carga después de firebase-config.js
// ============================================================

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------- Helpers de DOM ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Categorías disponibles ----------
const CATEGORIES = [
  'General', 'Ciencia', 'Historia', 'Geografía', 'Arte',
  'Deportes', 'Música', 'Cine', 'Videojuegos', 'Cultura Pop', 'Otro'
];

const DIFFICULTY_STYLES = {
  Easy: 'bg-secondary-container text-on-secondary-container',
  Medium: 'bg-primary/10 text-primary-container border border-primary/20',
  Hard: 'bg-error-container text-on-error-container'
};

// ---------- Autenticación ----------
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    return true;
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    return false;
  }
}

async function signOutUser() {
  try {
    await auth.signOut();
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  }
}

// ---------- Utilidades ----------
function formatNumber(n) {
  return n.toLocaleString('en-US');
}

// ---------- Modo claro / oscuro ----------
function initTheme() {
  const saved = localStorage.getItem('triviaflow_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved ? saved === 'dark' : prefersDark;
  document.documentElement.classList.toggle('dark', dark);
  const icon = $('#theme-toggle .material-symbols-outlined');
  if (icon) icon.textContent = dark ? 'light_mode' : 'dark_mode';
}

function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('triviaflow_theme', dark ? 'dark' : 'light');
  const icon = $('#theme-toggle .material-symbols-outlined');
  if (icon) icon.textContent = dark ? 'light_mode' : 'dark_mode';
}

const themeToggle = $('#theme-toggle');
if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
initTheme();

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- UI de autenticación en el nav ----------
// Los elementos con [data-login-btn] se muestran sin sesión.
// Los que tienen [data-user-menu] se muestran con sesión.
function bindAuthUI(onChange) {
  const loginBtns = $$('[data-login-btn]');
  const userMenus = $$('[data-user-menu]');

  function setAuthed(user) {
    loginBtns.forEach(b => b.classList.toggle('hidden', !!user));
    userMenus.forEach(m => {
      m.classList.toggle('hidden', !user);
      m.classList.toggle('flex', !!user);
    });

    userMenus.forEach(menu => {
      const img = $('img', menu);
      const name = $('[data-user-name]', menu);
      if (img) img.src = user && user.photoURL ? user.photoURL : '';
      if (name) name.textContent = user ? (user.displayName || 'Usuario') : '';
    });
  }

  loginBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await signInWithGoogle();
      if (!ok) alert('No se pudo iniciar sesión. Revisa que hayas activado Google en Firebase Auth.');
    });
  });

  $$('[data-signout-btn]').forEach(btn => {
    btn.addEventListener('click', signOutUser);
  });

  auth.onAuthStateChanged(user => {
    setAuthed(user);
    if (typeof onChange === 'function') onChange(user);
  });
}
