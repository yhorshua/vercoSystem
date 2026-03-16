const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function handleResponse(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const productionService = {
  // Crear OP
  createOrder: async (data: any, token: string) => {
    const res = await fetch(`${API_URL}/production/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Actualizar proceso de un área
  updateProcess: async (orderId: string, area: string, status: string, token: string) => {
    const res = await fetch(`${API_URL}/production/orders/${orderId}/process`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ area, status }),
    });
    return handleResponse(res);
  },

  // Obtener órdenes por área (para la pantalla de operario)
  getOrdersByArea: async (area: string, token: string) => {
    const res = await fetch(`${API_URL}/production/orders?area=${area}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
  }
};