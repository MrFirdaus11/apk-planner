export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { messages, apiKey, max_tokens = 512, model } = request.body;

    if (!apiKey) {
      return response.status(400).json({ error: 'API key diperlukan' });
    }

    if (typeof max_tokens !== 'number') max_tokens = 512;
    if (!model) model = 'meta/llama-3.1-8b-instruct';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiResponse.ok) {
      const err = await apiResponse.json().catch(() => ({}));
      const msg = err.error?.message || err.message || '';
      if (apiResponse.status === 429) {
        return response.status(429).json({ error: 'Terlalu banyak permintaan atau kuota API habis. Tunggu beberapa saat atau gunakan API key lain.' });
      }
      return response.status(apiResponse.status).json({
        error: msg || `Gagal terhubung ke AI (${apiResponse.status})`,
      });
    }

    const data = await apiResponse.json();
    return response.status(200).json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return response.status(504).json({ error: 'AI tidak merespon, coba pertanyaan yang lebih sederhana' });
    }
    return response.status(500).json({ error: err.message || 'Terjadi kesalahan internal' });
  }
}
