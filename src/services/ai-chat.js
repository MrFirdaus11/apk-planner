const API_BASE = 'https://integrate.api.nvidia.com/v1';
const MODEL = 'deepseek-ai/deepseek-v4-pro';

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

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 4096,
      extra_body: { chat_template_kwargs: { thinking: false } },
    }),
  });

  if (!response.ok) {
    let errMsg = `Gagal terhubung ke AI (${response.status})`;
    try {
      const err = await response.json();
      errMsg = err.error?.message || err.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
