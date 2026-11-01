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
  purchase_total?: number;
  line_total: number;
  profit: number;
  category_name?: string;
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
  customer_name?: string | null;
  notes?: string | null;
  warehouse_id: number;
  warehouse_name?: string | null;
  total_amount: number;
  payment_method?: string | null; // fallback si no hay payments
  payments?: SalesPaymentDTO[];   // si tu back ya lo devuelve
  details?: SalesReportDetailDTO[]; // Asegúrate de que esto sea correcto según tu modelo de datos
};

export type SalesReportMetaDTO = {
  total_operating_expenses?: number;
  total_quantity?: number;
  total_purchase_amount?: number;
  total_sales_amount?: number;
  total_profit?: number;
  net_profit?: number;
  warehouse_id: number;
  warehouse_name?: string | null;
  total_sales: number;
  total_amount: number;
};

export type WeeklyCategorySummary = {
  category: string;
  quantity: number;
  purchase_amount: number;
  sales_amount: number;
  profit: number;
};

export type SalesReportResponse = {
  meta: SalesReportMetaDTO;
  sales: SalesReportRowDTO[];
  categories?: WeeklyCategorySummary[];
  total_quantity?: number;
  total_profit?: number;
  total_cost?: number;
  total_cash_amount?: number;
  total_virtual_amount?: number;
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
  customer_name?: string | null;
  notes?: string | null;
  payment_method?: string | null;
  sale_total?: number;

  product_id: number;
  article_code: string;
  article_description: string;

  size: string | null;

  quantity: number;
  commissionable_quantity: number;
  unit_price: number;
  purchase_price: number;
  purchase_total: number;
  sales_total: number;
  profit: number;
  commission: number;
};

export type SellerCategory = {
  category: string;
  pairs: number;
  amount: number;
  quantity: number;
  commissionable_quantity: number;
  purchase_amount: number;
  sales_amount: number;
  profit: number;
  commission: number;
  sales: SellerSalesDetail[];
};

export type SellerCommissionTotals = {
  quantity: number;
  commissionable_quantity: number;
  purchase_amount: number;
  sales_amount: number;
  profit: number;
  commission: number;
};

export type SellerCategorySummary = SellerCommissionTotals & {
  category: string;
};

export type SellerSalesDetailReport = {
  seller_id: number;
  seller_name: string;
  total_pairs: number;
  total_quantity: number;
  total_commissionable_quantity: number;
  total_purchase_amount: number;
  total_sales_amount: number;
  total_profit: number;
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
    commission_per_unit?: number;
  };
  totals: SellerCommissionTotals;
  categories: SellerCategorySummary[];
  sellers: SellerSalesDetailReport[];
};

function numericValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSellerCategory(value: any): SellerCategory {
  const quantity = numericValue(value?.quantity ?? value?.pairs);
  const commissionableQuantity = numericValue(
    value?.commissionable_quantity ?? value?.pairs ?? quantity,
  );
  const purchaseAmount = numericValue(value?.purchase_amount);
  const salesAmount = numericValue(value?.sales_amount ?? value?.amount);

  return {
    ...value,
    category: String(value?.category || 'Sin categoría'),
    pairs: numericValue(value?.pairs ?? commissionableQuantity),
    amount: numericValue(value?.amount ?? salesAmount),
    quantity,
    commissionable_quantity: commissionableQuantity,
    purchase_amount: purchaseAmount,
    sales_amount: salesAmount,
    profit: numericValue(value?.profit ?? salesAmount - purchaseAmount),
    commission: numericValue(value?.commission),
    sales: Array.isArray(value?.sales) ? value.sales : [],
  };
}

function sumCommissionCategories(categories: SellerCategorySummary[]): SellerCommissionTotals {
  return categories.reduce<SellerCommissionTotals>((totals, category) => ({
    quantity: totals.quantity + numericValue(category.quantity),
    commissionable_quantity: totals.commissionable_quantity + numericValue(category.commissionable_quantity),
    purchase_amount: totals.purchase_amount + numericValue(category.purchase_amount),
    sales_amount: totals.sales_amount + numericValue(category.sales_amount),
    profit: totals.profit + numericValue(category.profit),
    commission: totals.commission + numericValue(category.commission),
  }), {
    quantity: 0,
    commissionable_quantity: 0,
    purchase_amount: 0,
    sales_amount: 0,
    profit: 0,
    commission: 0,
  });
}

