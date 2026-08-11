import { realmsState, getCurrentQuestion, submitRealmsAnswer, nextRealmsQuestion, pauseRealmsSession, resumeRealmsSession, retryRealmsSession } from '../realmsSession.js';
import { playSound } from '../../services/audioService.js';
import { triggerConfetti, triggerXpPopup } from '../../services/effectsService.js';

// Maze Grid Configuration: 13 Columns x 11 Rows
// 1 = Wall, 0 = Path, 2 = Hero Checkpoint, 3 = Gate A, 4 = Gate B, 5 = Gate C, 6 = Gate D
export const MAZE_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 0, 1, 0, 0, 0, 1, 0, 0, 4, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 5, 0, 0, 1, 0, 0, 0, 1, 0, 0, 6, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

export const GATE_MAPPINGS = {
  3: { choiceIndex: 0, label: 'أ', badge: '△', color: '#c026d3' },
  4: { choiceIndex: 1, label: 'ب', badge: '○', color: '#0284c7' },
  5: { choiceIndex: 2, label: 'ج', badge: '✕', color: '#d97706' },
  6: { choiceIndex: 3, label: 'د', badge: '□', color: '#059669' }
};

let mazeState = {
  hero: { col: 5, row: 5, targetCol: 5, targetRow: 5, x: 5, y: 5 },
  enemies: [
    { col: 1, row: 3, dirCol: 1, dirRow: 0, speed: 0.035, x: 1, y: 3 },
    { col: 11, row: 7, dirCol: -1, dirRow: 0, speed: 0.035, x: 11, y: 7 }
  ],
  invulnerableUntil: 0,
  readMode: false, // Accessibility option: pause movement while reading
  reducedMotion: false,
  animFrameId: null,
  keyboardListener: null,
  containerEl: null,
  onWorldComplete: null,
  onReturnToWorlds: null,
  feedbackMessage: null
};

export function renderKnowledgeMaze(containerEl, onWorldComplete, onReturnToWorlds) {
  if (!containerEl) return;
  containerEl.replaceChildren();

  mazeState.containerEl = containerEl;
  mazeState.onWorldComplete = onWorldComplete;
  mazeState.onReturnToWorlds = onReturnToWorlds;
  mazeState.feedbackMessage = null;

  resetHeroAndEnemies();

  const wrapper = document.createElement('div');
  wrapper.className = 'w-full max-w-4xl mx-auto space-y-4 bg-slate-900/95 border border-purple-900/50 rounded-2xl p-4 md:p-6 shadow-2xl transition-all duration-300 relative selection:bg-none';

  // HUD Bar
  const hud = renderMazeHUD();
  wrapper.appendChild(hud);

  // Main Playing Area: Grid Layout (Canvas + Side Question Panel)
  const gameBody = document.createElement('div');
  gameBody.className = 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start';

  // Side Question Panel (Left in LTR, Right in RTL)
  const qPanel = renderQuestionPanel();
  qPanel.className = 'lg:col-span-5 space-y-3';

  // Canvas Maze Container (Center)
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'lg:col-span-7 flex flex-col items-center justify-center space-y-3';

  const canvas = document.createElement('canvas');
  canvas.id = 'maze-canvas';
  canvas.width = 520;
  canvas.height = 440;
  canvas.className = 'bg-slate-950 border-2 border-purple-800/80 rounded-2xl shadow-xl touch-none w-full max-w-[520px] aspect-[13/11]';

  canvasContainer.appendChild(canvas);

  // Touch Controls Overlay (for mobile & desktop compatibility)
  const touchControls = renderTouchControls();
  canvasContainer.appendChild(touchControls);

  gameBody.appendChild(qPanel);
  gameBody.appendChild(canvasContainer);
  wrapper.appendChild(gameBody);

  // Feedback Modal Layer (for correct/wrong answers & level complete)
  const modalLayer = document.createElement('div');
  modalLayer.id = 'maze-modal-layer';
  modalLayer.className = 'hidden absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4 rounded-2xl';
  wrapper.appendChild(modalLayer);

  containerEl.appendChild(wrapper);

  // Attach Keyboard Listeners
  setupKeyboardControls();

  // Start Canvas Game Loop
  startCanvasLoop(canvas);
}

