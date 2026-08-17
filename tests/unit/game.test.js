const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadScript, readGlobal, norm } = require('../helpers/harness');

const ctx = loadScript('js/game.js');
const BaseGame = readGlobal(ctx, 'BaseGame');
const buildResult = readGlobal(ctx, 'buildResult');

test('BaseGame recorre su ciclo de vida', () => {
  const g = new BaseGame({ j: 1 });
  assert.equal(g.status, 'idle');
  g.init();
  assert.equal(g.status, 'ready');
  g.start();
  assert.equal(g.status, 'running');
  g.pause();
  assert.equal(g.status, 'paused');
  g.resume();
  assert.equal(g.status, 'running');
  g.reset();
  assert.equal(g.status, 'ready');
  assert.equal(g.result, null);
  g.destroy();
  assert.equal(g.status, 'destroyed');
});

test('destroy impide arrancar de nuevo (start no altera)', () => {
  const g = new BaseGame();
  g.destroy();
  g.start();
  assert.equal(g.status, 'destroyed');
});

test('finish setea status y guarda el resultado de getResult', () => {
  class Fake extends BaseGame { getResult() { return { x: 1 }; } }
  const g = new Fake();
  const res = g.finish();
  assert.equal(g.status, 'finished');
  assert.deepEqual(res, { x: 1 });
  assert.deepEqual(g.result, { x: 1 });
});

test('buildResult normaliza el resultado con defaults', () => {
  const r = buildResult({ gameId: 'g1', winnerTeamId: 't1' });
  assert.equal(r.gameId, 'g1');
  assert.equal(r.winnerTeamId, 't1');
  assert.deepEqual(norm(r.rankings), []);
  assert.deepEqual(norm(r.pointsAwarded), {});
  assert.deepEqual(norm(r.statistics), {});
  assert.ok(r.completedAt > 0);
});

test('buildResult ignora valores no válidos', () => {
  const r = buildResult({ gameId: null, winnerTeamId: null, rankings: 'x', pointsAwarded: null });
  assert.equal(r.gameId, null);
  assert.equal(r.winnerTeamId, null);
  assert.deepEqual(norm(r.rankings), []);
  assert.deepEqual(norm(r.pointsAwarded), {});
});