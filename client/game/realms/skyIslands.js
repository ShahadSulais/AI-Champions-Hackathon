import { realmsState, getCurrentQuestion, submitRealmsAnswer, nextRealmsQuestion, pauseRealmsSession, resumeRealmsSession, retryRealmsSession } from '../realmsSession.js';
import { playSound } from '../../services/audioService.js';
import { triggerConfetti, triggerXpPopup } from '../../services/effectsService.js';

let skyState = {
  hero: { x: 80, y: 250, vx: 0, vy: 0, isGrounded: true, width: 32, height: 32 },
  checkpoint: { x: 50, y: 280, width: 120, height: 24 },
  platforms: [],
  gravity: 0.45,
  jumpForce: -10.5,
  moveSpeed: 3.8,
  tapMode: false, // Accessibility: Direct tap-the-answer jump mode
  animFrameId: null,
  keyboardListener: null,
  containerEl: null,
  onWorldComplete: null,
  onReturnToWorlds: null,
  isProcessingLanding: false
};

export function renderSkyIslands(containerEl, onWorldComplete, onReturnToWorlds) {
  if (!containerEl) return;
  containerEl.replaceChildren();

  skyState.containerEl = containerEl;
  skyState.onWorldComplete = onWorldComplete;
  skyState.onReturnToWorlds = onReturnToWorlds;
  skyState.isProcessingLanding = false;

  resetSkyIslandsState();

  const wrapper = document.createElement('div');
  wrapper.className = 'w-full max-w-4xl mx-auto space-y-4 bg-slate-900/95 border border-sky-900/50 rounded-2xl p-4 md:p-6 shadow-2xl transition-all duration-300 relative selection:bg-none';

  // HUD Header Bar
  const hud = renderSkyHUD();
  wrapper.appendChild(hud);

  // Main Layout Grid: Side Question Panel + Canvas Area
  const gameBody = document.createElement('div');
  gameBody.className = 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start';

  // Question Panel (5 cols)
  const qPanel = renderSkyQuestionPanel();
  qPanel.className = 'lg:col-span-5 space-y-3';

  // Canvas & Platform Controls (7 cols)
  const canvasArea = document.createElement('div');
  canvasArea.className = 'lg:col-span-7 flex flex-col items-center justify-center space-y-3';

  const canvas = document.createElement('canvas');
  canvas.id = 'sky-canvas';
  canvas.width = 540;
  canvas.height = 360;
  canvas.className = 'bg-gradient-to-b from-sky-950 via-indigo-950 to-slate-950 border-2 border-sky-800/80 rounded-2xl shadow-xl touch-none w-full max-w-[540px] aspect-[3/2]';

  canvasArea.appendChild(canvas);

  // Platform Controls (Jump / Left / Right + Tap-to-Answer direct buttons)
  const controls = renderSkyControls();
  canvasArea.appendChild(controls);

  gameBody.appendChild(qPanel);
  gameBody.appendChild(canvasArea);
  wrapper.appendChild(gameBody);

  // Modal Layer
  const modalLayer = document.createElement('div');
  modalLayer.id = 'sky-modal-layer';
  modalLayer.className = 'hidden absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4 rounded-2xl';
  wrapper.appendChild(modalLayer);

  containerEl.appendChild(wrapper);

  setupSkyKeyboardControls();
  startSkyCanvasLoop(canvas);
}

function resetSkyIslandsState() {
  skyState.hero = { x: 80, y: 230, vx: 0, vy: 0, isGrounded: true, width: 32, height: 32 };
  skyState.checkpoint = { x: 40, y: 260, width: 110, height: 24 };
  skyState.isProcessingLanding = false;

  const currentQ = getCurrentQuestion();
  const choicesCount = (currentQ && currentQ.choices) ? currentQ.choices.length : 4;

  // Generate 3 or 4 answer platforms evenly spaced horizontally
  skyState.platforms = [];
  const startX = 180;
  const gapX = 85;

  for (let i = 0; i < choicesCount; i++) {
    skyState.platforms.push({
      index: i,
      x: startX + i * gapX,
      y: 220 + (i % 2 === 0 ? 0 : 35),
      width: 74,
      height: 22,
      state: 'normal', // 'normal' | 'correct' | 'shake'
      badge: ['△', '○', '✕', '□'][i % 4],
      color: ['#c026d3', '#0284c7', '#d97706', '#059669'][i % 4]
    });
  }
}

