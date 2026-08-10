import { getSettings } from '../services/settingsService.js';

export async function fetchGenerateGame({ lessonTitle, studentLevel, lessonText, storyTheme, memory }) {
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : '';

  const { provider, apiKey } = getSettings();

  const headers = {
    'Content-Type': 'application/json',
  };

  if (provider && provider !== 'auto') {
    headers['X-LLM-Provider'] = provider;
  }
  if (apiKey) {
    if (provider === 'openrouter') {
      headers['X-OpenRouter-Key'] = apiKey;
    } else {
      headers['X-Gemini-Key'] = apiKey;
    }
  }

  const response = await fetch(`${API_BASE}/api/games/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      lessonTitle,
      studentLevel,
      lessonText,
      storyTheme,
      memory,
      provider: provider !== 'auto' ? provider : undefined,
      apiKey: apiKey || undefined
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'فشل في توليد اللعبة التكيفية عبر المحرك الذكي.');
  }

  return await response.json();
}

export async function fetchExtractTextFromImage({ imageBase64, mimeType }) {
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : '';

  const { provider, apiKey } = getSettings();

  const headers = {
    'Content-Type': 'application/json',
  };

  if (provider && provider !== 'auto') {
    headers['X-LLM-Provider'] = provider;
  }
  if (apiKey) {
    if (provider === 'openrouter') {
      headers['X-OpenRouter-Key'] = apiKey;
    } else {
      headers['X-Gemini-Key'] = apiKey;
    }
  }

  const response = await fetch(`${API_BASE}/api/extract-text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageBase64,
      mimeType,
      provider: provider !== 'auto' ? provider : undefined,
      apiKey: apiKey || undefined
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'فشل في استخراج النص من الصورة.');
  }

  const data = await response.json();
  return data.extractedText || '';
}


