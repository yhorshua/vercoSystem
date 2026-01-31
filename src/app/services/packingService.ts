const API_URL = process.env.NEXT_PUBLIC_API_URL;

// DTO de escaneo
export type ScanItemDto = {
  order_id: number;
  codigo_producto: string;
  talla: string;
  cantidad: number;
}


export async function scanItem(dto: ScanItemDto, token: string) {
  const res = await fetch(`${API_URL}/packing/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Error al registrar escaneo');
  }

  return res.json();
}


export async function closePacking(dto: { order_id: number; user_id: number }, token: string) {
  const res = await fetch(`${API_URL}/packing/close`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Error al finalizar el picking');
  }

  return res.json();
}

// En packingService.ts
export async function getScanStatus(orderId: number, token: string) {
  const res = await fetch(`${API_URL}/packing/scan-status/${orderId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Error al obtener el estado de los escaneos');
  }

  return res.json(); // Debería devolver una lista de artículos con su estado (escaneado vs solicitado)
}


