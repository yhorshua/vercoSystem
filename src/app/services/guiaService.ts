const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type CreateGuiaDto = {
  order_id: number;
  usuario_id: number;
};

export async function createGuiaFromOrder(dto: CreateGuiaDto, token: string) {
  const res = await fetch(`${API_URL}/guia-interna/from-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Error al generar guía interna');
  }

  return res.json();
}