// HUD Header
function renderSkyHUD() {
  const hud = document.createElement('div');
  hud.className = 'flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3 text-xs font-bold';

  const leftStats = document.createElement('div');
  leftStats.className = 'flex items-center gap-2 flex-wrap';

  const worldBadge = document.createElement('span');
  worldBadge.className = 'bg-sky-950 text-sky-300 border border-sky-700/60 px-3 py-1 rounded-full flex items-center gap-1.5';
  worldBadge.innerHTML = `<span>☁️</span> <span>جزر السماء</span>`;

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

  // Accessibility: Direct Tap Jump Toggle
  const tapToggleBtn = document.createElement('button');
  tapToggleBtn.type = 'button';
  tapToggleBtn.className = `px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1 ${
    skyState.tapMode
      ? 'bg-sky-950 text-sky-300 border-sky-700'
      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
  }`;
  tapToggleBtn.title = 'نمط القفز المباشر بالإشعارات (Tap-to-Land Accessibility)';
  tapToggleBtn.innerHTML = `<span>🎯</span> <span class="hidden sm:inline">${skyState.tapMode ? 'القفز المباشر: مفعّل' : 'قفز مباشر'}</span>`;
  tapToggleBtn.addEventListener('click', () => {
    skyState.tapMode = !skyState.tapMode;
    playSound('select');
    renderSkyIslands(skyState.containerEl, skyState.onWorldComplete, skyState.onReturnToWorlds);
  });

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'bg-slate-800 hover:bg-slate-700 text-sky-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1';
  pauseBtn.innerHTML = `<span>⏸️</span> <span class="hidden sm:inline">إيقاف</span>`;
  pauseBtn.addEventListener('click', () => {
    playSound('select');
    showSkyPauseModal();
  });

  rightActions.appendChild(tapToggleBtn);
  rightActions.appendChild(pauseBtn);

  hud.appendChild(leftStats);
  hud.appendChild(rightActions);

  return hud;
}

// Side Question Panel
function renderSkyQuestionPanel() {
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
  qBadge.className = 'text-[11px] font-bold text-sky-300 bg-sky-950 px-2.5 py-0.5 rounded border border-sky-800';
  qBadge.textContent = `🎯 سؤال جزر السماء #${realmsState.currentQuestionIndex + 1}`;

  const instr = document.createElement('span');
  instr.className = 'text-[10px] text-slate-400 font-semibold';
  instr.textContent = 'اقفز واهبط فوق جزيرة الخيار الصحيح ☁️';

  qHeader.appendChild(qBadge);
  qHeader.appendChild(instr);

  const qText = document.createElement('h4');
  qText.className = 'text-sm font-bold text-slate-100 leading-relaxed';
  qText.textContent = currentQ.question;

  qCard.appendChild(qHeader);
  qCard.appendChild(qText);

  // List of answer choices matching platform colors
  const choicesList = document.createElement('div');
  choicesList.className = 'space-y-2 pt-1';

  currentQ.choices.forEach((choice, idx) => {
    const plat = skyState.platforms[idx] || { badge: '?', color: '#38bdf8' };

    const choiceRow = document.createElement('div');
    choiceRow.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs font-semibold text-slate-200';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'flex items-center gap-2';

    const badge = document.createElement('span');
    badge.className = 'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0';
    badge.style.backgroundColor = plat.color;
    badge.textContent = plat.badge;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'leading-relaxed text-[12px]';
    labelSpan.textContent = choice.text;

    leftGroup.appendChild(badge);
    leftGroup.appendChild(labelSpan);
    choiceRow.appendChild(leftGroup);

    // If Accessibility Tap Mode is active, enable direct landing buttons
    if (skyState.tapMode) {
      const tapBtn = document.createElement('button');
      tapBtn.type = 'button';
      tapBtn.className = 'text-[10px] bg-sky-600 hover:bg-sky-500 text-white font-bold px-2 py-1 rounded-lg transition';
      tapBtn.textContent = 'قفز مباشر 🎯';
      tapBtn.addEventListener('click', () => {
        triggerDirectPlatformJump(idx);
      });
      choiceRow.appendChild(tapBtn);
    }

    choicesList.appendChild(choiceRow);
  });

  qCard.appendChild(choicesList);
  return qCard;
}

