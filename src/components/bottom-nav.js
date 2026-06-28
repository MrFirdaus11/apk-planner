export function renderBottomNav() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  const currentHash = window.location.hash.slice(1) || 'jadwal';

  const items = [
    { id: 'jadwal', label: 'Jadwal', icon: 'calendar-days' },
    { id: 'fokus', label: 'Pomodoro', icon: 'timer' },
    { id: 'manifestasi', label: 'Manifestasi', icon: 'sparkles' },
    { id: 'jurnal', label: 'Jurnal', icon: 'scroll-text' },
    { id: 'progres', label: 'Progres', icon: 'bar-chart-2' },
  ];

  nav.className = 'bottom-nav';
  nav.innerHTML = items.map(item => `
    <a href="#${item.id}" class="nav-item ${currentHash === item.id ? 'active' : ''}" id="nav-${item.id}">
      <div class="nav-icon-wrap">
        <i data-lucide="${item.icon}" width="20" height="20"></i>
      </div>
      <span class="nav-label">${item.label}</span>
    </a>
  `).join('');

  // Re-render Lucide icons
  if (window.lucide) window.lucide.createIcons();
}
