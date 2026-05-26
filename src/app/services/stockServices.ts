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

// Registrar stock para varios productos
export async function registerStockForMultipleItems(
  warehouseId: number,
  products: { productId: number; productSizeId: number; quantity: number }[],
  token: string  // Asegúrate de pasar el token aquí
) {
  const res = await fetch(`${API_URL}/stock/register-multiple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,  // Enviamos el token en la cabecera de autorización
    },
    body: JSON.stringify({
      warehouseId,
      products,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Error al registrar el stock para los productos');
  }

  return res.json();  // Retorna la respuesta de la API (mensaje de éxito o los productos registrados)
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
