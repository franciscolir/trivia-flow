// ============================================================
//  js/create.js — Formulario de creación de trivias
// ============================================================

const LS_KEY = 'triviaflow_draft';

const state = {
  title: '', category: 'General', difficulty: 'Medium',
  timeLimit: 15, points: 100, useTimer: true,
  questions: []
};

const draft = { text: '', options: [{ text: '', correct: true }, { text: '', correct: false }] };
let editingIndex = -1;

// ---------- Refs ----------
const $els = {
  gate: $('#auth-gate'), content: $('#create-content'), gateLogin: $('#gate-login'),
  title: $('#trivia-title'), category: $('#trivia-category'), difficulty: $('#trivia-difficulty'),
  time: $('#trivia-time'), points: $('#trivia-points'), timeField: $('#time-field'),
  timerOn: $('#timer-on'), timerOff: $('#timer-off'),
  qText: $('#q-text'), qOptions: $('#q-options'), qAddOption: $('#q-add-option'),
  qSave: $('#q-save'), qCancel: $('#q-cancel'),
  questionsList: $('#questions-list'), questionsEmpty: $('#questions-empty'), qCount: $('#q-count'),
  publishBtn: $('#publish-btn'), statusMsg: $('#status-msg')
};

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

function setStatus(msg, isError) {
  $els.statusMsg.textContent = msg;
  $els.statusMsg.classList.remove('hidden', 'text-error', 'text-primary');
  $els.statusMsg.classList.add(isError ? 'text-error' : 'text-primary');
}

// ---------- Persistencia (borrador) ----------
function saveLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ state, draft, editingIndex }));
  } catch (e) { console.warn('No se pudo guardar el borrador', e); }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(state, data.state);
    if (data.draft) Object.assign(draft, data.draft);
    editingIndex = data.editingIndex ?? -1;
  } catch (e) { console.warn('Borrador corrupto', e); }
}

function clearLocal() {
  localStorage.removeItem(LS_KEY);
}

// ---------- Categorías ----------
function renderCategories() {
  $els.category.innerHTML = CATEGORIES
    .map(c => `<option ${c === state.category ? 'selected' : ''}>${c}</option>`)
    .join('');
}

// ---------- Formulario de pregunta ----------
function renderOptions() {
  $els.qOptions.innerHTML = draft.options.map((opt, i) => `
    <div class="flex items-center gap-sm p-xs bg-surface-bright rounded-xl border border-surface-container-highest focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
      <div class="pl-sm">
        <input type="radio" name="opt-correct" class="opt-radio w-5 h-5 text-primary border-outline-variant focus:ring-primary" data-index="${i}" ${opt.correct ? 'checked' : ''}/>
      </div>
      <div class="flex-1">
        <input type="text" class="opt-text w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md py-sm px-sm" data-index="${i}" placeholder="Opción ${String.fromCharCode(65 + i)}" value="${escapeHtml(opt.text)}"/>
      </div>
      ${draft.options.length > 2 ? `<button type="button" class="opt-remove p-1 rounded-full text-on-surface-variant hover:text-error transition-colors" data-index="${i}">
        <span class="material-symbols-outlined text-[20px]">close</span>
      </button>` : ''}
    </div>`).join('');

  $els.qOptions.querySelectorAll('.opt-radio').forEach(r => {
    r.addEventListener('change', () => {
      draft.options.forEach(o => o.correct = false);
      draft.options[+r.dataset.index].correct = true;
      saveLocal();
    });
  });
  $els.qOptions.querySelectorAll('.opt-text').forEach(t => {
    t.addEventListener('input', () => {
      draft.options[+t.dataset.index].text = t.value;
      saveLocal();
    });
  });
  $els.qOptions.querySelectorAll('.opt-remove').forEach(b => {
    b.addEventListener('click', () => {
      draft.options.splice(+b.dataset.index, 1);
      if (!draft.options.some(o => o.correct)) draft.options[0].correct = true;
      renderOptions();
      saveLocal();
    });
  });
}

function resetDraft() {
  draft.text = '';
  draft.options = [{ text: '', correct: true }, { text: '', correct: false }];
  editingIndex = -1;
  $els.qText.value = '';
  $('#q-save-label').textContent = 'Guardar pregunta';
  $els.qCancel.classList.add('hidden');
  renderOptions();
}

// ---------- Lista de preguntas guardadas ----------
function renderQuestions() {
  $els.qCount.textContent = state.questions.length;
  $els.questionsEmpty.classList.toggle('hidden', state.questions.length > 0);

  $els.questionsList.innerHTML = state.questions.map((q, i) => {
    const letters = q.options.map((o, j) => o.correct ? `<span class="text-secondary font-bold">${String.fromCharCode(65 + j)}</span>` : String.fromCharCode(65 + j)).join(', ');
    return `
    <div class="flex items-center gap-sm p-sm bg-surface-bright rounded-xl border border-surface-container-highest">
      <div class="w-8 h-8 rounded-full bg-primary-container text-primary font-label-md text-label-md flex items-center justify-center shrink-0">${i + 1}</div>
      <div class="flex-1 min-w-0">
        <p class="font-body-md text-body-md text-on-surface truncate">${escapeHtml(q.text)}</p>
        <p class="font-label-sm text-label-sm text-on-surface-variant">Opciones: ${letters}</p>
      </div>
      <div class="flex items-center gap-xs shrink-0">
        <button type="button" class="q-edit p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" data-index="${i}">
          <span class="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button type="button" class="q-delete p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors" data-index="${i}">
          <span class="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>`;
  }).join('');

  $els.questionsList.querySelectorAll('.q-edit').forEach(b => {
    b.addEventListener('click', () => startEdit(+b.dataset.index));
  });
  $els.questionsList.querySelectorAll('.q-delete').forEach(b => {
    b.addEventListener('click', () => {
      state.questions.splice(+b.dataset.index, 1);
      renderQuestions();
      saveLocal();
    });
  });
}

