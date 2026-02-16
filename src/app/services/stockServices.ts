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
