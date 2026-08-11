import { realmsState, getCurrentQuestion, submitRealmsAnswer, nextRealmsQuestion, pauseRealmsSession, resumeRealmsSession, retryRealmsSession } from '../realmsSession.js';
import { playSound } from '../../services/audioService.js';
import { triggerConfetti, triggerXpPopup } from '../../services/effectsService.js';

let racerState = {
  currentLane: 1, // 0: Far Right (A), 1: Center-Right (B), 2: Center-Left (C), 3: Far Left (D)
  totalLanes: 4,
  vehicleY: 280,
  gateZ: 0, // Distance to upcoming gate (0 to 100)
  speed: 0.8,
  baseSpeed: 0.8,
  slowMode: false, // Accessibility slow-track reading mode
  animFrameId: null,
  keyboardListener: null,
  containerEl: null,
  onWorldComplete: null,
  onReturnToWorlds: null,
  isProcessingGate: false
};

export function renderCosmicRacer(containerEl, onWorldComplete, onReturnToWorlds) {
  if (!containerEl) return;
  containerEl.replaceChildren();

  racerState.containerEl = containerEl;
  racerState.onWorldComplete = onWorldComplete;
  racerState.onReturnToWorlds = onReturnToWorlds;
  racerState.isProcessingGate = false;

  resetCosmicRacerState();

  const wrapper = document.createElement('div');
  wrapper.className = 'w-full max-w-4xl mx-auto space-y-4 bg-slate-900/95 border border-amber-900/50 rounded-2xl p-4 md:p-6 shadow-2xl transition-all duration-300 relative selection:bg-none';

  // HUD Header
  const hud = renderRacerHUD();
  wrapper.appendChild(hud);

  // Main Grid Layout: Side Question Panel + 3D-effect Track Canvas
  const gameBody = document.createElement('div');
  gameBody.className = 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start';

  // Question Panel (5 cols)
  const qPanel = renderRacerQuestionPanel();
  qPanel.className = 'lg:col-span-5 space-y-3';

  // Track Canvas & Controls (7 cols)
  const canvasArea = document.createElement('div');
  canvasArea.className = 'lg:col-span-7 flex flex-col items-center justify-center space-y-3';

  const canvas = document.createElement('canvas');
  canvas.id = 'racer-canvas';
  canvas.width = 540;
  canvas.height = 360;
  canvas.className = 'bg-slate-950 border-2 border-amber-800/80 rounded-2xl shadow-xl touch-none w-full max-w-[540px] aspect-[3/2]';

  canvasArea.appendChild(canvas);

  // Lane Switch Touch Controls
  const controls = renderRacerControls();
  canvasArea.appendChild(controls);

  gameBody.appendChild(qPanel);
  gameBody.appendChild(canvasArea);
  wrapper.appendChild(gameBody);

  // Modal Layer
  const modalLayer = document.createElement('div');
  modalLayer.id = 'racer-modal-layer';
  modalLayer.className = 'hidden absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4 rounded-2xl';
  wrapper.appendChild(modalLayer);

  containerEl.appendChild(wrapper);

  setupRacerKeyboardControls();
  startRacerCanvasLoop(canvas);
}

function resetCosmicRacerState() {
  racerState.currentLane = 1;
  racerState.gateZ = 0;
  racerState.speed = racerState.slowMode ? 0.3 : racerState.baseSpeed;
  racerState.isProcessingGate = false;
}

