const API_URL = process.env.NEXT_PUBLIC_API_URL;

/* ===============================
   TYPES
================================ */

export type CreateOrderItemPayload = {
  product_id: number;
  product_size_id?: number | null;
  quantity: number;
  unit_price: number;
};

export type CreateOrderPayload = {
  client_id: number;
  user_id: number; // ⚠️ recomendado quitar a futuro
  warehouse_id: number;
  items: CreateOrderItemPayload[];
};

/* ===============================
   CREATE ORDER
================================ */
export async function createOrder(
  payload: CreateOrderPayload,
  token: string,
) {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Error al registrar pedido');
  }

  return res.json();
}

/* ===============================
   LIST ORDERS (ADVANCED / BY ROLE)
================================ */
export async function getOrdersByRole(
  token: string,
  params: {
    user_id: number;
    role: string;
    status?: number;
    client_id?: number;
    seller_id?: number;
    date_from?: string;
    date_to?: string;
  },
) {
  const query = new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        acc[k] = String(v);
      }
      return acc;
    }, {} as Record<string, string>),
  ).toString();

  const res = await fetch(`${API_URL}/orders/by-role?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Error al obtener pedidos');
  }

  return res.json();
}

/* ===============================
   GET ORDER DETAIL
================================ */
export async function getOrderById(
  orderId: number,
  token: string,
) {
  const res = await fetch(`${API_URL}/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Error al obtener pedido');
  }

  return res.json();
}

/* ===============================
   APPROVE ORDER
================================ */
export async function approveOrder(
  orderId: number,
  approvedBy: number,
  token: string,
) {
  const res = await fetch(`${API_URL}/orders/${orderId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approved_by: approvedBy }),
  });

  if (!res.ok) {
    throw new Error('Error al aprobar pedido');
  }

  return res.json();
}

/* ===============================
   REJECT ORDER
================================ */
export async function rejectOrder(
  orderId: number,
  rejectedBy: number,
  reason: string | undefined,
  token: string,
) {
  const res = await fetch(`${API_URL}/orders/${orderId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      rejected_by: rejectedBy,
      reason,
    }),
  });

  if (!res.ok) {
    throw new Error('Error al rechazar pedido');
  }

  return res.json();
}
