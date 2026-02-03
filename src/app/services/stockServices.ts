const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function registerStockForMultipleItems(
  warehouseId: number,
  products: { productId: number; productSizeId: number; quantity: number }[]
) {
  const res = await fetch(`${API_URL}/stock/register-multiple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      warehouseId,
      products,
    }),
  });

  if (!res.ok) throw new Error(await res.text()); // Si hay error, lanzamos la excepción
  return res.json(); // Devuelve la respuesta (el stock registrado o algún mensaje de éxito)
}