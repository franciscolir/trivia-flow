// ============================================================
//  js/registry.js — GameRegistry
//  Registro dinámico de juegos. El circuito y el centro de
//  juegos consultan los juegos disponibles aquí. Agregar un
//  juego nuevo = crear su módulo y registrarlo.
// ============================================================

const GameRegistry = (function () {
  const _games = {};

  return {
    registerGame(def) {
      if (!def || !def.id) throw new Error('GameRegistry: se requiere id');
      if (_games[def.id]) console.warn('GameRegistry: sobrescribiendo juego ' + def.id);
      _games[def.id] = def;
      return def;
    },
    getAvailableGames() {
      return Object.values(_games);
    },
    getGame(id) {
      return _games[id] || null;
    },
    createGameInstance(id, ctx) {
      const def = _games[id];
      if (!def) throw new Error('GameRegistry: juego no registrado: ' + id);
      if (typeof def.create === 'function') return def.create(ctx);
      return { definition: def, ctx: ctx || {} };
    },
    gamePage(id) {
      const def = _games[id];
      return def && def.page ? def.page : 'play';
    }
  };
})();

// ---------- Definiciones de los juegos actuales ----------
GameRegistry.registerGame({
  id: 'trivia',
  name: 'Trivia Clásica',
  description: 'Preguntas de opción múltiple por turnos de equipo.',
  icon: 'quiz',
  version: '1.0.0',
  page: 'play',
  enabled: true,
  supportsIndividual: true,
  defaults: { points: 10, duration: 10, settings: { timePerQuestion: 15, questionCount: 10 } },
  configurationSchema: [
    { key: 'name', label: 'Nombre del juego', type: 'text', placeholder: 'Trivia Clásica' },
    { key: 'points', label: 'Puntos por acierto', type: 'number', min: 0 },
    { key: 'settings.timePerQuestion', label: 'Tiempo por pregunta (seg, 0 = sin tiempo)', type: 'number', min: 0 },
    { key: 'settings.questionCount', label: 'Cantidad de preguntas', type: 'number', min: 1 }
  ]
});

GameRegistry.registerGame({
  id: 'timed',
  name: 'Trivia Contrarreloj',
  description: 'Rondas por equipo con tiempo limitado y preguntas equivalentes.',
  icon: 'timer',
  version: '1.0.0',
  page: 'play?mode=timed',
  enabled: true,
  supportsIndividual: true,
  defaults: { points: 20, duration: 15, settings: { totalTime: 60, maxQuestions: 20, penalty: 5 } },
  configurationSchema: [
    { key: 'name', label: 'Nombre del juego', type: 'text', placeholder: 'Trivia Contrarreloj' },
    { key: 'points', label: 'Puntos por acierto', type: 'number', min: 0 },
    { key: 'settings.totalTime', label: 'Segundos por ronda', type: 'number', min: 10 },
    { key: 'settings.maxQuestions', label: 'Máximo de preguntas por ronda', type: 'number', min: 1 },
    { key: 'settings.penalty', label: 'Penalización por error', type: 'number', min: 0 }
  ]
});

GameRegistry.registerGame({
  id: 'memorice',
  name: 'Memorice',
  description: 'Encuentra las parejas por turnos. Quien acierta continúa.',
  icon: 'grid_view',
  version: '1.0.0',
  page: 'memorice',
  enabled: true,
  supportsIndividual: true,
  defaults: { points: 15, duration: 5, settings: { pairs: 8 } },
  configurationSchema: [
    { key: 'name', label: 'Nombre del juego', type: 'text', placeholder: 'Memorice' },
    { key: 'points', label: 'Puntos por pareja', type: 'number', min: 0 },
    { key: 'settings.pairs', label: 'Cantidad de parejas', type: 'number', min: 2, max: 12 },
    { key: 'settings.contentId', label: 'Conjunto de imágenes (Memorice)', type: 'content', collection: 'memorySets', placeholder: 'Usar banco integrado' }
  ]
});

GameRegistry.registerGame({
  id: 'tombola',
  name: 'Tómbola',
  description: 'Selección al azar de participantes de un equipo.',
  icon: 'casino',
  version: '1.0.0',
  page: 'tombola',
  enabled: true,
  supportsIndividual: true,
  defaults: { points: 0, duration: 3, settings: {} },
  configurationSchema: []
});

GameRegistry.registerGame({
  id: 'word',
  name: 'Descubre la Palabra',
  description: 'Revela casillas para descubrir la palabra secreta.',
  icon: 'abc',
  version: '1.0.0',
  page: 'word',
  enabled: true,
  supportsIndividual: true,
  defaults: { points: 10, duration: 10, settings: {} },
  configurationSchema: []
});

// Reservados para próximas versiones (definiciones listas, sin página aún)
GameRegistry.registerGame({
  id: 'synonyms',
  name: 'Sinónimos / Antónimos',
  description: 'Empareja palabras según sinónimos o antónimos por rondas de equipo.',
  icon: 'swap_horiz',
  version: '1.0.0',
  page: 'synonyms',
  enabled: true,
  supportsIndividual: true,
  defaults: { points: 10, duration: 5, settings: { type: 'sinonimos', pairs: 4, roundTime: 60 } },
  configurationSchema: [
    { key: 'name', label: 'Nombre del juego', type: 'text', placeholder: 'Sinónimos / Antónimos' },
    { key: 'points', label: 'Puntos por ronda ganada', type: 'number', min: 0 },
    { key: 'settings.type', label: 'Tipo', type: 'select', options: ['sinonimos', 'antonimos'] },
    { key: 'settings.pairs', label: 'Cantidad de parejas', type: 'number', min: 2, max: 8 },
    { key: 'settings.roundTime', label: 'Tiempo por ronda (seg)', type: 'number', min: 10 },
    { key: 'settings.contentId', label: 'Lista de palabras (set)', type: 'content', collection: 'synonymSets', placeholder: 'Usar banco integrado' }
  ]
});

GameRegistry.registerGame({
  id: 'sentence',
  name: 'Completar la Oración',
  description: 'El participante completa la oración verbalmente. El conductor valida.',
  icon: 'edit_note',
  version: '1.0.0',
  page: 'sentence',
  enabled: true,
  supportsIndividual: true,
  defaults: { points: 10, duration: 5, settings: { questionTime: 30, penalty: 0 } },
  configurationSchema: [
    { key: 'name', label: 'Nombre del juego', type: 'text', placeholder: 'Completar la Oración' },
    { key: 'points', label: 'Puntos por acierto', type: 'number', min: 0 },
    { key: 'settings.questionTime', label: 'Tiempo por pregunta (seg)', type: 'number', min: 5 },
    { key: 'settings.penalty', label: 'Penalización por error', type: 'number', min: 0 },
    { key: 'settings.contentId', label: 'Conjunto de oraciones (set)', type: 'content', collection: 'sentenceSets', placeholder: 'Usar banco integrado' }
  ]
});
