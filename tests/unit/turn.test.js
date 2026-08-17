const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadScript, readGlobal } = require('../helpers/harness');

const ctx = loadScript('js/turn.js');
const TurnManager = readGlobal(ctx, 'TurnManager');

test('TurnManager cicla turnos en orden', () => {
  const teams = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
  const t = new TurnManager().setTeams(teams);
  assert.equal(t.count(), 3);
  assert.deepEqual(t.current(), teams[0]);
  assert.deepEqual(t.next(), teams[1]);
  assert.deepEqual(t.next(), teams[2]);
  // vuelve al inicio
  assert.deepEqual(t.next(), teams[0]);
});

test('setFirst posiciona el turno en un equipo concreto', () => {
  const teams = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const t = new TurnManager().setTeams(teams).setFirst('b');
  assert.deepEqual(t.current(), teams[1]);
});

test('reset vuelve al primer equipo', () => {
  const teams = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const t = new TurnManager().setTeams(teams);
  t.next();
  t.reset();
  assert.deepEqual(t.current(), teams[0]);
});

test('sin equipos devuelve null y next no rompe', () => {
  const t = new TurnManager();
  assert.equal(t.current(), null);
  assert.equal(t.count(), 0);
  assert.equal(t.next(), null);
});

test('setTeams acepta solo arrays', () => {
  const t = new TurnManager().setTeams('nope');
  assert.equal(t.count(), 0);
});