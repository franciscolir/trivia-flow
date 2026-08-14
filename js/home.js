// ============================================================
//  js/home.js — Feed de trivias
// ============================================================

const grid = $('#trivias-grid');
const emptyState = $('#empty-state');
const searchInput = $('#search-input');
let allTrivias = [];

function difficultyBadge(difficulty) {
  const base = DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.Medium;
  return `<span class="font-label-sm text-label-sm px-sm py-xs rounded-full ${base}">${difficulty || 'Medium'}</span>`;
}

function categoryChip(category) {
  return `<span class="font-label-md text-label-md text-primary-container px-sm py-xs rounded-full bg-primary/10 border border-primary/20">${category || 'General'}</span>`;
}

function coverBlock(trivia) {
  if (trivia.coverUrl) {
    return `<img src="${trivia.coverUrl}" alt="${escapeHtml(trivia.title)}" class="w-full h-40 object-cover"/>`;
  }
  return `<div class="gradient-fallback w-full h-40 flex items-center justify-center">
    <span class="material-symbols-outlined text-white text-[56px]" style="font-variation-settings: 'FILL' 1;">psychology</span>
  </div>`;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

function cardTemplate(t) {
  const creator = t.userName || 'Anónimo';
  const count = Array.isArray(t.questions) ? t.questions.length : 0;
  return `
  <a href="play.html?id=${t.id}" class="trivia-card bg-surface-container-lowest rounded-xl card-shadow overflow-hidden border border-surface-container-high block group">
    ${coverBlock(t)}
    <div class="p-lg flex flex-col gap-sm">
      <div class="flex items-center justify-between gap-sm">
        ${categoryChip(t.category)}
        ${difficultyBadge(t.difficulty)}
      </div>
      <h3 class="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors line-clamp-2">${escapeHtml(t.title)}</h3>
      <div class="flex items-center gap-md mt-auto pt-sm text-on-surface-variant">
        <span class="flex items-center gap-xs text-body-md"><span class="material-symbols-outlined text-[18px]">quiz</span>${count} preguntas</span>
        <span class="flex items-center gap-xs text-body-md"><span class="material-symbols-outlined text-[18px]">timer</span>${t.timeLimit || 15}s</span>
      </div>
      <div class="flex items-center gap-sm pt-sm border-t border-surface-container-high">
        <div class="w-7 h-7 rounded-full bg-primary-container text-primary flex items-center justify-center text-label-sm font-bold uppercase">${escapeHtml((creator[0] || '?').toUpperCase())}</div>
        <span class="font-label-md text-label-md text-on-surface-variant truncate">${escapeHtml(creator)}</span>
        <span class="ml-auto material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">play_circle</span>
      </div>
    </div>
  </a>`;
}

function render() {
  const term = (searchInput.value || '').trim().toLowerCase();
  const filtered = term
    ? allTrivias.filter(t =>
        (t.title || '').toLowerCase().includes(term) ||
        (t.category || '').toLowerCase().includes(term))
    : allTrivias;

  grid.innerHTML = filtered.map(cardTemplate).join('');
  emptyState.classList.toggle('hidden', allTrivias.length > 0);
  grid.classList.toggle('hidden', allTrivias.length === 0);
}

searchInput.addEventListener('input', render);

subscribeTrivias(list => {
  allTrivias = list;
  render();
});

bindAuthUI();
