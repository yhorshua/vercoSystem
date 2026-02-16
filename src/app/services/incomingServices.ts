const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type CreateIncomingPayload = {
  warehouse_id: number;
  user_id: number;
  reference?: string;
  items: Array<{
    product_id: number;
    product_size_id?: number | null;
    quantity: number;
    unit_of_measure: string; // "PAR"
  }>;
};

function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error registrando ingreso';
}

export async function registerIncoming(payload: CreateIncomingPayload, token: string) {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const res = await fetch(`${API_URL}/stock/incoming`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,  // Enviar el token de autorización
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));  // Manejamos el error de forma segura
  }

  return res.json();  // Devuelve la respuesta en formato JSON
}