function startEdit(i) {
  const q = state.questions[i];
  editingIndex = i;
  draft.text = q.text;
  draft.options = q.options.map(o => ({ ...o }));
  $els.qText.value = q.text;
  $('#q-save-label').textContent = 'Actualizar pregunta';
  $els.qCancel.classList.remove('hidden');
  renderOptions();
  $els.qText.scrollIntoView({ behavior: 'smooth', block: 'center' });
  $els.qText.focus();
}

// ---------- Acciones ----------
function saveQuestion() {
  const text = $els.qText.value.trim();
  const options = draft.options
    .map(o => ({ text: o.text.trim(), correct: o.correct }))
    .filter(o => o.text.length > 0);

  if (!text) { setStatus('Escribe el texto de la pregunta.', true); return; }
  if (options.length < 2) { setStatus('Agrega al menos 2 opciones.', true); return; }
  if (!options.some(o => o.correct)) { setStatus('Marca la opción correcta.', true); return; }

  if (editingIndex === -1) {
    state.questions.push({ text, options });
  } else {
    state.questions[editingIndex] = { text, options };
  }
  resetDraft();
  renderQuestions();
  saveLocal();
  setStatus('Pregunta guardada correctamente.', false);
  setTimeout(() => $els.statusMsg.classList.add('hidden'), 2500);
}

// ---------- Publicar ----------
async function publish() {
  const title = state.title.trim();
  if (!title) { setStatus('Escribe un título para tu trivia.', true); return; }
  if (state.questions.length === 0) { setStatus('Agrega al menos una pregunta.', true); return; }

  const user = auth.currentUser;
  setStatus('Publicando...', false);
  $els.publishBtn.disabled = true;

  try {
    const id = await createTrivia({
      title,
      category: state.category,
      difficulty: state.difficulty,
      timeLimit: state.useTimer ? Math.min(60, Math.max(5, +state.timeLimit || 15)) : 0,
      points: Math.max(10, +state.points || 100),
      uid: user.uid,
      userName: user.displayName || 'Anónimo',
      questions: state.questions
    });
    clearLocal();
    window.location.href = `play?id=${id}`;
  } catch (err) {
    console.error('Error al publicar:', err);
    setStatus('Ocurrió un error al publicar. Revisa tu configuración de Firebase.', true);
    $els.publishBtn.disabled = false;
  }
}

function setTimerUI() {
  $els.timerOn.checked = state.useTimer;
  $els.timerOff.checked = !state.useTimer;
  $els.time.disabled = !state.useTimer;
  $els.timeField.classList.toggle('opacity-40', !state.useTimer);
}

// ---------- Inicialización ----------
function init() {
  loadLocal();

  renderCategories();
  $els.title.value = state.title;
  $els.difficulty.value = state.difficulty;
  $els.time.value = state.timeLimit;
  $els.points.value = state.points;
  setTimerUI();
  draft.text = draft.text || '';
  $els.qText.value = draft.text;
  renderOptions();
  renderQuestions();
  if (editingIndex !== -1 && state.questions[editingIndex]) {
    startEdit(editingIndex);
  } else {
    $('#q-save-label').textContent = 'Guardar pregunta';
  }
}

// ---------- Eventos ----------
$els.title.addEventListener('input', e => { state.title = e.target.value; saveLocal(); });
$els.category.addEventListener('change', e => { state.category = e.target.value; saveLocal(); });
$els.difficulty.addEventListener('change', e => { state.difficulty = e.target.value; saveLocal(); });
$els.time.addEventListener('input', e => { state.timeLimit = +e.target.value || 15; saveLocal(); });
$els.points.addEventListener('input', e => { state.points = +e.target.value || 100; saveLocal(); });
$els.timerOn.addEventListener('change', () => {
  if ($els.timerOn.checked) { state.useTimer = true; setTimerUI(); saveLocal(); }
});
$els.timerOff.addEventListener('change', () => {
  if ($els.timerOff.checked) { state.useTimer = false; setTimerUI(); saveLocal(); }
});
$els.qText.addEventListener('input', e => { draft.text = e.target.value; saveLocal(); });
$els.qAddOption.addEventListener('click', () => {
  if (draft.options.length >= 4) { setStatus('Máximo 4 opciones por pregunta.', true); return; }
  draft.options.push({ text: '', correct: false });
  renderOptions();
  saveLocal();
});
$els.qSave.addEventListener('click', saveQuestion);
$els.qCancel.addEventListener('click', resetDraft);
$els.publishBtn.addEventListener('click', publish);

$els.gateLogin.addEventListener('click', async () => {
  const ok = await signInWithGoogle();
  if (!ok) setStatus('No se pudo iniciar sesión.', true);
});

bindAuthUI(user => {
  const authed = !!user;
  $els.gate.classList.toggle('hidden', authed);
  $els.gate.classList.toggle('flex', !authed);
  $els.content.classList.toggle('hidden', !authed);
  if (authed) init();
});
