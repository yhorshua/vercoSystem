// services/estadoCuentaService.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface RegistrarAbonoDto {
  cliente_id: number;
  monto_abono: number;
  tipo_abono: string;
  moneda_abono: string;
}

export async function getEstadoCuentaCliente(clienteId: number, token: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await fetch(`${API_URL}/estado-cuenta/cliente/${clienteId}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Error obteniendo estado de cuenta');
  return res.json();
}

export async function registrarAbono(
  dto: RegistrarAbonoDto,
  token: string,
) {
  const res = await fetch(
    `${API_URL}/estado-cuenta/abono`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    },
  );

  if (!res.ok) {
    const error = await res.json().catch(() => null);

    throw new Error(
      error?.message || 'Error registrando abono',
    );
  }

  return res.json();
}