// HUD Header
function renderRacerHUD() {
  const hud = document.createElement('div');
  hud.className = 'flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3 text-xs font-bold';

  const leftStats = document.createElement('div');
  leftStats.className = 'flex items-center gap-2 flex-wrap';

  const worldBadge = document.createElement('span');
  worldBadge.className = 'bg-amber-950 text-amber-300 border border-amber-700/60 px-3 py-1 rounded-full flex items-center gap-1.5';
  worldBadge.innerHTML = `<span>🏎️</span> <span>سباق المجرات</span>`;

  const qBadge = document.createElement('span');
  qBadge.className = 'bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full';
  qBadge.textContent = `السؤال ${realmsState.currentQuestionIndex + 1} من ${realmsState.questions.length}`;

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

  const rightActions = document.createElement('div');
  rightActions.className = 'flex items-center gap-2';

  // Accessibility: Slow Track Toggle
  const slowModeBtn = document.createElement('button');
  slowModeBtn.type = 'button';
  slowModeBtn.className = `px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1 ${
    racerState.slowMode
      ? 'bg-amber-950 text-amber-300 border-amber-700'
      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
  }`;
  slowModeBtn.title = 'إبطاء سرعة السباق لقراءة مريحة';
  slowModeBtn.innerHTML = `<span>⏱️</span> <span class="hidden sm:inline">${racerState.slowMode ? 'السباق الهادئ: مفعّل' : 'إبطاء السباق'}</span>`;
  slowModeBtn.addEventListener('click', () => {
    racerState.slowMode = !racerState.slowMode;
    racerState.speed = racerState.slowMode ? 0.3 : racerState.baseSpeed;
    playSound('select');
    renderCosmicRacer(racerState.containerEl, racerState.onWorldComplete, racerState.onReturnToWorlds);
  });

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1';
  pauseBtn.innerHTML = `<span>⏸️</span> <span class="hidden sm:inline">إيقاف</span>`;
  pauseBtn.addEventListener('click', () => {
    playSound('select');
    showRacerPauseModal();
  });

  rightActions.appendChild(slowModeBtn);
  rightActions.appendChild(pauseBtn);

  hud.appendChild(leftStats);
  hud.appendChild(rightActions);

  return hud;
}

// Side Question Panel
function renderRacerQuestionPanel() {
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
  qBadge.textContent = `🏎️ سؤال سباق المجرات #${realmsState.currentQuestionIndex + 1}`;

  const instr = document.createElement('span');
  instr.className = 'text-[10px] text-slate-400 font-semibold';
  instr.textContent = 'انتقل إلى مسار بوابات الخيار الصحيح ⚡';

  qHeader.appendChild(qBadge);
  qHeader.appendChild(instr);

  const qText = document.createElement('h4');
  qText.className = 'text-sm font-bold text-slate-100 leading-relaxed';
  qText.textContent = currentQ.question;

  qCard.appendChild(qHeader);
  qCard.appendChild(qText);

  // List choices with matching lane colors
  const laneColors = ['#c026d3', '#0284c7', '#d97706', '#059669'];
  const laneBadges = ['△ (مسار 1)', '○ (مسار 2)', '✕ (مسار 3)', '□ (مسار 4)'];

  const choicesList = document.createElement('div');
  choicesList.className = 'space-y-2 pt-1';

  currentQ.choices.forEach((choice, idx) => {
    const color = laneColors[idx % 4];

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

    // Direct Lane Switch Button
    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.className = 'text-[10px] bg-amber-600 hover:bg-amber-500 text-white font-bold px-2 py-1 rounded-lg transition';
    switchBtn.textContent = `مسار ${idx + 1} 🏎️`;
    switchBtn.addEventListener('click', () => {
      switchLaneTo(idx);
    });
    choiceRow.appendChild(switchBtn);

    choicesList.appendChild(choiceRow);
  });

  qCard.appendChild(choicesList);
  return qCard;
}

// Touch Lane Switch Controls Overlay
function renderRacerControls() {
  const container = document.createElement('div');
  container.className = 'flex items-center justify-between gap-3 w-full max-w-[540px]';

  const leftLaneBtn = document.createElement('button');
  leftLaneBtn.type = 'button';
  leftLaneBtn.className = 'flex-grow h-12 bg-slate-800 hover:bg-amber-900 border border-slate-700 rounded-xl text-sm font-bold text-amber-200 flex items-center justify-center gap-1.5 shadow-md active:scale-95';
  leftLaneBtn.innerHTML = `<span>◀️ الانتقال للمسار الأيسر</span>`;
  leftLaneBtn.addEventListener('click', () => {
    switchLaneRelative(1);
  });

  const rightLaneBtn = document.createElement('button');
  rightLaneBtn.type = 'button';
  rightLaneBtn.className = 'flex-grow h-12 bg-slate-800 hover:bg-amber-900 border border-slate-700 rounded-xl text-sm font-bold text-amber-200 flex items-center justify-center gap-1.5 shadow-md active:scale-95';
  rightLaneBtn.innerHTML = `<span>الانتقال للمسار الأيمن ▶️</span>`;
  rightLaneBtn.addEventListener('click', () => {
    switchLaneRelative(-1);
  });

  container.appendChild(rightLaneBtn);
  container.appendChild(leftLaneBtn);

  return container;
}