function resetHeroAndEnemies() {
  mazeState.hero = { col: 5, row: 5, targetCol: 5, targetRow: 5, x: 5, y: 5, dir: 'right' };
  mazeState.enemies = [
    { col: 1, row: 3, dirCol: 1, dirRow: 0, speed: 0.035, x: 1, y: 3, color: '#ef4444' }, // Blinky Red
    { col: 11, row: 7, dirCol: -1, dirRow: 0, speed: 0.035, x: 11, y: 7, color: '#ec4899' }  // Pinky Pink
  ];
  mazeState.invulnerableUntil = 0;
}

// HUD Construction
function renderMazeHUD() {
  const hud = document.createElement('div');
  hud.className = 'flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3 text-xs';

  const leftStats = document.createElement('div');
  leftStats.className = 'flex items-center gap-2 flex-wrap font-bold';

  const worldBadge = document.createElement('span');
  worldBadge.className = 'bg-purple-950 text-purple-300 border border-purple-700/60 px-3 py-1 rounded-full flex items-center gap-1.5';
  worldBadge.innerHTML = `<span>🌀</span> <span>متاهة المعرفة</span>`;

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

  // Right Control Actions
  const rightActions = document.createElement('div');
  rightActions.className = 'flex items-center gap-2';

  // Read Mode Toggle (Accessibility Feature)
  const readModeBtn = document.createElement('button');
  readModeBtn.type = 'button';
  readModeBtn.className = `px-2.5 py-1.5 rounded-lg border font-semibold transition flex items-center gap-1 ${
    mazeState.readMode
      ? 'bg-amber-950 text-amber-300 border-amber-700'
      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
  }`;
  readModeBtn.title = 'نمط القراءة الهادئة (تجميد الحركة أثناء القراءة)';
  readModeBtn.innerHTML = `<span>📖</span> <span class="hidden sm:inline">${mazeState.readMode ? 'نمط القراءة: مفعّل' : 'نمط القراءة'}</span>`;
  readModeBtn.addEventListener('click', () => {
    mazeState.readMode = !mazeState.readMode;
    playSound('select');
    renderKnowledgeMaze(mazeState.containerEl, mazeState.onWorldComplete, mazeState.onReturnToWorlds);
  });

  // Sound Toggle
  const soundBtn = document.createElement('button');
  soundBtn.type = 'button';
  soundBtn.className = 'bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 font-semibold transition';
  soundBtn.innerHTML = `<span>🔊</span>`;
  soundBtn.addEventListener('click', () => {
    playSound('select');
  });

  // Pause Button
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'bg-slate-800 hover:bg-slate-700 text-purple-300 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold transition flex items-center gap-1';
  pauseBtn.innerHTML = `<span>⏸️</span> <span class="hidden sm:inline">إيقاف</span>`;
  pauseBtn.addEventListener('click', () => {
    playSound('select');
    showMazePauseModal();
  });

  rightActions.appendChild(readModeBtn);
  rightActions.appendChild(soundBtn);
  rightActions.appendChild(pauseBtn);

  hud.appendChild(leftStats);
  hud.appendChild(rightActions);

  return hud;
}

