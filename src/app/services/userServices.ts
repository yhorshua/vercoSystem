// /services/userServices.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SellerOption = {
  id: number;
  full_name: string;
};

function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error consultando vendedores';
}

/**
 * GET /users/by-warehouse?warehouseId=1
 */
export async function getSellersByWarehouse(warehouseId: number, token: string): Promise<SellerOption[]> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');
  if (!warehouseId || warehouseId <= 0) return [];

  const url = new URL(`${API_URL}/users/by-warehouse`);
  url.searchParams.set('warehouseId', String(warehouseId));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));
  }

  const data = await res.json();

  // Esperado: [{ id, full_name }]
  if (!Array.isArray(data)) return [];
  return data
    .map((u: any) => ({
      id: Number(u?.id),
      full_name: String(u?.full_name ?? ''),
    }))
    .filter((u) => Number.isFinite(u.id) && u.id > 0 && u.full_name.length > 0);
}
