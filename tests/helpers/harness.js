// Harness de pruebas Node: carga un script del navegador (IIFE/funciones)
// en un contexto vm con mocks de los globals del navegador (document,
// localStorage, window/location, db opcional). Las funciones declaradas se
// exponen en el contexto devuelto; const/let quedan en el closure del script.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');

// Mismo escapado que un navegador sobre textContent -> innerHTML.
function fakeEscape(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function makeFakeElement() {
  const st = { html: '', text: '' };
  const el = {
    value: '',
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    appendChild() {},
    remove() {},
    setAttribute() {},
    getAttribute() { return null; }
  };
  Object.defineProperty(el, 'textContent', {
    get() { return st.text; },
    set(v) { st.text = v == null ? '' : String(v); st.html = undefined; }
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return st.html !== undefined ? st.html : fakeEscape(st.text); },
    set(v) { st.html = v == null ? '' : String(v); st.text = undefined; }
  });
  return el;
}

function makeFakeDocument() {
  return {
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => makeFakeElement(),
    body: makeFakeElement(),
    documentElement: { classList: { toggle() {}, add() {}, remove() {}, contains() { return true; } }, className: 'dark' },
    readyState: 'complete',
    addEventListener() {},
    title: 'test'
  };
}

// localStorage persistente durante la vida del contexto
function makeLocalStorage() {
  const store = {};
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    __store: store
  };
}

// Fake db con cadenas encadenables (doc/orderBy/limit/get/set/delete)
// `overrides.collectionName.get` permite personalizar el snapshot.
function makeDb(overrides) {
  const over = overrides || {};
  return {
    collection(name) {
      const d = over[name] || {};
      const chain = {
        doc(id) {
          return {
            set: d.docSet || (() => Promise.resolve()),
            update: d.docUpdate || (() => Promise.resolve()),
            delete: d.docDelete || (() => Promise.resolve()),
            get: d.docGet || (() => Promise.resolve({ exists: false }))
          };
        },
        orderBy() { return chain; },
        limit() { return chain; },
        get: d.get || (() => Promise.resolve({ empty: true, docs: [] })),
        add: d.add || (() => Promise.resolve({ id: 'new_' + Math.random().toString(36).slice(2, 7) }))
      };
      return chain;
    }
  };
}

// Carga `rel` (relativo a la raíz del repo) en un contexto vm aislado.
function loadScript(rel, globals) {
  const ctx = createSandbox(globals);
  loadInto(ctx, rel);
  return ctx;
}

// Crea un sandbox vm reutilizable (para componer varios módulos).
function createSandbox(globals) {
  const windowObj = {
    location: { search: '', href: 'http://localhost/', pathname: '/' },
    addEventListener() {}
  };
  const ctx = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    URL, URLSearchParams,
    window: windowObj,
    location: windowObj.location,
    self: windowObj,
    globalThis: null,
    document: makeFakeDocument(),
    localStorage: makeLocalStorage(),
    Math, Date, JSON, RegExp, Promise, String, Number, Boolean, Array, Object, Error, isNaN, parseInt, parseFloat,
    ...(globals || {})
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  return ctx;
}

// Ejecuta un archivo JS dentro de un sandbox ya creado.
function loadInto(ctx, rel, globals) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error('no existe: ' + rel);
  const code = fs.readFileSync(file, 'utf8');
  if (globals) Object.assign(ctx, globals);
  vm.runInContext(code, ctx, { filename: rel });
  return ctx;
}

// Lee un binding léxico/global (class, const, let) desde el sandbox.
function readGlobal(ctx, name) {
  return vm.runInContext(name, ctx);
}

// Combina setInterval real con una API para disparar ticks manualmente.
function makeFakeTimers() {
  const intervals = new Map();
  let cur = 0;
  return {
    setInterval(fn) { const id = ++cur; intervals.set(id, fn); return id; },
    clearInterval(id) { intervals.delete(id); },
    __count: () => intervals.size,
    __tick: () => { for (const fn of Array.from(intervals.values())) fn(); },
    __clear: () => intervals.clear()
  };
}

// Serializa a JSON plano para comparar valores creados dentro del sandbox vm.
function norm(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

// Lectura de bindings léxicos del sandbox (class/const/let).
module.exports = { loadScript, loadInto, createSandbox, readGlobal, makeDb, makeFakeTimers, makeFakeElement, makeFakeDocument, norm, ROOT };