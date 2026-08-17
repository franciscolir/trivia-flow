// ============================================================
//  js/sounds.js — Efectos de sonido sintetizados (Web Audio API)
//  Timbres de campana, zumbido suave, tic de madera y fanfarria.
//  Sin archivos externos: fiables, ligeros y funcionan offline.
// ============================================================

let audioCtx = null;
let master = null;

function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    master = audioCtx.createGain();
    master.gain.value = 0.85;
    master.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Campana: fundamental + parciales inharmónicos con caída larga
function bell(freq, start, peak, decay, partials, weights) {
  if (typeof isMuted === 'function' && isMuted()) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime + start;
  (partials || [1, 2.0, 2.93, 4.26]).forEach((ratio, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((peak || 0.26) * (weights || [1, 0.5, 0.28, 0.14])[i], t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (decay || 1.2) / (i + 1) * 1.6);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + (decay || 1.2) + 0.1);
  });
}

// Acierto: tres campanas ascendentes (do-mi-sol) — alegre y claro
function playCorrect() {
  bell(1046.5, 0);           // C6
  bell(1318.5, 0.18);        // E6
  bell(1568, 0.36, 0.22, 1.6); // G6
}

// Error: zumbido grave y suave con deslizamiento hacia abajo
function playWrong() {
  if (typeof isMuted === 'function' && isMuted()) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filt = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(210, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.35);
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(750, t);
  filt.frequency.exponentialRampToValueAtTime(350, t + 0.4);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.24, t + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(filt);
  filt.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + 0.6);
}

// Tic-tac: golpe seco tipo "clic" de madera, breve y discreto
function playTick() {
  if (typeof isMuted === 'function' && isMuted()) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1900;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + 0.06);
}

// Tómbola: ráfaga de notas giratorias con descenso corto (ruleta)
function playSpin() {
  if (typeof isMuted === 'function' && isMuted()) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 8; i++) {
    const row = i < 5 ? [1046.5, 1318.5, 1568, 880] : [880, 659.25, 523.25];
    bell(row[i % row.length], i * 0.07, 0.16, 0.15);
  }
}

// Fin de trivia: fanfarria triunfal (arpegio de do mayor)
function playFinish() {
  bell(523.25, 0, 0.24, 0.9);     // C5
  bell(659.25, 0.16, 0.24, 0.9);  // E5
  bell(783.99, 0.32, 0.24, 1.1);  // G5
  bell(1046.5, 0.5, 0.3, 2.2);    // C6
}

// Desbloquear el AudioContext en la primera interacción del usuario
['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
  document.addEventListener(ev, () => ensureAudio(), { once: true });
});
