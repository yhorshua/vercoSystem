const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getApiUrl() {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');
  return API_URL;
}

export async function parseError(res: Response) {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || `Error HTTP ${res.status}`;
}
