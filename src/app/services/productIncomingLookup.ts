const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type ProductIncomingResponse = {
  product_id: number;
  article_code: string;
  article_description: string;
  article_series: string;
  unit_price: number;
  unit_of_measure: string;
  sizes: Array<{
    product_size_id: number;
    size: string; // "38"
  }>;
};

function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error consultando producto';
}

export async function getProductByCodeForIncoming(articleCode: string, token: string) {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const code7 = articleCode.trim().toUpperCase().substring(0, 7);

  const res = await fetch(`${API_URL}/products/by-code/${code7}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));
  }

  return res.json() as Promise<ProductIncomingResponse>;
}
