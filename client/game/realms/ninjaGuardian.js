import { realmsState, getCurrentQuestion, submitRealmsAnswer, nextRealmsQuestion, pauseRealmsSession, resumeRealmsSession, retryRealmsSession } from '../realmsSession.js';
import { playSound } from '../../services/audioService.js';
import { triggerConfetti, triggerXpPopup } from '../../services/effectsService.js';

let ninjaState = {
  orbs: [],
  bladeTrail: [], // Array of {x, y, time} for glowing katana swipe effect
  animFrameId: null,
  keyboardListener: null,
  mouseListener: null,
  touchListener: null,
  containerEl: null,
  onWorldComplete: null,
  onReturnToWorlds: null,
  isMouseDown: false,
  isProcessingSlice: false
};

export function renderNinjaGuardian(containerEl, onWorldComplete, onReturnToWorlds) {
  if (!containerEl) return;
  containerEl.replaceChildren();

  ninjaState.containerEl = containerEl;
  ninjaState.onWorldComplete = onWorldComplete;
  ninjaState.onReturnToWorlds = onReturnToWorlds;
  ninjaState.isProcessingSlice = false;

  resetNinjaState();

  const wrapper = document.createElement('div');
  wrapper.className = 'w-full max-w-4xl mx-auto space-y-4 bg-slate-900/95 border border-amber-900/50 rounded-2xl p-4 md:p-6 shadow-2xl transition-all duration-300 relative selection:bg-none';

  // HUD Header
  const hud = renderNinjaHUD();
  wrapper.appendChild(hud);

  // Main Layout Grid: Question Panel + Ninja Canvas
  const gameBody = document.createElement('div');
  gameBody.className = 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start';

  // Question Panel (5 cols)
  const qPanel = renderNinjaQuestionPanel();
  qPanel.className = 'lg:col-span-5 space-y-3';

  // Canvas & Touch Controls (7 cols)
  const canvasArea = document.createElement('div');
  canvasArea.className = 'lg:col-span-7 flex flex-col items-center justify-center space-y-3';

  const canvas = document.createElement('canvas');
  canvas.id = 'ninja-canvas';
  canvas.width = 540;
  canvas.height = 380;
  canvas.className = 'bg-slate-950 border-2 border-amber-800/80 rounded-2xl shadow-xl touch-none w-full max-w-[540px] aspect-[1.4/1] cursor-crosshair';

  canvasArea.appendChild(canvas);

  // Quick Cut Action Buttons (Accessibility for touch/click)
  const controls = renderNinjaActionControls();
  canvasArea.appendChild(controls);

  gameBody.appendChild(qPanel);
  gameBody.appendChild(canvasArea);
  wrapper.appendChild(gameBody);

  // Modal Layer
  const modalLayer = document.createElement('div');
  modalLayer.id = 'ninja-modal-layer';
  modalLayer.className = 'hidden absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4 rounded-2xl';
  wrapper.appendChild(modalLayer);

  containerEl.appendChild(wrapper);

  setupNinjaSwipeListeners(canvas);
  setupNinjaKeyboardControls();
  startNinjaCanvasLoop(canvas);
}

function resetNinjaState() {
  ninjaState.bladeTrail = [];
  ninjaState.isProcessingSlice = false;

  const currentQ = getCurrentQuestion();
  const choices = (currentQ && currentQ.choices) ? currentQ.choices : [];

  ninjaState.orbs = choices.map((c, i) => ({
    choiceId: c.id,
    label: ['أ', 'ب', 'ج', 'د'][i % 4],
    badge: ['△', '○', '✕', '□'][i % 4],
    color: ['#c026d3', '#0284c7', '#d97706', '#059669'][i % 4],
    text: c.text,
    x: 80 + i * 115,
    y: 120 + (i % 2 === 0 ? 0 : 40),
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.5) * 1.5,
    radius: 36,
    isCut: false
  }));
}

