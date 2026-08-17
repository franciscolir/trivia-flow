// Tests de integración: composición real de módulos (arena + registry +
// game + session) reproduciendo flujos completos del circuito.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadInto, readGlobal, makeDb } = require('../helpers/harness');

function fullSandbox(db) {
  const ctx = createSandbox({
    renderScoreboard: () => {},
    ...(db !== undefined ? { db } : {})
  });
  loadInto(ctx, 'js/arena.js');
  loadInto(ctx, 'js/turn.js');
  loadInto(ctx, 'js/timer.js');
  loadInto(ctx, 'js/game.js');
  loadInto(ctx, 'js/registry.js');
  loadInto(ctx, 'js/session.js');
  return ctx;
}

function teams() {
  return [{ id: 't1', name: 'A', color: 'rojo', score: 0 }, { id: 't2', name: 'B', color: 'azul', score: 0 }];
}

test('flujo completo: crear circuito -> setWord -> revelar -> premio -> ranking', () => {
  const ctx = fullSandbox();
  const sess = ctx.createSession({ mode: 'circuit', difficulty: 1, teams: teams(), games: [] });
  assert.equal(sess.status, 'ready');
  assert.deepEqual(ctx.getSession(), sess);

  ctx.setWord('OLA', { rewardAll: 5, maxReveals: 16 });
  ctx.addScore('t1', 20, 'Trivia', 'g1');
  ctx.revealWordLetter('O');
  assert.deepEqual(ctx.getSession().word.revealed, [0]);
  ctx.revealWordLetter('L');
  ctx.revealWordLetter('A');
  assert.equal(ctx.isWordComplete(), true);

  // El premio rewardAll llegó a ambos equipos
  assert.equal(ctx.getTeamScore('t1'), 25);
  assert.equal(ctx.getTeamScore('t2'), 5);
  // Eventos coherentes
  assert.equal(ctx.getEvents('LETTER_REVEALED').length, 3);
  assert.equal(ctx.getEvents('WORD_COMPLETED').length, 1);
});

test('el circuito avanza de juego con nextGameUrl y termina en winner', () => {
  const ctx = fullSandbox();
  const games = [
    readGlobal(ctx, 'GameRegistry').getGame('trivia'),
    readGlobal(ctx, 'GameRegistry').getGame('memorice')
  ].map(def => ({ id: 'gx', type: def.id, name: def.name, points: def.defaults.points, settings: {} }));
  ctx.createSession({ mode: 'circuit', difficulty: 1, teams: teams(), games });
  assert.equal(ctx.nextGameUrl(), 'memorice?gi=1');
  ctx.setCurrentGameIndex(1);
  assert.equal(ctx.nextGameUrl(), 'winner');
  // getGamePage por tipo
  assert.equal(ctx.getGamePage('trivia'), 'play');
  assert.equal(ctx.getGamePage('tombola'), 'tombola');
});

test('desempate por victorias: más juegos ganados rompe el empate en puntos', () => {
  const ctx = fullSandbox();
  ctx.createSession({ mode: 'circuit', difficulty: 1, teams: teams(), tiebreaker: 'gamesWon', games: [{ id: 'g1', type: 'trivia' }] });
  ctx.addScore('t1', 30, 'x');
  ctx.addScore('t2', 30, 'x');
  // t1 ganó 2 juegos, t2 uno
  ctx.logEvent('GAME_FINISHED', { teamId: 't1' });
  ctx.logEvent('GAME_FINISHED', { teamId: 't2' });
  ctx.logEvent('GAME_FINISHED', { teamId: 't1' });
  const tied = ctx.tiedTeams();
  assert.equal(tied.length, 2);
  // el criterio gamesWon elige al de más victorias
  const [a, b] = tied;
  const cmp = ctx.gameWins(a.id) - ctx.gameWins(b.id);
  assert.notEqual(cmp, 0);
  assert.equal(ctx.gameWins(ctx.getRanking()[0].id), 2);
});

test('resultados normalizados con buildResult se integran con el ranking', () => {
  const ctx = fullSandbox();
  ctx.createSession({ mode: 'circuit', difficulty: 1, teams: teams() });
  ctx.addScore('t1', 10, 'x');
  const res = ctx.buildResult({
    gameId: 'g1', winnerTeamId: 't1',
    rankings: ctx.getRanking(),
    pointsAwarded: { winner: ctx.getTeamScore('t1') }
  });
  assert.equal(res.winnerTeamId, 't1');
  assert.equal(res.rankings[0].id, 't1');
  assert.equal(res.pointsAwarded.winner, 10);
  assert.ok(res.completedAt > 0);
});

test('recuperación cruzada: otra pestaña (mismo localStorage) y Firestore', async () => {
  const doc = { id: 'rv1', name: 'Circuito X', mode: 'circuit', difficulty: 1, teams: teams(), games: [], word: { active: false }, tombola: { active: false }, scoreHistory: [], events: [], tiebreaker: 'gamesWon', rewardMode: 'cell' };
  const db = makeDb({ sessions: { get: () => Promise.resolve({ empty: false, docs: [{ id: doc.id, data: () => doc }] }) } });
  const ctx = fullSandbox(db);
  const s = await ctx.recoverSessionFromFirestore();
  assert.equal(s.id, 'rv1');
  assert.equal(ctx.getTeamScore('t2'), 0);
  // después de recuperar, el marcador registra y llega el turno al hub
  assert.ok(ctx.localStorage.getItem('arena_session'));
  // persistir tras la recuperación funciona (db fake encadenable)
  ctx.addScore('t1', 8, 'rec');
  assert.equal(ctx.getTeamScore('t1'), 8);
});

test('sesión de individual usa defaultTeams y no crea circuito', () => {
  const ctx = fullSandbox();
  const s = ctx.createSession({ mode: 'individual', teams: [] });
  assert.equal(s.mode, 'individual');
  assert.equal(s.games.length, 0);
  assert.equal(ctx.nextGameUrl(), 'index');
});