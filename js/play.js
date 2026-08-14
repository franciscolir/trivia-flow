// ============================================================
//  js/play.js — Motor del juego
// ============================================================

const CIRCUMFERENCE = 283;

const game = {
  trivia: null,
  questions: [],
  index: 0,
  score: 0,
  correct: 0,
  answered: false,
  timeLimit: 15,
  timeLeft: 15,
  timerId: null
};

const $g = {
  loading: $('#loading'), error: $('#error'), game: $('#game'), results: $('#results'),
  roundLabel: $('#round-label'), qNum: $('#q-num'), qTotal: $('#q-total'), score: $('#score'),
  timerText: $('#timer-text'), timerCircle: $('#timer-circle'), progressBar: $('#progress-bar'),
  categoryChip: $('#category-chip'), questionImage: $('#question-image'), questionText: $('#question-text'),
  answersGrid: $('#answers-grid'),
  finalScore: $('#final-score'), finalCorrect: $('#final-correct'), finalTotal: $('#final-total'), finalAccuracy: $('#final-accuracy')
};

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

// ---------- Timer ----------
function renderTimer() {
  const frac = game.timeLeft / game.timeLimit;
  $g.timerCircle.style.strokeDashoffset = CIRCUMFERENCE * (1 - frac);
  $g.timerText.textContent = Math.max(0, game.timeLeft);
  $g.timerCircle.classList.toggle('stroke-secondary-container', frac > 0.35);
  $g.timerCircle.classList.toggle('stroke-error', frac <= 0.35);
  $g.timerText.classList.toggle('text-secondary', frac > 0.35);
  $g.timerText.classList.toggle('text-error', frac <= 0.35);
}

function startTimer() {
  stopTimer();
  game.timeLeft = game.timeLimit;
  renderTimer();
  game.timerId = setInterval(() => {
    game.timeLeft--;
    renderTimer();
    if (game.timeLeft <= 0) {
      stopTimer();
      revealAnswer(null);
    }
  }, 1000);
}

function stopTimer() {
  if (game.timerId) { clearInterval(game.timerId); game.timerId = null; }
}

// ---------- Renderizado ----------
function renderQuestion() {
  const q = game.questions[game.index];

  $g.roundLabel.textContent = `Round 1`;
  $g.qNum.textContent = game.index + 1;
  $g.qTotal.textContent = game.questions.length;
  $g.score.textContent = formatNumber(game.score);
  $g.progressBar.style.width = `${(game.index / game.questions.length) * 100}%`;

  $g.categoryChip.textContent = `Categoría: ${game.trivia.category || 'General'}`;
  $g.questionText.textContent = q.text;

  if (q.imageUrl) {
    $g.questionImage.src = q.imageUrl;
    $g.questionImage.classList.remove('hidden');
  } else {
    $g.questionImage.classList.add('hidden');
  }

  const correctIndex = q.options.findIndex(o => o.correct);
  $g.answersGrid.innerHTML = q.options.map((opt, i) => {
    const letter = String.fromCharCode(65 + i);
    return `
    <button class="answer-chip group bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex items-center gap-lg text-left w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" data-index="${i}">
      <div class="letter w-12 h-12 rounded-full bg-surface-container-low text-on-surface-variant font-headline-md text-headline-md flex items-center justify-center group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">${letter}</div>
      <span class="text flex-grow font-body-lg text-body-lg text-on-surface group-hover:text-primary transition-colors">${escapeHtml(opt.text)}</span>
      <span class="result-icon hidden material-symbols-outlined text-[24px]"></span>
    </button>`;
  }).join('');

  game.answered = false;
  game.correctIndex = correctIndex;
  $$('.answer-chip', $g.answersGrid).forEach(btn => {
    btn.addEventListener('click', () => selectOption(+btn.dataset.index));
  });

  startTimer();
}

