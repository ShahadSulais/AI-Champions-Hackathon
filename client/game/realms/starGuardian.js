import { realmsState, getCurrentQuestion, submitRealmsAnswer, nextRealmsQuestion, pauseRealmsSession, resumeRealmsSession, retryRealmsSession } from '../realmsSession.js';
import { playSound } from '../../services/audioService.js';
import { triggerConfetti, triggerXpPopup } from '../../services/effectsService.js';

let guardianState = {
  coreEnergy: 100, // Knowledge Core energy percentage
  shadowDistance: 100, // Distance of "ظلال النسيان" (100 = far, 0 = breach)
  animFrameId: null,
  keyboardListener: null,
  containerEl: null,
  onWorldComplete: null,
  onReturnToWorlds: null
};

export function renderStarGuardian(containerEl, onWorldComplete, onReturnToWorlds) {
  if (!containerEl) return;
  containerEl.replaceChildren();

  guardianState.containerEl = containerEl;
  guardianState.onWorldComplete = onWorldComplete;
  guardianState.onReturnToWorlds = onReturnToWorlds;

  resetStarGuardianState();

  const wrapper = document.createElement('div');
  wrapper.className = 'w-full max-w-4xl mx-auto space-y-4 bg-slate-900/95 border border-emerald-900/50 rounded-2xl p-4 md:p-6 shadow-2xl transition-all duration-300 relative selection:bg-none';

  // HUD Header
  const hud = renderGuardianHUD();
  wrapper.appendChild(hud);

  // Main Layout Grid: Side Mission Actions Panel + Space Archive Canvas
  const gameBody = document.createElement('div');
  gameBody.className = 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start';

  // Question & Action Control Panel (6 cols)
  const qPanel = renderGuardianQuestionPanel();
  qPanel.className = 'lg:col-span-6 space-y-3';

  // Space Defense Canvas (6 cols)
  const canvasArea = document.createElement('div');
  canvasArea.className = 'lg:col-span-6 flex flex-col items-center justify-center space-y-3';

  const canvas = document.createElement('canvas');
  canvas.id = 'guardian-canvas';
  canvas.width = 480;
  canvas.height = 360;
  canvas.className = 'bg-slate-950 border-2 border-emerald-800/80 rounded-2xl shadow-xl touch-none w-full max-w-[480px] aspect-[4/3]';

  canvasArea.appendChild(canvas);
  gameBody.appendChild(qPanel);
  gameBody.appendChild(canvasArea);
  wrapper.appendChild(gameBody);

  // Modal Layer
  const modalLayer = document.createElement('div');
  modalLayer.id = 'guardian-modal-layer';
  modalLayer.className = 'hidden absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4 rounded-2xl';
  wrapper.appendChild(modalLayer);

  containerEl.appendChild(wrapper);

  setupGuardianKeyboardControls();
  startGuardianCanvasLoop(canvas);
}

function resetStarGuardianState() {
  guardianState.coreEnergy = 100;
  guardianState.shadowDistance = 100;
}

