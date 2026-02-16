const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Función para manejar errores de forma segura
function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error';
}

// Función genérica para hacer peticiones fetch con token
async function fetchJson<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, // Enviamos el token en la cabecera
      ...(options?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));
  }

  return res.json();
}

// ==========================
// Types
// ==========================
export type CashSessionStatus = 'OPEN' | 'CLOSED';

export type CashSession = {
  id: number;
  warehouse_id: number;
  user_id: number; // quien abrió (o responsable)
  opened_at: string;
  closed_at: string | null;

  opening_cash: number;
  closing_cash_counted: number | null;
  closing_expected_cash: number | null;
  difference: number | null;

  status: CashSessionStatus;
  notes: string | null;
};

export type CashMovement = {
  id: number;
  session_id: number;
  warehouse_id: number;
  user_id: number;

  type: string; // ejemplo: 'SALE' | 'EXPENSE' | 'OPENING' | 'CLOSING'
  payment_method: string | null; // efectivo/yape/plin/tarjeta...
  amount: number; // + ingreso / - egreso
  operation_number: string | null;

  reference_sale_id?: number | null;
  reference_sale_payment_id?: number | null;

  description: string | null;
  created_at: string;
};

export type CashSummary = {
  session: CashSession;

  totalsByMethod: Record<string, number>;

  totalIncome: number;
  totalExpense: number;
  net: number;

  expectedCash: number;
};

// ==========================
// DTOs
// ==========================
export type OpenCashPayload = {
  warehouse_id: number;
  user_id: number;
  opening_amount: number;
  notes?: string;
};

export type ExpensePayload = {
  warehouse_id: number;
  user_id: number;
  session_id: number;

  amount: number;
  description: string;
};

export type CloseCashPayload = {
  warehouse_id: number;
  user_id: number;
  session_id: number;

  closing_cash_counted: number;
  notes?: string;
};

// ==========================
// API calls
// ==========================
export async function openCash(payload: OpenCashPayload, token: string) {
  return fetchJson<{ session: CashSession }>(`/cash/open`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Devuelve sesión abierta (o null)
export async function getCashStatus(warehouseId: number, token: string) {
  return fetchJson<{ session: CashSession | null }>(`/cash/status/${warehouseId}`, token, {
    method: 'GET',
  });
}

export async function getCashMovements(sessionId: number, token: string) {
  return fetchJson<{ movements: CashMovement[]; summary: CashSummary }>(
    `/cash/movements/${sessionId}`,
    token,
    { method: 'GET' },
  );
}

export async function registerExpense(payload: ExpensePayload, token: string) {
  return fetchJson<{ ok: true }>(`/cash/expense`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function closeCash(payload: CloseCashPayload, token: string) {
  return fetchJson<{ session: CashSession }>(`/cash/close`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
