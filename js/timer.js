// ============================================================
//  js/timer.js — TimerManager
//  Temporizador reutilizable: cuenta regresiva, pausa, reanudación
//  y callback de timeout. No duplicar lógica en cada juego.
// ============================================================

class TimerManager {
  constructor() {
    this.total = 0;
    this.remaining = 0;
    this.timerId = null;
    this.paused = false;
    this.onTick = null;
    this.onTimeout = null;
  }

  start(seconds, onTick, onTimeout) {
    this.stop();
    this.total = Math.max(0, Math.round(seconds || 0));
    this.remaining = this.total;
    this.paused = false;
    this.onTick = onTick;
    this.onTimeout = onTimeout;
    if (this.total <= 0) { if (onTimeout) onTimeout(); return this; }
    if (onTick) onTick(this.remaining);
    this.timerId = setInterval(() => {
      if (this.paused) return;
      this.remaining--;
      if (onTick) onTick(this.remaining);
      if (this.remaining <= 0) {
        this.stop();
        if (onTimeout) onTimeout();
      }
    }, 1000);
    return this;
  }

  pause() { this.paused = true; return this; }
  resume() { this.paused = false; return this; }

  stop() {
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
    this.paused = false;
    return this;
  }

  remaining() { return Math.max(0, Math.ceil(this.remaining)); }
  isRunning() { return !!this.timerId; }
}
