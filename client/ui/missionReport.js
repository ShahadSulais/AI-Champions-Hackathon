// Guardian Mission Report & Interactive SVG Memory Constellation


export function renderMemoryConstellation(masteredConcepts = [], reviewConcepts = []) {
  const container = document.getElementById('constellation-canvas-container');
  if (!container) return;

  const totalConcepts = [...masteredConcepts, ...reviewConcepts];
  if (totalConcepts.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 p-4 text-center">لا توجد مفاهيم مسجلة في هذا التقرير بعد.</p>`;
    return;
  }

  // Calculate node positions in an SVG canvas (400x220)
  const width = 400;
  const height = 220;

  const nodes = totalConcepts.map((concept, idx) => {
    const isMastered = masteredConcepts.includes(concept);
    const angle = (idx / totalConcepts.length) * Math.PI * 2;
    const radius = 65 + (idx % 2) * 25;

    const x = Math.round(width / 2 + Math.cos(angle) * radius);
    const y = Math.round(height / 2 + Math.sin(angle) * radius);

    return { concept, isMastered, x, y };
  });

  // Generate SVG constellation lines connecting adjacent nodes
  let linePaths = '';
  for (let i = 0; i < nodes.length; i++) {
    const curr = nodes[i];
    const next = nodes[(i + 1) % nodes.length];
    const lineColor = (curr.isMastered && next.isMastered) ? '#f59e0b' : '#a855f7';
    linePaths += `<line x1="${curr.x}" y1="${curr.y}" x2="${next.x}" y2="${next.y}" stroke="${lineColor}" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.6" />`;
  }

  const svgContent = `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-48 md:h-56 mx-auto bg-slate-950/90 rounded-2xl border border-purple-900/50 p-2 shadow-inner">
      <defs>
        <radialGradient id="starGlowGold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="1" />
          <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#d97706" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="starGlowPurple" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f472b6" stop-opacity="0.9" />
          <stop offset="60%" stop-color="#c026d3" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#7e22ce" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Connection Lines -->
      <g class="constellation-lines">${linePaths}</g>

      <!-- Constellation Star Nodes -->
      ${nodes.map((n, index) => `
        <g class="constellation-node cursor-pointer transition-transform hover:scale-125" data-concept-idx="${index}">
          <circle cx="${n.x}" cy="${n.y}" r="${n.isMastered ? 14 : 10}" fill="${n.isMastered ? 'url(#starGlowGold)' : 'url(#starGlowPurple)'}" class="${n.isMastered ? 'animate-pulse' : ''}" />
          <circle cx="${n.x}" cy="${n.y}" r="${n.isMastered ? 5 : 3}" fill="#ffffff" />
          <text x="${n.x}" y="${n.y + 22}" text-anchor="middle" fill="${n.isMastered ? '#fef08a' : '#e879f9'}" font-size="10" font-weight="bold" font-family="sans-serif">
            ${n.concept.length > 12 ? n.concept.substring(0, 10) + '..' : n.concept}
          </text>
        </g>
      `).join('')}
    </svg>
  `;

  container.innerHTML = svgContent;

  // Add click handler to node elements to show concept details
  container.querySelectorAll('.constellation-node').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-concept-idx'), 10);
      const target = nodes[idx];
      if (target) showConceptDetailModal(target.concept, target.isMastered);
    });
  });
}

function showConceptDetailModal(conceptName, isMastered) {
  const detailBox = document.getElementById('constellation-detail-box');
  if (!detailBox) return;

  detailBox.className = `p-4 rounded-2xl border text-right space-y-1 transition-all duration-300 animate-fade-in ${
    isMastered 
      ? 'bg-amber-950/80 border-amber-500/60 text-amber-200' 
      : 'bg-purple-950/80 border-purple-500/60 text-purple-200'
  }`;

  detailBox.innerHTML = `
    <div class="flex justify-between items-center">
      <span class="text-xs font-bold ${isMastered ? 'text-amber-300' : 'text-purple-300'} flex items-center gap-1.5">
        <span>${isMastered ? '⭐ مفهوم متقن بنجاح' : '📌 مفهوم يحتاج مراجعة'}</span>
      </span>
      <span class="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-300">${isMastered ? 'مكتمل' : 'قيد التطوير'}</span>
    </div>
    <h4 class="font-bold text-sm text-white mt-1">${conceptName}</h4>
    <p class="text-xs text-slate-300 leading-relaxed">
      ${isMastered 
        ? 'أظهرت أداءً متميزًا في فهم وتطبيق هذا المفهوم خلال التحديات.' 
        : 'تم حفظ هذا المفهوم في ذاكرة المراجعة القادمة لتثبيته بشكل أفضل.'}
    </p>
  `;

  detailBox.classList.remove('hidden');
}
