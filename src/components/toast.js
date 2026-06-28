export function tampilkanToast(pesan, tipe = 'info', durasi = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: '💬', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipe}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[tipe] || '💬'}</span>
    <span>${pesan}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(() => toast.remove(), 250);
  }, durasi);
}
