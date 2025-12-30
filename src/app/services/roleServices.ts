import { getApiUrl, parseError } from './http';

export type RoleRow = { id: number; name_role: string };

export async function getRoles(token?: string): Promise<RoleRow[]> {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/roles`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return Array.isArray(data)
    ? data.map((r: any) => ({ id: Number(r?.id), name_role: String(r?.name_role ?? '') }))
        .filter((r) => r.id > 0 && r.name_role)
    : [];
}

export async function createRole(name_role: string, token?: string) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ name_role }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