// HUD Header
function renderGuardianHUD() {
  const hud = document.createElement('div');
  hud.className = 'flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3 text-xs font-bold';

  const leftStats = document.createElement('div');
  leftStats.className = 'flex items-center gap-2 flex-wrap';

  const worldBadge = document.createElement('span');
  worldBadge.className = 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-3 py-1 rounded-full flex items-center gap-1.5';
  worldBadge.innerHTML = `<span>🛡️</span> <span>حارس النجوم</span>`;

  const qBadge = document.createElement('span');
  qBadge.className = 'bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full';
  qBadge.textContent = `المهمة ${realmsState.currentQuestionIndex + 1} من ${realmsState.questions.length}`;

  const hearts = document.createElement('span');
  hearts.className = 'bg-rose-950/80 text-rose-300 border border-rose-800 px-2.5 py-1 rounded-full flex items-center gap-1';
  let heartsStr = '';
  for (let i = 0; i < realmsState.maxEnergy; i++) {
    heartsStr += i < realmsState.energy ? '💖' : '🖤';
  }
  hearts.textContent = heartsStr;

  const xpBadge = document.createElement('span');
  xpBadge.className = 'bg-amber-950/80 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-full flex items-center gap-1';
  xpBadge.innerHTML = `<span>⭐</span> <span>${realmsState.score} XP</span>`;

  const comboBadge = document.createElement('span');
  comboBadge.className = `border px-2.5 py-1 rounded-full ${
    realmsState.combo >= 2
      ? 'bg-gradient-to-r from-purple-900 to-pink-900 text-purple-200 border-purple-500 animate-pulse'
      : 'hidden'
  }`;
  comboBadge.textContent = `🔥 مضاعف x${Math.min(realmsState.combo, 4)}`;

  leftStats.appendChild(worldBadge);
  leftStats.appendChild(qBadge);
  leftStats.appendChild(hearts);
  leftStats.appendChild(xpBadge);
  leftStats.appendChild(comboBadge);

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'bg-slate-800 hover:bg-slate-700 text-emerald-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1';
  pauseBtn.innerHTML = `<span>⏸️</span> <span class="hidden sm:inline">إيقاف</span>`;
  pauseBtn.addEventListener('click', () => {
    playSound('select');
    showGuardianPauseModal();
  });

  hud.appendChild(leftStats);
  hud.appendChild(pauseBtn);

  return hud;
}

// Side Question & Control Panel
function renderGuardianQuestionPanel() {
  const currentQ = getCurrentQuestion();
  const qCard = document.createElement('div');
  qCard.className = 'bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-inner';

  if (!currentQ) {
    qCard.innerHTML = `<p class="text-xs text-slate-400">لا توجد أسئلة حالية.</p>`;
    return qCard;
  }

  const qHeader = document.createElement('div');
  qHeader.className = 'flex justify-between items-center border-b border-slate-800 pb-2';

  const qBadge = document.createElement('span');
  qBadge.className = 'text-[11px] font-bold text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800';
  qBadge.textContent = `🛡️ مهمة الدفاع المعرفي #${realmsState.currentQuestionIndex + 1}`;

  const instr = document.createElement('span');
  instr.className = 'text-[10px] text-slate-400 font-semibold';
  instr.textContent = 'شغّل النظام الدفاعي بالإجابة الصحيحة ⚡';

  qHeader.appendChild(qBadge);
  qHeader.appendChild(instr);

  const qText = document.createElement('h4');
  qText.className = 'text-sm font-bold text-slate-100 leading-relaxed';
  qText.textContent = currentQ.question;

  qCard.appendChild(qHeader);
  qCard.appendChild(qText);

  // Large Control Panel Action Buttons (A, B, C, D)
  const choicesGrid = document.createElement('div');
  choicesGrid.className = 'grid grid-cols-1 gap-2.5 pt-1';

  const psStyles = [
    { class: 'ps-btn-triangle', symbol: '△', color: '#c026d3' },
    { class: 'ps-btn-circle', symbol: '○', color: '#0284c7' },
    { class: 'ps-btn-cross', symbol: '✕', color: '#d97706' },
    { class: 'ps-btn-square', symbol: '□', color: '#059669' }
  ];

  currentQ.choices.forEach((choice, idx) => {
    const psStyle = psStyles[idx % psStyles.length];

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'w-full bg-slate-900 hover:bg-emerald-950/70 border border-slate-700 hover:border-emerald-500 p-3.5 rounded-xl transition text-right flex items-center justify-between gap-3 text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-400 outline-none group cursor-pointer shadow-md min-h-[50px]';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'flex items-center gap-2.5';

    const badge = document.createElement('span');
    badge.className = `ps-btn-badge ${psStyle.class} text-xs font-bold flex-shrink-0`;
    badge.textContent = psStyle.symbol;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'text-xs md:text-sm leading-relaxed';
    labelSpan.textContent = choice.text;

    leftGroup.appendChild(badge);
    leftGroup.appendChild(labelSpan);
    btn.appendChild(leftGroup);

    btn.addEventListener('click', () => {
      handleGuardianActionSubmit(choice.id);
    });

    choicesGrid.appendChild(btn);
  });

  qCard.appendChild(choicesGrid);
  return qCard;
}

