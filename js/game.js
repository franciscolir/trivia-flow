// ============================================================
//  js/game.js — Contrato común de juegos + resultado normalizado
//  BaseGame define el ciclo de vida que todo juego implementa.
// ============================================================

class BaseGame {
  constructor(ctx) {
    this.ctx = ctx || {};
    this.status = 'idle'; // idle | ready | running | paused | finished | destroyed
    this.result = null;
  }

  init() { this.status = 'ready'; return this; }
  start() { if (this.status !== 'destroyed') this.status = 'running'; return this; }
  pause() { if (this.status === 'running') this.status = 'paused'; return this; }
  resume() { if (this.status === 'paused') this.status = 'running'; return this; }
  reset() { this.status = 'ready'; this.result = null; return this; }

  finish() {
    this.status = 'finished';
    this.result = this.getResult();
    return this.result;
  }

  getResult() { return null; }
  destroy() { this.status = 'destroyed'; return this; }
}

// Resultado normalizado que devuelven todos los juegos al finalizar
function buildResult({ gameId, winnerTeamId, rankings, pointsAwarded, statistics }) {
  return {
    gameId: gameId || null,
    winnerTeamId: winnerTeamId || null,
    rankings: Array.isArray(rankings) ? rankings : [],
    pointsAwarded: pointsAwarded || {},
    statistics: statistics || {},
    completedAt: Date.now()
  };
}
