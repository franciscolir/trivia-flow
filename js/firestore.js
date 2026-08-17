// ============================================================
//  js/firestore.js — Capa de datos (CRUD sobre Firestore)
//  Requiere cargar previamente firebase-config.js
// ============================================================

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Obtiene todas las trivias publicadas, ordenadas por fecha (desc).
async function getTrivias() {
  const snap = await db.collection('trivias').limit(100).get();
  const list = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.status === 'published')
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return list;
}

// Escucha en tiempo real el listado de trivias publicadas.
function subscribeTrivias(callback) {
  return db.collection('trivias').limit(100).onSnapshot(snap => {
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.status === 'published')
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(list);
  }, err => console.error('Error al escuchar trivias:', err));
}

async function getTrivia(id) {
  const doc = await db.collection('trivias').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function createTrivia(data) {
  const docRef = await db.collection('trivias').add({
    ...data,
    status: data.status || 'published',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

async function updateTrivia(id, data) {
  await db.collection('trivias').doc(id).update(data);
}

async function deleteTrivia(id) {
  await db.collection('trivias').doc(id).delete();
}
