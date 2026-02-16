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
  payment_method: PaymentMethod;

  payment?: {
    efectivoEntregado?: number;
    vuelto?: number;
    numeroOperacion?: string;
    yapeMonto?: number;
    yapeOperacion?: string;
    efectivoEntregadoMixto?: number;
    vueltoMixto?: number;
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
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error registrando venta';
}

// Función para registrar una venta
export async function registerSale(payload: CreateSalePayload, token: string) {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');

  const res = await fetch(`${API_URL}/stock/sale`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, // Enviar el token en la cabecera de autorización
    },
    body: JSON.stringify(payload),  // Cuerpo de la solicitud con la información de la venta
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(safeErrorMessage(text));  // Manejo de errores de la API
  }

  return res.json();  // Retorna la respuesta de la API
}

// Función para obtener el stock de un producto en un almacén específico
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
        Authorization: `Bearer ${token}`, // Enviar el token en la cabecera de autorización
      },
      cache: 'no-store',  // Deshabilitar cache
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error consultando stock (${res.status})`);  // Manejo de errores de la API
  }

  return res.json();  // Retorna la respuesta con los datos de stock
}
