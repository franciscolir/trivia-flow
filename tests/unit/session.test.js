const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadInto, makeDb, norm } = require('../helpers/harness');

function sessionCtx(db, extra) {
  const ctx = createSandbox({
    renderScoreboard: () => {},
    ...(db !== undefined ? { db } : {}),
    ...(extra || {})
  });
  loadInto(ctx, 'js/arena.js');   // shuffleArray y helpers
  loadInto(ctx, 'js/session.js');
  return ctx;
}

function baseSession(ctx, extra) {
  return ctx.createSession(Object.assign({
    mode: 'circuit',
    difficulty: 1,
    teams: [
      { id: 't1', name: 'A', color: 'rojo', score: 0 },
      { id: 't2', name: 'B', color: 'azul', score: 0 }
    ]
  }, extra || {}));
}

test('createSession aplica defaults', () => {
  const ctx = sessionCtx();
  const s = ctx.createSession({});
  assert.equal(s.mode, 'circuit');
  assert.equal(s.tiebreaker, 'gamesWon');
  assert.equal(s.rewardMode, 'cell');
  assert.equal(s.word.active, false);
  assert.equal(s.teams.length, 3); // defaultTeams(3)
  assert.ok(ctx.getSession() === s);
});

test('addScore suma e historiza, respetando la dificultad', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  const pts = ctx.addScore('t1', 10, 'prueba', 'g1');
  assert.equal(pts, 10);
  assert.equal(ctx.getTeamScore('t1'), 10);
  // dificultad 1.5 redondea
  const c2 = sessionCtx();
  baseSession(c2, { difficulty: 1.5 });
  c2.addScore('t1', 10, 'x');
  assert.equal(c2.getTeamScore('t1'), 15);
});

test('addScore no suma a equipos inexistentes', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  assert.equal(ctx.addScore('ghost', 10, 'x'), 0);
});

test('subtractScore nunca baja de cero', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  ctx.addScore('t1', 5, 'x');
  assert.equal(ctx.subtractScore('t1', 99, 'pena'), 0);
});

test('getRanking ordena por puntos descendente', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  ctx.addScore('t2', 30, 'x');
  ctx.addScore('t1', 10, 'x');
  const r = ctx.getRanking();
  assert.deepEqual(norm(r.map(t => t.id)), ['t2', 't1']);
});

test('logEvent y getEvents registran eventos tipados', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  ctx.logEvent('GAME_FINISHED', { winnerTeamId: 't1' });
  ctx.logEvent('SCORE_ADDED', { points: 5 });
  assert.equal(ctx.getEvents('GAME_FINISHED').length, 1);
  assert.equal(ctx.getEvents().length, 2);
});

test('buildWordCells genera 16 casillas con letras y especiales', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  const cells = ctx.buildWordCells('CASA', 16);
  assert.equal(cells.length, 16);
  const letters = cells.filter(c => c.type === 'letter').map(c => c.letter);
  assert.deepEqual(norm(letters.slice().sort()), ['A', 'A', 'C', 'S']);
  // códigos de celda únicos
  assert.equal(new Set(cells.map(c => c.id)).size, 16);
});

test('setWord configura el juego de palabra y respeta maxReveals', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  ctx.setWord('casa', { maxReveals: 2, guessEnabled: false, cells: 8, rewardAll: 3, rewardWinner: 7 });
  const w = ctx.getSession().word;
  assert.equal(w.text, 'CASA');
  assert.equal(w.active, true);
  assert.equal(w.cells.length, 8);
  assert.equal(w.maxReveals, 2);
  assert.equal(w.revealsUsed, 0);
  assert.equal(w.guessEnabled, false);
});

test('revealWordLetter revela todas las apariciones; completeWord premia a todos', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  ctx.setWord('aba', { rewardAll: 5 });
  ctx.revealWordLetter('a');
  assert.deepEqual(norm(ctx.getSession().word.revealed), [0, 2]);
  assert.equal(ctx.isWordComplete(), false);
  ctx.revealWordLetter('b');
  assert.equal(ctx.isWordComplete(), true);
  // rewardAll repartido a cada equipo
  assert.equal(ctx.getTeamScore('t1'), 5);
  assert.equal(ctx.getTeamScore('t2'), 5);
});

test('guessWord correcto completa la palabra', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  ctx.setWord('sol', { guessEnabled: true });
  const ok = ctx.guessWord('t1', 'SOL');
  assert.equal(ok, true);
  assert.equal(ctx.isWordComplete(), true);
  assert.ok(ctx.getSession().word.revealed.length === 3);
});