export function normalizeSellerSalesDetailResponse(input: any): SellerSalesDetailResponse {
  const source = input && typeof input === 'object' ? input : {};
  const rawSellers = Array.isArray(input)
    ? input
    : Array.isArray(source.sellers)
      ? source.sellers
      : [];

  const sellers: SellerSalesDetailReport[] = rawSellers.map((seller: any, index: number) => {
    const categories = Array.isArray(seller?.categories)
      ? seller.categories.map(normalizeSellerCategory)
      : [];
    const derived = sumCommissionCategories(categories);

    return {
      ...seller,
      seller_id: numericValue(seller?.seller_id ?? seller?.user_id ?? index),
      seller_name: String(seller?.seller_name ?? seller?.user_name ?? 'Sin vendedor'),
      total_pairs: numericValue(seller?.total_pairs ?? derived.commissionable_quantity),
      total_quantity: numericValue(seller?.total_quantity ?? derived.quantity),
      total_commissionable_quantity: numericValue(
        seller?.total_commissionable_quantity ?? derived.commissionable_quantity,
      ),
      total_purchase_amount: numericValue(seller?.total_purchase_amount ?? derived.purchase_amount),
      total_sales_amount: numericValue(seller?.total_sales_amount ?? derived.sales_amount),
      total_profit: numericValue(seller?.total_profit ?? derived.profit),
      total_commission: numericValue(seller?.total_commission ?? derived.commission),
      categories,
    };
  });

  let categories: SellerCategorySummary[];
  if (Array.isArray(source.categories)) {
    categories = source.categories.map((category: any) => normalizeSellerCategory(category));
  } else {
    const categoryMap = new Map<string, SellerCategorySummary>();
    sellers.forEach((seller) => seller.categories.forEach((category) => {
      const current = categoryMap.get(category.category) || {
        category: category.category,
        quantity: 0,
        commissionable_quantity: 0,
        purchase_amount: 0,
        sales_amount: 0,
        profit: 0,
        commission: 0,
      };
      current.quantity += category.quantity;
      current.commissionable_quantity += category.commissionable_quantity;
      current.purchase_amount += category.purchase_amount;
      current.sales_amount += category.sales_amount;
      current.profit += category.profit;
      current.commission += category.commission;
      categoryMap.set(category.category, current);
    }));
    categories = Array.from(categoryMap.values());
  }

  const derivedTotals = sumCommissionCategories(categories);
  const rawTotals = source.totals || {};

  return {
    meta: {
      warehouse_id: numericValue(source.meta?.warehouse_id),
      warehouse_name: String(source.meta?.warehouse_name || ''),
      start: String(source.meta?.start || ''),
      end: String(source.meta?.end || ''),
      sellers: numericValue(source.meta?.sellers ?? sellers.length),
      commission_per_unit: source.meta?.commission_per_unit == null
        ? undefined
        : numericValue(source.meta.commission_per_unit),
    },
    totals: {
      quantity: numericValue(rawTotals.quantity ?? derivedTotals.quantity),
      commissionable_quantity: numericValue(
        rawTotals.commissionable_quantity ?? derivedTotals.commissionable_quantity,
      ),
      purchase_amount: numericValue(rawTotals.purchase_amount ?? derivedTotals.purchase_amount),
      sales_amount: numericValue(rawTotals.sales_amount ?? derivedTotals.sales_amount),
      profit: numericValue(rawTotals.profit ?? derivedTotals.profit),
      commission: numericValue(rawTotals.commission ?? derivedTotals.commission),
    },
    categories,
    sellers,
  };
}

export type SneakersGoalResponse = {
  meta: {
    warehouse_id: number;
    warehouse_name: string;
    start: string;
    end: string;
  };
  progress: {
    pairs_sold: number;
    pairs_goal: number;
    pairs_remaining: number;
    pairs_percentage: number;

    revenue: number;
    revenue_goal: number;
    revenue_remaining: number;
    revenue_percentage: number;

    profit: number;
    cost: number;
    margin: number;
  };
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

  return normalizeSellerSalesDetailResponse(await res.json());
}

export async function getSneakersGoal(
  params: GetSalesReportParams,
  token: string
): Promise<SneakersGoalResponse> {

  const q = new URLSearchParams();
  q.set('warehouseId', String(params.warehouseId));
  q.set('type', params.type);

  if (params.type === 'DAY') {
    if (!params.date) throw new Error('date requerido');
    q.set('date', params.date);
  } else {
    if (!params.from || !params.to) throw new Error('from/to requerido');
    q.set('from', params.from);
    q.set('to', params.to);
  }

  const res = await fetch(`${API_URL}/reports/sneakers-goal?${q.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('ERROR RESPONSE:', text); // 🔥 clave para debug
    throw new Error(safeErrorMessage(text));
  }

  return res.json();
}

export async function getMonthlyWebSalesTotal(token: string) {
  const res = await fetch(
    `${API_URL}/reports/monthly-total`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Error al obtener ventas web mensuales');
  }

  return res.json();
}