// ---------- Selección ----------
function selectOption(i) {
  if (game.answered) return;
  game.answered = true;
  stopTimer();

  const correct = i === game.correctIndex;
  if (correct) {
    game.score += game.trivia.points || 100;
    game.correct++;
  }
  $g.score.textContent = formatNumber(game.score);

  $$('.answer-chip', $g.answersGrid).forEach(btn => {
    btn.disabled = true;
    const idx = +btn.dataset.index;
    const letter = $('.letter', btn);
    const text = $('.text', btn);
    const icon = $('.result-icon', btn);

    btn.classList.remove('bg-surface-container-lowest');
    letter.classList.remove('bg-surface-container-low', 'text-on-surface-variant', 'group-hover:bg-primary-container', 'group-hover:text-on-primary-container');
    text.classList.remove('text-on-surface', 'group-hover:text-primary');
    icon.classList.remove('hidden');

    if (idx === game.correctIndex) {
      btn.classList.add('bg-secondary-container', 'border-secondary');
      letter.classList.add('bg-secondary', 'text-on-secondary');
      icon.classList.add('text-on-secondary-container');
      icon.textContent = 'check_circle';
    } else if (idx === i) {
      btn.classList.add('bg-error-container', 'border-error');
      letter.classList.add('bg-error', 'text-on-error');
      text.classList.add('text-on-error-container');
      icon.classList.add('text-on-error-container');
      icon.textContent = 'cancel';
    } else {
      btn.classList.add('bg-surface-container-low', 'border-outline-variant');
      letter.classList.add('bg-surface-container-high', 'text-on-surface-variant');
      text.classList.add('text-on-surface-variant');
    }
  });

  setTimeout(advance, 1400);
}

function revealAnswer(_) {
  if (game.answered) return;
  game.answered = true;
  stopTimer();
  $$('.answer-chip', $g.answersGrid).forEach(btn => {
    btn.disabled = true;
    const idx = +btn.dataset.index;
    const letter = $('.letter', btn);
    const text = $('.text', btn);
    const icon = $('.result-icon', btn);
    if (idx === game.correctIndex) {
      btn.classList.add('bg-secondary-container', 'border-secondary');
      letter.classList.add('bg-secondary', 'text-on-secondary');
      icon.classList.remove('hidden');
      icon.textContent = 'check_circle';
      icon.classList.add('text-on-secondary-container');
    } else {
      btn.classList.add('bg-surface-container-low', 'border-outline-variant');
      text.classList.add('text-on-surface-variant');
    }
  });
  setTimeout(advance, 1400);
}

function advance() {
  game.index++;
  if (game.index >= game.questions.length) {
    endGame();
  } else {
    renderQuestion();
  }
}

// ---------- Resultados ----------
function endGame() {
  stopTimer();
  $g.game.classList.add('hidden');
  $g.results.classList.remove('hidden');
  $g.finalScore.textContent = formatNumber(game.score);
  $g.finalCorrect.textContent = game.correct;
  $g.finalTotal.textContent = game.questions.length;
  $g.finalAccuracy.textContent = `${Math.round((game.correct / game.questions.length) * 100)}%`;
}

// ---------- Inicialización ----------
async function init() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { showError(); return; }

  let trivia = null;
  try {
    trivia = await getTrivia(id);
  } catch (err) {
    console.error('Error al cargar la trivia:', err);
  }

  if (!trivia || !Array.isArray(trivia.questions) || trivia.questions.length === 0) {
    showError();
    return;
  }

  game.trivia = trivia;
  game.questions = shuffleArray(trivia.questions);
  game.timeLimit = trivia.timeLimit || 15;
  game.index = 0;
  game.score = 0;
  game.correct = 0;

  $g.loading.classList.add('hidden');
  $g.game.classList.remove('hidden');
  renderQuestion();
}

function showError() {
  $g.loading.classList.add('hidden');
  $g.error.classList.remove('hidden');
}

$('#play-again').addEventListener('click', () => {
  $g.results.classList.add('hidden');
  $g.game.classList.remove('hidden');
  game.index = 0;
  game.score = 0;
  game.correct = 0;
  game.questions = shuffleArray(game.questions);
  renderQuestion();
});

bindAuthUI();
init();
