import { getApiUrl, parseError } from './http';

export type PaymentState = 'pendiente' | 'vence_hoy' | 'vencido' | 'cancelado';
export type PaymentFilter = 'all' | 'pending' | 'due_today' | 'overdue' | 'paid';
export type CreditPaymentMethod =
  | 'efectivo'
  | 'yape'
  | 'plin'
  | 'tarjetaDebito'
  | 'tarjetaCredito';

export type PendingPaymentRow = {
  id: number;
  sale_code: string;
  sale_date: string;
  customer_id: number | null;
  customer_name: string;
  total_amount: string;
  monto_adelanto: string;
  amount_paid: string;
  monto_restante: string;
  fecha_proximo_pago: string | null;
  days_remaining: number | null;
  payment_state: PaymentState;
};

export type PendingPaymentsResponse = {
  data: PendingPaymentRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type PaymentHistoryRow = {
  id: number;
  amount: string;
  method: CreditPaymentMethod;
  payment_date: string | null;
  operation_number: string | null;
  notes: string | null;
  registered_by_user_id: number | null;
  registered_by: string | null;
  created_at: string;
};

export type PendingPaymentDetail = {
  sale: PendingPaymentRow & {
    warehouse_id: number;
    user_id: number;
    metodo_pago_adelanto: string | null;
    payment_status: 'PENDING' | 'PAID';
  };
  items: Array<{
    id: number;
    article_code: string;
    article_description: string;
    size: string | null;
    quantity: string;
    unit_price: string;
    line_total: string;
  }>;
  payments: PaymentHistoryRow[];
};

export type PendingPaymentQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentFilter;
  from?: string;
  to?: string;
  warehouseId?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
};

async function authorizedRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export function getPendingPayments(query: PendingPaymentQuery, token: string) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return authorizedRequest<PendingPaymentsResponse>(
    `/pending-payments?${params.toString()}`,
    token,
  );
}

export function getPendingPaymentDetail(saleId: number, token: string) {
  return authorizedRequest<PendingPaymentDetail>(`/pending-payments/${saleId}`, token);
}

export function getPendingPaymentCount(token: string) {
  return authorizedRequest<{
    pendingCredits: number;
    definition: 'credit_sales_with_pending_balance';
    businessDate: string;
    timeZone: 'America/Lima';
  }>('/pending-payments/count', token);
}

export function registerCreditPayment(
  saleId: number,
  payload: {
    amount: string;
    payment_date: string;
    method: CreditPaymentMethod;
    operation_number?: string;
    next_payment_date?: string;
    idempotency_key: string;
    notes?: string;
  },
  token: string,
) {
  return authorizedRequest<{
    message: string;
    duplicate: boolean;
    payment: PaymentHistoryRow;
    sale: PendingPaymentDetail['sale'];
  }>(`/pending-payments/${saleId}/payments`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