test('guessWord incorrecto penaliza solo si hay guessPenalty', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  ctx.setWord('sol', { guessEnabled: true, guessPenalty: 4 });
  ctx.addScore('t1', 10, 'x');
  assert.equal(ctx.guessWord('t1', 'NO'), false);
  assert.equal(ctx.getTeamScore('t1'), 6);
  // sin penalización no resta
  const ctx2 = sessionCtx();
  baseSession(ctx2);
  ctx2.setWord('sol', { guessEnabled: true, guessPenalty: 0 });
  ctx2.addScore('t1', 10, 'x');
  ctx2.guessWord('t1', 'NO');
  assert.equal(ctx2.getTeamScore('t1'), 10);
});

test('getUndiscoveredLetters devuelve letras únicas sin revelar', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  ctx.setWord('ANANAS');
  ctx.revealWordLetter('A');
  assert.deepEqual(norm(ctx.getUndiscoveredLetters()), ['N', 'S']);
});

test('tiedTeams devuelve a los líderes empatados y gameWins cuenta victorias', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  ctx.addScore('t1', 10, 'x');
  ctx.addScore('t2', 10, 'x');
  const tied = ctx.tiedTeams().map(t => t.id).sort();
  assert.deepEqual(norm(tied), ['t1', 't2']);
  ctx.logEvent('GAME_FINISHED', { teamId: 't1' });
  ctx.logEvent('GAME_FINISHED', { teamId: 't1' });
  assert.equal(ctx.gameWins('t1'), 2);
  assert.equal(ctx.gameWins('t2'), 0);
  // despejamos el empate por victorias
  assert.deepEqual(norm(ctx.tiedTeams().map(t => t.id).sort()), ['t1', 't2']); // siguen empatados en puntos
});

test('sin equipos suficientes tiedTeams devuelve vacío', () => {
  const ctx = sessionCtx();
  assert.deepEqual(norm(ctx.tiedTeams()), []);
});

test('persistencia: loadSession recupera de localStorage', () => {
  const ctx = sessionCtx();
  baseSession(ctx);
  assert.ok(ctx.getSession());
  // mismo almacenamiento local = recarga de página
  const ctx2 = sessionCtx(undefined, { localStorage: ctx.localStorage });
  assert.equal(ctx2.getSession(), null);
  assert.ok(ctx2.loadSession());
  assert.equal(ctx2.getSession().mode, 'circuit');
});

test('clearSession limpia localStorage y borra el doc de Firestore', () => {
  let deleted = 0;
  const db = makeDb();
  const ctx = sessionCtx(db);
  baseSession(ctx);
  const sid = ctx.getSession().id;
  ctx.persistSession();
  assert.ok(ctx.localStorage.getItem('arena_session'));
  // interceptar delete del doc
  db.collection = (name) => {
    const base = { doc: (id) => ({ set: () => Promise.resolve(), delete: () => { deleted++; return Promise.resolve(); } }), get: () => Promise.resolve({ empty: true, docs: [] }) };
    return Object.assign({}, base, { orderBy: () => base, limit: () => base });
  };
  ctx.clearSession();
  assert.equal(ctx.getSession(), null);
  assert.equal(ctx.localStorage.getItem('arena_session'), null);
  assert.equal(deleted, 1);
});

test('recoverSessionFromFirestore restaura la sesión más reciente', async () => {
  const doc = { id: 'ses-abc', name: 'Circuito Recuperado', mode: 'circuit', difficulty: 1, teams: [{ id: 't1', name: 'A', color: 'rojo', score: 4 }], games: [], word: { active: false }, tombola: { active: false }, scoreHistory: [], events: [], tiebreaker: 'gamesWon', rewardMode: 'cell' };
  const db = makeDb({ sessions: { get: () => Promise.resolve({ empty: false, docs: [{ id: doc.id, data: () => doc }] }) } });
  const ctx = sessionCtx(db);
  // Sin sesión local
  assert.equal(ctx.getSession(), null);
  const s = await ctx.recoverSessionFromFirestore();
  assert.ok(s);
  assert.equal(s.id, 'ses-abc');
  assert.equal(s.name, 'Circuito Recuperado');
  assert.equal(ctx.getTeamScore('t1'), 4);
  // quedó guardada en localStorage
  assert.ok(ctx.localStorage.getItem('arena_session'));
});