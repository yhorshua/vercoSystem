const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type DocumentTypeRow = {
  code: string;
  name: string;        // DNI/RUC
  description: string; // texto
};

function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error en servicio de tipos de documento';
}

export async function getDocumentTypes(token?: string): Promise<DocumentTypeRow[]> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const res = await fetch(`${API_URL}/document-types`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .map((x: any) => ({
      code: String(x?.code ?? ''),
      name: String(x?.name ?? ''),
      description: String(x?.description ?? ''),
    }))
    .filter((x) => x.code.length > 0 && x.name.length > 0);
}
