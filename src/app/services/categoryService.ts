// src/services/categoryService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

function safeErrorMessage(text: string) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
  } catch {}
  return text || 'Error';
}

export const getCategories = async (token: string) => {
  try {
    const res = await fetch(`${API_URL}/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,  // Enviar el token en la cabecera Authorization
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Error ${res.status}: ${text || res.statusText}`);
    }

    return await res.json();  // Devuelve las categorías en formato JSON
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
};
