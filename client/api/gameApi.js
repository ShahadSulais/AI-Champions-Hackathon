import { getSettings } from '../services/settingsService.js';
import { DEMO_LESSON } from '../data/demoLesson.js';
import { REALMS_FALLBACK_DATA } from '../data/realmsFallback.js';

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
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
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('API returned non-OK status. Returning DEMO_LESSON fallback.');
      return DEMO_LESSON;
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('API call failed or timed out. Returning DEMO_LESSON fallback:', err.message);
    return DEMO_LESSON;
  }
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

export async function fetchGenerateRealmsGame({ lessonTitle, studentLevel, lessonText, storyTheme, memory }) {
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${API_BASE}/api/games/generate-realms`, {
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
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Realms API returned non-OK status. Returning REALMS_FALLBACK_DATA.');
      return { ...REALMS_FALLBACK_DATA, title: `مهمة ${lessonTitle || 'الدرس'} - بوابة الأكوان` };
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Realms API call failed or timed out. Returning REALMS_FALLBACK_DATA:', err.message);
    return { ...REALMS_FALLBACK_DATA, title: `مهمة ${lessonTitle || 'الدرس'} - بوابة الأكوان` };
  }
}
