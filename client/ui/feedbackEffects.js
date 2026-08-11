// Visual Answer Feedback & Particle Effects Engine
import { SuccessBurstSVG, ShieldHintSVG } from './svgAssets.js';
import { playSound } from '../services/audioService.js';

const ENCOURAGING_MESSAGES = [
  "اقتربت! لنراجع الدليل والمفاهيم سويًا.",
  "اكتشفت الآن معلومة مهمة ستفيدك بالمحاولة القادمة.",
  "المحاولة الثانية أقوى لأنك تعرف أكثر الآن!",
  "كل خطوة تقربك أكثر لإتقان المعرفة كاملة.",
  "ممتاز في المحاولة! استعن بالتلميح لربط الأفكار."
];

export function showFloatingParticle(text, x, y, type = 'xp') {
  const pop = document.createElement('div');
  pop.className = 'xp-float-popup';
  pop.textContent = text;
  
  // Position near event or screen center
  const posX = x || (window.innerWidth / 2 - 50);
  const posY = y || (window.innerHeight / 2 - 20);

  pop.style.left = `${posX}px`;
  pop.style.top = `${posY}px`;

  document.body.appendChild(pop);

  setTimeout(() => {
    if (document.body.contains(pop)) {
      document.body.removeChild(pop);
    }
  }, 1100);
}

export function renderCorrectFeedback(container, explanation = '') {
  if (!container) return;

  playSound('success');
  showFloatingParticle('⭐ +100 XP');

  container.className = 'p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs md:text-sm space-y-2 animate-fade-in shadow-[0_0_20px_rgba(34,197,94,0.3)]';
  container.innerHTML = `
    <div class="flex items-center gap-3">
      ${SuccessBurstSVG()}
      <div>
        <h4 class="font-bold text-sm md:text-base text-emerald-300">إجابة رائعة ومتقنة! 🎉</h4>
        <p class="text-xs text-emerald-200/90 mt-0.5 leading-relaxed">${explanation || 'تم ربط المفهوم بنجاح وإعادة التوازن المعرفي!'}</p>
      </div>
    </div>
  `;
  container.classList.remove('hidden');
}

export function renderIncorrectFeedback(container, explanation = '', hint = '') {
  if (!container) return;

  playSound('click'); // Soft tone instead of harsh fail sound

  const randomEncouragement = ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];

  container.className = 'p-4 rounded-2xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs md:text-sm space-y-3 animate-fade-in shadow-[0_0_20px_rgba(245,158,11,0.25)]';
  container.innerHTML = `
    <div class="flex items-start gap-3">
      ${ShieldHintSVG()}
      <div class="space-y-1">
        <h4 class="font-bold text-sm md:text-base text-amber-300 flex items-center gap-2">
          <span>${randomEncouragement}</span>
        </h4>
        ${explanation ? `<p class="text-xs text-amber-200/90 leading-relaxed">${explanation}</p>` : ''}
        ${hint ? `
          <div class="bg-amber-900/40 border border-amber-700/50 p-2.5 rounded-xl text-xs text-amber-100 mt-2">
            💡 <strong>تلميح الذكاء المعرفي:</strong> ${hint}
          </div>
        ` : ''}
      </div>
    </div>
  `;
  container.classList.remove('hidden');
}
