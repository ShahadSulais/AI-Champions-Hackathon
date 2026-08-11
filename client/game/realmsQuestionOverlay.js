import { realmsState, getCurrentQuestion, submitRealmsAnswer, nextRealmsQuestion, pauseRealmsSession, resumeRealmsSession, retryRealmsSession } from './realmsSession.js';
import { playSound } from '../services/audioService.js';
import { triggerConfetti, triggerXpPopup } from '../services/effectsService.js';
import { REALM_WORLDS } from '../../shared/gameTypes.js';

let keyboardListener = null;

export function renderRealmsOverlay(containerEl, onWorldComplete, onReturnToWorlds) {
  if (!containerEl) return;
  containerEl.replaceChildren();

  const currentWorldObj = REALM_WORLDS.find(w => w.id === realmsState.selectedWorld) || REALM_WORLDS[0];

  // Remove existing keyboard listener if present
  if (keyboardListener) {
    document.removeEventListener('keydown', keyboardListener);
    keyboardListener = null;
  }

  // Base Overlay Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'w-full max-w-3xl mx-auto space-y-5 bg-slate-900/95 border border-purple-900/50 rounded-2xl p-5 md:p-7 shadow-2xl transition-all duration-300 relative';

  // Render current state overlay view
  if (realmsState.sessionStatus === 'ready') {
    renderReadyState(wrapper, currentWorldObj);
  } else if (realmsState.sessionStatus === 'playing') {
    renderPlayingState(wrapper, currentWorldObj, onWorldComplete, onReturnToWorlds);
  } else if (realmsState.sessionStatus === 'paused') {
    renderPausedState(wrapper, currentWorldObj, onReturnToWorlds);
  } else if (realmsState.sessionStatus === 'success') {
    renderSuccessState(wrapper, currentWorldObj, onWorldComplete, onReturnToWorlds);
  } else if (realmsState.sessionStatus === 'game_over') {
    renderGameOverState(wrapper, currentWorldObj, onReturnToWorlds);
  }

  containerEl.appendChild(wrapper);
}

// 1. Ready / Start State Screen
function renderReadyState(container, world) {
  const box = document.createElement('div');
  box.className = 'text-center space-y-5 py-4';

  const badge = document.createElement('div');
  badge.className = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700/60 text-xs font-bold';
  badge.innerHTML = `<span>${world.icon}</span> <span>عالم: ${world.name}</span>`;

  const iconBig = document.createElement('div');
  iconBig.className = 'text-5xl my-2 animate-bounce';
  iconBig.textContent = world.icon;

  const title = document.createElement('h3');
  title.className = 'text-2xl font-bold text-white';
  title.textContent = realmsState.title || 'بدء المغامرة في بوابة الأكوان';

  const desc = document.createElement('p');
  desc.className = 'text-sm text-slate-300 max-w-lg mx-auto leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800';
  desc.textContent = realmsState.intro || world.description;

  const metaBox = document.createElement('div');
  metaBox.className = 'flex justify-center items-center gap-6 text-xs text-purple-200 bg-slate-950 p-3 rounded-xl max-w-sm mx-auto border border-purple-950';
  metaBox.innerHTML = `
    <div class="flex items-center gap-1.5"><span>❓</span> <span>${realmsState.questions.length} أسئلة أركيدية</span></div>
    <div class="flex items-center gap-1.5"><span>💖</span> <span>3 محاولات طاقة</span></div>
  `;

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.className = 'w-full max-w-md mx-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition text-base md:text-lg flex items-center justify-center gap-2 focus:ring-2 focus:ring-purple-400 outline-none';
  startBtn.innerHTML = `<span>انطلق إلى العالم الآن</span> <span>⚔️</span>`;
  startBtn.addEventListener('click', () => {
    playSound('select');
    realmsState.sessionStatus = 'playing';
    const containerEl = container.parentElement;
    renderRealmsOverlay(containerEl);
  });

  box.appendChild(badge);
  box.appendChild(iconBig);
  box.appendChild(title);
  box.appendChild(desc);
  box.appendChild(metaBox);
  box.appendChild(startBtn);

  container.appendChild(box);
}

