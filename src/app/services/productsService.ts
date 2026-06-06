const API_URL = process.env.NEXT_PUBLIC_API_URL;

// /types/index.ts

export interface CreateProductDto {
  article_code: string;
  article_description: string;
  article_series: string;
  type_origin: string;
  manufacturing_cost: number;
  unit_price: number;
  selling_price: number;
  brand_name?: string;
  model_code?: string;
  categoryId: number;
  material_type?: string;
  color?: string;
  stock_minimum?: number;
  product_image?: string;
  sizes: string[];
  lot_pair?: number;
}

export interface StockItem {
  size: string;
  quantity: number;
}

export interface ApiProductResponse {
  article_code: string;
  article_description: string;
  article_series: string;
  stock: StockItem[];
}

// Función para manejar errores de forma segura
function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error';
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

// Obtener productos con tallas
export async function getProductsWithSizes(token: string) {
  const res = await fetch(`${API_URL}/products/sizes`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`, // Asegúrate de enviar el token de autenticación
    },
    cache: 'no-store', // Deshabilitar cache si es necesario
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }

  return res.json(); // Devuelve las categorías en formato JSON
}

// Crear productos
export async function createProduct(products: CreateProductDto[], token: string) {
  const res = await fetch(`${API_URL}/products/many`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,  // Incluir el token
    },
    body: JSON.stringify(products),  // Asegúrate de enviar la lista de productos
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }
  return await res.json();  // Devuelve el resultado del servicio
}

// Obtener productos por almacén, categoría y serie
export async function getProductsByWarehouse(warehouseId: number, categoryId: number | null, token: string, serie: string) {
  const url = new URL(`${API_URL}/products/filter`);
  const params = new URLSearchParams();

  params.append('warehouseId', warehouseId.toString());
  if (categoryId !== null) {
    params.append('categoryId', categoryId.toString());
  }
  if (serie) {
    params.append('serie', serie);  // Agregar el parámetro de serie
  }

  const res = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`, // Enviar el token en la cabecera
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

// Buscar productos por código o descripción
export async function getProductsByCodeOrDescription(query: string, token: string) {
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

export const getProductoByCodigo = async (codigo: string) => {
  try {
    const res = await fetch(`/api/products/search?query=${codigo}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!res.ok) throw new Error("No encontrado");

    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
};

export async function updateProduct(
  id: number,
  data: Partial<CreateProductDto>,
  token: string
) {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
  );

  return fetchJson(`/products/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(cleanData),
  });
}

export async function importStockExcel(
  file: File,
  token: string
) {
  const formData = new FormData();

  formData.append('file', file);

  const response = await fetch(
    `${API_URL}/products/import-stock`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  return response.json();
}
