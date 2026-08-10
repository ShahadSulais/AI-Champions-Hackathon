const SETTINGS_KEY = 'kg_settings';

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { provider: 'auto', apiKey: '' };
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider || 'auto',
      apiKey: parsed.apiKey || ''
    };
  } catch (err) {
    console.error('Failed to parse settings from localStorage:', err);
    return { provider: 'auto', apiKey: '' };
  }
}

export function saveSettings({ provider, apiKey }) {
  try {
    const data = {
      provider: provider || 'auto',
      apiKey: (apiKey || '').trim()
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
    return false;
  }
}

export function clearSettings() {
  try {
    localStorage.removeItem(SETTINGS_KEY);
    return true;
  } catch (err) {
    console.error('Failed to clear settings:', err);
    return false;
  }
}
