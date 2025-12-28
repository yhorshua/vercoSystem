export type RucResponse = {
  razon_social?: string;
  razonSocial?: string;
  nombre_o_razon_social?: string;
  direccion?: string;
  [key: string]: any;
};

export async function GETRUC(numero: string): Promise<RucResponse> {
  const resp = await fetch(`/api/decolecta/ruc?numero=${encodeURIComponent(numero)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data?.message || 'Error consultando RUC');
  }

  return data;
}
