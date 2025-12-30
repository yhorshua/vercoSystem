import { getApiUrl, parseError } from './http';

export type SellerOption = { id: number; full_name: string };

export type CreateUserPayload = {
  full_name: string;
  email: string;
  password: string;
  rol_id: number;
  warehouse_id: number;
  cellphone?: string;
  address_home?: string;
  id_cedula?: string;
};

export async function getSellersByWarehouse(warehouseId: number, token: string): Promise<SellerOption[]> {
  const API_URL = getApiUrl();
  if (!warehouseId || warehouseId <= 0) return [];

  const url = new URL(`${API_URL}/users/by-warehouse`);
  url.searchParams.set('warehouseId', String(warehouseId));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(await parseError(res));

  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((u: any) => ({ id: Number(u?.id), full_name: String(u?.full_name ?? '') }))
    .filter((u) => Number.isFinite(u.id) && u.id > 0 && u.full_name.length > 0);
}

export async function createUser(payload: CreateUserPayload, token: string) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getUsers(token: string) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