// HUD Header
function renderNinjaHUD() {
  const hud = document.createElement('div');
  hud.className = 'flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3 text-xs font-bold';

  const leftStats = document.createElement('div');
  leftStats.className = 'flex items-center gap-2 flex-wrap';

  const worldBadge = document.createElement('span');
  worldBadge.className = 'bg-amber-950 text-amber-300 border border-amber-700/60 px-3 py-1 rounded-full flex items-center gap-1.5';
  worldBadge.innerHTML = `<span>🥷</span> <span>نينجا المعرفة</span>`;

  const qBadge = document.createElement('span');
  qBadge.className = 'bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full';
  qBadge.textContent = `التحدي ${realmsState.currentQuestionIndex + 1} من ${realmsState.questions.length}`;

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
  pauseBtn.className = 'bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1';
  pauseBtn.innerHTML = `<span>⏸️</span> <span class="hidden sm:inline">إيقاف</span>`;
  pauseBtn.addEventListener('click', () => {
    playSound('select');
    showNinjaPauseModal();
  });

  hud.appendChild(leftStats);
  hud.appendChild(pauseBtn);

  return hud;
}

// Side Question Panel
function renderNinjaQuestionPanel() {
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
  qBadge.className = 'text-[11px] font-bold text-amber-300 bg-amber-950 px-2.5 py-0.5 rounded border border-amber-800';
  qBadge.textContent = `🥷 سؤال نينجا المعرفة #${realmsState.currentQuestionIndex + 1}`;

  const instr = document.createElement('span');
  instr.className = 'text-[10px] text-slate-400 font-semibold';
  instr.textContent = 'امسح بسيفك ⚔️ لقطع الخيار الصحيح!';

  qHeader.appendChild(qBadge);
  qHeader.appendChild(instr);

  const qText = document.createElement('h4');
  qText.className = 'text-sm font-bold text-slate-100 leading-relaxed';
  qText.textContent = currentQ.question;

  qCard.appendChild(qHeader);
  qCard.appendChild(qText);

  // List of answer choices
  const choicesList = document.createElement('div');
  choicesList.className = 'space-y-2 pt-1';

  currentQ.choices.forEach((choice, idx) => {
    const color = ['#c026d3', '#0284c7', '#d97706', '#059669'][idx % 4];

    const choiceRow = document.createElement('div');
    choiceRow.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs font-semibold text-slate-200';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'flex items-center gap-2';

    const badge = document.createElement('span');
    badge.className = 'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0';
    badge.style.backgroundColor = color;
    badge.textContent = ['أ', 'ب', 'ج', 'د'][idx % 4];

    const labelSpan = document.createElement('span');
    labelSpan.className = 'leading-relaxed text-[12px]';
    labelSpan.textContent = choice.text;

    leftGroup.appendChild(badge);
    leftGroup.appendChild(labelSpan);
    choiceRow.appendChild(leftGroup);

    // Direct Cut Button for accessibility
    const cutBtn = document.createElement('button');
    cutBtn.type = 'button';
    cutBtn.className = 'text-[10px] bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg transition shadow';
    cutBtn.textContent = 'قطع بالسيف ⚔️';
    cutBtn.addEventListener('click', () => {
      handleNinjaCutChoice(choice.id);
    });
    choiceRow.appendChild(cutBtn);

    choicesList.appendChild(choiceRow);
  });

  qCard.appendChild(choicesList);
  return qCard;
}

// Touch Action Controls
function renderNinjaActionControls() {
  const container = document.createElement('div');
  container.className = 'flex flex-wrap items-center justify-center gap-2 w-full max-w-[540px]';

  const currentQ = getCurrentQuestion();
  if (!currentQ || !currentQ.choices) return container;

  currentQ.choices.forEach((c, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'flex-grow max-w-[120px] h-11 bg-slate-800 hover:bg-amber-900 border border-slate-700 rounded-xl text-xs font-bold text-amber-200 flex items-center justify-center gap-1 shadow-md active:scale-95';
    btn.innerHTML = `<span>قطع (${['أ', 'ب', 'ج', 'د'][idx]})</span> <span>⚔️</span>`;
    btn.addEventListener('click', () => {
      handleNinjaCutChoice(c.id);
    });
    container.appendChild(btn);
  });

  return container;
}

