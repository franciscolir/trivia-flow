// ============================================================
//  js/firestore.js — Capa de datos (CRUD sobre Firestore)
//  Requiere cargar previamente firebase-config.js
// ============================================================

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ---------- Gate de acceso del conductor (Google) ----------
// La pantalla pública (espejo) no necesita autenticación; el conductor sí.
// Como el proyecto tiene la creación de usuarios deshabilitada, el conductor
// inicia sesión con su cuenta de Google (los proveedores ya autenticados
// pasan las reglas de Firestore que exigen request.auth != null).
let resolveAuthReady;
const authReady = new Promise(res => { resolveAuthReady = res; });
function isPublicPage() {
  try { return new URLSearchParams(window.location.search).get('public') === '1'; } catch (e) { return false; }
}

function mountGoogleGate() {
  if (document.getElementById('auth-gate')) return;
  const gate = document.createElement('div');
  gate.id = 'auth-gate';
  gate.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0B0E14;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;padding:2rem;text-align:center;font-family:Montserrat,sans-serif;';
  gate.innerHTML =
    '<div style="font-size:2.2rem;font-weight:900;color:#d2f4ff;letter-spacing:.02em;">ULTRA <span style="color:#8affc9;">ARENA</span></div>' +
    '<div style="color:#dde3e7;font-size:1.05rem;max-width:30rem;line-height:1.5;">Acceso del conductor. Inicia sesión con tu cuenta de Google para gestionar los juegos.</div>' +
    '<button id="google-signin-btn" style="display:inline-flex;align-items:center;gap:.6rem;padding:.9rem 1.8rem;border-radius:9999px;border:1px solid rgba(210,244,255,.5);background:#fff;color:#1f2933;font-family:Montserrat,sans-serif;font-weight:700;font-size:1rem;cursor:pointer;">' +
      '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>' +
      'INICIAR SESIÓN CON GOOGLE' +
    '</button>' +
    '<div id="auth-gate-error" style="display:none;color:#ffb4ab;font-size:.9rem;max-width:26rem;"></div>';
  document.body.appendChild(gate);
  const btn = document.getElementById('google-signin-btn');
  const err = document.getElementById('auth-gate-error');
  btn.addEventListener('click', () => {
    btn.disabled = true;
    err.style.display = 'none';
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then(() => resolveAuthReady())
      .catch(e => {
        btn.disabled = false;
        err.style.display = 'block';
        err.textContent = 'No se pudo iniciar sesión: ' + (e && e.message ? e.message : e);
      });
  });
}

function removeGoogleGate() {
  const gate = document.getElementById('auth-gate');
  if (gate) gate.remove();
}

(function initAuthGate() {
  if (isPublicPage()) { resolveAuthReady(); return; }
  auth.onAuthStateChanged(user => {
    if (user) { removeGoogleGate(); resolveAuthReady(); }
    else if (!document.getElementById('auth-gate')) mountGoogleGate();
  });
})();

async function awaitReady() {
  try { await authReady; } catch (e) { /* noop */ }
}

// Obtiene todas las trivias publicadas, ordenadas por fecha (desc).
async function getTrivias() {
  await awaitReady();
  const snap = await db.collection('trivias').limit(100).get();
  const list = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.status === 'published')
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return list;
}

// Escucha en tiempo real el listado de trivias publicadas.
async function subscribeTrivias(callback) {
  await awaitReady();
  return db.collection('trivias').limit(100).onSnapshot(snap => {
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.status === 'published')
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(list);
  }, err => console.error('Error al escuchar trivias:', err));
}

async function getTrivia(id) {
  await awaitReady();
  const doc = await db.collection('trivias').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function createTrivia(data) {
  await awaitReady();
  const docRef = await db.collection('trivias').add({
    ...data,
    status: data.status || 'published',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

async function updateTrivia(id, data) {
  await awaitReady();
  await db.collection('trivias').doc(id).update(data);
}

async function deleteTrivia(id) {
  await awaitReady();
  await db.collection('trivias').doc(id).delete();
}
