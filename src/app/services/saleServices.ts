// /services/saleServices.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type PaymentMethod =
  | 'efectivo'
  | 'yape'
  | 'plin'
  | 'tarjetaDebito'
  | 'tarjetaCredito'
  | 'yapeEfectivo'
  | 'obsequio';

export type CreateSalePayload = {
  warehouse_id: number;
  user_id: number;
  customer_id?: number;

  // ⚠️ Solo envíalo si tu backend ya lo acepta en CreateSaleDto
  // document_type?: 'boleta' | 'factura';

  payment_method: PaymentMethod;

  payment?: {
    // efectivo
    efectivoEntregado?: number;
    vuelto?: number;

    // yape/plin/tarjetas
    numeroOperacion?: string;

    // mixto
    yapeMonto?: number;
    yapeOperacion?: string;
    efectivoEntregadoMixto?: number;
    vueltoMixto?: number;

    // obsequio
    motivoObsequio?: string;
    autorizadoPor?: string;
  };

  items: Array<{
    product_id: number;
    product_size_id?: number | null;
    quantity: number;
    unit_of_measure: string;
    unit_price: number;
  }>;
};

function safeErrorMessage(text: string) {
  try {
    // si tu back devuelve JSON con message
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error registrando venta';
}

export async function registerSale(payload: CreateSalePayload, token: string) {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const res = await fetch(`${API_URL}/stock/sale`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));
  }

  return res.json();
}

export async function getProductStockByWarehouseAndCode(
  warehouseId: number,
  articleCode: string,
  token: string
) {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const res = await fetch(
    `${API_URL}/stock/by-warehouse/${warehouseId}/article/${encodeURIComponent(articleCode)}`,
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
    throw new Error(text || `Error consultando stock (${res.status})`);
  }

  return res.json();
}
