const SETTINGS_KEY = 'kg_settings';

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { provider: 'auto', apiKey: '', experienceMode: 'adventure', reducedMotion: false };
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider || 'auto',
      apiKey: parsed.apiKey || '',
      experienceMode: parsed.experienceMode || 'adventure',
      reducedMotion: Boolean(parsed.reducedMotion)
    };
  } catch (err) {
    console.error('Failed to parse settings from localStorage:', err);
    return { provider: 'auto', apiKey: '', experienceMode: 'adventure', reducedMotion: false };
  }
}

export function saveSettings({ provider, apiKey, experienceMode, reducedMotion }) {
  try {
    const current = getSettings();
    const data = {
      provider: provider || current.provider || 'auto',
      apiKey: apiKey !== undefined ? apiKey.trim() : current.apiKey,
      experienceMode: experienceMode || current.experienceMode || 'adventure',
      reducedMotion: reducedMotion !== undefined ? Boolean(reducedMotion) : current.reducedMotion
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

