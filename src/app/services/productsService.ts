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

{/*}
export async function getProductsByWarehouse(warehouseId: number, token: string) {
  const res = await fetch(`${API_URL}/products/warehouse/${warehouseId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}
  */}

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

  return res.json(); // Devuelve la respuesta como un JSON
}

export async function createProduct(products: CreateProductDto[]) {
  const res = await fetch(`${API_URL}/products/many`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(products),  // Asegúrate de enviar la lista de productos
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }
  return await res.json();
}


export async function getProductsByWarehouse(warehouseId: number, categoryId: number | null, token: string) {
  const url = new URL(`${API_URL}/products/filter`);
  const params = new URLSearchParams();

  params.append('warehouseId', warehouseId.toString());
  if (categoryId !== null) {
    params.append('categoryId', categoryId.toString());
  }

  const res = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}


export async function getProductsByCodeOrDescription(query: string) {
  const res = await fetch(`${API_URL}/products/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }

  return res.json(); // Devuelve los datos del producto encontrado
}