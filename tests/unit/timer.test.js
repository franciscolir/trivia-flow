const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadScript, readGlobal, makeFakeTimers } = require('../helpers/harness');

function timerWith(fake) {
  return loadScript('js/timer.js', {
    setInterval: fake.setInterval,
    clearInterval: fake.clearInterval
  });
}

test('start con total 0 dispara onTimeout inmediatamente y no corre', () => {
  const fake = makeFakeTimers();
  const ctx = timerWith(fake);
  let timed = 0;
  const t = new (readGlobal(ctx, 'TimerManager'))();
  t.start(0, null, () => timed++);
  assert.equal(timed, 1);
  assert.equal(t.isRunning(), false);
});

test('start emite onTick inicial y decrementa con cada tick', () => {
  const fake = makeFakeTimers();
  const ctx = timerWith(fake);
  const ticks = [];
  const t = new (readGlobal(ctx, 'TimerManager'))();
  t.start(3, s => ticks.push(s), () => {});
  assert.deepEqual(ticks, [3]); // tick inicial
  fake.__tick();
  assert.deepEqual(ticks, [3, 2]);
  fake.__tick();
  assert.deepEqual(ticks, [3, 2, 1]);
  assert.equal(t.getRemaining(), 1);
});

test('al llegar a 0 llama onTimeout y se detiene', () => {
  const fake = makeFakeTimers();
  const ctx = timerWith(fake);
  let timed = 0;
  const t = new (readGlobal(ctx, 'TimerManager'))();
  t.start(1, null, () => timed++);
  fake.__tick();
  assert.equal(timed, 1);
  assert.equal(t.isRunning(), false);
  assert.equal(t.getRemaining(), 0);
});

test('pause/resume congelan y reanudan la cuenta', () => {
  const fake = makeFakeTimers();
  const ctx = timerWith(fake);
  const t = new (readGlobal(ctx, 'TimerManager'))();
  t.start(3, null, () => {});
  fake.__tick();
  t.pause();
  fake.__tick();
  assert.equal(t.getRemaining(), 2);
  t.resume();
  fake.__tick();
  assert.equal(t.getRemaining(), 1);
});

test('stop cancela el intervalo y no vuelve a llamar onTimeout', () => {
  const fake = makeFakeTimers();
  const ctx = timerWith(fake);
  let timed = 0;
  const t = new (readGlobal(ctx, 'TimerManager'))();
  t.start(5, null, () => timed++);
  t.stop();
  fake.__tick();
  assert.equal(timed, 0);
  assert.equal(t.isRunning(), false);
  assert.equal(fake.__count(), 0);
});

test('start reinicia reemplazando el intervalo anterior', () => {
  const fake = makeFakeTimers();
  const ctx = timerWith(fake);
  const t = new (readGlobal(ctx, 'TimerManager'))();
  t.start(10, null, () => {});
  assert.equal(fake.__count(), 1);
  t.start(5, null, () => {});
  assert.equal(fake.__count(), 1);
  fake.__tick();
  assert.equal(t.getRemaining(), 4);
});