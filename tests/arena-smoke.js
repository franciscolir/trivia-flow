// Smoke test — ULTRA ARENA
// Prueba local con puppeteer-core + Edge del sistema. Levanta tests/server.js
// en un hilo y recorre las páginas principales verificando que cargan sin
// errores de consola/página y que los contenedores clave se renderizan.
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const BASE = 'http://localhost:4173';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGES = [
  { name: 'hub', path: '/', expect: [{ sel: '#individual-games a', min: 5 }] },
  { name: 'create', path: '/create', expect: [{ sel: '.mode-card', min: 1 }] },
  { name: 'trivias', path: '/trivias', expect: [{ sel: '#list-view', min: 1 }] },
  { name: 'content', path: '/content', expect: [{ sel: '#list-view', min: 1 }, { sel: '.type-btn', min: 3 }] },
  { name: 'play', path: '/play?gi=0', expect: [{ sel: '#loading, #no-data, #game', min: 1 }] },
  { name: 'memorice', path: '/memorice?gi=0', expect: [{ sel: '#board', min: 1 }] },
  { name: 'synonyms', path: '/synonyms?gi=0', expect: [{ sel: '#board, #no-pairs', min: 1 }] },
  { name: 'sentence', path: '/sentence?gi=0', expect: [{ sel: '#round-info', min: 1 }] },
  { name: 'tombola', path: '/tombola?gi=0', expect: [{ sel: '#spin-btn', min: 1 }] },
  { name: 'word', path: '/word?gi=0', expect: [{ sel: '#grid', min: 1 }] },
  { name: 'winner', path: '/winner', expect: [{ sel: '#gate, #result', min: 1 }] }
];

(async () => {
  const server = spawn(process.execPath, [require('path').join(__dirname, 'server.js')]);
  const errors = [];
  let browser;
  try {
    await new Promise((res, rej) => {
      server.stdout.once('data', () => res());
      server.once('exit', code => rej(new Error('server exited ' + code)));
      setTimeout(() => rej(new Error('server timeout')), 8000);
    });
    browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', e => pageErrors.push((e && e.message) || String(e)));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    for (const p of PAGES) {
      await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(900);
      let ok = true;
      const notes = [];
      for (const e of p.expect) {
        const count = await page.$$eval(e.sel, els => els.length).catch(() => 0);
        if (count < e.min) { ok = false; notes.push(e.sel + '=' + count + '<' + e.min); }
      }
      const status = ok ? 'PASS' : 'FAIL';
      console.log(`[${status}] ${p.name}  ${notes.join(' | ')}`);
      if (!ok) errors.push(p.name + ' (selectores: ' + notes.join(', ') + ')');
    }

    if (pageErrors.length || consoleErrors.length) {
      console.log('\n--- errores de consola/página ---');
      [...new Set([...pageErrors, ...consoleErrors])].slice(0, 20).forEach(e => console.log('  ' + e));
      errors.push('console/page errors detected');
    } else {
      console.log('sin errores de consola/página');
    }

    // Mute toggle en el hub
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.click('#mute-toggle');
    await sleep(100);
    const icon = await page.$eval('#mute-toggle .material-symbols-outlined', el => el.textContent).catch(() => '?');
    const muted = await page.evaluate(() => localStorage.getItem('arena_muted'));
    const muteOk = icon.trim() === 'volume_off' && muted === '1';
    console.log(`[${muteOk ? 'PASS' : 'FAIL'}] mute toggle (icono=${icon.trim()}, arena_muted=${muted})`);
    if (!muteOk) errors.push('mute toggle');

    await browser.close();
  } catch (e) {
    errors.push('setup: ' + (e && e.message));
  } finally {
    if (browser) { try { await browser.close(); } catch (e) { /* noop */ } }
    server.kill();
  }

  if (errors.length) {
    console.log('\nERRORES (' + errors.length + '):\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('\nOK — smoke test sin errores.');
})();