// Action Submit Handler
export function handleGuardianActionSubmit(choiceId) {
  const evalResult = submitRealmsAnswer(choiceId);

  if (evalResult.isCorrect) {
    playSound('correct');
    triggerConfetti({ count: 50 });
    const canvasEl = typeof document !== 'undefined' ? document.getElementById('guardian-canvas') : null;
    if (canvasEl) triggerXpPopup(`+${evalResult.earnedXp} XP`, canvasEl);


    showGuardianModal({
      type: 'correct',
      title: '🛡️ تم تفعيل الشعاع الدفاعي بنجاح!',
      subtitle: `كسبت +${evalResult.earnedXp} XP (مضاعف Combo x${Math.min(realmsState.combo, 4)})`,
      explanation: evalResult.explanation,
      isFinished: evalResult.isFinished
    });

  } else {
    playSound('incorrect');

    showGuardianModal({
      type: 'wrong',
      title: evalResult.isGameOver ? '💔 اختُرق الدروع ونفدت الطاقة!' : '⚠️ تم التصدّي ولكن تضرع الدروع! (فقدان 1 طاقة)',
      subtitle: evalResult.isGameOver ? 'يمكنك مراجعة المفاهيم وإعادة المحاولة' : 'تم تشغيل دروع الطوارئ للتصدّي لظلال النسيان',
      explanation: evalResult.explanation,
      isGameOver: evalResult.isGameOver
    });
  }
}

// Keyboard Controls
function setupGuardianKeyboardControls() {
  if (guardianState.keyboardListener) {
    document.removeEventListener('keydown', guardianState.keyboardListener);
  }

  guardianState.keyboardListener = (e) => {
    if (realmsState.sessionStatus !== 'playing') return;

    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      showGuardianPauseModal();
      return;
    }

    const currentQ = getCurrentQuestion();
    if (!currentQ || !currentQ.choices) return;

    const keyMap = {
      '1': currentQ.choices[0]?.id,
      '2': currentQ.choices[1]?.id,
      '3': currentQ.choices[2]?.id,
      '4': currentQ.choices[3]?.id,
      'a': currentQ.choices[0]?.id,
      'b': currentQ.choices[1]?.id,
      'c': currentQ.choices[2]?.id,
      'd': currentQ.choices[3]?.id
    };

    const chosenId = keyMap[e.key.toLowerCase()];
    if (chosenId) {
      e.preventDefault();
      handleGuardianActionSubmit(chosenId);
    }
  };

  document.addEventListener('keydown', guardianState.keyboardListener);
}

// Canvas Game Render Loop
function startGuardianCanvasLoop(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function loop() {
    if (document.getElementById('guardian-canvas')) {
      renderGuardianCanvas(ctx, canvas);
      guardianState.animFrameId = requestAnimationFrame(loop);
    }
  }

  if (guardianState.animFrameId) cancelAnimationFrame(guardianState.animFrameId);
  guardianState.animFrameId = requestAnimationFrame(loop);
}

// Space Defense Graphic Painting
function renderGuardianCanvas(ctx, canvas) {
  const now = Date.now();
  const w = canvas.width;
  const h = canvas.height;

  // Space Background with Animated Stars
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 25; i++) {
    const sx = (i * 37 + now * 0.02) % w;
    const sy = (i * 53) % h;
    ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#ffffff';
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Draw Central Knowledge Core Archive
  const cx = w / 2;
  const cy = h / 2;
  const corePulse = Math.sin(now / 200) * 5;

  // Outer Shield Aura
  ctx.beginPath();
  ctx.arc(cx, cy, 65 + corePulse, 0, Math.PI * 2);
  ctx.fillStyle = '#10b98122';
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Knowledge Core Crystal
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#059669';
  ctx.fill();
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💎', cx, cy);

  // Draw "ظلال النسيان" Abstract Shadow Spheres At Top
  ctx.beginPath();
  ctx.arc(cx, 45, 30 + Math.sin(now / 150) * 4, 0, Math.PI * 2);
  ctx.fillStyle = '#4c0519aa';
  ctx.fill();
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fda4af';
  ctx.font = 'bold 12px Cairo, sans-serif';
  ctx.fillText('ظلال النسيان 👾', cx, 45);
}