// 2. Active Playing State Screen
function renderPlayingState(container, world, onWorldComplete, onReturnToWorlds) {
  const currentQ = getCurrentQuestion();
  if (!currentQ) {
    renderEmptyState(container, onReturnToWorlds);
    return;
  }

  // --- HUD Header ---
  const hud = document.createElement('div');
  hud.className = 'flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-4';

  const leftStats = document.createElement('div');
  leftStats.className = 'flex items-center gap-2.5 flex-wrap';

  // World Badge
  const worldBadge = document.createElement('span');
  worldBadge.className = 'text-xs font-bold bg-purple-950 text-purple-300 border border-purple-700/60 px-3 py-1 rounded-full flex items-center gap-1.5';
  worldBadge.innerHTML = `<span>${world.icon}</span> <span>${world.name}</span>`;

  // Question Counter Badge
  const qBadge = document.createElement('span');
  qBadge.className = 'text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full';
  qBadge.textContent = `السؤال ${realmsState.currentQuestionIndex + 1} من ${realmsState.questions.length}`;

  // Energy / Hearts Meter
  const energyMeter = document.createElement('span');
  energyMeter.className = 'text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800 px-2.5 py-1 rounded-full flex items-center gap-1';
  let heartsStr = '';
  for (let i = 0; i < realmsState.maxEnergy; i++) {
    heartsStr += i < realmsState.energy ? '💖' : '🖤';
  }
  energyMeter.textContent = heartsStr;

  // Score Badge
  const scoreBadge = document.createElement('span');
  scoreBadge.className = 'text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-full flex items-center gap-1';
  scoreBadge.innerHTML = `<span>⭐</span> <span>${realmsState.score} XP</span>`;

  // Combo Badge
  const comboBadge = document.createElement('span');
  comboBadge.className = `text-xs font-bold border px-2.5 py-1 rounded-full ${
    realmsState.combo >= 2
      ? 'bg-gradient-to-r from-purple-900 to-pink-900 text-purple-200 border-purple-500 animate-pulse'
      : 'hidden'
  }`;
  comboBadge.textContent = `🔥 مضاعف x${Math.min(realmsState.combo, 4)}`;

  leftStats.appendChild(worldBadge);
  leftStats.appendChild(qBadge);
  leftStats.appendChild(energyMeter);
  leftStats.appendChild(scoreBadge);
  leftStats.appendChild(comboBadge);

  // Pause Button
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 px-3 py-1.5 rounded-xl border border-slate-700 transition font-semibold flex items-center gap-1 focus:ring-2 focus:ring-purple-400 outline-none';
  pauseBtn.innerHTML = `<span>⏸️</span> <span>إيقاف مؤقت</span>`;
  pauseBtn.addEventListener('click', () => {
    playSound('select');
    pauseRealmsSession();
    const containerEl = container.parentElement;
    renderRealmsOverlay(containerEl, onWorldComplete, onReturnToWorlds);
  });

  hud.appendChild(leftStats);
  hud.appendChild(pauseBtn);
  container.appendChild(hud);

  // Progress Bar
  const progressBox = document.createElement('div');
  progressBox.className = 'w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800';
  const progressPercent = Math.round(((realmsState.currentQuestionIndex + 1) / realmsState.questions.length) * 100);
  const progressBar = document.createElement('div');
  progressBar.className = 'bg-gradient-to-r from-purple-600 to-pink-500 h-full transition-all duration-300';
  progressBar.style.width = `${progressPercent}%`;
  progressBox.appendChild(progressBar);
  container.appendChild(progressBox);

  // Question Card Area
  const qCard = document.createElement('div');
  qCard.className = 'bg-slate-950 border border-slate-800 p-4 md:p-6 rounded-2xl space-y-4';

  const qHeader = document.createElement('div');
  qHeader.className = 'flex justify-between items-center';

  const qTag = document.createElement('span');
  qTag.className = 'text-[11px] font-bold text-purple-300 bg-purple-950 px-2.5 py-0.5 rounded border border-purple-800';
  qTag.textContent = `🎯 التحدي المعرفي #${realmsState.currentQuestionIndex + 1}`;

  const keyboardHint = document.createElement('span');
  keyboardHint.className = 'text-[10px] text-slate-400 hidden sm:inline-block';
  keyboardHint.textContent = '💡 استخدم الأرقام (1-4) أو مفاتيح (A-D) للتحكم الأسرع';

  qHeader.appendChild(qTag);
  qHeader.appendChild(keyboardHint);

  const qText = document.createElement('h4');
  qText.className = 'text-base md:text-lg font-bold text-slate-100 leading-relaxed';
  qText.textContent = currentQ.question;

  qCard.appendChild(qHeader);
  qCard.appendChild(qText);
  container.appendChild(qCard);

  // Answer Choices Grid (Large touch & click targets)
  const choicesGrid = document.createElement('div');
  choicesGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3.5';

  const psStyles = [
    { class: 'ps-btn-triangle', symbol: '△', key: '1' },
    { class: 'ps-btn-circle', symbol: '○', key: '2' },
    { class: 'ps-btn-cross', symbol: '✕', key: '3' },
    { class: 'ps-btn-square', symbol: '□', key: '4' }
  ];

  // Feedback Container
  const feedbackBox = document.createElement('div');
  feedbackBox.className = 'hidden p-4 rounded-xl text-sm border space-y-2';

  currentQ.choices.forEach((choice, idx) => {
    const psStyle = psStyles[idx % psStyles.length];

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `choice-btn-${choice.id}`;
    btn.className = 'realm-choice-btn w-full bg-slate-900 hover:bg-purple-950/70 border border-slate-700 hover:border-purple-500 p-4 rounded-xl transition text-right flex items-center justify-between gap-3 text-slate-100 font-semibold focus:ring-2 focus:ring-purple-400 outline-none group cursor-pointer shadow-md min-h-[56px]';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'flex items-center gap-3';

    const badge = document.createElement('span');
    badge.className = `ps-btn-badge ${psStyle.class} text-xs font-bold flex-shrink-0 group-hover:scale-110 transition-transform`;
    badge.textContent = psStyle.symbol;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'text-sm md:text-base leading-relaxed';
    labelSpan.textContent = choice.text;

    leftGroup.appendChild(badge);
    leftGroup.appendChild(labelSpan);

    const keyBadge = document.createElement('span');
    keyBadge.className = 'text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 group-hover:text-purple-300 group-hover:border-purple-800 transition hidden sm:inline-block';
    keyBadge.textContent = `[${psStyle.key}]`;

    btn.appendChild(leftGroup);
    btn.appendChild(keyBadge);

    btn.addEventListener('click', () => handleChoiceSubmit(choice.id, container, feedbackBox, onWorldComplete, onReturnToWorlds));

    choicesGrid.appendChild(btn);
  });

  container.appendChild(choicesGrid);
  container.appendChild(feedbackBox);

  // Setup Keyboard Shortcuts listener
  keyboardListener = (e) => {
    if (realmsState.sessionStatus !== 'playing') return;

    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      pauseRealmsSession();
      renderRealmsOverlay(container.parentElement, onWorldComplete, onReturnToWorlds);
      return;
    }

    const keyMap = {
      '1': currentQ.choices[0]?.id,
      '2': currentQ.choices[1]?.id,
      '3': currentQ.choices[2]?.id,
      '4': currentQ.choices[3]?.id,
      'a': currentQ.choices[0]?.id,
      'b': currentQ.choices[1]?.id,
      'c': currentQ.choices[2]?.id,
      'd': currentQ.choices[3]?.id,
      'ش': currentQ.choices[0]?.id,
      'لا': currentQ.choices[1]?.id,
      'ؤ': currentQ.choices[2]?.id,
      'ر': currentQ.choices[3]?.id,
    };

    const chosenId = keyMap[e.key.toLowerCase()];
    if (chosenId) {
      e.preventDefault();
      handleChoiceSubmit(chosenId, container, feedbackBox, onWorldComplete, onReturnToWorlds);
    }
  };

  document.addEventListener('keydown', keyboardListener);
}

