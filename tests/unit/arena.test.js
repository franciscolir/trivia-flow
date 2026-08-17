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