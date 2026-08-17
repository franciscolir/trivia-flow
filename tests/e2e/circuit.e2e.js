// E2E — ULTRA ARENA
// Flujos completos contra el stack real (servidor local + Firestore):
//  1. Circuito completo con Trivia clásica (wizard -> pregunta -> resultado -> ganador)
//  2. Memorice configurado con un set de contenido personalizado desde el manager
// Requiere internet para Firestore y Edge instalado.
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = process.env.PORT || 4174;
const BASE = 'http://localhost:' + PORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const failures = [];
const log = (...a) => console.log('  ' + a.join(' '));

// ---------- helpers de página ----------
async function typeNumber(page, selector, value) {
  await page.$eval(selector, (el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function clickWhenAvailable(page, selector, timeout = 15000) {
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.click(selector);
}

async function waitUntilGone(page, selector, timeout = 15000) {
  await page.waitForFunction(sel => !document.querySelector(sel) ||
    getComputedStyle(document.querySelector(sel)).display === 'none', { timeout }, selector);
}

// Ejecuta una expresión que necesita `db` (solo páginas con firestore.js).
async function withDb(page, fn, ...args) {
  await page.goto(BASE + '/content', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof db !== 'undefined', { timeout: 15000 }).catch(() => { throw new Error('db no disponible'); });
  return page.evaluate(fn, ...args);
}

// ---------- server ----------
function startServer() {
  const s = spawn(process.execPath, [path.join(__dirname, '..', 'helpers', '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT) }
  });
  return new Promise((res, rej) => {
    s.stdout.once('data', () => res(s));
    s.once('exit', c => rej(new Error('server exit ' + c)));
    setTimeout(() => rej(new Error('server timeout')), 8000);
  });
}

(async () => {
  const server = await startServer();
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push((e && e.message) || String(e)));

  try {
    // Limpia sesión residual de Firestore antes de empezar
    await page.goto(BASE + '/index', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => { try { clearSession(); } catch (e) { /* noop */ } localStorage.clear(); });
    await sleep(300);

    // ============================================================
    // FLUJO 1: circuito completo con trivia clásica
    // ============================================================
    log('FLUJO 1: circuito completo (trivia)');
    const triviaId = await withDb(page, () =>
      db.collection('trivias').add({
        title: 'E2E Smoke', category: 'General', difficulty: 'Easy', timeLimit: 15, status: 'published',
        questions: [{ text: '¿2 + 2?', options: [{ text: '4', correct: true }, { text: '5', correct: false }] }],
        updatedAt: Date.now()
      }).then(r => r.id)
    );
    log('trivia seed = ' + triviaId);

    await page.goto(BASE + '/create', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await clickWhenAvailable(page, '.mode-card[data-mode="circuit"]');
    await sleep(150);
    await clickWhenAvailable(page, '#next-btn');               // equipos -> participantes
    await sleep(100);
    await clickWhenAvailable(page, '#next-btn');               // participantes -> juegos
    await sleep(100);
    await clickWhenAvailable(page, '#add-game');
    await clickWhenAvailable(page, '[data-type="trivia"]');    // abre config
    // forzar 1 pregunta para un flujo corto y determinista
    await page.waitForSelector('#config-fields [data-cfg="settings.questionCount"]', { timeout: 8000 });
    await typeNumber(page, '#config-fields [data-cfg="settings.questionCount"]', 1);
    await clickWhenAvailable(page, '#config-save');
    await sleep(150);
    await clickWhenAvailable(page, '#next-btn');               // dinámicas
    await sleep(100);
    await clickWhenAvailable(page, '#next-btn');               // resumen
    await clickWhenAvailable(page, '#start-btn');
    await page.waitForFunction(() => location.pathname.includes('play'), { timeout: 15000 });

    // responder la única pregunta
    await page.waitForFunction(() => document.querySelectorAll('#answers .answer-option').length >= 2, { timeout: 15000 });
    await page.click('#answers .answer-option');               // cualquiera
    await page.waitForSelector('#result-next', { visible: true, timeout: 20000 });
    // otorga puntos al primer equipo para garantizar un ganador único
    await page.evaluate(() => { const s = getSession(); if (s && s.teams[0]) { addScore(s.teams[0].id, 10, 'E2E award', null); persistSession(); } });
    await page.click('#result-next');
    await page.waitForFunction(() => location.pathname.includes('winner'), { timeout: 15000 });

    await clickWhenAvailable(page, '#finalize-btn');
    await page.waitForSelector('#result', { visible: true, timeout: 10000 }).catch(() => {});
    const winnerShown = await page.evaluate(() => {
      const el = document.getElementById('result');
      return el && getComputedStyle(el).display !== 'none' && document.getElementById('winner-name').textContent.trim().length > 0;
    });
    log(winnerShown ? 'OK: ganador mostrado' : 'FAIL: no se mostró el ganador');
    if (!winnerShown) failures.push('flow1 winner');

    await withDb(page, id => db.collection('trivias').doc(id).delete().catch(() => {}), triviaId);

    // ============================================================
    // FLUJO 2: memorice con contenido personalizado
    // ============================================================
    log('FLUJO 2: memorice con contenido custom');
    const setItems = ['🚀', '🌟', '🎯'].map((im, i) => ({ image: im, label: 'Item ' + i }));
    const setId = await withDb(page, items =>
      db.collection('memorySets').add({ name: 'E2E Set', items, updatedAt: Date.now() }).then(r => r.id), setItems);
    log('memorySet seed = ' + setId);

    await page.goto(BASE + '/create', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => { try { clearSession(); } catch (e) { /* noop */ } localStorage.clear(); });
    await clickWhenAvailable(page, '.mode-card[data-mode="circuit"]');
    await sleep(150);
    await clickWhenAvailable(page, '#next-btn');
    await sleep(100);
    await clickWhenAvailable(page, '#next-btn');
    await sleep(100);
    await clickWhenAvailable(page, '#add-game');
    await clickWhenAvailable(page, '[data-type="memorice"]');  // abre config
    // elegir el set en el select de contenido
    await page.waitForFunction(id =>
      [...document.querySelectorAll('#config-fields select[data-collection="memorySets"] option')].some(o => o.value === id),
      { timeout: 15000 }, setId);
    await page.select('#config-fields select[data-collection="memorySets"]', setId);
    await clickWhenAvailable(page, '#config-save');
    await sleep(150);
    await clickWhenAvailable(page, '#next-btn');
    await sleep(100);
    await clickWhenAvailable(page, '#next-btn');
    await clickWhenAvailable(page, '#start-btn');
    await page.waitForFunction(() => location.pathname.includes('memorice'), { timeout: 15000 });

    await page.waitForFunction(() => document.querySelectorAll('#board .memory-card').length === 6, { timeout: 15000 });
    const cardCount = await page.evaluate(() => document.querySelectorAll('#board .memory-card').length);
    const pairsInfo = await page.evaluate(() => document.getElementById('pairs').textContent);
    log('tablero: ' + cardCount + ' cartas, indicador ' + pairsInfo);
    if (cardCount !== 6) { failures.push('flow2 memory board ' + cardCount); }
    // contenido custom: las caras son del set (🚀/🌟/🎯)
    const faceSet = await page.evaluate(() => {
      const faces = [];
      document.querySelectorAll('#board .memory-card').forEach(() => {});
      return [...document.querySelectorAll('#board .memory-front')].map(e => e.textContent).filter(Boolean);
    });
    // voltear las 3 parejas para ver las caras
    for (let i = 0; i < 3; i++) {
      await page.click('#board .memory-card');
      await sleep(300);
      await page.click('#board .memory-card');
      await sleep(700);
    }
    const revealed = await page.evaluate(() => {
      return [...document.querySelectorAll('.memory-card.flipped .memory-front')].map(e => e.textContent.trim()).filter(Boolean);
    });
    log('caras reveladas: ' + JSON.stringify([...new Set(revealed)]));
    if (!revealed.some(t => ['🚀', '🌟', '🎯'].includes(t))) failures.push('flow2 custom faces');

    await withDb(page, id => db.collection('memorySets').doc(id).delete().catch(() => {}), setId);

    // ============================================================
    // Resumen
    // ============================================================
    if (pageErrors.length) {
      failures.push('page errors: ' + [...new Set(pageErrors)].slice(0, 10).join(' | '));
    }
    if (failures.length) {
      console.log('\nE2E ERRORES (' + failures.length + '):');
      failures.forEach(f => console.log('  - ' + f));
      process.exitCode = 1;
    } else {
      console.log('\nE2E OK: flujo 1 y 2 completados sin errores.');
    }
    if (pageErrors.length) console.log('pageErrors:\n' + [...new Set(pageErrors)].join('\n'));
  } catch (e) {
    console.error('\nE2E EXCEPCIÓN: ' + (e && e.stack || e));
    process.exitCode = 1;
    if (pageErrors.length) console.error('pageErrors:\n' + [...new Set(pageErrors)].join('\n'));
  } finally {
    await browser.close();
    server.kill();
  }
})();