// Touch & Platform Jump Controls Overlay
function renderSkyControls() {
  const container = document.createElement('div');
  container.className = 'flex flex-wrap items-center justify-center gap-3 w-full max-w-[540px]';

  // Left/Right Movement Buttons
  const moveGroup = document.createElement('div');
  moveGroup.className = 'flex items-center gap-2';

  const leftBtn = document.createElement('button');
  leftBtn.type = 'button';
  leftBtn.className = 'w-12 h-11 bg-slate-800 hover:bg-sky-900 border border-slate-700 rounded-xl text-lg font-bold text-sky-200 flex items-center justify-center active:scale-95 shadow-md';
  leftBtn.textContent = '⬅️';
  leftBtn.setAttribute('aria-label', 'تحريك لليسار');
  leftBtn.addEventListener('click', () => {
    skyState.hero.x = Math.max(20, skyState.hero.x - 30);
  });

  const rightBtn = document.createElement('button');
  rightBtn.type = 'button';
  rightBtn.className = 'w-12 h-11 bg-slate-800 hover:bg-sky-900 border border-slate-700 rounded-xl text-lg font-bold text-sky-200 flex items-center justify-center active:scale-95 shadow-md';
  rightBtn.textContent = '➡️';
  rightBtn.setAttribute('aria-label', 'تحريك لليمين');
  rightBtn.addEventListener('click', () => {
    skyState.hero.x = Math.min(480, skyState.hero.x + 30);
  });

  moveGroup.appendChild(leftBtn);
  moveGroup.appendChild(rightBtn);

  // Jump Button
  const jumpBtn = document.createElement('button');
  jumpBtn.type = 'button';
  jumpBtn.className = 'flex-grow max-w-[200px] h-11 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95';
  jumpBtn.innerHTML = `<span>قفز بالجو</span> <span>🦘</span>`;
  jumpBtn.addEventListener('click', () => {
    triggerHeroJump();
  });

  container.appendChild(moveGroup);
  container.appendChild(jumpBtn);

  return container;
}

export function triggerHeroJump() {
  if (realmsState.sessionStatus !== 'playing') return;
  if (skyState.hero.isGrounded) {
    skyState.hero.vy = skyState.jumpForce;
    skyState.hero.isGrounded = false;
    playSound('select');
  }
}

// Accessibility Direct Jump Trigger
export function triggerDirectPlatformJump(platformIndex) {
  const targetPlat = skyState.platforms[platformIndex];
  if (!targetPlat || realmsState.sessionStatus !== 'playing') return;

  skyState.hero.x = targetPlat.x + targetPlat.width / 2 - skyState.hero.width / 2;
  skyState.hero.y = targetPlat.y - skyState.hero.height;
  skyState.hero.vy = 0;
  skyState.hero.isGrounded = true;

  handlePlatformLanding(platformIndex);
}

// Keyboard Controls
function setupSkyKeyboardControls() {
  if (skyState.keyboardListener) {
    document.removeEventListener('keydown', skyState.keyboardListener);
  }

  skyState.keyboardListener = (e) => {
    if (realmsState.sessionStatus !== 'playing') return;

    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      showSkyPauseModal();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      triggerHeroJump();
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      skyState.hero.x = Math.max(20, skyState.hero.x - 22);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      skyState.hero.x = Math.min(480, skyState.hero.x + 22);
    }
  };

  document.addEventListener('keydown', skyState.keyboardListener);
}

// Physics Loop
function startSkyCanvasLoop(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function loop() {
    if (document.getElementById('sky-canvas')) {
      updateSkyPhysics();
      renderSkyCanvas(ctx, canvas);
      skyState.animFrameId = requestAnimationFrame(loop);
    }
  }

  if (skyState.animFrameId) cancelAnimationFrame(skyState.animFrameId);
  skyState.animFrameId = requestAnimationFrame(loop);
}

