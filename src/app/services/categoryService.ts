// src/services/categoryService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getCategories = async (token: string) => {
  try {
    const res = await fetch(`${API_URL}/categories`, {
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

    return await res.json(); // Devuelve las categorías en formato JSON
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
};
