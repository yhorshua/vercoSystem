const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Obtener el stock de un producto en un almacén específico
export async function getProductStockByWarehouseAndCode(
  warehouseId: number,
  articleCode: string,
  token: string
) {
  const res = await fetch(
    `${API_URL}/stock/by-warehouse/${warehouseId}/article/${encodeURIComponent(articleCode)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,  // Enviamos el token en la cabecera de autorización
      },
      cache: 'no-store',  // Deshabilitar el cache de la respuesta
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error consultando el stock del producto');
  }
  return res.json();  // Retorna la respuesta con el stock del producto
}

export type RegisterStockItemPayload = {
  productId: number;
  productSizeId: number;
  quantity: number;
};

export type RegisterStockMultiplePayload = {
  warehouseId: number;
  guideId?: number | null;
  guideNumber: string;
  products: RegisterStockItemPayload[];
};

// Registrar stock para varios productos
export async function registerStockForMultipleItems(
  payload: RegisterStockMultiplePayload,
  token: string,
) {
  const res = await fetch(`${API_URL}/stock/register-multiple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);

    throw new Error(
      Array.isArray(error?.message)
        ? error.message.join(', ')
        : error?.message || 'Error al registrar el stock para los productos',
    );
  }

  return res.json();
}

export async function getInventoryByWarehouseAndCategory(
  warehouseId: number,
  category: number,
  token: string
) {
  const res = await fetch(
    `${API_URL}/stock/inventory/${warehouseId}/category/${encodeURIComponent(category)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error al obtener inventario');
  }

  return res.json();
}

export async function adjustInventory(
  warehouseId: number,
  userId: number,
  items: {
    product_id: number;
    product_size_id: number;
    new_quantity: number;
  }[],
  token: string
) {
  const res = await fetch(`${API_URL}/stock/inventory/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      warehouseId,
      userId,
      items,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error al ajustar inventario');
  }

  return res.json();
}

export interface StockMovementReportParams {
  warehouseId: number;
  startDate: string;
  endDate: string;
}

export async function getStockMovementReport(
  params: StockMovementReportParams,
  token: string,
) {
  const query = new URLSearchParams({
    warehouseId:
      String(params.warehouseId),

    startDate:
      params.startDate,

    endDate:
      params.endDate,
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/stock/movements/report?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      text ||
      'No se pudo obtener el reporte de movimientos',
    );
  }

  return response.json();
}
