const THEME_KEY = 'apk-theme';

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // Update theme-color meta tag
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = theme === 'dark' ? '#0F0F1A' : '#6C3CE1';
  }
}

// Auto-init on load
applyTheme(getTheme());
