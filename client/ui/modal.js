import { getMemory, clearMemory } from '../services/memoryService.js';
import { getSettings, saveSettings, clearSettings } from '../services/settingsService.js';

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

export function renderSettingsFields() {
  const current = getSettings();
  const providerSelect = document.getElementById('provider-select');
  const keyInput = document.getElementById('api-key-input');
  const statusBadge = document.getElementById('api-status-badge');

  if (providerSelect) providerSelect.value = current.provider || 'auto';
  if (keyInput) keyInput.value = current.apiKey || '';

  if (statusBadge) {
    if (current.apiKey) {
      statusBadge.textContent = 'مُدخل يدوياً 🔑';
      statusBadge.className = 'text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800 font-semibold';
    } else {
      statusBadge.textContent = 'تلقائي (الخادم)';
      statusBadge.className = 'text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700';
    }
  }
}

export function handleSaveSettings() {
  const providerSelect = document.getElementById('provider-select');
  const keyInput = document.getElementById('api-key-input');
  
  const provider = providerSelect?.value || 'auto';
  const apiKey = keyInput?.value.trim() || '';

  saveSettings({ provider, apiKey });
  renderSettingsFields();

  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'تم الحفظ ✓';
    saveBtn.classList.replace('bg-purple-600', 'bg-green-600');
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.classList.replace('bg-green-600', 'bg-purple-600');
    }, 1500);
  }
}

export function handleClearSettings() {
  clearSettings();
  renderSettingsFields();
}

export function toggleKeyVisibility() {
  const keyInput = document.getElementById('api-key-input');
  const toggleBtn = document.getElementById('toggle-key-visibility-btn');
  if (!keyInput) return;

  if (keyInput.type === 'password') {
    keyInput.type = 'text';
    if (toggleBtn) toggleBtn.textContent = '🔒';
  } else {
    keyInput.type = 'password';
    if (toggleBtn) toggleBtn.textContent = '👁️';
  }
}

export function openSettingsModal() {
  renderSettingsFields();
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

