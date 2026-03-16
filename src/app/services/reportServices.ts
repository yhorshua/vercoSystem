// /services/reportServices.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SalesReportType = 'DAY' | 'RANGE';

export type SalesReportDetailDTO = {
  product_id: number;
  article_code: string;
  article_description: string;
  size: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  line_total: number;
  profit: number;
};

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
  warehouse_id: number;
  warehouse_name?: string | null;
  total_amount: number;
  payment_method?: string | null; // fallback si no hay payments
  payments?: SalesPaymentDTO[];   // si tu back ya lo devuelve
  details?: SalesReportDetailDTO[]; // Asegúrate de que esto sea correcto según tu modelo de datos
};

export type SalesReportMetaDTO = {
  total_operating_expenses?: number;
  warehouse_id: number;
  warehouse_name?: string | null;
  total_sales: number;
  total_amount: number;
};

export type SalesReportResponse = {
  meta: SalesReportMetaDTO;
  sales: SalesReportRowDTO[];
};

export type CashClosureDay = {
  date: string;
  opening_cash: number;

  sales_cash: number;
  income: number;
  expense: number;
  returns: number;

  expected_cash: number;
  counted_cash: number;
  difference: number;
};

export type CashClosureResponse = {
  meta: {
    warehouse_id: number;
    start?: string;
    end?: string;
    total_days?: number;
  };
  days: CashClosureDay[];
};

export type SellerSalesDetail = {
  sale_id: number;
  sale_code: string;
  sale_date: string;

  product_id: number;
  article_code: string;
  article_description: string;

  size: string | null;

  quantity: number;
  unit_price: number;

  total: number;

  counted_pairs: number;
};

export type SellerCategory = {
  category: string;
  pairs: number;
  amount: number;
  sales: SellerSalesDetail[];
};

export type SellerSalesDetailReport = {
  seller_id: number;
  seller_name: string;
  total_pairs: number;
  total_commission: number;
  categories: SellerCategory[];
};

export type SellerSalesDetailResponse = {
  meta: {
    warehouse_id: number;
    warehouse_name: string;
    start: string;
    end: string;
    sellers: number;
  };
  sellers: SellerSalesDetailReport[];
};

// Función para manejar errores de forma segura
function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch { }
  return text || 'Error consultando reporte';
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

  return res.json();  // Devuelve la respuesta en formato JSON
}

// ==========================
// API calls
// ==========================

// Obtener reporte de ventas
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
      Authorization: `Bearer ${token}`, // Enviar el token
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));
  }

  return res.json();
}

// Obtener reporte de comisión de vendedor
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
      Authorization: `Bearer ${token}`, // Enviar el token
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el reporte de comisiones de vendedores');
  }

  return res.json();
}

// Obtener reporte de utilidad semanal
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
      Authorization: `Bearer ${token}`, // Enviar el token
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el reporte de utilidad semanal');
  }

  return res.json();
}

// Obtener reporte de ingreso de inventario
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
      Authorization: `Bearer ${token}`, // Enviar el token
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el reporte de ingreso de mercancía');
  }

  return res.json();
}

// Obtener reporte de gastos operativos
export async function getOperatingExpenses(start: string, end: string, token: string): Promise<number> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const queryParams = new URLSearchParams();
  queryParams.set('start', start);
  queryParams.set('end', end);

  const res = await fetch(`${API_URL}/cash-movements/operating-expenses?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`, // Enviar el token
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el reporte de gastos operativos');
  }

  return res.json(); // El resultado esperado es un número
}

export async function getCashClosureReport(
  params: GetSalesReportParams,
  token: string
): Promise<CashClosureResponse> {

  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const q = new URLSearchParams();
  q.set('warehouseId', String(params.warehouseId));

  let endpoint = '';

  if (params.type === 'DAY') {

    if (!params.date) {
      throw new Error('date es requerido cuando type=DAY');
    }

    q.set('date', params.date);
    endpoint = '/reports/cash/daily';

  } else {

    if (!params.from || !params.to) {
      throw new Error('from y to son requeridos cuando type=RANGE');
    }

    q.set('warehouseId', String(params.warehouseId));
    q.set('start', params.from);
    q.set('end', params.to);

    endpoint = '/reports/cash/range';
  }

  const res = await fetch(`${API_URL}${endpoint}?${q.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Error consultando reporte de caja');
  }

  return res.json();
}

export async function getSellerSalesDetailReport(
  params: GetSalesReportParams,
  token: string,
): Promise<SellerSalesDetailResponse> {

  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const q = new URLSearchParams();

  q.set('warehouseId', String(params.warehouseId));
  q.set('type', params.type);

  if (params.type === 'DAY') {

    if (!params.date) {
      throw new Error('date es requerido cuando type=DAY');
    }

    q.set('date', params.date);

  } else {

    if (!params.from || !params.to) {
      throw new Error('from y to son requeridos cuando type=RANGE');
    }

    q.set('from', params.from);
    q.set('to', params.to);

  }

  if (params.userId) {
    q.set('userId', String(params.userId));
  }

  const res = await fetch(`${API_URL}/reports/seller-sales-detail?${q.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Error consultando reporte de ventas por vendedor');
  }

  return res.json();
}