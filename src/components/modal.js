let activeModal = null;

export function bukaModal({ judul, konten, aksi = [], ukuran = 'normal' }) {
  tutupModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'modal-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'modal-sheet';
  if (ukuran === 'besar') sheet.style.maxHeight = '96vh';

  sheet.innerHTML = `
    <div class="modal-handle"></div>
    ${judul ? `<h3 class="modal-title">${judul}</h3>` : ''}
    <div class="modal-body">${typeof konten === 'string' ? konten : ''}</div>
    ${aksi.length ? `
      <div class="modal-actions">
        ${aksi.map(a => `
          <button class="btn ${a.kelas || 'btn-ghost'}" id="modal-btn-${a.id || a.label}">
            ${a.icon ? `<i data-lucide="${a.icon}" width="16" height="16"></i>` : ''}
            ${a.label}
          </button>
        `).join('')}
      </div>
    ` : ''}
  `;

  if (typeof konten !== 'string' && konten instanceof HTMLElement) {
    sheet.querySelector('.modal-body').appendChild(konten);
  }

  backdrop.appendChild(sheet);
  document.getElementById('modal-container').appendChild(backdrop);
  activeModal = backdrop;

  if (window.lucide) window.lucide.createIcons();

  // Setup aksi buttons
  aksi.forEach(a => {
    const btn = sheet.querySelector(`#modal-btn-${a.id || a.label}`);
    if (btn && a.onClick) btn.addEventListener('click', a.onClick);
  });

  // Tutup saat klik backdrop
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) tutupModal();
  });

  return sheet;
}

export function tutupModal() {
  const existing = document.getElementById('modal-backdrop');
  if (existing) {
    existing.style.opacity = '0';
    existing.style.transition = 'opacity 0.2s';
    setTimeout(() => existing.remove(), 200);
  }
  activeModal = null;
}

export function updateModalBody(html) {
  const body = document.querySelector('.modal-body');
  if (body) body.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}
