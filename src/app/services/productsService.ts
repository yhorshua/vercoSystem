const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getProductsByWarehouse(warehouseId: number, token: string) {
  const res = await fetch(`${API_URL}/products/warehouse/${warehouseId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}