// Slice Action Evaluator
export function handleNinjaCutChoice(choiceId) {
  if (ninjaState.isProcessingSlice || realmsState.sessionStatus !== 'playing') return;
  ninjaState.isProcessingSlice = true;

  const evalResult = submitRealmsAnswer(choiceId);

  if (evalResult.isCorrect) {
    playSound('correct');
    triggerConfetti({ count: 55 });
    const canvasEl = typeof document !== 'undefined' ? document.getElementById('ninja-canvas') : null;
    if (canvasEl) triggerXpPopup(`+${evalResult.earnedXp} XP ⚔️`, canvasEl);

    showNinjaModal({
      type: 'correct',
      title: '⚔️ قطع نينجا دقيق وإجابة صحيحة!',
      subtitle: `كسبت +${evalResult.earnedXp} XP (مضاعف Combo x${Math.min(realmsState.combo, 4)})`,
      explanation: evalResult.explanation,
      isFinished: evalResult.isFinished
    });

  } else {
    playSound('incorrect');

    showNinjaModal({
      type: 'wrong',
      title: evalResult.isGameOver ? '💔 نفدت محاولات النينجا!' : '⚠️ قطع غير دقيق! (فقدان 1 طاقة)',
      subtitle: evalResult.isGameOver ? 'يمكنك مراجعة المفاهيم وإعادة محاولة عالم النينجا' : 'استعن بالتوضيحات وراجع خيارات التحدي',
      explanation: evalResult.explanation,
      isGameOver: evalResult.isGameOver
    });
  }
}

