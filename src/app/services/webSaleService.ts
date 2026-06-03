const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface WebSaleDetailDto {
  product_id: number;
  product_size_id: number;
  size: string;
  quantity: number;
  sale_price: number;
  subtotal: number;
}

export interface CreateWebSaleDto {
  customer_name: string;
  customer_dni: string;
  customer_phone: string;
  customer_address: string;

  department: string;
  province: string;
  district: string;

  reference?: string;

  payment_method: string;
  observations?: string;

  total_amount: number;

  user_id: number;

  details: WebSaleDetailDto[];
}

export interface WebSaleResponse {
  id: number;
  ticket: string;

  customer_name: string;
  customer_phone: string;
  customer_address: string;

  department: string;
  province: string;
  district: string;

  payment_method: string;
  observations: string;

  total_amount: number;

  status: string;

  is_agency_delivery: boolean;

  agency_name?: string;

  shipping_code?: string;

  created_at: string;

  seller: {
    id: number;
    full_name: string;
    email: string;
    role: string;
  };

  total_products: number;

  details: any[];
}

export interface FilterSalesParams {
  status?: string;
  startDate?: string;
  endDate?: string;
}

export async function createWebSale(
  data: CreateWebSaleDto,
  token: string
) {

  const res = await fetch(`${API_URL}/websales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Error al registrar venta');
  }

  return res.json();
}

export async function getWebSales(
  token: string,
  filters?: FilterSalesParams
): Promise<WebSaleResponse[]> {

  const query = new URLSearchParams();

  if (filters?.status && filters.status !== 'todos') {
    query.append('status', filters.status);
  }

  if (filters?.startDate) {
    query.append('startDate', filters.startDate);
  }

  if (filters?.endDate) {
    query.append('endDate', filters.endDate);
  }

  const res = await fetch(
    `${API_URL}/websales/list?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    }
  );

  if (!res.ok) {
    throw new Error('Error al obtener ventas');
  }

  return res.json();
}

export async function updateWebSaleStatus(
   id: number,
  status: string,
  token: string,
  shipping_code?: string
) {
  const res = await fetch(
    `${API_URL}/websales/${id}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status,
        shipping_code
      })
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      text || 'Error al actualizar estado'
    );
  }

  return res.json();
}

export interface DeliverSaleDetailDto {
  detail_id: number;
  status: string;
}

export interface DeliverSaleDto {
  details: DeliverSaleDetailDto[];
}

export async function deliverSaleRequest(
  id: number,
  data: DeliverSaleDto,
  token: string
) {
  const res = await fetch(`${API_URL}/websales/${id}/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Error al registrar entrega');
  }

  return res.json();
}