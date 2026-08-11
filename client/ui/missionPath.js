// Mission Path Visual Quest Map Header Component
import { MissionStageSVG } from './svgAssets.js';

export const MISSION_STAGES = [
  { id: 'setup', num: 1, title: 'اكتشاف الدرس', icon: '🔍' },
  { id: 'loading', num: 2, title: 'تجهيز الحارس', icon: '⚡' },
  { id: 'briefing', num: 3, title: 'ملخص المهمة', icon: '📜' },
  { id: 'story', num: 4, title: 'بوابة القصة', icon: '🚪' },
  { id: 'game', num: 5, title: 'تحدي المعرفة', icon: '⚔️' },
  { id: 'realms', num: 6, title: 'المواجهة النهائية', icon: '🌌' },
  { id: 'report', num: 7, title: 'تقرير الحارس', icon: '📊' }
];

export function renderMissionPath(activeStageId) {
  const container = document.getElementById('mission-path-container');
  if (!container) return;

  const activeIndex = MISSION_STAGES.findIndex(s => s.id === activeStageId);
  const currentStageIndex = activeIndex >= 0 ? activeIndex : 0;

  const html = `
    <div class="bg-slate-950/90 border border-purple-900/40 rounded-2xl p-3 md:p-4 mb-5 shadow-lg backdrop-blur-md transition-all duration-300">
      <div class="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
        ${MISSION_STAGES.map((stage, idx) => {
          let status = 'upcoming';
          if (idx < currentStageIndex) status = 'completed';
          else if (idx === currentStageIndex) status = 'active';

          const isLast = idx === MISSION_STAGES.length - 1;

          return `
            <div class="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <div class="flex flex-col items-center gap-1 group cursor-default">
                <div class="relative">
                  ${MissionStageSVG(stage.num, status)}
                  <span class="absolute inset-0 flex items-center justify-center text-xs pointer-events-none">
                    ${status === 'completed' ? '' : stage.icon}
                  </span>
                </div>
                <span class="text-[10px] md:text-xs font-bold ${
                  status === 'active' 
                    ? 'text-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.8)]' 
                    : status === 'completed' 
                    ? 'text-emerald-400' 
                    : 'text-slate-500'
                } whitespace-nowrap">
                  ${stage.title}
                </span>
              </div>
              ${!isLast ? `
                <div class="w-4 md:w-8 h-1 rounded-full ${
                  idx < currentStageIndex 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                    : idx === currentStageIndex
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 animate-pulse'
                    : 'bg-slate-800'
                } transition-all duration-500"></div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}
