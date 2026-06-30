let apiKey = '';

export function setApiKey(key) {
  apiKey = key;
}

export function getApiKey() {
  return apiKey;
}

export function hasApiKey() {
  return !!apiKey;
}

export async function kirimPesan(riwayat, pesanBaru, sistemPrompt, dataKonteks) {
  if (!apiKey) {
    throw new Error('API key belum diatur. Silakan atur di halaman Pengaturan.');
  }

  const messages = [
    { role: 'system', content: `${sistemPrompt}\n\n${dataKonteks}` },
    ...riwayat,
    { role: 'user', content: pesanBaru },
  ];

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, apiKey }),
  });

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
}