// Side Question Panel Rendering
function renderQuestionPanel() {
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
  qBadge.className = 'text-[11px] font-bold text-purple-300 bg-purple-950 px-2.5 py-0.5 rounded border border-purple-800';
  qBadge.textContent = `🎯 السؤال المعرفي #${realmsState.currentQuestionIndex + 1}`;

  const instr = document.createElement('span');
  instr.className = 'text-[10px] text-slate-400 font-semibold';
  instr.textContent = 'حرّك "حارس النور" نحو بوابة الخيار الصحيح 🌀';

  qHeader.appendChild(qBadge);
  qHeader.appendChild(instr);

  const qText = document.createElement('h4');
  qText.className = 'text-sm font-bold text-slate-100 leading-relaxed';
  qText.textContent = currentQ.question;

  qCard.appendChild(qHeader);
  qCard.appendChild(qText);

  // List Gate Mappings so student can easily identify choices & gate badges
  const choicesList = document.createElement('div');
  choicesList.className = 'space-y-2 pt-1';

  currentQ.choices.forEach((choice, idx) => {
    const gateInfo = GATE_MAPPINGS[3 + idx] || { badge: '?', color: '#a855f7' };

    const choiceRow = document.createElement('div');
    choiceRow.className = 'flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs font-semibold text-slate-200';

    const gateBadge = document.createElement('span');
    gateBadge.className = 'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0';
    gateBadge.style.backgroundColor = gateInfo.color;
    gateBadge.textContent = gateInfo.badge;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'leading-relaxed text-[12px]';
    labelSpan.textContent = choice.text;

    choiceRow.appendChild(gateBadge);
    choiceRow.appendChild(labelSpan);
    choicesList.appendChild(choiceRow);
  });

  qCard.appendChild(choicesList);

  if (mazeState.readMode) {
    const readBanner = document.createElement('div');
    readBanner.className = 'mt-2 p-2.5 rounded-xl bg-amber-950/60 border border-amber-800 text-[11px] text-amber-200 flex items-center justify-between';
    readBanner.innerHTML = `
      <span>📖 الحركة متوقفة مؤقتاً لقراءة السؤال هادئاً.</span>
      <button type="button" id="unfreeze-motion-btn" class="bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg transition text-[10px]">ابدأ الحركة ▶️</button>
    `;
    qCard.appendChild(readBanner);

    setTimeout(() => {
      document.getElementById('unfreeze-motion-btn')?.addEventListener('click', () => {
        mazeState.readMode = false;
        renderKnowledgeMaze(mazeState.containerEl, mazeState.onWorldComplete, mazeState.onReturnToWorlds);
      });
    }, 50);
  }

  return qCard;
}

// Touch D-Pad Overlay (Virtual Directional Controls for Mobile & Accessibility)
function renderTouchControls() {
  const dpad = document.createElement('div');
  dpad.className = 'flex flex-col items-center gap-1 py-1 user-select-none select-none';

  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.className = 'w-12 h-12 bg-slate-800 hover:bg-purple-900 border border-slate-700 rounded-xl text-lg font-bold text-purple-200 flex items-center justify-center active:scale-95 shadow-md';
  upBtn.textContent = '⬆️';
  upBtn.setAttribute('aria-label', 'تحريك للأعلى');
  upBtn.addEventListener('click', () => moveHero(0, -1));

  const middleRow = document.createElement('div');
  middleRow.className = 'flex items-center gap-4';

  const leftBtn = document.createElement('button');
  leftBtn.type = 'button';
  leftBtn.className = 'w-12 h-12 bg-slate-800 hover:bg-purple-900 border border-slate-700 rounded-xl text-lg font-bold text-purple-200 flex items-center justify-center active:scale-95 shadow-md';
  leftBtn.textContent = '⬅️';
  leftBtn.setAttribute('aria-label', 'تحريك لليسار');
  leftBtn.addEventListener('click', () => moveHero(-1, 0));

  const rightBtn = document.createElement('button');
  rightBtn.type = 'button';
  rightBtn.className = 'w-12 h-12 bg-slate-800 hover:bg-purple-900 border border-slate-700 rounded-xl text-lg font-bold text-purple-200 flex items-center justify-center active:scale-95 shadow-md';
  rightBtn.textContent = '➡️';
  rightBtn.setAttribute('aria-label', 'تحريك لليمين');
  rightBtn.addEventListener('click', () => moveHero(1, 0));

  middleRow.appendChild(leftBtn);
  middleRow.appendChild(rightBtn);

  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.className = 'w-12 h-12 bg-slate-800 hover:bg-purple-900 border border-slate-700 rounded-xl text-lg font-bold text-purple-200 flex items-center justify-center active:scale-95 shadow-md';
  downBtn.textContent = '⬇️';
  downBtn.setAttribute('aria-label', 'تحريك للأسفل');
  downBtn.addEventListener('click', () => moveHero(0, 1));

  dpad.appendChild(upBtn);
  dpad.appendChild(middleRow);
  dpad.appendChild(downBtn);

  return dpad;
}

