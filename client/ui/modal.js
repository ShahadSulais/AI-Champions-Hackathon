import { getMemory, clearMemory } from '../services/memoryService.js';

export function renderMemoryInspector() {
  const mem = getMemory();
  const box = document.getElementById('memory-inspector-box');
  if (!box) return;
  box.replaceChildren();

  // Profile Summary
  const profileDiv = document.createElement('div');
  const profileLabel = document.createElement('strong');
  profileLabel.textContent = 'ملخص الملف الشخصي: ';
  profileDiv.appendChild(profileLabel);
  profileDiv.appendChild(document.createTextNode(mem.profileSummary || 'طالب جديد.'));
  box.appendChild(profileDiv);

  // Sessions Count
  const countDiv = document.createElement('div');
  const countLabel = document.createElement('strong');
  countLabel.textContent = 'الجلسات المكتملة: ';
  countDiv.appendChild(countLabel);
  countDiv.appendChild(document.createTextNode(String(mem.sessionsCount || 0)));
  box.appendChild(countDiv);

  // Struggle Areas
  if (mem.struggleAreas && mem.struggleAreas.length > 0) {
    const struggleDiv = document.createElement('div');
    struggleDiv.className = 'text-amber-400';
    const struggleLabel = document.createElement('strong');
    struggleLabel.textContent = 'نقاط تحتاج دعم مستمر: ';
    struggleDiv.appendChild(struggleLabel);
    struggleDiv.appendChild(document.createTextNode(mem.struggleAreas.join(', ')));
    box.appendChild(struggleDiv);
  }

  // Timeline Header
  const timelineHeader = document.createElement('div');
  timelineHeader.className = 'mt-2 border-t border-slate-800 pt-1 text-slate-400';
  const timelineLabel = document.createElement('strong');
  timelineLabel.textContent = 'السجل الزمني الأخير:';
  timelineHeader.appendChild(timelineLabel);
  box.appendChild(timelineHeader);

  // Timeline Items
  if (!mem.timeline || mem.timeline.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'text-slate-500';
    emptyDiv.textContent = 'لا يوجد سجل زمني محفوظ بعد.';
    box.appendChild(emptyDiv);
  } else {
    mem.timeline.forEach(t => {
      const itemDiv = document.createElement('div');
      itemDiv.textContent = `• [${t.time}] ${t.lessonTitle} (${t.scoreSummary})`;
      box.appendChild(itemDiv);
    });
  }
}

export function openSettingsModal() {
  renderMemoryInspector();
  document.getElementById('settings-modal')?.classList.remove('hidden');
}

export function closeSettingsModal() {
  document.getElementById('settings-modal')?.classList.add('hidden');
}

export function handleClearMemory() {
  if (clearMemory()) {
    renderMemoryInspector();
  }
}
