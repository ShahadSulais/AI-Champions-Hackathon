import { state } from '../state/gameState.js';
import { playSound } from '../services/audioService.js';

export function renderMiniGame() {
  const container = document.getElementById('minigame-container');
  if (!container) return;
  container.replaceChildren(); // Safely clear container

  const type = state.currentSceneData.gameType;

  if (type === 'classification') {
    const chal = state.currentSceneData.challenge;

    // Shuffle items copy without modifying original
    state.interactiveData.items = [...chal.items].sort(() => Math.random() - 0.5);
    state.interactiveData.categories = [...chal.categories];
    state.interactiveData.assignments = {};
    state.selectedClassItem = null;

    // Instruction Box
    const instrBox = document.createElement('div');
    instrBox.className = 'mb-3 flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-3';

    const leftTitleGroup = document.createElement('div');
    const instrBadge = document.createElement('span');
    instrBadge.className = 'text-xs font-bold bg-purple-950 text-purple-300 border border-purple-700/60 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-1';
    instrBadge.textContent = '🧩 تحدي التصنيف المفاهيمي';

    const instrDesc = document.createElement('p');
    instrDesc.className = 'text-xs text-slate-400';
    instrDesc.textContent = 'اضغط على العنصر أولاً لتحديده، ثم اضغط على الفئة المناسبة لنقله إليها.';

    leftTitleGroup.appendChild(instrBadge);
    leftTitleGroup.appendChild(instrDesc);
    instrBox.appendChild(leftTitleGroup);
    container.appendChild(instrBox);

    // Grid Layout
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

    // Unassigned Side
    const unassignedCol = document.createElement('div');
    unassignedCol.className = 'space-y-2';

    const unassignedTitle = document.createElement('span');
    unassignedTitle.className = 'text-xs font-bold text-slate-300 block flex items-center gap-1';
    unassignedTitle.textContent = '📦 العناصر غير المَصنفة:';

    const unassignedBox = document.createElement('div');
    unassignedBox.id = 'unassigned-items';
    unassignedBox.className = 'min-h-[140px] bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-wrap gap-2 items-start';

    state.interactiveData.items.forEach(item => {
      const itemEl = createClassificationItemEl(item);
      unassignedBox.appendChild(itemEl);
    });

    unassignedCol.appendChild(unassignedTitle);
    unassignedCol.appendChild(unassignedBox);
    grid.appendChild(unassignedCol);

    // Categories Side
    const catCol = document.createElement('div');
    catCol.className = 'space-y-3';

    const catTitle = document.createElement('span');
    catTitle.className = 'text-xs font-bold text-slate-300 block flex items-center gap-1';
    catTitle.textContent = '🎯 الفئات المستهدفة:';
    catCol.appendChild(catTitle);

    state.interactiveData.categories.forEach(cat => {
      const dropzone = document.createElement('div');
      dropzone.className = 'category-dropzone bg-slate-900/80 hover:bg-purple-950/40 border border-purple-900/60 p-3 rounded-xl min-h-[80px] transition cursor-pointer focus:ring-2 focus:ring-purple-400 outline-none';
      dropzone.dataset.catId = cat.id;
      dropzone.setAttribute('tabindex', '0');
      dropzone.setAttribute('role', 'button');
      dropzone.setAttribute('aria-label', `فئة: ${cat.label}، اضغط لتخصيص العنصر المحدد`);

      const catHeader = document.createElement('div');
      catHeader.className = 'text-xs font-bold text-purple-300 mb-2 flex items-center gap-1.5';
      catHeader.innerHTML = `<span>📂</span> <span>${cat.label}</span>`;

      const catItemsBox = document.createElement('div');
      catItemsBox.id = `cat-items-${cat.id}`;
      catItemsBox.className = 'flex flex-wrap gap-2';

      dropzone.appendChild(catHeader);
      dropzone.appendChild(catItemsBox);

      const triggerAssign = () => assignToCategory(cat.id);
      dropzone.addEventListener('click', triggerAssign);
      dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerAssign();
        }
      });

      catCol.appendChild(dropzone);
    });

    grid.appendChild(catCol);
    container.appendChild(grid);

  } else if (type === 'ordering') {
    const chal = state.currentSceneData.challenge;

    // Shuffle steps copy without modifying original answer key
    state.interactiveData.steps = [...chal.steps].sort(() => Math.random() - 0.5);

    renderOrderingList(container);

  } else if (type === 'written_answer') {
    const chal = state.currentSceneData.challenge;
    let questionText = chal.question;

    if (state.currentSceneIndex === 2 && state.studentSession.struggledScenesCount >= 1) {
      questionText = "بناءً على تتبع الذاكرة، تم تيسير السؤال لدعم استيعابك: " + chal.question;
      state.studentSession.adaptedDifficulty = 'support';
    } else if (state.currentSceneIndex === 2 && state.studentSession.struggledScenesCount === 0) {
      questionText = "بصفتك باحثاً متقدماً: " + chal.question + " وضح التأثير العميق لذلك.";
      state.studentSession.adaptedDifficulty = 'higher';
    }

    const headerBox = document.createElement('div');
    headerBox.className = 'mb-3 space-y-2';

    const headerBadge = document.createElement('span');
    headerBadge.className = 'text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-3 py-1 rounded-full inline-flex items-center gap-1.5';
    headerBadge.textContent = '✍️ تحدي الإجابة المفاهيمية القصيرة';

    const qPrompt = document.createElement('p');
    qPrompt.className = 'text-sm font-semibold text-slate-100 bg-slate-900/90 border border-slate-800 p-4 rounded-xl leading-relaxed';
    qPrompt.textContent = questionText;

    headerBox.appendChild(headerBadge);
    headerBox.appendChild(qPrompt);

    const textareaContainer = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.id = 'student-written-input';
    textarea.rows = 3;
    textarea.placeholder = 'اكتب إجابتك العلمية الواضحة هنا...';
    textarea.setAttribute('aria-label', 'حقل الإجابة العلمية القصيرة');
    textarea.className = 'w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400 transition leading-relaxed';

    textareaContainer.appendChild(textarea);
    container.appendChild(headerBox);
    container.appendChild(textareaContainer);
  }
}