// Choice submission handler
function handleChoiceSubmit(choiceId, container, feedbackBox, onWorldComplete, onReturnToWorlds) {
  // Prevent duplicate submissions
  const buttons = container.querySelectorAll('.realm-choice-btn');
  buttons.forEach(b => b.disabled = true);

  const evalResult = submitRealmsAnswer(choiceId);

  feedbackBox.classList.remove('hidden');
  feedbackBox.replaceChildren();

  if (evalResult.isCorrect) {
    playSound('correct');
    const selectedBtn = container.querySelector(`#choice-btn-${choiceId}`);
    if (selectedBtn) {
      selectedBtn.classList.remove('bg-slate-900', 'border-slate-700');
      selectedBtn.classList.add('bg-green-950/80', 'border-green-500', 'ring-2', 'ring-green-400');
    }

    triggerXpPopup(`+${evalResult.earnedXp} XP`, selectedBtn || feedbackBox);
    triggerConfetti({ count: 40 });

    feedbackBox.className = "p-4 rounded-xl text-sm border bg-green-950/80 border-green-700 text-green-200 space-y-2 animate-fade-in";

    const titleEl = document.createElement('div');
    titleEl.className = 'font-bold flex items-center gap-1.5 text-base';
    titleEl.textContent = `✅ إجابة متميزة دقيقة! (+${evalResult.earnedXp} XP)`;

    const expText = document.createElement('p');
    expText.className = 'text-xs text-slate-300 leading-relaxed';
    expText.textContent = evalResult.explanation;

    feedbackBox.appendChild(titleEl);
    feedbackBox.appendChild(expText);

    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'mt-3 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-md text-sm outline-none focus:ring-2 focus:ring-green-400';
    actionBtn.textContent = evalResult.isFinished ? 'عرض نتيجة العالم الشاملة 🏆' : 'المتابعة إلى التحدي التالي ➔';

    actionBtn.addEventListener('click', () => {
      playSound('select');
      if (evalResult.isFinished) {
        realmsState.sessionStatus = 'success';
      } else {
        nextRealmsQuestion();
      }
      renderRealmsOverlay(container.parentElement, onWorldComplete, onReturnToWorlds);
    });

    feedbackBox.appendChild(actionBtn);

  } else {
    playSound('incorrect');
    const selectedBtn = container.querySelector(`#choice-btn-${choiceId}`);
    if (selectedBtn) {
      selectedBtn.classList.remove('bg-slate-900', 'border-slate-700');
      selectedBtn.classList.add('bg-red-950/80', 'border-red-500', 'ring-2', 'ring-red-400');
    }

    feedbackBox.className = "p-4 rounded-xl text-sm border bg-red-950/80 border-red-800 text-red-200 space-y-2 animate-fade-in";

    const titleEl = document.createElement('div');
    titleEl.className = 'font-bold flex items-center gap-1.5 text-base';
    titleEl.textContent = evalResult.isGameOver ? '⚠️ نفدت طاقة المحاولات!' : '⚠️ محاولة غير دقيقة (فقدان طاقة)';

    const expText = document.createElement('p');
    expText.className = 'text-xs text-slate-300 leading-relaxed';
    expText.textContent = evalResult.explanation;

    feedbackBox.appendChild(titleEl);
    feedbackBox.appendChild(expText);

    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = evalResult.isGameOver
      ? 'mt-3 w-full bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition text-sm outline-none'
      : 'mt-3 w-full bg-purple-800 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition text-sm outline-none';
    actionBtn.textContent = evalResult.isGameOver ? 'عرض نتائج محاولات العالم ➔' : 'المتابعة للتحدي التالي ➔';

    actionBtn.addEventListener('click', () => {
      playSound('select');
      if (evalResult.isGameOver) {
        realmsState.sessionStatus = 'game_over';
      } else {
        nextRealmsQuestion();
      }
      renderRealmsOverlay(container.parentElement, onWorldComplete, onReturnToWorlds);
    });

    feedbackBox.appendChild(actionBtn);
  }
}