// Hero Movement Logic
export function moveHero(deltaCol, deltaRow) {
  if (realmsState.sessionStatus !== 'playing' || mazeState.readMode) return;

  const targetCol = mazeState.hero.col + deltaCol;
  const targetRow = mazeState.hero.row + deltaRow;

  if (targetCol < 0 || targetCol >= 13 || targetRow < 0 || targetRow >= 11) return;

  // Track direction for Pac-Man chomp orientation
  if (deltaCol === 1) mazeState.hero.dir = 'right';
  else if (deltaCol === -1) mazeState.hero.dir = 'left';
  else if (deltaRow === 1) mazeState.hero.dir = 'down';
  else if (deltaRow === -1) mazeState.hero.dir = 'up';

  // Check collision with walls (1)
  if (MAZE_GRID[targetRow][targetCol] === 1) {
    playSound('select');
    return;
  }

  mazeState.hero.col = targetCol;
  mazeState.hero.row = targetRow;
  mazeState.hero.x = targetCol;
  mazeState.hero.y = targetRow;

  // Check collision with Answer Gates (3, 4, 5, 6)
  const cellVal = MAZE_GRID[targetRow][targetCol];
  if (cellVal >= 3 && cellVal <= 6) {
    const gateInfo = GATE_MAPPINGS[cellVal];
    const currentQ = getCurrentQuestion();
    if (currentQ && currentQ.choices[gateInfo.choiceIndex]) {
      const chosenChoiceId = currentQ.choices[gateInfo.choiceIndex].id;
      handleAnswerGateTrigger(chosenChoiceId);
    }
  }
}

// Handle Answer Gate Hit
function handleAnswerGateTrigger(choiceId) {
  const evalResult = submitRealmsAnswer(choiceId);

  if (evalResult.isCorrect) {
    playSound('correct');
    triggerConfetti({ count: 50 });
    triggerXpPopup(`+${evalResult.earnedXp} XP`, document.getElementById('maze-canvas'));

    showMazeModal({
      type: 'correct',
      title: '✅ إجابة موفقة وصحيحة!',
      subtitle: `كسبت +${evalResult.earnedXp} XP (مضاعف Combo x${Math.min(realmsState.combo, 4)})`,
      explanation: evalResult.explanation,
      isFinished: evalResult.isFinished
    });

  } else {
    playSound('incorrect');
    resetHeroAndEnemies();

    showMazeModal({
      type: 'wrong',
      title: evalResult.isGameOver ? '💔 نفدت محاولات الطاقة!' : '⚠️ محاولة غير دقيقة (فقدان 1 طاقة)',
      subtitle: evalResult.isGameOver ? 'يمكنك مراجعة المفاهيم وإعادة المحاولة' : 'تمت إعادتك لنقطة البداية لتجربة مسار آخر',
      explanation: evalResult.explanation,
      isGameOver: evalResult.isGameOver
    });
  }
}

// Keyboard Control Handler
function setupKeyboardControls() {
  if (mazeState.keyboardListener) {
    document.removeEventListener('keydown', mazeState.keyboardListener);
  }

  mazeState.keyboardListener = (e) => {
    if (realmsState.sessionStatus !== 'playing') return;

    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      showMazePauseModal();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      moveHero(0, -1);
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      moveHero(0, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      moveHero(-1, 0); // Physical left movement
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      moveHero(1, 0); // Physical right movement
    }
  };

  document.addEventListener('keydown', mazeState.keyboardListener);
}

// Canvas Game Render Loop
function startCanvasLoop(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function loop() {
    if (document.getElementById('maze-canvas')) {
      updateEnemiesLogic();
      renderMazeCanvas(ctx, canvas);
      mazeState.animFrameId = requestAnimationFrame(loop);
    }
  }

  if (mazeState.animFrameId) cancelAnimationFrame(mazeState.animFrameId);
  mazeState.animFrameId = requestAnimationFrame(loop);
}

