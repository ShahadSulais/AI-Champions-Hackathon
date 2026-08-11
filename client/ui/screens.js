import { state } from '../state/gameState.js';
import { playSound, stopSpeech } from '../services/audioService.js';
import { getMemory } from '../services/memoryService.js';

export function switchScreen(screenId) {
  stopSpeech();
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

export function initBriefingScreen(lessonData) {
  if (!lessonData) return;

  const titleEl = document.getElementById('briefing-lesson-title');
  if (titleEl) titleEl.textContent = lessonData.title || 'عنوان الدرس العلمي';

  const subjectEl = document.getElementById('briefing-lesson-subject');
  if (subjectEl) subjectEl.textContent = `المادة: ${lessonData.subject || 'العلوم العامة'}`;

  const readingTimeEl = document.getElementById('briefing-reading-time');
  if (readingTimeEl) {
    const mins = lessonData.estimatedReadingMinutes || 2;
    readingTimeEl.textContent = `⏱️ وقت القراءة: ${mins} دقائق`;
  }

  const summaryEl = document.getElementById('briefing-summary-text');
  if (summaryEl) summaryEl.textContent = lessonData.summary || '';

  // Key points
  const pointsList = document.getElementById('briefing-key-points-list');
  if (pointsList) {
    pointsList.replaceChildren();
    const points = Array.isArray(lessonData.keyPoints) ? lessonData.keyPoints : [];
    points.forEach(pt => {
      const li = document.createElement('li');
      li.className = 'leading-relaxed text-slate-200';
      li.textContent = pt;
      pointsList.appendChild(li);
    });
  }

  // Terms
  const termsSec = document.getElementById('briefing-terms-section');
  const termsContainer = document.getElementById('briefing-terms-container');
  if (termsContainer && termsSec) {
    termsContainer.replaceChildren();
    const terms = Array.isArray(lessonData.terms) ? lessonData.terms : [];
    if (terms.length === 0) {
      termsSec.classList.add('hidden');
    } else {
      termsSec.classList.remove('hidden');
      terms.forEach(item => {
        const div = document.createElement('div');
        div.className = 'bg-slate-900/90 border border-purple-900/40 p-3.5 rounded-xl space-y-1';
        div.innerHTML = `
          <span class="text-xs font-bold text-purple-300 block">📌 ${item.term || ''}</span>
          <p class="text-xs text-slate-300 leading-relaxed">${item.definition || ''}</p>
        `;
        termsContainer.appendChild(div);
      });
    }
  }

  // Formulas
  const formulasSec = document.getElementById('briefing-formulas-section');
  const formulasContainer = document.getElementById('briefing-formulas-container');
  if (formulasContainer && formulasSec) {
    formulasContainer.replaceChildren();
    const formulas = Array.isArray(lessonData.formulas) ? lessonData.formulas : [];
    if (formulas.length === 0) {
      formulasSec.classList.add('hidden');
    } else {
      formulasSec.classList.remove('hidden');
      formulas.forEach(item => {
        const div = document.createElement('div');
        div.className = 'bg-slate-900/90 border border-amber-900/40 p-3.5 rounded-xl space-y-1 font-mono text-xs';
        div.innerHTML = `
          <div class="text-amber-300 font-bold">📐 ${item.formula || ''}</div>
          <div class="text-slate-300 text-[11px] leading-relaxed font-sans">${item.explanation || ''}</div>
        `;
        formulasContainer.appendChild(div);
      });
    }
  }
}

let activeStoryState = {
  currentIndex: 0,
  storyData: null,
  onComplete: null
};

export function getActiveStoryScene() {
  const { storyData, currentIndex } = activeStoryState;
  if (!storyData || !Array.isArray(storyData.scenes)) return null;
  return storyData.scenes[currentIndex] || null;
}

export function initStoryIntroScreen(storyData, onComplete) {
  if (!storyData) return;
  activeStoryState = {
    currentIndex: 0,
    storyData,
    onComplete
  };

  const titleEl = document.getElementById('story-intro-title');
  if (titleEl) titleEl.textContent = storyData.title || 'مهمة حُرّاس المعرفة';

  const objEl = document.getElementById('story-intro-objective');
  if (objEl) objEl.textContent = storyData.missionObjective || 'استعادة شظايا المفاهيم المفقودة وإلغاء تأثير ظلال النسيان';

  renderCurrentStoryScene();
}

export function renderCurrentStoryScene() {
  stopSpeech();
  const { storyData, currentIndex } = activeStoryState;
  if (!storyData || !Array.isArray(storyData.scenes)) return;

  const scenes = storyData.scenes;
  const total = scenes.length;
  const current = scenes[currentIndex] || scenes[0];

  const counterEl = document.getElementById('story-scene-counter');
  if (counterEl) counterEl.textContent = `المشهد ${currentIndex + 1} من ${total}`;

  const bgDescEl = document.getElementById('story-bg-desc');
  if (bgDescEl) {
    bgDescEl.innerHTML = `<span>🖼️</span> <span>${current.backgroundDescription || 'بيئة المهمة القصصية'}</span>`;
  }

  const soundDescEl = document.getElementById('story-sound-desc');
  if (soundDescEl) {
    if (current.soundDescription) {
      soundDescEl.innerHTML = `<span>🔊</span> <span>مؤثر: ${current.soundDescription}</span>`;
      soundDescEl.classList.remove('hidden');
    } else {
      soundDescEl.classList.add('hidden');
    }
  }

  const narrationEl = document.getElementById('story-scene-narration');
  if (narrationEl) narrationEl.textContent = current.narration || '';

  const dialogueContainer = document.getElementById('story-dialogue-container');
  const dialogueEl = document.getElementById('story-scene-dialogue');
  if (dialogueContainer && dialogueEl) {
    if (current.dialogue && current.dialogue.trim()) {
      dialogueEl.textContent = `"${current.dialogue.trim()}"`;
      dialogueContainer.classList.remove('hidden');
    } else {
      dialogueContainer.classList.add('hidden');
    }
  }

  // Dots
  const dotsContainer = document.getElementById('story-scene-dots');
  if (dotsContainer) {
    dotsContainer.replaceChildren();
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.className = i === currentIndex
        ? 'w-3 h-3 rounded-full bg-purple-500 shadow-md transition-all'
        : 'w-2 h-2 rounded-full bg-slate-700 transition-all';
      dotsContainer.appendChild(dot);
    }
  }

  // Prev / Next Buttons
  const prevBtn = document.getElementById('story-prev-btn');
  if (prevBtn) {
    if (currentIndex === 0) {
      prevBtn.classList.add('opacity-40', 'pointer-events-none');
    } else {
      prevBtn.classList.remove('opacity-40', 'pointer-events-none');
    }
  }

  const nextBtnText = document.getElementById('story-next-btn-text');
  if (nextBtnText) {
    if (currentIndex >= total - 1) {
      nextBtnText.textContent = 'انطلق إلى العالم والتحدي ⚔️';
    } else {
      nextBtnText.textContent = 'المشهد التالي';
    }
  }
}

export function advanceStoryScene() {
  const { storyData, currentIndex, onComplete } = activeStoryState;
  if (!storyData || !Array.isArray(storyData.scenes)) return;

  if (currentIndex < storyData.scenes.length - 1) {
    activeStoryState.currentIndex++;
    renderCurrentStoryScene();
    playSound('select');
  } else {
    if (typeof onComplete === 'function') onComplete();
  }
}

export function previousStoryScene() {
  if (activeStoryState.currentIndex > 0) {
    activeStoryState.currentIndex--;
    renderCurrentStoryScene();
    playSound('select');
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