// 3. Paused State Screen
function renderPausedState(container, world, onReturnToWorlds) {
  const box = document.createElement('div');
  box.className = 'text-center space-y-5 py-4';

  const icon = document.createElement('div');
  icon.className = 'text-4xl';
  icon.textContent = '⏸️';

  const title = document.createElement('h3');
  title.className = 'text-xl font-bold text-white';
  title.textContent = 'اللعب متوقف مؤقتاً';

  const btnStack = document.createElement('div');
  btnStack.className = 'space-y-3 max-w-sm mx-auto';

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.className = 'w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 px-6 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md';
  resumeBtn.innerHTML = `<span>استئناف اللعب</span> <span>▶️</span>`;
  resumeBtn.addEventListener('click', () => {
    playSound('select');
    resumeRealmsSession();
    renderRealmsOverlay(container.parentElement, null, onReturnToWorlds);
  });

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'w-full bg-slate-800 hover:bg-slate-700 text-purple-200 border border-slate-700 font-bold py-3 px-6 rounded-xl transition text-sm flex items-center justify-center gap-2';
  retryBtn.innerHTML = `<span>إعادة محاولة العالم</span> <span>🔄</span>`;
  retryBtn.addEventListener('click', () => {
    playSound('select');
    retryRealmsSession();
    renderRealmsOverlay(container.parentElement, null, onReturnToWorlds);
  });

  const quitBtn = document.createElement('button');
  quitBtn.type = 'button';
  quitBtn.className = 'w-full bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-900/60 font-semibold py-3 px-6 rounded-xl transition text-sm flex items-center justify-center gap-2';
  quitBtn.innerHTML = `<span>العودة لاختيار الأكوان</span> <span>🚪</span>`;
  quitBtn.addEventListener('click', () => {
    playSound('select');
    if (onReturnToWorlds) onReturnToWorlds();
  });

  btnStack.appendChild(resumeBtn);
  btnStack.appendChild(retryBtn);
  btnStack.appendChild(quitBtn);

  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(btnStack);

  container.appendChild(box);
}

