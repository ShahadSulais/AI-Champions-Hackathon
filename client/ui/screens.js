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

  const card = document.createElement('div');
  card.className = 'bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3';

  // Header bar
  const headerBar = document.createElement('div');
  headerBar.className = 'flex justify-between items-center border-b border-slate-800 pb-2';

  const titleSpan = document.createElement('span');
  titleSpan.className = 'font-bold text-purple-300';
  titleSpan.textContent = 'ملخص الذاكرة المعرفية التكيفية للطالب';

  const countBadge = document.createElement('span');
  countBadge.className = 'text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded';
  countBadge.textContent = `إجمالي الجلسات المحفوظة: ${mem.sessionsCount || 0}`;

  headerBar.appendChild(titleSpan);
  headerBar.appendChild(countBadge);
  card.appendChild(headerBar);

  // Body content
  const body = document.createElement('div');
  body.className = 'text-xs space-y-1';

  // Profile status
  const pLine = document.createElement('div');
  const pLabel = document.createElement('strong');
  pLabel.textContent = 'حالة الملف الشخصي: ';
  pLine.appendChild(pLabel);
  pLine.appendChild(document.createTextNode(mem.profileSummary || 'لا يوجد'));
  body.appendChild(pLine);

  // Recent concepts
  const rLine = document.createElement('div');
  const rLabel = document.createElement('strong');
  rLabel.textContent = 'المفاهيم الأخيرة المكتسبة: ';
  rLine.appendChild(rLabel);
  rLine.appendChild(document.createTextNode(mem.recentConcepts?.join(', ') || 'لا توجد'));
  body.appendChild(rLine);

  // Struggle areas
  const sLine = document.createElement('div');
  const sLabel = document.createElement('strong');
  sLabel.textContent = 'المفاهيم المخزنة للمراجعة: ';
  sLine.appendChild(sLabel);
  sLine.appendChild(document.createTextNode(mem.struggleAreas?.join(', ') || 'لا توجد'));
  body.appendChild(sLine);

  card.appendChild(body);
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
