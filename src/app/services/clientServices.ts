// src/app/services/clientServices.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type CreateClientPayload = {
  // ✅ enviamos el code (SUNAT): '01' DNI, '06' RUC, etc.
  document_type_code: string;
  document_number: string;
  business_name: string;
  trade_name?: string;
  address?: string;
  district?: string;
  province?: string;
  department?: string;
  country?: string;
  email?: string;
  phone?: string;
};

export type ClientRow = {
  id: number;
  // en DB queda el code (01/06) o el campo que uses
  document_type: string;
  document_number: string;
  business_name: string;
  trade_name: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  seller_id: number | null;
  created_at: string;
  updated_at: string | null;
  last_order_at: string | null;
};

function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error en servicio de clientes';
}

export async function createClient(payload: CreateClientPayload, token: string) {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const res = await fetch(`${API_URL}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));
  }

  return (await res.json()) as ClientRow;
}

export async function getMyClients(token: string): Promise<ClientRow[]> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const res = await fetch(`${API_URL}/clients/mine`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));
  }

  const data = await res.json();
  return Array.isArray(data) ? (data as ClientRow[]) : [];
}