// 4. Success State Screen
function renderSuccessState(container, world, onWorldComplete, onReturnToWorlds) {
  playSound('victory');
  triggerConfetti({ count: 80 });

  const box = document.createElement('div');
  box.className = 'text-center space-y-5 py-4';

  const badge = document.createElement('div');
  badge.className = 'w-16 h-16 bg-purple-900/60 border border-purple-500/50 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xl shadow-purple-600/30 animate-bounce';
  badge.textContent = '🏆';

  const title = document.createElement('h3');
  title.className = 'text-2xl font-bold text-white';
  title.textContent = `اجتزت عالم (${world.name}) بنجاح!`;

  // Shards & Core Progression Banner
  const shardsBox = document.createElement('div');
  shardsBox.className = 'bg-slate-950 border border-pink-900/50 p-4 rounded-xl text-center max-w-lg mx-auto space-y-2';
  const shardCount = realmsState.collectedShards.length;
  shardsBox.innerHTML = `
    <div class="flex justify-between items-center text-xs text-pink-300 font-bold">
      <span>💎 شظايا المعرفة المجمعة:</span>
      <span>${shardCount} من 4 شظايا</span>
    </div>
    <div class="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
      <div class="bg-gradient-to-r from-pink-500 to-purple-500 h-full" style="width: ${(shardCount / 4) * 100}%"></div>
    </div>
    ${realmsState.isCoreRestored ? '<div class="text-xs text-amber-300 font-bold animate-pulse">✨ مبروك! تم استعادة نواة المعرفة بالكامل بإكمال الأكوان الأربعة!</div>' : '<div class="text-[11px] text-slate-400">جمع باقي الشظايا من الأكوان الأخرى لاستعادة "نواة المعرفة".</div>'}
  `;

  // Score & Accuracy Grid
  const accuracy = Math.round(
    (realmsState.completedQuestions.filter(q => q.isCorrect).length / realmsState.questions.length) * 100
  );

  const scoreBanner = document.createElement('div');
  scoreBanner.className = 'grid grid-cols-3 gap-3 bg-slate-950 border border-purple-900/40 p-4 rounded-xl text-center max-w-lg mx-auto';
  scoreBanner.innerHTML = `
    <div>
      <span class="block text-[11px] text-slate-400 font-semibold">مجموع الـ XP</span>
      <span class="text-xl font-bold text-amber-300">⭐ ${realmsState.score}</span>
    </div>
    <div>
      <span class="block text-[11px] text-slate-400 font-semibold">أعلى Combo</span>
      <span class="text-xl font-bold text-purple-300">🔥 ${realmsState.maxCombo}</span>
    </div>
    <div>
      <span class="block text-[11px] text-slate-400 font-semibold">نسبة الدقة</span>
      <span class="text-xl font-bold text-emerald-400">${accuracy}%</span>
    </div>
  `;

  // Learning Review: Incorrect Questions & Explanations Breakdown
  if (realmsState.incorrectQuestionsSummary.length > 0) {
    const reviewBox = document.createElement('div');
    reviewBox.className = 'bg-slate-950 border border-amber-900/50 p-4 rounded-xl text-right max-w-lg mx-auto space-y-2 text-xs';
    reviewBox.innerHTML = `<h4 class="font-bold text-amber-400 flex items-center gap-1.5 mb-2"><span>📌</span> مراجعة الأسئلة غير الدقيقة والتوضيحات:</h4>`;

    realmsState.incorrectQuestionsSummary.forEach((inc, idx) => {
      const card = document.createElement('div');
      card.className = 'bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1';
      card.innerHTML = `
        <div class="font-bold text-slate-200">${idx + 1}. ${inc.questionText}</div>
        <div class="text-red-400">إجابتك: ${inc.selectedText}</div>
        <div class="text-green-400">الإجابة الصحيحة: ${inc.correctText}</div>
        <div class="text-slate-400 text-[11px] leading-relaxed pt-1 border-t border-slate-800/60">${inc.explanation}</div>
      `;
      reviewBox.appendChild(card);
    });
    box.appendChild(reviewBox);
  }

  // Recommendation Card
  const recCard = document.createElement('div');
  recCard.className = 'bg-purple-950/40 border border-purple-800/50 p-3 rounded-xl max-w-lg mx-auto text-xs text-purple-200 text-right';
  recCard.innerHTML = `
    <span class="font-bold block mb-1">💡 العالم التالي الموصى به:</span>
    <span class="text-slate-300">${realmsState.selectedWorld === 'maze' ? 'جزر السماء ☁️ (تحدي المنصات والتسلق المفاهيمي)' : 'سباق المجرات 🏎️ (تحدي السرعة والتنقل بين المسارات)'}</span>
  `;

  const btnRow = document.createElement('div');
  btnRow.className = 'flex flex-wrap justify-center gap-3 pt-2 max-w-lg mx-auto';

  // "تدرب مرة أخرى" Practice Again Button
  if (realmsState.incorrectQuestionsSummary.length > 0) {
    const practiceBtn = document.createElement('button');
    practiceBtn.type = 'button';
    practiceBtn.className = 'bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition text-sm flex items-center gap-2';
    practiceBtn.innerHTML = `<span>تدرب مرة أخرى</span> <span>🎯</span>`;
    practiceBtn.addEventListener('click', () => {
      playSound('select');
      import('./realmsSession.js').then(m => {
        m.startPracticeReviewSession();
        renderRealmsOverlay(container.parentElement, onWorldComplete, onReturnToWorlds);
      });
    });
    btnRow.appendChild(practiceBtn);
  }

  const returnBtn = document.createElement('button');
  returnBtn.type = 'button';
  returnBtn.className = 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition text-sm flex items-center gap-2';
  returnBtn.innerHTML = `<span>اختيار عالم آخر</span> <span>🌌</span>`;
  returnBtn.addEventListener('click', () => {
    playSound('select');
    if (onReturnToWorlds) onReturnToWorlds();
  });

  const replayBtn = document.createElement('button');
  replayBtn.type = 'button';
  replayBtn.className = 'bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 px-5 rounded-xl border border-slate-700 transition text-sm';
  replayBtn.textContent = '🔄 إعادة التحدي';
  replayBtn.addEventListener('click', () => {
    playSound('select');
    retryRealmsSession();
    renderRealmsOverlay(container.parentElement, onWorldComplete, onReturnToWorlds);
  });

  btnRow.appendChild(returnBtn);
  btnRow.appendChild(replayBtn);

  box.appendChild(badge);
  box.appendChild(title);
  box.appendChild(shardsBox);
  box.appendChild(scoreBanner);
  box.appendChild(recCard);
  box.appendChild(btnRow);

  container.appendChild(box);
}

