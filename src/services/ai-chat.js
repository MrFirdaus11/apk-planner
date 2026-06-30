let apiKey = '';
let abortController = null;

export function setApiKey(key) {
  apiKey = key;
}

export function getApiKey() {
  return apiKey;
}

export function hasApiKey() {
  return !!apiKey;
}

export function abortPesan() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

export async function kirimPesan(riwayat, pesanBaru, sistemPrompt, dataKonteks) {
  if (!apiKey) {
    throw new Error('API key belum diatur. Silakan atur di halaman Pengaturan.');
  }

  abortController = new AbortController();
  const signal = abortController.signal;

  const messages = [
    { role: 'system', content: `${sistemPrompt}\n\n${dataKonteks}` },
    ...riwayat,
    { role: 'user', content: pesanBaru },
  ];

  const timeout = setTimeout(() => {
    abortController.abort();
    abortController = null;
  }, 25000);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, apiKey }),
      signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      let errMsg = `Gagal terhubung ke AI (${response.status})`;
      try {
        const err = await response.json();
        errMsg = err.error || err.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Dibatalkan');
    }
    throw err;
  } finally {
    abortController = null;
  }
}