function createClassificationItemEl(item) {
  const itemEl = document.createElement('div');
  itemEl.id = `item-${item.id}`;
  itemEl.dataset.itemId = item.id;
  itemEl.className = 'class-item bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition font-semibold text-slate-100 focus:ring-2 focus:ring-purple-400 outline-none shadow-sm';
  itemEl.textContent = item.text;
  itemEl.setAttribute('tabindex', '0');
  itemEl.setAttribute('role', 'button');

  const triggerSelect = () => selectClassificationItem(item.id);
  itemEl.addEventListener('click', triggerSelect);
  itemEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerSelect();
    }
  });

  return itemEl;
}

function selectClassificationItem(itemId) {
  playSound('select');
  document.querySelectorAll('.class-item').forEach(el => {
    el.classList.remove('border-purple-400', 'bg-purple-950', 'ring-2', 'ring-purple-400', 'text-purple-200');
    el.classList.add('border-slate-600', 'bg-slate-800', 'text-slate-100');
  });

  state.selectedClassItem = itemId;
  const el = document.getElementById(`item-${itemId}`);
  if (el) {
    el.classList.remove('border-slate-600', 'bg-slate-800', 'text-slate-100');
    el.classList.add('border-purple-400', 'bg-purple-950', 'ring-2', 'ring-purple-400', 'text-purple-200');
  }
}

function assignToCategory(catId) {
  if (!state.selectedClassItem) return;
  playSound('select');

  const itemId = state.selectedClassItem;
  state.interactiveData.assignments[itemId] = catId;
  const itemObj = state.interactiveData.items.find(i => i.id === itemId);

  // Remove existing elements from DOM if already assigned elsewhere
  const itemEl = document.getElementById(`item-${itemId}`);
  if (itemEl) itemEl.remove();

  const existingBadge = document.getElementById(`assigned-${itemId}`);
  if (existingBadge) existingBadge.remove();

  const catBox = document.getElementById(`cat-items-${catId}`);
  if (catBox && itemObj) {
    const badge = document.createElement('div');
    badge.id = `assigned-${itemId}`;
    badge.className = 'bg-purple-950 border border-purple-600/80 text-xs px-3 py-1.5 rounded-xl text-purple-200 font-semibold flex items-center gap-1.5 cursor-pointer focus:ring-2 focus:ring-purple-400 outline-none shadow-sm min-h-[38px]';
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('role', 'button');
    badge.setAttribute('aria-label', `${itemObj.text}، اضغط لإلغاء التخصيص`);

    const labelSpan = document.createElement('span');
    labelSpan.textContent = itemObj.text;

    const removeBtn = document.createElement('span');
    removeBtn.className = 'text-purple-300 hover:text-white mr-1 text-base font-bold';
    removeBtn.textContent = '×';

    badge.appendChild(labelSpan);
    badge.appendChild(removeBtn);

    const triggerUnassign = (e) => {
      e.stopPropagation();
      unassignItem(itemId);
    };

    badge.addEventListener('click', triggerUnassign);
    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerUnassign(e);
      }
    });

    catBox.appendChild(badge);
  }
  state.selectedClassItem = null;
}

