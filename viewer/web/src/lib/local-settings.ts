const KEY = 'blv-settings';

export interface LocalSettings {
  apiKey: string;
}

const DEFAULTS: LocalSettings = {
  apiKey: '',
};

export function getSettings(): LocalSettings {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function setSettings(s: Partial<LocalSettings>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const merged = { ...getSettings(), ...s };
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* noop */
  }
}