// Mouse / Touch Swipe Listener for Katana Blade Trail
function setupNinjaSwipeListeners(canvas) {
  if (!canvas) return;

  function addPoint(x, y) {
    const rect = canvas.getBoundingClientRect();
    const cx = ((x - rect.left) / rect.width) * canvas.width;
    const cy = ((y - rect.top) / rect.height) * canvas.height;

    ninjaState.bladeTrail.push({ x: cx, y: cy, time: Date.now() });

    // Check intersection with active answer target orbs
    ninjaState.orbs.forEach(orb => {
      if (!orb.isCut && !ninjaState.isProcessingSlice) {
        const dist = Math.hypot(cx - orb.x, cy - orb.y);
        if (dist < orb.radius + 10) {
          orb.isCut = true;
          handleNinjaCutChoice(orb.choiceId);
        }
      }
    });
  }

  canvas.addEventListener('mousedown', (e) => {
    ninjaState.isMouseDown = true;
    addPoint(e.clientX, e.clientY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (ninjaState.isMouseDown) {
      addPoint(e.clientX, e.clientY);
    }
  });

  window.addEventListener('mouseup', () => {
    ninjaState.isMouseDown = false;
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches[0]) {
      addPoint(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches[0]) {
      addPoint(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });
}

// Keyboard Controls
function setupNinjaKeyboardControls() {
  if (ninjaState.keyboardListener) {
    document.removeEventListener('keydown', ninjaState.keyboardListener);
  }

  ninjaState.keyboardListener = (e) => {
    if (realmsState.sessionStatus !== 'playing') return;

    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      showNinjaPauseModal();
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
      handleNinjaCutChoice(chosenId);
    }
  };

  document.addEventListener('keydown', ninjaState.keyboardListener);
}

// Canvas Game Loop
function startNinjaCanvasLoop(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function loop() {
    if (document.getElementById('ninja-canvas')) {
      updateNinjaPhysics(canvas);
      renderNinjaCanvas(ctx, canvas);
      ninjaState.animFrameId = requestAnimationFrame(loop);
    }
  }

  if (ninjaState.animFrameId) cancelAnimationFrame(ninjaState.animFrameId);
  ninjaState.animFrameId = requestAnimationFrame(loop);
}

function updateNinjaPhysics(canvas) {
  if (realmsState.sessionStatus !== 'playing') return;

  const w = canvas.width;
  const h = canvas.height;

  // Bounce Orbs around canvas boundaries smoothly
  ninjaState.orbs.forEach(orb => {
    orb.x += orb.vx;
    orb.y += orb.vy;

    if (orb.x - orb.radius < 20 || orb.x + orb.radius > w - 20) orb.vx *= -1;
    if (orb.y - orb.radius < 20 || orb.y + orb.radius > h - 20) orb.vy *= -1;
  });

  // Prune expired blade trail points (>350ms old)
  const now = Date.now();
  ninjaState.bladeTrail = ninjaState.bladeTrail.filter(pt => now - pt.time < 350);
}

// Canvas Painting Logic
function renderNinjaCanvas(ctx, canvas) {
  const now = Date.now();
  const w = canvas.width;
  const h = canvas.height;

  // Dojo / Cyber Ninja Background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, w, h);

  // Background Katana Slash Grid Effects
  ctx.strokeStyle = '#f59e0b11';
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 100, h);
    ctx.stroke();
  }

  // Render Target Answer Orbs
  ninjaState.orbs.forEach(orb => {
    if (orb.isCut) return;

    // Glowing Aura
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius + 8 + Math.sin(now / 150) * 3, 0, Math.PI * 2);
    ctx.fillStyle = `${orb.color}33`;
    ctx.fill();

    // Target Orb Body
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fillStyle = orb.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Symbol Badge & Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${orb.label} ${orb.badge}`, orb.x, orb.y);
  });

  // Render Glowing Katana Blade Trail
  const trail = ninjaState.bladeTrail;
  if (trail.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) {
      ctx.lineTo(trail[i].x, trail[i].y);
    }
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// Modal Layer Renderers
function showNinjaModal({ type, title, subtitle, explanation, isFinished = false, isGameOver = false }) {
  if (typeof document === 'undefined') return;
  const modalLayer = document.getElementById('ninja-modal-layer');
  if (!modalLayer) return;

  modalLayer.replaceChildren();
  modalLayer.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-amber-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-center shadow-2xl animate-fade-in';

  const icon = document.createElement('div');
  icon.className = 'text-4xl animate-bounce';
  icon.textContent = type === 'correct' ? '🥷' : (isGameOver ? '💔' : '⚠️');

  const titleEl = document.createElement('h3');
  titleEl.className = 'text-xl font-bold text-white';
  titleEl.textContent = title;

  const subEl = document.createElement('p');
  subEl.className = 'text-xs text-amber-200 font-semibold';
  subEl.textContent = subtitle;

  const expBox = document.createElement('div');
  expBox.className = 'bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed text-right space-y-1';
  expBox.innerHTML = `
    <strong class="text-amber-300 block mb-1">📌 الشرح المفاهيمي:</strong>
    <p>${explanation || 'تفسير دقيق لناتج التحدي.'}</p>
  `;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = type === 'correct'
    ? 'w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm'
    : 'w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm';

  btn.textContent = isFinished
    ? 'إكمال العالم وعرض النتيجة 🏆'
    : (isGameOver ? 'إعادة محاولة العالم 🔄' : 'المتابعة للتحدي التالي ➔');

  btn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    playSound('select');

    if (isFinished) {
      realmsState.sessionStatus = 'success';
      if (ninjaState.onWorldComplete) ninjaState.onWorldComplete();
    } else if (isGameOver) {
      retryRealmsSession();
      renderNinjaGuardian(ninjaState.containerEl, ninjaState.onWorldComplete, ninjaState.onReturnToWorlds);
    } else if (type === 'correct') {
      nextRealmsQuestion();
      renderNinjaGuardian(ninjaState.containerEl, ninjaState.onWorldComplete, ninjaState.onReturnToWorlds);
    } else {
      renderNinjaGuardian(ninjaState.containerEl, ninjaState.onWorldComplete, ninjaState.onReturnToWorlds);
    }
  });

  card.appendChild(icon);
  card.appendChild(titleEl);
  card.appendChild(subEl);
  card.appendChild(expBox);
  card.appendChild(btn);

  modalLayer.appendChild(card);
}

function showNinjaPauseModal() {
  pauseRealmsSession();
  const modalLayer = document.getElementById('ninja-modal-layer');
  if (!modalLayer) return;

  modalLayer.replaceChildren();
  modalLayer.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-amber-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center shadow-2xl';

  const title = document.createElement('h3');
  title.className = 'text-xl font-bold text-white';
  title.textContent = '⏸️ اللعب متوقف مؤقتاً';

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.className = 'w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition';
  resumeBtn.textContent = '▶️ استئناف اللعب';
  resumeBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    resumeRealmsSession();
    playSound('select');
  });

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'w-full bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition';
  retryBtn.textContent = '🔄 إعادة المحاولة';
  retryBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    retryRealmsSession();
    playSound('select');
    renderNinjaGuardian(ninjaState.containerEl, ninjaState.onWorldComplete, ninjaState.onReturnToWorlds);
  });

  const quitBtn = document.createElement('button');
  quitBtn.type = 'button';
  quitBtn.className = 'w-full bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-900/60 font-semibold py-2.5 px-4 rounded-xl text-sm transition';
  quitBtn.textContent = '🚪 العودة لاختيار الأكوان';
  quitBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    playSound('select');
    if (ninjaState.onReturnToWorlds) ninjaState.onReturnToWorlds();
  });

  card.appendChild(title);
  card.appendChild(resumeBtn);
  card.appendChild(retryBtn);
  card.appendChild(quitBtn);

  modalLayer.appendChild(card);
}