function updateSkyPhysics() {
  if (realmsState.sessionStatus !== 'playing') return;

  const hero = skyState.hero;

  // Apply Gravity
  hero.vy += skyState.gravity;
  hero.y += hero.vy;

  let groundedThisFrame = false;

  // Check collision with Start Checkpoint Island
  const cp = skyState.checkpoint;
  if (
    hero.x + hero.width > cp.x &&
    hero.x < cp.x + cp.width &&
    hero.y + hero.height >= cp.y &&
    hero.y + hero.height <= cp.y + 12 &&
    hero.vy >= 0
  ) {
    hero.y = cp.y - hero.height;
    hero.vy = 0;
    hero.isGrounded = true;
    groundedThisFrame = true;
  }

  // Check collision with Answer Platforms
  skyState.platforms.forEach((plat, idx) => {
    if (
      hero.x + hero.width > plat.x &&
      hero.x < plat.x + plat.width &&
      hero.y + hero.height >= plat.y &&
      hero.y + hero.height <= plat.y + 12 &&
      hero.vy >= 0
    ) {
      hero.y = plat.y - hero.height;
      hero.vy = 0;
      hero.isGrounded = true;
      groundedThisFrame = true;

      if (!skyState.isProcessingLanding) {
        handlePlatformLanding(idx);
      }
    }
  });

  if (!groundedThisFrame && hero.y < 300) {
    hero.isGrounded = false;
  }

  // Safety Trampoline (no lethal falls)
  if (hero.y > 330) {
    hero.x = cp.x + cp.width / 2 - hero.width / 2;
    hero.y = cp.y - hero.height;
    hero.vy = 0;
    hero.isGrounded = true;
  }
}

// Platform Landing Evaluation
function handlePlatformLanding(platformIndex) {
  skyState.isProcessingLanding = true;

  const currentQ = getCurrentQuestion();
  if (!currentQ || !currentQ.choices[platformIndex]) return;

  const choiceId = currentQ.choices[platformIndex].id;
  const evalResult = submitRealmsAnswer(choiceId);

  if (evalResult.isCorrect) {
    playSound('correct');
    triggerConfetti({ count: 45 });
    const canvasEl = typeof document !== 'undefined' ? document.getElementById('sky-canvas') : null;
    if (canvasEl) triggerXpPopup(`+${evalResult.earnedXp} XP`, canvasEl);


    showSkyModal({
      type: 'correct',
      title: '✅ هبوط صحيحة فوق الجزيرة!',
      subtitle: `كسبت +${evalResult.earnedXp} XP (مضاعف Combo x${Math.min(realmsState.combo, 4)})`,
      explanation: evalResult.explanation,
      isFinished: evalResult.isFinished
    });

  } else {
    playSound('incorrect');

    // Shake platform visual
    const targetPlat = skyState.platforms[platformIndex];
    if (targetPlat) targetPlat.state = 'shake';

    showSkyModal({
      type: 'wrong',
      title: evalResult.isGameOver ? '💔 نفدت طاقة المحاولات!' : '⚠️ المنصة اهتزت وسقطت! (فقدان 1 طاقة)',
      subtitle: evalResult.isGameOver ? 'يمكنك مراجعة المفاهيم وإعادة المحاولة' : 'تمت إعادتك لمنصة البداية بأمان لتجربة منصة أخرى',
      explanation: evalResult.explanation,
      isGameOver: evalResult.isGameOver
    });
  }
}

