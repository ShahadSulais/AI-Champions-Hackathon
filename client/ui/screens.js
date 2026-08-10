import { state } from '../state/gameState.js';
import { playSound } from '../services/audioService.js';
import { getMemory } from '../services/memoryService.js';

export function switchScreen(screenId) {
  document.querySelectorAll('.screen-view').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(screenId);
  if (target) target.classList.remove('hidden');

  const statusBadge = document.getElementById('header-status');
  if (statusBadge) {
    if (screenId === 'screen-setup') {
      statusBadge.classList.add('hidden');
    } else {
      statusBadge.classList.remove('hidden');
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function initIntroScreen() {
  const g = state.gameState;
  if (!g) return;

  const titleEl = document.getElementById('intro-game-title');
  if (titleEl) titleEl.textContent = g.gameTitle || '';

  const missionTitle = document.getElementById('intro-mission-title');
  if (missionTitle) missionTitle.textContent = g.mission || '';

  const missionDesc = document.getElementById('intro-mission-desc');
  if (missionDesc) missionDesc.textContent = g.introduction || '';

  if (g.character) {
    const charName = document.getElementById('char-name');
    if (charName) charName.textContent = g.character.name || '';

    const charDesc = document.getElementById('char-desc');
    if (charDesc) charDesc.textContent = g.character.description || '';

    const charDialogue = document.getElementById('char-dialogue');
    if (charDialogue) charDialogue.textContent = `"${g.character.dialogue || ''}"`;
  }
}

export function showTeacherReport() {
  playSound('select');
  const reportContainer = document.getElementById('teacher-report-content');
  if (!reportContainer) return;
  reportContainer.replaceChildren();

  const mem = getMemory();

  // Primary diagnostic card
  const card = document.createElement('div');
  card.className = 'bg-slate-950 border border-purple-900/40 p-5 rounded-2xl space-y-4 shadow-sm';

  // Header bar
  const headerBar = document.createElement('div');
  headerBar.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3';

  const titleSpan = document.createElement('h3');
  titleSpan.className = 'font-bold text-purple-300 text-base flex items-center gap-2';
  titleSpan.innerHTML = '<span>🧠</span> <span>تقرير الذاكرة المعرفية والتشخيص التكيفي</span>';

  const countBadge = document.createElement('span');
  countBadge.className = 'text-xs bg-purple-950 text-purple-200 border border-purple-700/60 px-3 py-1 rounded-full font-semibold';
  countBadge.textContent = `الجلسات المكتملة: ${mem.sessionsCount || 0}`;

  headerBar.appendChild(titleSpan);
  headerBar.appendChild(countBadge);
  card.appendChild(headerBar);

  // Profile overview grid
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-3 gap-3 text-xs';

  // Card 1: Status
  const statusBox = document.createElement('div');
  statusBox.className = 'bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1';
  statusBox.innerHTML = `
    <div class="text-slate-400 font-bold mb-1">حالة الملف الشخصي:</div>
    <div class="text-purple-200 font-semibold text-sm leading-relaxed">${mem.profileSummary || 'لا يوجد سجّل سابق'}</div>
  `;

  // Card 2: Mastered
  const masteredBox = document.createElement('div');
  masteredBox.className = 'bg-slate-900/90 border border-emerald-900/40 p-3.5 rounded-xl space-y-1';
  const masteredListText = mem.recentConcepts?.length ? mem.recentConcepts.join(' • ') : 'لا توجد مفاهيم مكتملة بعد';
  masteredBox.innerHTML = `
    <div class="text-emerald-400 font-bold mb-1 flex items-center gap-1"><span>✅</span> المفاهيم المُتقنة مؤخراً:</div>
    <div class="text-slate-200 leading-relaxed">${masteredListText}</div>
  `;

  // Card 3: Review Needed
  const reviewBox = document.createElement('div');
  reviewBox.className = 'bg-slate-900/90 border border-amber-900/40 p-3.5 rounded-xl space-y-1';
  const reviewListText = mem.struggleAreas?.length ? mem.struggleAreas.join(' • ') : 'لا توجد نقاط ضعف محددة';
  reviewBox.innerHTML = `
    <div class="text-amber-400 font-bold mb-1 flex items-center gap-1"><span>📌</span> مفاهيم تتطلب تعزيز ومراجعة:</div>
    <div class="text-slate-200 leading-relaxed">${reviewListText}</div>
  `;

  grid.appendChild(statusBox);
  grid.appendChild(masteredBox);
  grid.appendChild(reviewBox);
  card.appendChild(grid);

  // Contextual Recommendation for Teacher
  const recBox = document.createElement('div');
  recBox.className = 'bg-purple-950/40 border border-purple-800/50 p-4 rounded-xl space-y-2 text-xs text-purple-200';
  
  let recommendation = "يُوصى بمواصلة تقديم تحديات تعزيزية للحفاظ على استقرار الفهم المفاهيمي لدى الطالب.";
  if (mem.struggleAreas?.length > 0) {
    recommendation = `يُقترح على المعلم التركيز في الجلسات القادمة على توضيح الأمثلة التطبيقية للمفاهيم التالية: (${mem.struggleAreas.join('، ')}) مستفيداً من تلميحات الذاكرة التكيفية.`;
  } else if (mem.recentConcepts?.length > 0) {
    recommendation = "أظهر الطالب استيعاباً ممتازاً للمفاهيم المستهدفة. يُنصح برفع مستوى التحديات التحليلية في المغامرة التالية.";
  }

  recBox.innerHTML = `
    <div class="font-bold text-sm text-purple-300 flex items-center gap-1.5">
      <span>💡</span> توصية المحرك المعرفي للمعلم:
    </div>
    <p class="leading-relaxed text-slate-300">${recommendation}</p>
  `;
  card.appendChild(recBox);

  reportContainer.appendChild(card);

  switchScreen('screen-report');
}

export function returnToEnding() {
  playSound('select');
  switchScreen('screen-ending');
}

export function resetGameSession() {
  playSound('select');
  switchScreen('screen-setup');
}
