export async function fetchGenerateGame({ lessonTitle, studentLevel, lessonText, storyTheme, memory }) {
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : '';

  const response = await fetch(`${API_BASE}/api/games/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lessonTitle, studentLevel, lessonText, storyTheme, memory }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'فشل في توليد اللعبة التكيفية عبر المحرك الذكي.');
  }

  return await response.json();
}
