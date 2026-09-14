const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type QuotationItemPayload = {
  product_id: number;
  product_size_id: number;
  quantity: number;
  unit_price: string;
  discount_amount?: string;
  tax_amount?: string;
};

export type CreateQuotationPayload = {
  client_id: number;
  seller_id: number;
  warehouse_id: number;
  idempotency_key: string;
  expires_on?: string;
  observations?: string;
  items: QuotationItemPayload[];
};

export type QuotationDetail = {
  id: number;
  quotation_id: number;
  product_id: number;
  product_size_id: number;
  sku_snapshot: string;
  description_snapshot: string;
  size_snapshot: string;
  quantity: number;
  used_quantity: number;
  remaining_quantity: number;
  unit_price: string;
  discount_amount: string;
  tax_amount: string;
  line_total: string;
};

export type QuotationHeader = {
  id: number;
  quote_number: string;
  client_id: number;
  client_name: string;
  seller_id: number;
  seller_name: string;
  warehouse_id: number;
  warehouse_name?: string;
  business_date: string;
  expires_on: string | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  status: string;
  effective_status?: string;
  observations: string | null;
  remaining_quantity?: number;
};

export type QuotationResponse = {
  quotation: QuotationHeader & Record<string, unknown>;
  details: QuotationDetail[];
  history: Array<Record<string, unknown>>;
};

function getMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    return Array.isArray(message) ? message.join('\n') : String(message || fallback);
  }
  return fallback;
}

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está configurado');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(getMessage(body, 'No se pudo completar la operación de cotización'));
  return body as T;
}

export function createQuotation(payload: CreateQuotationPayload, token: string) {
  return api<QuotationResponse>('/quotations', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAvailableQuotations(
  filters: { clientId: number; sellerId: number; page?: number; limit?: number },
  token: string,
) {
  const query = new URLSearchParams({
    client_id: String(filters.clientId),
    seller_id: String(filters.sellerId),
    available: 'true',
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 50),
  });
  return api<{ data: QuotationHeader[]; pagination: Record<string, number> }>(
    `/quotations?${query.toString()}`,
    token,
  );
}

export function getQuotation(id: number, token: string) {
  return api<QuotationResponse>(`/quotations/${id}`, token);
}

export function getQuotations(
  filters: {
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    sellerId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  },
  token: string,
) {
  const query = new URLSearchParams();
  if (filters.search) query.set('search', filters.search);
  if (filters.status) query.set('status', filters.status);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (filters.sellerId) query.set('seller_id', String(filters.sellerId));
  query.set('page', String(filters.page ?? 1));
  query.set('limit', String(filters.limit ?? 20));
  query.set('sort_by', filters.sortBy ?? 'date');
  query.set('sort_direction', filters.sortDirection ?? 'desc');
  return api<{ data: QuotationHeader[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
    `/quotations?${query.toString()}`,
    token,
  );
}