function unassignItem(itemId) {
  playSound('select');
  delete state.interactiveData.assignments[itemId];

  const assignedEl = document.getElementById(`assigned-${itemId}`);
  if (assignedEl) assignedEl.remove();

  const itemObj = state.interactiveData.items.find(i => i.id === itemId);
  const unassignedContainer = document.getElementById('unassigned-items');
  if (itemObj && unassignedContainer) {
    const itemEl = createClassificationItemEl(itemObj);
    unassignedContainer.appendChild(itemEl);
  }
}

function renderOrderingList(container) {
  container.replaceChildren();

  const instrBox = document.createElement('div');
  instrBox.className = 'mb-3 border-b border-slate-800/80 pb-3';

  const instrBadge = document.createElement('span');
  instrBadge.className = 'text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-1';
  instrBadge.textContent = '🔢 تحدي ترتيب التسلسل الصحيح';

  const instrDesc = document.createElement('p');
  instrDesc.className = 'text-xs text-slate-400';
  instrDesc.textContent = 'استخدم أزرار (⬆️ أعلى / ⬇️ أسفل) لرصف الخطوات بالتسلسل العلمي الصحيح.';

  instrBox.appendChild(instrBadge);
  instrBox.appendChild(instrDesc);
  container.appendChild(instrBox);

  const listContainer = document.createElement('div');
  listContainer.className = 'space-y-2.5';
  listContainer.id = 'ordering-list';

  const totalSteps = state.interactiveData.steps.length;

  state.interactiveData.steps.forEach((step, idx) => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold shadow-sm hover:border-slate-700 transition';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'flex items-center gap-3';

    const numBadge = document.createElement('span');
    numBadge.className = 'w-7 h-7 rounded-full bg-purple-900/80 border border-purple-700/60 text-purple-200 flex items-center justify-center text-xs font-bold flex-shrink-0';
    numBadge.textContent = String(idx + 1);

    const stepText = document.createElement('span');
    stepText.className = 'text-slate-100 leading-relaxed';
    stepText.textContent = step.text;

    leftGroup.appendChild(numBadge);
    leftGroup.appendChild(stepText);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex items-center gap-1.5 flex-shrink-0';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.disabled = idx === 0;
    upBtn.className = `px-3 py-1.5 rounded-lg text-xs font-bold transition focus:ring-2 focus:ring-purple-400 outline-none flex items-center gap-1 ${
      idx === 0
        ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
    }`;
    upBtn.textContent = '⬆️ أعلى';
    upBtn.setAttribute('aria-label', `تحريك ${step.text} للأعلى`);
    upBtn.addEventListener('click', () => moveStep(idx, -1));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.disabled = idx === totalSteps - 1;
    downBtn.className = `px-3 py-1.5 rounded-lg text-xs font-bold transition focus:ring-2 focus:ring-purple-400 outline-none flex items-center gap-1 ${
      idx === totalSteps - 1
        ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
    }`;
    downBtn.textContent = '⬇️ أسفل';
    downBtn.setAttribute('aria-label', `تحريك ${step.text} الأسفل`);
    downBtn.addEventListener('click', () => moveStep(idx, 1));

    btnGroup.appendChild(upBtn);
    btnGroup.appendChild(downBtn);

    card.appendChild(leftGroup);
    card.appendChild(btnGroup);
    listContainer.appendChild(card);
  });

  container.appendChild(listContainer);
}

function moveStep(index, direction) {
  playSound('select');
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.interactiveData.steps.length) return;

  const temp = state.interactiveData.steps[index];
  state.interactiveData.steps[index] = state.interactiveData.steps[newIndex];
  state.interactiveData.steps[newIndex] = temp;

  const container = document.getElementById('minigame-container');
  if (container) renderOrderingList(container);
}

