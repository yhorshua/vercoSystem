import { getApiUrl, parseError } from './http';

export type WarehouseRow = {
  id: number;
  warehouse_name: string;
  type?: string | null;
  location?: string | null;
  status?: boolean;
};

export async function getWarehouses(token?: string): Promise<WarehouseRow[]> {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/warehouses`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();

  return Array.isArray(data)
    ? data
      .map((w: any) => ({
        id: Number(w?.id),
        warehouse_name: String(w?.warehouse_name ?? ''),
        type: w?.type ?? null,
        location: w?.location ?? null,
        status: Boolean(w?.status),
      }))
      .filter((w) => w.id > 0 && w.warehouse_name)
    : [];
}

export async function createWarehouse(
  payload: { warehouse_name: string; type?: string; location?: string },
  token?: string
) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/warehouses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
