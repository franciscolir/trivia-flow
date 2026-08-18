const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadScript, makeDb } = require('../helpers/harness');

const arena = () => loadScript('js/arena.js');

test('escapeHtml escapa HTML y no rompe con null/undefined', () => {
  const ctx = arena();
  assert.equal(ctx.escapeHtml('<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  assert.equal(ctx.escapeHtml(null), '');
  assert.equal(ctx.escapeHtml(undefined), '');
  assert.equal(ctx.escapeHtml(42), '42');
});

test('fmt formatea miles', () => {
  const ctx = arena();
  assert.equal(ctx.fmt(0), '0');
  assert.equal(ctx.fmt(1234), '1,234');
  assert.equal(ctx.fmt('2500'), '2,500');
  assert.equal(ctx.fmt(undefined), '0');
});

test('shuffleArray conserva elementos y no muta el original', () => {
  const ctx = arena();
  const orig = [1, 2, 3, 4, 5];
  const out = ctx.shuffleArray(orig);
  assert.notEqual(out, orig);
  assert.deepEqual([...out].sort((a, b) => a - b), orig);
  assert.deepEqual(orig, [1, 2, 3, 4, 5]);
});

test('contentCollectionFor mapea cada tipo a su colección', () => {
  const ctx = arena();
  assert.equal(ctx.contentCollectionFor('memorice'), 'memorySets');
  assert.equal(ctx.contentCollectionFor('synonyms'), 'synonymSets');
  assert.equal(ctx.contentCollectionFor('sentence'), 'sentenceSets');
  assert.equal(ctx.contentCollectionFor('trivia'), null);
});

test('loadGameContent: null sin db, sin contentId o sin documento', async () => {
  const ctx = arena();
  assert.equal(await ctx.loadGameContent(null), null);
  assert.equal(await ctx.loadGameContent({ settings: {} }), null);
  const db = makeDb({
    memorySets: { docGet: () => Promise.resolve({ exists: false }) }
  });
  const ctx2 = loadScript('js/arena.js', { db });
  const out = await ctx2.loadGameContent({ type: 'memorice', settings: { contentId: 'nope' } });
  assert.equal(out, null);
});

test('loadGameContent: devuelve los items del set configurado', async () => {
  const items = [{ image: '🚀', label: 'Cohete' }, { image: '🌟' }];
  const db = makeDb({
    synonymSets: { docGet: () => Promise.resolve({ exists: true, data: () => ({ name: 'S1', items }) }) }
  });
  const ctx = loadScript('js/arena.js', { db });
  const out = await ctx.loadGameContent({ type: 'synonyms', settings: { contentId: 'set1' } });
  assert.deepEqual(out, items);
});

test('loadGameContent: items no-array se descartan', async () => {
  const db = makeDb({
    sentenceSets: { docGet: () => Promise.resolve({ exists: true, data: () => ({ items: 'nope' }) }) }
  });
  const ctx = loadScript('js/arena.js', { db });
  assert.equal(await ctx.loadGameContent({ type: 'sentence', settings: { contentId: 's' } }), null);
});

test('isPublic detecta el modo público por la URL', () => {
  const ctx = loadScript('js/arena.js', {
    window: { location: { search: '?public=1' } },
    location: { search: '?public=1' }
  });
  assert.equal(ctx.isPublic(), true);
  const ctx2 = arena();
  assert.equal(ctx2.isPublic(), false);
});

test('isWaitingScreen detecta la sala de espera por pathname', () => {
  const ctx = loadScript('js/arena.js', {
    window: { location: { pathname: '/espera' } },
    location: { pathname: '/espera' }
  });
  assert.equal(ctx.isWaitingScreen(), true);
  const ctx2 = loadScript('js/arena.js', {
    window: { location: { pathname: '/espera.html' } },
    location: { pathname: '/espera.html' }
  });
  assert.equal(ctx2.isWaitingScreen(), true);
  const hub = loadScript('js/arena.js', {
    window: { location: { pathname: '/' } },
    location: { pathname: '/' }
  });
  assert.equal(hub.isWaitingScreen(), false);
  const play = loadScript('js/arena.js', {
    window: { location: { pathname: '/play' } },
    location: { pathname: '/play' }
  });
  assert.equal(play.isWaitingScreen(), false);
});

test('companionEligible: solo en pantalla pública de juegos', () => {
  // Pública en página de juego -> sí
  const play = loadScript('js/arena.js', {
    window: { location: { search: '?public=1', pathname: '/play' } },
    location: { search: '?public=1', pathname: '/play' }
  });
  assert.equal(play.companionEligible(), true);
  // Conductor (sin public) -> no
  const cond = loadScript('js/arena.js', {
    window: { location: { pathname: '/play' } },
    location: { pathname: '/play' }
  });
  assert.equal(cond.companionEligible(), false);
  // Pública en hub -> no
  const hub = loadScript('js/arena.js', {
    window: { location: { search: '?public=1', pathname: '/' } },
    location: { search: '?public=1', pathname: '/' }
  });
  assert.equal(hub.companionEligible(), false);
  // Pública en espera -> no
  const esp = loadScript('js/arena.js', {
    window: { location: { search: '?public=1', pathname: '/espera' } },
    location: { search: '?public=1', pathname: '/espera' }
  });
  assert.equal(esp.companionEligible(), false);
});

test('capybaraMarkup genera la estructura del capibara', () => {
  const ctx = arena();
  const html = ctx.capybaraMarkup();
  assert.ok(html.includes('capy-head'));
  assert.ok(html.includes('capy-eye'));
  assert.ok(html.includes('capy-body'));
  assert.ok(html.includes('capy-paw'));
  assert.ok(html.includes('capy-zzz'));
});

test('redirectFromWait: en espera pública salta al juego de la sesión', () => {
  const href = 'http://localhost/espera.html';
  const session = { currentGameIndex: 1, games: [{ type: 'trivia' }, { type: 'memorice' }] };
  const loc = { search: '?public=1', pathname: '/espera.html', href };
  const ctx = loadScript('js/arena.js', { window: { location: loc }, location: loc });
  ctx.GameRegistry = { gamePage: t => (t === 'memorice' ? 'memorice' : 'play') };
  ctx.redirectFromWait(session);
  assert.equal(loc.href, 'http://localhost/memorice?gi=1&public=1');
});

test('redirectFromWait: sin sesión o sin juegos no navega', () => {
  const href = 'http://localhost/espera.html';
  const loc = { search: '?public=1', pathname: '/espera.html', href };
  const ctx = loadScript('js/arena.js', { window: { location: loc }, location: loc });
  ctx.redirectFromWait(null);
  assert.equal(loc.href, href);
  ctx.redirectFromWait({ games: [] });
  assert.equal(loc.href, href);
});

test('startPublicIdleRedirect: sin navegador real no arma intervalos', () => {
  const ctx = loadScript('js/arena.js', {
    window: { location: { search: '?public=1', pathname: '/play' } },
    location: { search: '?public=1', pathname: '/play' }
  });
  // En el sandbox no existe `navigator`, por lo que no debe colgar el proceso
  ctx.startPublicIdleRedirect();
  assert.ok(true);
});