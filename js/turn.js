// ============================================================
//  js/turn.js — TurnManager
//  Gestión de turnos de equipos. Reutilizable por cualquier juego.
// ============================================================

class TurnManager {
  constructor() {
    this.teams = [];
    this.index = 0;
  }

  setTeams(teams) {
    this.teams = Array.isArray(teams) ? teams : [];
    this.index = 0;
    return this;
  }

  setFirst(teamId) {
    const i = this.teams.findIndex(t => t.id === teamId);
    if (i >= 0) this.index = i;
    return this;
  }

  current() {
    return this.teams.length ? this.teams[this.index] || null : null;
  }

  next() {
    if (!this.teams.length) return null;
    this.index = (this.index + 1) % this.teams.length;
    return this.current();
  }

  reset() {
    this.index = 0;
    return this;
  }

  count() {
    return this.teams.length;
  }
}