export function switchLaneTo(laneIndex) {
  if (realmsState.sessionStatus !== 'playing') return;
  if (laneIndex >= 0 && laneIndex < 4) {
    racerState.currentLane = laneIndex;
    playSound('select');
  }
}

export function switchLaneRelative(dir) {
  if (realmsState.sessionStatus !== 'playing') return;
  const newLane = racerState.currentLane + dir;
  if (newLane >= 0 && newLane < 4) {
    racerState.currentLane = newLane;
    playSound('select');
  }
}

// Keyboard Controls
function setupRacerKeyboardControls() {
  if (racerState.keyboardListener) {
    document.removeEventListener('keydown', racerState.keyboardListener);
  }

  racerState.keyboardListener = (e) => {
    if (realmsState.sessionStatus !== 'playing') return;

    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      showRacerPauseModal();
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      switchLaneRelative(-1); // Right lane in 3D perspective
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      switchLaneRelative(1); // Left lane in 3D perspective
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      switchLaneTo(parseInt(e.key) - 1);
    }
  };

  document.addEventListener('keydown', racerState.keyboardListener);
}

// Canvas Game Render Loop
function startRacerCanvasLoop(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function loop() {
    if (document.getElementById('racer-canvas')) {
      updateRacerLogic();
      renderRacerCanvas(ctx, canvas);
      racerState.animFrameId = requestAnimationFrame(loop);
    }
  }

  if (racerState.animFrameId) cancelAnimationFrame(racerState.animFrameId);
  racerState.animFrameId = requestAnimationFrame(loop);
}

function updateRacerLogic() {
  if (realmsState.sessionStatus !== 'playing') return;

  racerState.gateZ += racerState.speed;

  // When approaching gate threshold (gateZ >= 90)
  if (racerState.gateZ >= 90 && !racerState.isProcessingGate) {
    racerState.isProcessingGate = true;
    handleGateEntry(racerState.currentLane);
  }
}

// Gate Entry Logic
function handleGateEntry(laneIndex) {
  const currentQ = getCurrentQuestion();
  if (!currentQ || !currentQ.choices[laneIndex]) return;

  const choiceId = currentQ.choices[laneIndex].id;
  const evalResult = submitRealmsAnswer(choiceId);

  if (evalResult.isCorrect) {
    playSound('correct');
    triggerConfetti({ count: 50 });
    const canvasEl = typeof document !== 'undefined' ? document.getElementById('racer-canvas') : null;
    if (canvasEl) triggerXpPopup(`+${evalResult.earnedXp} XP`, canvasEl);


    showRacerModal({
      type: 'correct',
      title: '⚡ سرعة فائقة وإجابة صحيحة!',
      subtitle: `كسبت +${evalResult.earnedXp} XP (مضاعف Combo x${Math.min(realmsState.combo, 4)})`,
      explanation: evalResult.explanation,
      isFinished: evalResult.isFinished
    });

  } else {
    playSound('incorrect');

    showRacerModal({
      type: 'wrong',
      title: evalResult.isGameOver ? '💔 نفدت طاقة المركبة!' : '⚠️ اصطدام بالبوابة الخاطئة! (فقدان 1 طاقة)',
      subtitle: evalResult.isGameOver ? 'يمكنك مراجعة المفاهيم وإعادة السباق' : 'تم تيسير سرعة المركبة لتجربة مسار آخر',
      explanation: evalResult.explanation,
      isGameOver: evalResult.isGameOver
    });
  }
}

