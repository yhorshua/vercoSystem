const API_URL = process.env.NEXT_PUBLIC_API_URL;

function safeErrorMessage(text: string): string {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch { }
  return text || 'Error registrando venta';
}

// Definimos tipos explícitos para los parámetros y retorno
async function fetchJson<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
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

// Función para cambiar un producto
interface ChangeProductParams {
  sale_id: number
  product_id: number
  new_product_id: number
  quantity: number
  new_product_size_id: number
  old_product_price: number
  new_product_price: number
}

export async function changeProduct({
  sale_id,
  product_id,
  new_product_id,
  quantity,
  new_product_size_id,
  old_product_price,
  new_product_price
}: ChangeProductParams, token: string): Promise<any> {
  try {
    const response = await fetchJson('/sales/change-product', token, {
      method: 'POST',
      body: JSON.stringify({
        sale_id,
        product_id,
        new_product_id,
        quantity,
        new_product_size_id,
        old_product_price,
        new_product_price
      }),
    });
    return response; // Respuesta de éxito
  } catch (error: unknown) {
    console.error('Error changing product:', error);
    throw new Error(safeErrorMessage(error instanceof Error ? error.message : 'Error desconocido al cambiar el producto'));
  }
}

// Devolver un producto
interface ReturnProductParams {
  sale_id: number
  product_id: number
  quantity: number
  price_at_return: number
  reason?: string
}

export async function returnProduct({
  sale_id,
  product_id,
  quantity,
  price_at_return,
  reason
}: ReturnProductParams, token: string): Promise<any> {
  try {
    const response = await fetchJson('/sales/return-product', token, {
      method: 'POST',
      body: JSON.stringify({
        sale_id,
        product_id,
        quantity,
        price_at_return,
        reason
      }),
    });
    return response; // Respuesta de éxito
  } catch (error: unknown) {
    console.error('Error returning product:', error);
    throw new Error(safeErrorMessage(error instanceof Error ? error.message : 'Error desconocido al devolver el producto'));
  }
}

// Obtener productos por código o descripción
export async function getProductsByCodeOrDescription(query: string, token: string): Promise<any> {
  const res = await fetch(`${API_URL}/products/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`, // Incluir el token
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }

  return res.json(); // Devuelve los datos del producto encontrado
}

// Buscar venta por código
export async function getSaleByCode(saleCode: string, token: string): Promise<any> {
  try {
    const response = await fetchJson(`/sales/${saleCode}`, token, {
      method: 'GET',
    });
    return response; // Devuelve la venta encontrada
  } catch (error: unknown) {
    console.error('Error fetching sale by code:', error);
    throw new Error(
      safeErrorMessage(
        error instanceof Error ? error.message : 'Error desconocido al buscar la venta'
      )
    );
  }
}
