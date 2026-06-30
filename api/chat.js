export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, apiKey } = request.body;

    if (!apiKey) {
      return response.status(400).json({ error: 'API key diperlukan' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-ai/deepseek-v4-pro',
        messages,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 4096,
        extra_body: { chat_template_kwargs: { thinking: false } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiResponse.ok) {
      const err = await apiResponse.json().catch(() => ({}));
      return response.status(apiResponse.status).json({
        error: err.error?.message || `Gagal terhubung ke AI (${apiResponse.status})`,
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