// 5. Game Over State Screen
function renderGameOverState(container, world, onReturnToWorlds) {
  playSound('incorrect');

  const box = document.createElement('div');
  box.className = 'text-center space-y-5 py-4';

  const icon = document.createElement('div');
  icon.className = 'text-4xl animate-pulse';
  icon.textContent = '💔';

  const title = document.createElement('h3');
  title.className = 'text-xl font-bold text-white';
  title.textContent = 'نفدت محاولات الطاقة في هذا العالم';

  const desc = document.createElement('p');
  desc.className = 'text-xs text-slate-300 max-w-md mx-auto leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800';
  desc.textContent = 'المحاولة هي أولى خطوات النجاح. يمكنك الاستفادة من الشرح والتوضيحات وإعادة التدرب فوراً.';

  // Review of missed questions
  if (realmsState.incorrectQuestionsSummary.length > 0) {
    const reviewBox = document.createElement('div');
    reviewBox.className = 'bg-slate-950 border border-amber-900/50 p-4 rounded-xl text-right max-w-md mx-auto space-y-2 text-xs';
    reviewBox.innerHTML = `<h4 class="font-bold text-amber-400 flex items-center gap-1.5 mb-2"><span>📌</span> توضيح المفاهيم للمراجعة:</h4>`;

    realmsState.incorrectQuestionsSummary.forEach((inc, idx) => {
      const card = document.createElement('div');
      card.className = 'bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1';
      card.innerHTML = `
        <div class="font-bold text-slate-200">${idx + 1}. ${inc.questionText}</div>
        <div class="text-green-400">الصحيح: ${inc.correctText}</div>
        <div class="text-slate-400 text-[11px] leading-relaxed pt-1">${inc.explanation}</div>
      `;
      reviewBox.appendChild(card);
    });
    box.appendChild(reviewBox);
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'flex flex-wrap justify-center gap-3 pt-2 max-w-md mx-auto';

  // "تدرب مرة أخرى" Practice Button
  const practiceBtn = document.createElement('button');
  practiceBtn.type = 'button';
  practiceBtn.className = 'bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition text-sm flex items-center gap-2';
  practiceBtn.innerHTML = `<span>تدرب مرة أخرى</span> <span>🎯</span>`;
  practiceBtn.addEventListener('click', () => {
    playSound('select');
    import('./realmsSession.js').then(m => {
      m.startPracticeReviewSession();
      renderRealmsOverlay(container.parentElement, null, onReturnToWorlds);
    });
  });

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition text-sm flex items-center gap-2';
  retryBtn.innerHTML = `<span>إعادة المحاولة مجدداً</span> <span>🔄</span>`;
  retryBtn.addEventListener('click', () => {
    playSound('select');
    retryRealmsSession();
    renderRealmsOverlay(container.parentElement, null, onReturnToWorlds);
  });

  const returnBtn = document.createElement('button');
  returnBtn.type = 'button';
  returnBtn.className = 'bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 px-5 rounded-xl border border-slate-700 transition text-sm';
  returnBtn.textContent = '🚪 العودة للأكوان';
  returnBtn.addEventListener('click', () => {
    playSound('select');
    if (onReturnToWorlds) onReturnToWorlds();
  });

  btnRow.appendChild(practiceBtn);
  btnRow.appendChild(retryBtn);
  btnRow.appendChild(returnBtn);

  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(desc);
  box.appendChild(btnRow);

  container.appendChild(box);
}

// 6. Empty State Screen
function renderEmptyState(container, onReturnToWorlds) {
  const box = document.createElement('div');
  box.className = 'text-center space-y-4 py-6';

  const icon = document.createElement('div');
  icon.className = 'text-4xl';
  icon.textContent = '📭';

  const title = document.createElement('h3');
  title.className = 'text-lg font-bold text-white';
  title.textContent = 'لا توجد أسئلة متاحة حالياً';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition';
  backBtn.textContent = 'العودة لاختيار العالم';
  backBtn.addEventListener('click', () => {
    if (onReturnToWorlds) onReturnToWorlds();
  });

  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(backBtn);

  container.appendChild(box);
}
