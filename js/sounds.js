// ============================================================
//  js/sounds.js — Sonidos sintetizados con Web Audio API
//  No requiere archivos de audio externos.
// ============================================================

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, start, duration, type, volume) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + start;
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume || 0.25, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

// Acierto: dos notas ascendentes
function playCorrect() {
  tone(660, 0, 0.12, 'sine', 0.3);
  tone(880, 0.13, 0.22, 'sine', 0.3);
}

// Error: zumbido grave descendente
function playWrong() {
  tone(220, 0, 0.22, 'sawtooth', 0.18);
  tone(160, 0.24, 0.32, 'sawtooth', 0.18);
}

// Tic-tac del temporizador
function playTick() {
  tone(950, 0, 0.04, 'square', 0.1);
}

// Trivia terminada
function playFinish() {
  tone(523, 0, 0.15, 'sine', 0.3);
  tone(659, 0.16, 0.15, 'sine', 0.3);
  tone(784, 0.32, 0.35, 'sine', 0.35);
}

// Desbloquear el AudioContext en la primera interacción del usuario
['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
  document.addEventListener(ev, () => getCtx(), { once: true });
});
