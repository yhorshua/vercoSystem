export type DniResponse = {
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  [key: string]: any;
};

export async function GETDNI(numero: string): Promise<DniResponse> {
  const resp = await fetch(`/api/decolecta/dni?numero=${encodeURIComponent(numero)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data?.message || 'Error consultando DNI');
  }

  return data;
}
