// Service Worker - APK Planner
const CACHE_NAME = 'apk-planner-v1';
const DB_NAME = 'apk-planner-sw';
const DB_VERSION = 1;

let pendingTimers = new Map();
let _reminderInterval = null;

// ─── INDEXED DB HELPERS ─────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('scheduled')) {
        db.createObjectStore('scheduled', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(store, value) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

function dbGetAll(store) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

function dbDelete(store, id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

// ─── INSTALL & ACTIVATE ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
      .then(() => restoreScheduledNotifications())
  );
});

// ─── RESTORE PENDING NOTIFICATIONS ────────────────────────────────────────
async function restoreScheduledNotifications() {
  try {
    const items = await dbGetAll('scheduled');
    for (const item of items) {
      const delay = item.timestamp - Date.now();
      if (delay > 0) {
        scheduleSWNotification(item.id, item.title, item.body, delay);
      } else {
        await dbDelete('scheduled', item.id);
      }
    }

    const metas = await dbGetAll('meta');
    const reminderMeta = metas.find(m => m.key === 'reminder');
    if (reminderMeta) {
      scheduleDailyReminderSW(reminderMeta.jam, reminderMeta.menit, reminderMeta.title, reminderMeta.body);
    }
  } catch (e) {
    console.warn('[SW] Gagal restore notifikasi:', e);
  }
}

function scheduleSWNotification(id, title, body, delay) {
  const timerId = setTimeout(async () => {
    try {
      await self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: `jadwal-${id}`,
      });
    } catch (_) {}
    await dbDelete('scheduled', id).catch(() => {});
    pendingTimers.delete(id);
  }, delay);
  pendingTimers.set(id, timerId);
}

// ─── FETCH ────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ─── MESSAGE FROM APP ─────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { type, ...data } = event.data || {};

  if (type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title, data.options);
  }

  if (type === 'SCHEDULE_NOTIFICATION') {
    handleScheduleNotification(data);
  }

  if (type === 'CANCEL_NOTIFICATION') {
    handleCancelNotification(data);
  }

  if (type === 'SCHEDULE_DAILY_REMINDER') {
    handleDailyReminder(data);
  }

  if (type === 'CLEAR_REMINDER') {
    if (_reminderInterval) clearInterval(_reminderInterval);
    _reminderInterval = null;
    dbDelete('meta', 'reminder').catch(() => {});
  }
});

async function handleScheduleNotification(data) {
  const delay = data.timestamp - Date.now();
  if (delay <= 0) return;

  // Persist to IndexedDB
  await dbPut('scheduled', {
    id: data.id,
    title: data.title,
    body: data.body,
    timestamp: data.timestamp,
  }).catch(() => {});

  // Cancel existing if any
  if (pendingTimers.has(data.id)) {
    clearTimeout(pendingTimers.get(data.id));
  }

  scheduleSWNotification(data.id, data.title, data.body, delay);
}

async function handleCancelNotification(data) {
  if (pendingTimers.has(data.id)) {
    clearTimeout(pendingTimers.get(data.id));
    pendingTimers.delete(data.id);
  }
  await dbDelete('scheduled', data.id).catch(() => {});
}

async function handleDailyReminder(data) {
  // Store reminder config
  await dbPut('meta', {
    key: 'reminder',
    jam: data.jam,
    menit: data.menit,
    title: data.title,
    body: data.body,
  }).catch(() => {});

  scheduleDailyReminderSW(data.jam, data.menit, data.title, data.body);
}

// ─── DAILY REMINDER ───────────────────────────────────────────────────────
function scheduleDailyReminderSW(jam, menit, title, body) {
  if (_reminderInterval) clearInterval(_reminderInterval);
  // Check every 30 seconds
  _reminderInterval = setInterval(async () => {
    const now = new Date();
    if (now.getHours() === jam && now.getMinutes() === menit) {
      // Cek apakah sudah pernah ditampilkan hari ini
      try {
        const metas = await dbGetAll('meta');
        const shown = metas.find(m => m.key === 'reminder-shown');
        const today = new Date().toDateString();
        if (shown?.date === today) return;
        await dbPut('meta', { key: 'reminder-shown', date: today });
      } catch (_) {}

      try {
        await self.registration.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [300, 100, 300, 100, 300],
          requireInteraction: true,
          tag: 'reminder-malam',
        });
      } catch (_) {}
    }
  }, 30 * 1000);
}

// ─── NOTIFICATION CLICK ───────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        clientList[0].focus();
        clientList[0].navigate('/#jadwal').catch(() => {});
      } else {
        clients.openWindow('/#jadwal').catch(() => {});
      }
    })
  );
});

// ─── SYNC (untuk notifikasi yang terlewat) ────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(restoreScheduledNotifications());
  }
});
