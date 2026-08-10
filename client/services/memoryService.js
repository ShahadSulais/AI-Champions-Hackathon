const MEMORY_KEY = "knowledge_guardians_adaptive_memory_v4";

export function getMemory() {
  try {
    const mem = localStorage.getItem(MEMORY_KEY);
    return mem ? JSON.parse(mem) : { sessionsCount: 0, profileSummary: "طالب جديد في مستهل رحلته التعليمية.", recentConcepts: [], struggleAreas: [], timeline: [] };
  } catch (e) {
    return { sessionsCount: 0, profileSummary: "طالب جديد.", recentConcepts: [], struggleAreas: [], timeline: [] };
  }
}

export function updateMemory(sessionResult) {
  let memory = getMemory();
  memory.sessionsCount++;
  const timestamp = new Date().toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  memory.timeline.unshift({
    time: timestamp,
    lessonTitle: sessionResult.lessonTitle,
    scoreSummary: sessionResult.scoreSummary,
    struggles: sessionResult.struggles
  });
  if (memory.timeline.length > 10) memory.timeline.pop();

  sessionResult.mastered.forEach(m => {
    if (!memory.recentConcepts.includes(m)) memory.recentConcepts.unshift(m);
  });
  if (memory.recentConcepts.length > 8) memory.recentConcepts.pop();

  sessionResult.struggles.forEach(s => {
    if (!memory.struggleAreas.includes(s)) memory.struggleAreas.unshift(s);
  });
  if (memory.struggleAreas.length > 6) memory.struggleAreas.pop();

  memory.profileSummary = `أتم الطالب ${memory.sessionsCount} جلسة تعليمية. ${memory.struggleAreas.length > 0 ? 'يحتاج متابعة في: ' + memory.struggleAreas.slice(0, 2).join(', ') : 'أداء مستقر ومتطور في استيعاب المفاهيم العلمية.'}`;

  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export function clearMemory() {
  if (confirm("هل أنت متأكد من مسح الذاكرة التكيفية للطالب؟")) {
    localStorage.removeItem(MEMORY_KEY);
    alert("تم مسح الذاكرة بنجاح.");
    return true;
  }
  return false;
}
