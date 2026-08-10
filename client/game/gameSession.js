import { state, resetStudentSession } from '../state/gameState.js';
import { renderMiniGame } from './gameRenderer.js';
import { evaluateCurrentGame } from './gameEvaluation.js';
import { playSound } from '../services/audioService.js';
import { updateMemory } from '../services/memoryService.js';
import { switchScreen } from '../ui/screens.js';

export function startGameplay(lessonTitle) {
  playSound('select');
  resetStudentSession(lessonTitle);
  loadScene(0);
  switchScreen('screen-game');
}

export function loadScene(index) {
  state.currentSceneIndex = index;
  state.currentSceneData = state.gameState.scenes[index];

  const sceneCounter = document.getElementById('scene-counter');
  if (sceneCounter) sceneCounter.textContent = `المشهد ${index + 1} من 3`;

  const sceneTitle = document.getElementById('scene-title');
  if (sceneTitle) sceneTitle.textContent = state.currentSceneData.title;

  const sceneNarration = document.getElementById('scene-narration');
  if (sceneNarration) sceneNarration.textContent = state.currentSceneData.narration;

  const hintContainer = document.getElementById('hint-container');
  if (hintContainer) hintContainer.classList.add('hidden');

  const feedbackEl = document.getElementById('feedback-container');
  if (feedbackEl) {
    feedbackEl.classList.add('hidden');
    feedbackEl.className = "hidden p-4 rounded-xl text-sm border";
    feedbackEl.replaceChildren();
  }

  const actionContainer = document.getElementById('scene-action-container');
  if (actionContainer) {
    actionContainer.replaceChildren();

    const submitBtn = document.createElement('button');
    submitBtn.id = 'submit-game-btn';
    submitBtn.type = 'button';
    submitBtn.className = 'w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-md focus:ring-2 focus:ring-purple-500 outline-none';
    submitBtn.textContent = 'تحقق من الإجابة';
    submitBtn.addEventListener('click', submitCurrentGame);

    actionContainer.appendChild(submitBtn);
  }

  const adaptBadge = document.getElementById('adaptation-badge');
  const adaptText = document.getElementById('adaptation-text');
  if (adaptBadge && adaptText) {
    if (state.studentSession.adaptedDifficulty) {
      adaptBadge.classList.remove('hidden');
      adaptText.textContent = state.studentSession.adaptedDifficulty === 'higher'
        ? 'تم رفع مستوى التحدي التحليلي'
        : 'تم تقديم مساعدة مخصصة';
    } else {
      adaptBadge.classList.add('hidden');
    }
  }

  renderMiniGame();
}