// Enemy movement and collision updates
function updateEnemiesLogic() {
  if (realmsState.sessionStatus !== 'playing' || mazeState.readMode) return;

  const now = Date.now();

  mazeState.enemies.forEach(enemy => {
    const nextX = enemy.x + enemy.dirCol * enemy.speed;
    const nextY = enemy.y + enemy.dirRow * enemy.speed;

    const testCol = Math.floor(nextX + (enemy.dirCol > 0 ? 0.8 : 0.2));
    const testRow = Math.floor(nextY + (enemy.dirRow > 0 ? 0.8 : 0.2));

    if (testCol >= 0 && testCol < 13 && testRow >= 0 && testRow < 11 && MAZE_GRID[testRow][testCol] !== 1) {
      enemy.x = nextX;
      enemy.y = nextY;
      enemy.col = Math.round(nextX);
      enemy.row = Math.round(nextY);
    } else {
      // Reverse direction when hitting a wall
      enemy.dirCol *= -1;
      enemy.dirRow *= -1;
    }

    // Check collision with Hero "حارس النور"
    const dist = Math.hypot(enemy.x - mazeState.hero.x, enemy.y - mazeState.hero.y);
    if (dist < 0.7 && now > mazeState.invulnerableUntil) {
      playSound('incorrect');
      realmsState.energy = Math.max(0, realmsState.energy - 1);
      realmsState.combo = 0;
      mazeState.invulnerableUntil = now + 1500; // 1.5s invulnerability

      // Reset Hero to spawn point (5, 5)
      mazeState.hero.col = 5;
      mazeState.hero.row = 5;
      mazeState.hero.x = 5;
      mazeState.hero.y = 5;

      if (realmsState.energy === 0) {
        realmsState.sessionStatus = 'game_over';
        showMazeModal({
          type: 'wrong',
          title: '💔 اصطدمت بظلال التشويش ونفدت الطاقة!',
          subtitle: 'يمكنك مراجعة الدرس وإعادة المحاولة',
          explanation: 'احرص على تجنب الظلال والتحرك بحذر نحو بوابات الإجابة.',
          isGameOver: true
        });
      } else {
        renderKnowledgeMaze(mazeState.containerEl, mazeState.onWorldComplete, mazeState.onReturnToWorlds);
      }
    }
  });
}

