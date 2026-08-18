// ============================================================
//  js/firestore.js — Capa de datos (CRUD sobre Firestore)
//  Requiere cargar previamente firebase-config.js
// ============================================================

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Inicia sesión anónima para que las reglas de Firestore (que exigen
// request.auth != null) dejen pasar las operaciones de la app.
const dbReady = (() => {
  try {
    return auth.signInAnonymously().then(() => true).catch(() => true);
  } catch (e) { return Promise.resolve(true); }
})();
async function awaitReady() {
  try { await dbReady; } catch (e) { /* noop */ }
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
