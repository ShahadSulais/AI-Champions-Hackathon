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
    instrBox.className = 'mb-3';
    const instrTitle = document.createElement('span');
    instrTitle.className = 'text-xs font-bold text-purple-300 block mb-1';
    instrTitle.textContent = '🎮 تفاعل التصنيف:';
    const instrDesc = document.createElement('p');
    instrDesc.className = 'text-xs text-slate-400';
    instrDesc.textContent = 'اختر العنصر ثم اضغط على الفئة المناسبة له. يمكنك إعادة التغيير في أي وقت.';
    instrBox.appendChild(instrTitle);
    instrBox.appendChild(instrDesc);
    container.appendChild(instrBox);

    // Grid Layout
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

    // Unassigned Side
    const unassignedCol = document.createElement('div');
    unassignedCol.className = 'space-y-2';
    const unassignedTitle = document.createElement('span');
    unassignedTitle.className = 'text-xs font-semibold text-slate-400 block';
    unassignedTitle.textContent = 'العناصر غير المَصنفة:';
    const unassignedBox = document.createElement('div');
    unassignedBox.id = 'unassigned-items';
    unassignedBox.className = 'min-h-[140px] bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-wrap gap-2 items-start';

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
    catTitle.className = 'text-xs font-semibold text-slate-400 block';
    catTitle.textContent = 'الفئات المستهدفة:';
    catCol.appendChild(catTitle);

    state.interactiveData.categories.forEach(cat => {
      const dropzone = document.createElement('div');
      dropzone.className = 'category-dropzone bg-slate-900/80 hover:bg-purple-950/40 border border-purple-900/50 p-3 rounded-xl min-h-[70px] transition cursor-pointer focus:ring-2 focus:ring-purple-500 outline-none';
      dropzone.dataset.catId = cat.id;
      dropzone.setAttribute('tabindex', '0');
      dropzone.setAttribute('role', 'button');
      dropzone.setAttribute('aria-label', `فئة: ${cat.label}`);

      const catHeader = document.createElement('div');
      catHeader.className = 'text-xs font-bold text-purple-300 mb-1';
      catHeader.textContent = cat.label;

      const catItemsBox = document.createElement('div');
      catItemsBox.id = `cat-items-${cat.id}`;
      catItemsBox.className = 'flex flex-wrap gap-1.5';

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
    headerBox.className = 'mb-3';

    const headerTag = document.createElement('span');
    headerTag.className = 'text-xs font-bold text-purple-300 block mb-1';
    headerTag.textContent = '✍️ الإجابة المفاهيمية القصيرة:';

    const qPrompt = document.createElement('p');
    qPrompt.className = 'text-sm font-semibold text-slate-200 mb-3';
    qPrompt.textContent = questionText;

    headerBox.appendChild(headerTag);
    headerBox.appendChild(qPrompt);

    const textareaContainer = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.id = 'student-written-input';
    textarea.rows = 3;
    textarea.placeholder = 'اكتب إجابتك العلمية هنا...';
    textarea.className = 'w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition focus:ring-2 focus:ring-purple-500';

    textareaContainer.appendChild(textarea);
    container.appendChild(headerBox);
    container.appendChild(textareaContainer);
  }
}

function createClassificationItemEl(item) {
  const itemEl = document.createElement('div');
  itemEl.id = `item-${item.id}`;
  itemEl.dataset.itemId = item.id;
  itemEl.className = 'class-item bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-2 rounded-lg cursor-pointer transition font-semibold focus:ring-2 focus:ring-purple-500 outline-none';
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
  document.querySelectorAll('.class-item').forEach(el => el.classList.remove('border-purple-500', 'bg-purple-950'));
  state.selectedClassItem = itemId;
  const el = document.getElementById(`item-${itemId}`);
  if (el) el.classList.add('border-purple-500', 'bg-purple-950');
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
    badge.className = 'bg-purple-900/60 border border-purple-700/60 text-xs px-2.5 py-1 rounded-lg text-purple-200 font-semibold flex items-center gap-1 cursor-pointer focus:ring-2 focus:ring-purple-500 outline-none';
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('role', 'button');
    badge.setAttribute('aria-label', `${itemObj.text}، اضغط لإغلاق أو إعادة التصنيف`);

    const labelSpan = document.createElement('span');
    labelSpan.textContent = itemObj.text;

    const removeBtn = document.createElement('span');
    removeBtn.className = 'text-slate-400 hover:text-white ml-1 text-sm font-bold';
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
  instrBox.className = 'mb-3';

  const instrTitle = document.createElement('span');
  instrTitle.className = 'text-xs font-bold text-purple-300 block mb-1';
  instrTitle.textContent = '🎮 تفاعل الترتيب:';

  const instrDesc = document.createElement('p');
  instrDesc.className = 'text-xs text-slate-400';
  instrDesc.textContent = 'رتب الخطوات بالضغط على أزرار التبديل (أعلى / أسفل).';

  instrBox.appendChild(instrTitle);
  instrBox.appendChild(instrDesc);
  container.appendChild(instrBox);

  const listContainer = document.createElement('div');
  listContainer.className = 'space-y-2';
  listContainer.id = 'ordering-list';

  state.interactiveData.steps.forEach((step, idx) => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'flex items-center gap-2.5';

    const numBadge = document.createElement('span');
    numBadge.className = 'w-6 h-6 rounded-full bg-purple-900/60 text-purple-300 flex items-center justify-center text-[10px] font-bold';
    numBadge.textContent = String(idx + 1);

    const stepText = document.createElement('span');
    stepText.textContent = step.text;

    leftGroup.appendChild(numBadge);
    leftGroup.appendChild(stepText);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex items-center gap-1';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition focus:ring-2 focus:ring-purple-500 outline-none';
    upBtn.textContent = '⬆️ أعلى';
    upBtn.setAttribute('aria-label', `تحريك ${step.text} للأعلى`);
    upBtn.addEventListener('click', () => moveStep(idx, -1));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition focus:ring-2 focus:ring-purple-500 outline-none';
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