// Modal Layer Renderers
function showGuardianModal({ type, title, subtitle, explanation, isFinished = false, isGameOver = false }) {
  if (typeof document === 'undefined') return;
  const modalLayer = document.getElementById('guardian-modal-layer');
  if (!modalLayer) return;


  modalLayer.replaceChildren();
  modalLayer.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-emerald-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-center shadow-2xl animate-fade-in';

  const icon = document.createElement('div');
  icon.className = 'text-4xl animate-bounce';
  icon.textContent = type === 'correct' ? '🏆' : (isGameOver ? '💔' : '⚠️');

  const titleEl = document.createElement('h3');
  titleEl.className = 'text-xl font-bold text-white';
  titleEl.textContent = title;

  const subEl = document.createElement('p');
  subEl.className = 'text-xs text-emerald-200 font-semibold';
  subEl.textContent = subtitle;

  const expBox = document.createElement('div');
  expBox.className = 'bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed text-right space-y-1';
  expBox.innerHTML = `
    <strong class="text-emerald-300 block mb-1">📌 الشرح المفاهيمي:</strong>
    <p>${explanation || 'تفسير دقيق لناتج التحدي.'}</p>
  `;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = type === 'correct'
    ? 'w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm'
    : 'w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm';

  btn.textContent = isFinished
    ? 'إكمال العالم وعرض النتيجة 🏆'
    : (isGameOver ? 'إعادة محاولة العالم 🔄' : 'المتابعة للتحدي التالي ➔');

  btn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    playSound('select');

    if (isFinished) {
      realmsState.sessionStatus = 'success';
      if (guardianState.onWorldComplete) guardianState.onWorldComplete();
    } else if (isGameOver) {
      retryRealmsSession();
      renderStarGuardian(guardianState.containerEl, guardianState.onWorldComplete, guardianState.onReturnToWorlds);
    } else if (type === 'correct') {
      nextRealmsQuestion();
      renderStarGuardian(guardianState.containerEl, guardianState.onWorldComplete, guardianState.onReturnToWorlds);
    } else {
      renderStarGuardian(guardianState.containerEl, guardianState.onWorldComplete, guardianState.onReturnToWorlds);
    }
  });

  card.appendChild(icon);
  card.appendChild(titleEl);
  card.appendChild(subEl);
  card.appendChild(expBox);
  card.appendChild(btn);

  modalLayer.appendChild(card);
}

function showGuardianPauseModal() {
  pauseRealmsSession();
  const modalLayer = document.getElementById('guardian-modal-layer');
  if (!modalLayer) return;

  modalLayer.replaceChildren();
  modalLayer.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-emerald-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center shadow-2xl';

  const title = document.createElement('h3');
  title.className = 'text-xl font-bold text-white';
  title.textContent = '⏸️ اللعب متوقف مؤقتاً';

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.className = 'w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition';
  resumeBtn.textContent = '▶️ استئناف اللعب';
  resumeBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    resumeRealmsSession();
    playSound('select');
  });

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'w-full bg-slate-800 hover:bg-slate-700 text-emerald-200 border border-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition';
  retryBtn.textContent = '🔄 إعادة المحاولة';
  retryBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    retryRealmsSession();
    playSound('select');
    renderStarGuardian(guardianState.containerEl, guardianState.onWorldComplete, guardianState.onReturnToWorlds);
  });

  const quitBtn = document.createElement('button');
  quitBtn.type = 'button';
  quitBtn.className = 'w-full bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-900/60 font-semibold py-2.5 px-4 rounded-xl text-sm transition';
  quitBtn.textContent = '🚪 العودة لاختيار الأكوان';
  quitBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    playSound('select');
    if (guardianState.onReturnToWorlds) guardianState.onReturnToWorlds();
  });

  card.appendChild(title);
  card.appendChild(resumeBtn);
  card.appendChild(retryBtn);
  card.appendChild(quitBtn);

  modalLayer.appendChild(card);
}