// Helper: Draw Classic Pac-Man Arcade Ghost
function drawPacmanGhost(ctx, x, y, radius, color, dirCol = 1, dirRow = 0) {
  ctx.save();
  ctx.translate(x, y);

  // Ghost Body Path (Dome Head + Wavy Tentacle Bottom)
  ctx.beginPath();
  ctx.arc(0, -radius * 0.2, radius, Math.PI, 0, false);
  ctx.lineTo(radius, radius * 0.7);

  // Wavy Bottom Tentacles
  const steps = 3;
  const w = (radius * 2) / steps;
  for (let i = steps; i > 0; i--) {
    const startX = -radius + i * w;
    const endX = -radius + (i - 1) * w;
    const midX = (startX + endX) / 2;
    ctx.quadraticCurveTo(midX, radius * (i % 2 === 0 ? 1.05 : 0.45), endX, radius * 0.7);
  }

  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ghost Eyes (White Background, Deep Blue Pupils)
  const eyeOffsetX = radius * 0.35;
  const eyeOffsetY = -radius * 0.15;
  const eyeR = radius * 0.32;
  const pupilR = radius * 0.16;

  [-eyeOffsetX, eyeOffsetX].forEach(ex => {
    ctx.beginPath();
    ctx.ellipse(ex, eyeOffsetY, eyeR * 0.8, eyeR, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const px = ex + dirCol * (eyeR * 0.35);
    const py = eyeOffsetY + dirRow * (eyeR * 0.35);
    ctx.beginPath();
    ctx.arc(px, py, pupilR, 0, Math.PI * 2);
    ctx.fillStyle = '#1d4ed8';
    ctx.fill();
  });

  ctx.restore();
}

// Helper: Draw Pac-Man Hero
function drawPacmanHero(ctx, x, y, radius, dir = 'right', now) {
  let baseAngle = 0;
  if (dir === 'left') baseAngle = Math.PI;
  else if (dir === 'down') baseAngle = Math.PI / 2;
  else if (dir === 'up') baseAngle = -Math.PI / 2;

  // Mouth chomp animation (0 to 45 deg)
  const chomp = Math.abs(Math.sin(now / 70)) * 0.25 * Math.PI;
  const startAngle = baseAngle + chomp;
  const endAngle = baseAngle + (2 * Math.PI - chomp);

  ctx.save();
  ctx.translate(x, y);

  // Outer Aura Pulse
  const pulse = Math.sin(now / 150) * 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 4 + pulse, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
  ctx.fill();

  // Pac-Man Body
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = '#facc15'; // Pac-Man Yellow
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pac-Man Eye
  const eyeAngle = baseAngle - Math.PI / 4;
  const eyeDist = radius * 0.55;
  const eyeX = Math.cos(eyeAngle) * eyeDist;
  const eyeY = Math.sin(eyeAngle) * eyeDist;

  ctx.beginPath();
  ctx.arc(eyeX, eyeY, radius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  ctx.restore();
}

// Canvas Painting Logic (Pac-Man Arcade Style)
function renderMazeCanvas(ctx, canvas) {
  const cellW = canvas.width / 13;
  const cellH = canvas.height / 11;
  const now = Date.now();

  // Clear background with Arcade Deep Black/Blue
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Arcade Neon Walls & Pac-Dots
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 13; c++) {
      const val = MAZE_GRID[r][c];
      const x = c * cellW;
      const y = r * cellH;

      if (val === 1) {
        // Classic Neon Blue Wall Tile
        ctx.fillStyle = '#090d16';
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 3, y + 3, cellW - 6, cellH - 6);

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
      } else if (val === 0) {
        // Path Cell with Pac-Dots / Power Pellets
        ctx.fillStyle = '#030712';
        ctx.fillRect(x, y, cellW, cellH);

        const isPowerPellet = (r === 1 && (c === 2 || c === 10)) || (r === 9 && (c === 2 || c === 10));
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;

        if (isPowerPellet) {
          // Pulsing Power Pellet
          const pPulse = Math.sin(now / 150) * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 6.5 + pPulse, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // Pac-Dot
          ctx.beginPath();
          ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.fill();
        }
      }
    }
  }

  // 2. Draw Answer Gates / Target Orbs (A, B, C, D)
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 13; c++) {
      const val = MAZE_GRID[r][c];
      if (val >= 3 && val <= 6) {
        const gate = GATE_MAPPINGS[val];
        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) * 0.38;

        // Arcade Neon Aura Pulse
        const pulse = Math.sin(now / 200) * 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${gate.color}44`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = gate.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw Badge Symbol inside Orb
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gate.badge, cx, cy);
      }
    }
  }

  // 3. Draw Pac-Man Ghosts
  mazeState.enemies.forEach(enemy => {
    const ex = enemy.x * cellW + cellW / 2;
    const ey = enemy.y * cellH + cellH / 2;
    const radius = Math.min(cellW, cellH) * 0.34;
    drawPacmanGhost(ctx, ex, ey, radius, enemy.color || '#ef4444', enemy.dirCol, enemy.dirRow);
  });

  // 4. Draw Pac-Man Hero
  const hx = mazeState.hero.x * cellW + cellW / 2;
  const hy = mazeState.hero.y * cellH + cellH / 2;
  const heroRadius = Math.min(cellW, cellH) * 0.38;

  const isInvulnerable = now < mazeState.invulnerableUntil;
  if (isInvulnerable && Math.floor(now / 100) % 2 === 0) {
    // Blinking effect during invulnerability
    return;
  }

  drawPacmanHero(ctx, hx, hy, heroRadius, mazeState.hero.dir || 'right', now);
}

// Modal Layer Renderers
function showMazeModal({ type, title, subtitle, explanation, isFinished = false, isGameOver = false }) {
  const modalLayer = document.getElementById('maze-modal-layer');
  if (!modalLayer) return;

  modalLayer.replaceChildren();
  modalLayer.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-purple-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-center shadow-2xl animate-fade-in';

  const icon = document.createElement('div');
  icon.className = 'text-4xl animate-bounce';
  icon.textContent = type === 'correct' ? '🏆' : (isGameOver ? '💔' : '⚠️');

  const titleEl = document.createElement('h3');
  titleEl.className = 'text-xl font-bold text-white';
  titleEl.textContent = title;

  const subEl = document.createElement('p');
  subEl.className = 'text-xs text-purple-200 font-semibold';
  subEl.textContent = subtitle;

  const expBox = document.createElement('div');
  expBox.className = 'bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed text-right space-y-1';
  expBox.innerHTML = `
    <strong class="text-purple-300 block mb-1">📌 الشرح المفاهيمي:</strong>
    <p>${explanation || 'تفسير دقيق لناتج التحدي.'}</p>
  `;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = type === 'correct'
    ? 'w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm'
    : 'w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm';

  btn.textContent = isFinished
    ? 'إكمال العالم وعرض النتيجة 🏆'
    : (isGameOver ? 'إعادة محاولة العالم 🔄' : 'المتابعة للتحدي التالي ➔');

  btn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    playSound('select');

    if (isFinished) {
      realmsState.sessionStatus = 'success';
      if (mazeState.onWorldComplete) mazeState.onWorldComplete();
    } else if (isGameOver) {
      retryRealmsSession();
      renderKnowledgeMaze(mazeState.containerEl, mazeState.onWorldComplete, mazeState.onReturnToWorlds);
    } else if (type === 'correct') {
      nextRealmsQuestion();
      renderKnowledgeMaze(mazeState.containerEl, mazeState.onWorldComplete, mazeState.onReturnToWorlds);
    } else {
      renderKnowledgeMaze(mazeState.containerEl, mazeState.onWorldComplete, mazeState.onReturnToWorlds);
    }
  });

  card.appendChild(icon);
  card.appendChild(titleEl);
  card.appendChild(subEl);
  card.appendChild(expBox);
  card.appendChild(btn);

  modalLayer.appendChild(card);
}

function showMazePauseModal() {
  pauseRealmsSession();
  const modalLayer = document.getElementById('maze-modal-layer');
  if (!modalLayer) return;

  modalLayer.replaceChildren();
  modalLayer.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-purple-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center shadow-2xl';

  const title = document.createElement('h3');
  title.className = 'text-xl font-bold text-white';
  title.textContent = '⏸️ اللعب متوقف مؤقتاً';

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.className = 'w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition';
  resumeBtn.textContent = '▶️ استئناف اللعب';
  resumeBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    resumeRealmsSession();
    playSound('select');
  });

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'w-full bg-slate-800 hover:bg-slate-700 text-purple-200 border border-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition';
  retryBtn.textContent = '🔄 إعادة المحاولة';
  retryBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    retryRealmsSession();
    playSound('select');
    renderKnowledgeMaze(mazeState.containerEl, mazeState.onWorldComplete, mazeState.onReturnToWorlds);
  });

  const quitBtn = document.createElement('button');
  quitBtn.type = 'button';
  quitBtn.className = 'w-full bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-900/60 font-semibold py-2.5 px-4 rounded-xl text-sm transition';
  quitBtn.textContent = '🚪 العودة لاختيار الأكوان';
  quitBtn.addEventListener('click', () => {
    modalLayer.classList.add('hidden');
    playSound('select');
    if (mazeState.onReturnToWorlds) mazeState.onReturnToWorlds();
  });

  card.appendChild(title);
  card.appendChild(resumeBtn);
  card.appendChild(retryBtn);
  card.appendChild(quitBtn);

  modalLayer.appendChild(card);
}
