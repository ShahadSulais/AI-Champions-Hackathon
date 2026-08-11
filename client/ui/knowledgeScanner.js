// Knowledge Scanner Component (Replaces Generic Loading Spinner)
import { ScannerRadarSVG, KnowledgeCrystalSVG } from './svgAssets.js';

const SCANNER_STAGES = [
  { text: 'جاري فتح سجل المعرفة...', color: 'purple' },
  { text: 'جاري اكتشاف موضوع الدرس ورصد العناصر...', color: 'cyan' },
  { text: 'جاري استخراج المفاهيم والروابط الجوهرية...', color: 'gold' },
  { text: 'جاري بناء صرح المهمة والأكوان التفاعلية...', color: 'emerald' },
  { text: 'جاري تجهيز التحديات والألغاز المعرفية...', color: 'purple' }
];

let currentStageIndex = 0;
let stageInterval = null;
let userPrediction = '';

export function initKnowledgeScanner() {
  const container = document.getElementById('screen-loading');
  if (!container) return;

  userPrediction = '';
  currentStageIndex = 0;

  const html = `
    <div class="bg-slate-900/95 border border-purple-900/60 rounded-3xl p-6 md:p-8 max-w-lg mx-auto story-card-shadow space-y-6 text-center relative overflow-hidden backdrop-blur-xl">
      <!-- Ambient Background Glow -->
      <div class="absolute -top-20 -left-20 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-20 -right-20 w-40 h-40 bg-pink-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header Title -->
      <div class="space-y-1">
        <span class="text-[11px] font-mono tracking-widest bg-purple-950 text-purple-300 border border-purple-700/60 px-3.5 py-1 rounded-full uppercase inline-block animate-pulse">
          ⚡ KNOWLEDGE SCANNER ACTIVE
        </span>
        <h3 class="text-xl md:text-2xl font-bold text-white mt-1">ماسح المعرفة الذكي</h3>
      </div>

      <!-- SVG Animated Radar Graphic -->
      <div class="relative py-2">
        ${ScannerRadarSVG()}
      </div>

      <!-- Live Stage Status Indicator -->
      <div class="bg-slate-950/80 border border-purple-900/50 p-4 rounded-2xl space-y-2">
        <p id="scanner-stage-text" class="text-sm font-bold text-purple-200 transition-all duration-300">
          ${SCANNER_STAGES[0].text}
        </p>
        
        <!-- Stage Progress Bar -->
        <div class="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
          <div id="scanner-progress-bar" class="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 h-full w-1/5 transition-all duration-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]"></div>
        </div>
      </div>

      <!-- Glowing Discovered Knowledge Fragments Container -->
      <div class="space-y-2">
        <span class="text-xs text-slate-400 font-semibold block">الشظايا المعرفية المستكشفة:</span>
        <div id="scanner-fragments-list" class="flex justify-center items-center gap-3 min-h-[44px]">
          ${KnowledgeCrystalSVG('purple')}
        </div>
      </div>

      <!-- Optional Student Prediction Activity -->
      <div class="bg-slate-950/90 border border-amber-900/40 p-4 rounded-2xl space-y-2 text-right">
        <label for="scanner-prediction-input" class="block text-xs font-bold text-amber-300">
          🤔 سؤال التوقع المعرفي السريع:
        </label>
        <p class="text-[11px] text-slate-400">ماذا تتوقع أن يكون أهم مفهوم في هذا الدرس؟</p>
        <input 
          type="text" 
          id="scanner-prediction-input" 
          placeholder="اكتب توقعك هنا..." 
          class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
        />
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Listen to prediction input changes
  const predInput = document.getElementById('scanner-prediction-input');
  if (predInput) {
    predInput.addEventListener('input', (e) => {
      userPrediction = e.target.value;
    });
  }

  startStageCycle();
}

function startStageCycle() {
  if (stageInterval) clearInterval(stageInterval);

  stageInterval = setInterval(() => {
    currentStageIndex = (currentStageIndex + 1) % SCANNER_STAGES.length;
    updateScannerStage(currentStageIndex);
  }, 2500);
}

export function updateScannerStage(index) {
  const textEl = document.getElementById('scanner-stage-text');
  const barEl = document.getElementById('scanner-progress-bar');
  const fragContainer = document.getElementById('scanner-fragments-list');

  if (index >= 0 && index < SCANNER_STAGES.length) {
    const stage = SCANNER_STAGES[index];
    if (textEl) textEl.textContent = stage.text;
    if (barEl) {
      const pct = Math.round(((index + 1) / SCANNER_STAGES.length) * 100);
      barEl.style.width = `${pct}%`;
    }

    if (fragContainer) {
      const colors = ['purple', 'cyan', 'gold', 'emerald'];
      const fragColor = colors[index % colors.length];
      const newCrystal = document.createElement('div');
      newCrystal.className = 'animate-bounce-short';
      newCrystal.innerHTML = KnowledgeCrystalSVG(fragColor);
      fragContainer.appendChild(newCrystal);

      if (fragContainer.children.length > 5) {
        fragContainer.removeChild(fragContainer.children[0]);
      }
    }
  }
}

export function stopKnowledgeScanner() {
  if (stageInterval) {
    clearInterval(stageInterval);
    stageInterval = null;
  }
}

export function getUserPrediction() {
  return userPrediction;
}