// 3D Perspective Track Painting
function renderRacerCanvas(ctx, canvas) {
  const now = Date.now();
  const w = canvas.width;
  const h = canvas.height;

  // Clear Cyberpunk Starry Background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, w, h);

  // Perspective Vanishing Point
  const vpX = w / 2;
  const vpY = 80;

  // 1. Draw 4 Track Lanes
  const laneColors = ['#c026d3', '#0284c7', '#d97706', '#059669'];
  const bottomX = [40, 160, 280, 400, 520];

  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(vpX + (i - 2) * 20, vpY);
    ctx.lineTo(bottomX[i], h);
    ctx.lineTo(bottomX[i + 1], h);
    ctx.lineTo(vpX + (i - 1) * 20, vpY);
    ctx.closePath();

    ctx.fillStyle = `${laneColors[i]}18`;
    ctx.fill();

    ctx.strokeStyle = `${laneColors[i]}66`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 2. Draw Approaching Overhead Answer Gates
  const zProgress = (racerState.gateZ % 100) / 100;
  const gateY = vpY + (h - vpY) * zProgress;
  const scale = 0.2 + zProgress * 0.8;

  for (let i = 0; i < 4; i++) {
    const laneCenterX = vpX + (i - 1.5) * (40 + zProgress * 90);
    const gateW = 35 * scale;
    const gateH = 45 * scale;

    ctx.fillStyle = laneColors[i];
    ctx.fillRect(laneCenterX - gateW / 2, gateY - gateH, gateW, gateH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(laneCenterX - gateW / 2, gateY - gateH, gateW, gateH);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10, 14 * scale)}px Cairo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(['أ', 'ب', 'ج', 'د'][i], laneCenterX, gateY - gateH / 2);
  }

  // 3. Draw Hover Racer Vehicle in Active Lane
  const laneVehicleX = [100, 220, 340, 440][racerState.currentLane];
  const vehicleY = 280;

  // Hover Glow Aura
  ctx.beginPath();
  ctx.arc(laneVehicleX, vehicleY + 10, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b44';
  ctx.fill();

  // Hover Vehicle Sprite
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(laneVehicleX, vehicleY - 18);
  ctx.lineTo(laneVehicleX - 20, vehicleY + 16);
  ctx.lineTo(laneVehicleX + 20, vehicleY + 16);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Thruster Light Flame
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(laneVehicleX, vehicleY + 18, 6 + Math.sin(now / 50) * 2, 0, Math.PI * 2);
  ctx.fill();
}

// Modal Layer Renderers
function showRacerModal({ type, title, subtitle, explanation, isFinished = false, isGameOver = false }) {
  if (typeof document === 'undefined') return;
  const modalLayer = document.getElementById('racer-modal-layer');
  if (!modalLayer) return;


  modalLayer.replaceChildren();
  modalLayer.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-amber-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-center shadow-2xl animate-fade-in';

  const icon = document.createElement('div');
  icon.className = 'text-4xl animate-bounce';
  icon.textContent = type === 'correct' ? '🏆' : (isGameOver ? '💔' : '⚠️');

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
      if (racerState.onWorldComplete) racerState.onWorldComplete();
    } else if (isGameOver) {
      retryRealmsSession();
      renderCosmicRacer(racerState.containerEl, racerState.onWorldComplete, racerState.onReturnToWorlds);
    } else if (type === 'correct') {
      nextRealmsQuestion();
      renderCosmicRacer(racerState.containerEl, racerState.onWorldComplete, racerState.onReturnToWorlds);
    } else {
      renderCosmicRacer(racerState.containerEl, racerState.onWorldComplete, racerState.onReturnToWorlds);
    }
  });

  card.appendChild(icon);
  card.appendChild(titleEl);
  card.appendChild(subEl);
  card.appendChild(expBox);
  card.appendChild(btn);

  modalLayer.appendChild(card);
}

function showRacerPauseModal() {
  pauseRealmsSession();
  const modalLayer = document.getElementById('racer-modal-layer');
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
    renderCosmicRacer(racerState.containerEl, racerState.onWorldComplete, racerState.onReturnToWorlds);
  });

  const quitBtn = document.createElement('button');
  quitBtn.type = 'button';
  quitBtn.className = 'w-full bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-900/60 font-semibold py-2.5 px-4 rounded-xl text-sm transition';
  quitBtn.textContent = '🚪 العودة لاختيار الأكوان';
  quitBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    playSound('select');
    if (racerState.onReturnToWorlds) racerState.onReturnToWorlds();
  });

  card.appendChild(title);
  card.appendChild(resumeBtn);
  card.appendChild(retryBtn);
  card.appendChild(quitBtn);

  modalLayer.appendChild(card);
}