// Canvas Painting Logic
function renderSkyCanvas(ctx, canvas) {
  const now = Date.now();

  // Clear Sky Canvas Background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Cloud Ornaments
  ctx.fillStyle = '#ffffff11';
  ctx.beginPath();
  ctx.arc(100, 80, 40, 0, Math.PI * 2);
  ctx.arc(140, 80, 55, 0, Math.PI * 2);
  ctx.arc(380, 60, 45, 0, Math.PI * 2);
  ctx.arc(420, 60, 60, 0, Math.PI * 2);
  ctx.fill();

  // Draw Start Checkpoint Cloud Platform
  const cp = skyState.checkpoint;
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(cp.x, cp.y, cp.width, cp.height);
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 2;
  ctx.strokeRect(cp.x + 1, cp.y + 1, cp.width - 2, cp.height - 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('☁️ المنصة الآمنة', cp.x + cp.width / 2, cp.y + 16);

  // Draw Answer Platforms
  skyState.platforms.forEach(plat => {
    let px = plat.x;
    let py = plat.y;

    if (plat.state === 'shake') {
      px += Math.sin(now / 30) * 4;
    }

    ctx.fillStyle = plat.color;
    ctx.fillRect(px, py, plat.width, plat.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, plat.width - 2, plat.height - 2);

    // Platform Badge Symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(plat.badge, px + plat.width / 2, py + 16);
  });

  // Draw Hero "حارس النور"
  const hero = skyState.hero;
  const hcx = hero.x + hero.width / 2;
  const hcy = hero.y + hero.height / 2;

  const pulse = Math.sin(now / 150) * 3;
  ctx.beginPath();
  ctx.arc(hcx, hcy, 18 + pulse, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf844';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(hcx, hcy, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#0284c7';
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✨', hcx, hcy);
}

// Modal Layer Renderers
function showSkyModal({ type, title, subtitle, explanation, isFinished = false, isGameOver = false }) {
  if (typeof document === 'undefined') return;
  const modalLayer = document.getElementById('sky-modal-layer');
  if (!modalLayer) return;


  modalLayer.replaceChildren();
  modalLayer.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-sky-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-center shadow-2xl animate-fade-in';

  const icon = document.createElement('div');
  icon.className = 'text-4xl animate-bounce';
  icon.textContent = type === 'correct' ? '🏆' : (isGameOver ? '💔' : '⚠️');

  const titleEl = document.createElement('h3');
  titleEl.className = 'text-xl font-bold text-white';
  titleEl.textContent = title;

  const subEl = document.createElement('p');
  subEl.className = 'text-xs text-sky-200 font-semibold';
  subEl.textContent = subtitle;

  const expBox = document.createElement('div');
  expBox.className = 'bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed text-right space-y-1';
  expBox.innerHTML = `
    <strong class="text-sky-300 block mb-1">📌 الشرح المفاهيمي:</strong>
    <p>${explanation || 'تفسير دقيق لناتج التحدي.'}</p>
  `;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = type === 'correct'
    ? 'w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm'
    : 'w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm';

  btn.textContent = isFinished
    ? 'إكمال العالم وعرض النتيجة 🏆'
    : (isGameOver ? 'إعادة محاولة العالم 🔄' : 'المتابعة للتحدي التالي ➔');

  btn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    playSound('select');

    if (isFinished) {
      realmsState.sessionStatus = 'success';
      if (skyState.onWorldComplete) skyState.onWorldComplete();
    } else if (isGameOver) {
      retryRealmsSession();
      renderSkyIslands(skyState.containerEl, skyState.onWorldComplete, skyState.onReturnToWorlds);
    } else if (type === 'correct') {
      nextRealmsQuestion();
      renderSkyIslands(skyState.containerEl, skyState.onWorldComplete, skyState.onReturnToWorlds);
    } else {
      renderSkyIslands(skyState.containerEl, skyState.onWorldComplete, skyState.onReturnToWorlds);
    }
  });

  card.appendChild(icon);
  card.appendChild(titleEl);
  card.appendChild(subEl);
  card.appendChild(expBox);
  card.appendChild(btn);

  modalLayer.appendChild(card);
}

function showSkyPauseModal() {
  pauseRealmsSession();
  const modalLayer = document.getElementById('sky-modal-layer');
  if (!modalLayer) return;

  modalLayer.replaceChildren();
  modalLayer.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-sky-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center shadow-2xl';

  const title = document.createElement('h3');
  title.className = 'text-xl font-bold text-white';
  title.textContent = '⏸️ اللعب متوقف مؤقتاً';

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.className = 'w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition';
  resumeBtn.textContent = '▶️ استئناف اللعب';
  resumeBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    resumeRealmsSession();
    playSound('select');
  });

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'w-full bg-slate-800 hover:bg-slate-700 text-sky-200 border border-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition';
  retryBtn.textContent = '🔄 إعادة المحاولة';
  retryBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    retryRealmsSession();
    playSound('select');
    renderSkyIslands(skyState.containerEl, skyState.onWorldComplete, skyState.onReturnToWorlds);
  });

  const quitBtn = document.createElement('button');
  quitBtn.type = 'button';
  quitBtn.className = 'w-full bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-900/60 font-semibold py-2.5 px-4 rounded-xl text-sm transition';
  quitBtn.textContent = '🚪 العودة لاختيار الأكوان';
  quitBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    playSound('select');
    if (skyState.onReturnToWorlds) skyState.onReturnToWorlds();
  });

  card.appendChild(title);
  card.appendChild(resumeBtn);
  card.appendChild(retryBtn);
  card.appendChild(quitBtn);

  modalLayer.appendChild(card);
}
