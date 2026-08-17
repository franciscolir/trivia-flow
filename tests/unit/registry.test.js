const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadScript, readGlobal, norm } = require('../helpers/harness');

const ctx = loadScript('js/registry.js');
const GameRegistry = readGlobal(ctx, 'GameRegistry');

test('registra y lista juegos', () => {
  GameRegistry.registerGame({ id: 'x1', name: 'Juego X', page: 'x', defaults: { points: 1 } });
  const games = GameRegistry.getAvailableGames();
  assert.ok(games.length >= 1);
  assert.ok(games.some(g => g.id === 'x1'));
});

test('getGame devuelve la definición registrada o null', () => {
  GameRegistry.registerGame({ id: 'x2', name: 'Juego 2' });
  assert.equal(GameRegistry.getGame('x2').name, 'Juego 2');
  assert.equal(GameRegistry.getGame('no_existe'), null);
});

test('registerGame lanza si falta el id', () => {
  assert.throws(() => GameRegistry.registerGame({ name: 'sin id' }), /se requiere id/);
});

test('gamePage devuelve page o play como fallback', () => {
  GameRegistry.registerGame({ id: 'x3', page: 'pagina-x' });
  assert.equal(GameRegistry.gamePage('x3'), 'pagina-x');
  assert.equal(GameRegistry.gamePage('nope'), 'play');
});

test('createGameInstance usa def.create cuando existe', () => {
  const inst = { hola: 1 };
  GameRegistry.registerGame({ id: 'x4', create: () => inst });
  assert.equal(GameRegistry.createGameInstance('x4', {}), inst);
});

test('createGameInstance lanza para juegos desconocidos', () => {
  assert.throws(() => GameRegistry.createGameInstance('zz', {}), /no registrado/);
});

test('los 7 juegos actuales están habilitados y apuntan a páginas reales', () => {
  const expected = ['trivia', 'timed', 'memorice', 'tombola', 'word', 'synonyms', 'sentence'];
  const fresh = loadScript('js/registry.js');
  const R = readGlobal(fresh, 'GameRegistry');
  const avail = norm(R.getAvailableGames()).filter(g => g.enabled !== false).map(g => g.id);
  for (const id of expected) assert.ok(avail.includes(id), 'falta ' + id);
  assert.equal(avail.length, expected.length, 'no se esperan juegos extra');
  for (const g of norm(R.getAvailableGames())) {
    assert.ok(g.id && g.name && g.icon && typeof g.page === 'string');
  }
});