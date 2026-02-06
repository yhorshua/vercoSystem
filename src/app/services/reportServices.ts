// /services/reportServices.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SalesReportType = 'DAY' | 'RANGE';

export type GetSalesReportParams = {
  warehouseId: number;
  type: SalesReportType;
  date?: string; // yyyy-mm-dd
  from?: string; // yyyy-mm-dd
  to?: string;   // yyyy-mm-dd
  userId?: number;
};

export type SalesPaymentDTO = {
  method: string;
  amount: number;
  operation_number?: string | null;
  notes?: string | null;
};

export type SalesReportRowDTO = {
  sale_id: number;
  sale_code: string;
  sale_date: string; // ISO
  user_id: number;
  user_name: string;
  total_amount: number;
  payment_method?: string | null; // fallback si no hay payments
  payments?: SalesPaymentDTO[];   // si tu back ya lo devuelve
};

export type SalesReportMetaDTO = {
  warehouse_id: number;
  warehouse_name?: string | null;
  total_sales: number;
  total_amount: number;
};

export type SalesReportResponse = {
  meta: SalesReportMetaDTO;
  sales: SalesReportRowDTO[];
};

function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error consultando reporte';
}

export async function getSalesReport(
  params: GetSalesReportParams,
  token: string,
): Promise<SalesReportResponse> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const q = new URLSearchParams();
  q.set('warehouseId', String(params.warehouseId));
  q.set('type', params.type);

  if (params.type === 'DAY') {
    if (!params.date) throw new Error('date es requerido cuando type=DAY');
    q.set('date', params.date);
  } else {
    if (!params.from || !params.to) throw new Error('from y to son requeridos cuando type=RANGE');
    q.set('from', params.from);
    q.set('to', params.to);
  }

  if (typeof params.userId === 'number' && Number.isFinite(params.userId)) {
    q.set('userId', String(params.userId));
  }

  const res = await fetch(`${API_URL}/reports/sales?${q.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));
  }

  return res.json();
}

export async function getSellerCommissionReport(params: GetSalesReportParams, token: string): Promise<SalesReportResponse> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const queryParams = new URLSearchParams();
  queryParams.set('warehouseId', String(params.warehouseId));
  queryParams.set('type', params.type);

  if (params.type === 'DAY') {
    if (!params.date) throw new Error('date es requerido cuando type=DAY');
    queryParams.set('date', params.date);
  } else {
    if (!params.from || !params.to) throw new Error('from y to son requeridos cuando type=RANGE');
    queryParams.set('from', params.from);
    queryParams.set('to', params.to);
  }

  if (params.userId) {
    queryParams.set('userId', String(params.userId));
  }

  const res = await fetch(`${API_URL}/reports/seller-commission?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el reporte de comisiones de vendedores');
  }

  return res.json();
}

export async function getWeeklyProfitReport(params: GetSalesReportParams, token: string): Promise<SalesReportResponse> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const queryParams = new URLSearchParams();
  queryParams.set('warehouseId', String(params.warehouseId));
  queryParams.set('type', params.type);

  if (params.type === 'DAY') {
    if (!params.date) throw new Error('date es requerido cuando type=DAY');
    queryParams.set('date', params.date);
  } else {
    if (!params.from || !params.to) throw new Error('from y to son requeridos cuando type=RANGE');
    queryParams.set('from', params.from);
    queryParams.set('to', params.to);
  }

  if (params.userId) {
    queryParams.set('userId', String(params.userId));
  }

  const res = await fetch(`${API_URL}/reports/weekly-profit?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el reporte de utilidad semanal');
  }

  return res.json();
}

export async function getInventoryIngressReport(params: GetSalesReportParams, token: string): Promise<SalesReportResponse> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const queryParams = new URLSearchParams();
  queryParams.set('warehouseId', String(params.warehouseId));
  queryParams.set('type', params.type);

  if (params.type === 'DAY') {
    if (!params.date) throw new Error('date es requerido cuando type=DAY');
    queryParams.set('date', params.date);
  } else {
    if (!params.from || !params.to) throw new Error('from y to son requeridos cuando type=RANGE');
    queryParams.set('from', params.from);
    queryParams.set('to', params.to);
  }

  if (params.userId) {
    queryParams.set('userId', String(params.userId));
  }

  const res = await fetch(`${API_URL}/reports/inventory-ingress?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el reporte de ingreso de mercancía');
  }

  return res.json();
}
export async function getCashClosureReport(params: GetSalesReportParams, token: string): Promise<SalesReportResponse> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const queryParams = new URLSearchParams();
  queryParams.set('warehouseId', String(params.warehouseId));
  queryParams.set('type', params.type);

  if (params.type === 'DAY') {
    if (!params.date) throw new Error('date es requerido cuando type=DAY');
    queryParams.set('date', params.date);
  } else {
    if (!params.from || !params.to) throw new Error('from y to son requeridos cuando type=RANGE');
    queryParams.set('from', params.from);
    queryParams.set('to', params.to);
  }

  if (params.userId) {
    queryParams.set('userId', String(params.userId));
  }

  const res = await fetch(`${API_URL}/reports/cash-closure?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el reporte de cierre de caja');
  }

  return res.json();
}

// services/reportServices.ts

export async function getOperatingExpenses(start: string, end: string, token: string): Promise<number> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const queryParams = new URLSearchParams();
  queryParams.set('start', start);
  queryParams.set('end', end);

  const res = await fetch(`${API_URL}/cash-movements/operating-expenses?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el reporte de gastos operativos');
  }

  return res.json(); // El resultado esperado es un número
}