export function submitCurrentGame() {
  const evalResult = evaluateCurrentGame(state.currentSceneData, state.interactiveData);

  const feedbackEl = document.getElementById('feedback-container');
  if (!feedbackEl) return;
  feedbackEl.replaceChildren();

  // If problem is incomplete (e.g. not all items assigned in classification, or empty text)
  if (evalResult.isComplete === false) {
    playSound('incorrect');
    feedbackEl.classList.remove('hidden');
    feedbackEl.className = "p-4 rounded-xl text-sm border bg-amber-950/60 border-amber-800 text-amber-200 space-y-2";

    const titleEl = document.createElement('div');
    titleEl.className = 'font-bold flex items-center gap-1.5';
    titleEl.textContent = '⚠️ تنبيه: ';

    const msgEl = document.createElement('p');
    msgEl.className = 'text-xs text-slate-300';
    msgEl.textContent = evalResult.message || 'يرجى إكمال التحدي قبل التحقق من الإجابة.';

    feedbackEl.appendChild(titleEl);
    feedbackEl.appendChild(msgEl);
    return;
  }

  const currIndex = state.currentSceneIndex;
  if (!state.studentSession.attempts[currIndex]) {
    state.studentSession.attempts[currIndex] = 1;
  } else {
    state.studentSession.attempts[currIndex]++;
  }

  const attemptNum = state.studentSession.attempts[currIndex];
  feedbackEl.classList.remove('hidden');

  if (evalResult.isCorrect) {
    playSound('correct');
    state.studentSession.results[currIndex] = true;
    state.studentSession.answers[currIndex] = evalResult.evaluationDetails;

    feedbackEl.className = "p-4 rounded-xl text-sm border bg-green-950/60 border-green-800 text-green-200 space-y-2";

    const header = document.createElement('div');
    header.className = 'font-bold flex items-center gap-1.5';
    header.textContent = '✅ إجابة صحيحة وموفقة!';

    const text = document.createElement('p');
    text.className = 'text-xs text-slate-300';
    text.textContent = state.currentSceneData.successNarration;

    feedbackEl.appendChild(header);
    feedbackEl.appendChild(text);

    const actionContainer = document.getElementById('scene-action-container');
    if (actionContainer) {
      actionContainer.replaceChildren();

      if (currIndex < state.gameState.scenes.length - 1) {
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-md focus:ring-2 focus:ring-purple-500 outline-none';
        nextBtn.textContent = 'المشهد التالي ➔';
        nextBtn.addEventListener('click', nextScene);
        actionContainer.appendChild(nextBtn);
      } else {
        const finishBtn = document.createElement('button');
        finishBtn.type = 'button';
        finishBtn.className = 'w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-md focus:ring-2 focus:ring-purple-500 outline-none';
        finishBtn.textContent = 'عرض خاتمة القصة والنتائج وحفظ الذاكرة 🏆';
        finishBtn.addEventListener('click', finishGameSession);
        actionContainer.appendChild(finishBtn);
      }
    }

  } else {
    playSound('incorrect');
    if (attemptNum === 1) {
      state.studentSession.struggledScenesCount++;
      state.studentSession.answers[currIndex] = evalResult.evaluationDetails;

      feedbackEl.className = "p-4 rounded-xl text-sm border bg-amber-950/60 border-amber-800 text-amber-200 space-y-2";

      const header = document.createElement('div');
      header.className = 'font-bold flex items-center gap-1.5';
      header.textContent = '⚠️ محاولة غير دقيقة، حاول مرة أخرى';

      const text = document.createElement('p');
      text.className = 'text-xs text-slate-300';
      text.textContent = state.currentSceneData.supportNarration;

      feedbackEl.appendChild(header);
      feedbackEl.appendChild(text);

      toggleHint(true);
    } else {
      state.studentSession.results[currIndex] = false;
      state.studentSession.answers[currIndex] = evalResult.evaluationDetails;

      feedbackEl.className = "p-4 rounded-xl text-sm border bg-purple-950/60 border-purple-800 text-purple-200 space-y-2";

      const header = document.createElement('div');
      header.className = 'font-bold flex items-center gap-1.5';
      header.textContent = '📌 توضيح المفهوم العلمي:';

      const text = document.createElement('p');
      text.className = 'text-xs text-slate-300';
      text.textContent = 'تم تسجيل المفهوم في ذاكرة المعرفة لمراجعته لاحقاً.';

      feedbackEl.appendChild(header);
      feedbackEl.appendChild(text);

      const actionContainer = document.getElementById('scene-action-container');
      if (actionContainer) {
        actionContainer.replaceChildren();

        if (currIndex < state.gameState.scenes.length - 1) {
          const nextBtn = document.createElement('button');
          nextBtn.type = 'button';
          nextBtn.className = 'w-full bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-700/50 font-bold py-3 px-6 rounded-xl transition shadow-md focus:ring-2 focus:ring-purple-500 outline-none';
          nextBtn.textContent = 'المتابعة إلى المشهد التالي ➔';
          nextBtn.addEventListener('click', nextScene);
          actionContainer.appendChild(nextBtn);
        } else {
          const finishBtn = document.createElement('button');
          finishBtn.type = 'button';
          finishBtn.className = 'w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-md focus:ring-2 focus:ring-purple-500 outline-none';
          finishBtn.textContent = 'عرض خاتمة القصة والنتائج وحفظ الذاكرة 🏆';
          finishBtn.addEventListener('click', finishGameSession);
          actionContainer.appendChild(finishBtn);
        }
      }
    }
  }
}

export function toggleHint(forceOpen = false) {
  playSound('select');
  const hintBox = document.getElementById('hint-container');
  const hintText = document.getElementById('hint-text');
  if (hintText) hintText.textContent = state.currentSceneData.hint;

  if (hintBox) {
    if (forceOpen || hintBox.classList.contains('hidden')) {
      hintBox.classList.remove('hidden');
      state.studentSession.hintsUsed++;
    } else {
      hintBox.classList.add('hidden');
    }
  }
}

export function nextScene() {
  playSound('scene_complete');
  state.currentSceneIndex++;
  loadScene(state.currentSceneIndex);
}

export function finishGameSession() {
  playSound('scene_complete');

  const endingText = document.getElementById('ending-story-text');
  if (endingText) endingText.textContent = state.gameState.ending;

  const masteredList = document.getElementById('mastered-concepts-list');
  const reviewList = document.getElementById('review-concepts-list');
  if (masteredList) masteredList.replaceChildren();
  if (reviewList) reviewList.replaceChildren();

  let masteredConcepts = [];
  let struggles = [];

  state.gameState.scenes.forEach((scene, idx) => {
    const concept = state.gameState.concepts.find(c => c.id === scene.conceptId) || { name: scene.title };
    const isSuccess = state.studentSession.results[idx] === true || state.studentSession.attempts[idx] === 1;

    const li = document.createElement('li');
    li.textContent = concept.name;

    if (isSuccess) {
      if (masteredList) masteredList.appendChild(li);
      masteredConcepts.push(concept.name);
    } else {
      if (reviewList) reviewList.appendChild(li);
      struggles.push(concept.name);
    }
  });

  if (masteredList && masteredList.children.length === 0) {
    const li = document.createElement('li');
    li.className = 'text-slate-500';
    li.textContent = 'تم بناء الخبرة التراكمية.';
    masteredList.appendChild(li);
  }

  if (reviewList && reviewList.children.length === 0) {
    const li = document.createElement('li');
    li.className = 'text-slate-500';
    li.textContent = 'لا توجد نقاط ضعف.';
    reviewList.appendChild(li);
  }

  // Prevent duplicate memory updates for the same session
  if (!state.studentSession.hasSavedMemory) {
    updateMemory({
      lessonTitle: state.studentSession.lessonTitle,
      scoreSummary: `${masteredConcepts.length}/3 إتقان`,
      mastered: masteredConcepts,
      struggles: struggles
    });
    state.studentSession.hasSavedMemory = true;
  }

  switchScreen('screen-ending');
}
