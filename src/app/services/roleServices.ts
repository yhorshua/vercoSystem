import { getApiUrl, parseError } from './http';

export type RoleRow = { id: number; name_role: string };

// Obtener roles
export async function getRoles(token?: string): Promise<RoleRow[]> {
  const API_URL = getApiUrl();  // Obtén la URL base de la API
  const res = await fetch(`${API_URL}/roles`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json', 
      ...(token ? { Authorization: `Bearer ${token}` } : {}),  // Enviamos el token si está disponible
    },
    cache: 'no-store',
  });
  
  if (!res.ok) throw new Error(await parseError(res));  // Si la respuesta no es OK, lanza un error
  const data = await res.json();  // Parsea la respuesta JSON

  // Si los datos son un arreglo, mapéalo y retorna solo los roles válidos
  return Array.isArray(data)
    ? data.map((r: any) => ({ 
        id: Number(r?.id), 
        name_role: String(r?.name_role ?? '') 
      }))
        .filter((r) => r.id > 0 && r.name_role)  // Filtra roles con ID y nombre válidos
    : [];
}

// Crear un nuevo rol
export async function createRole(name_role: string, token?: string) {
  const API_URL = getApiUrl();  // Obtén la URL base de la API
  const res = await fetch(`${API_URL}/roles`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      ...(token ? { Authorization: `Bearer ${token}` } : {})  // Enviamos el token si está disponible
    },
    body: JSON.stringify({ name_role }),  // Envía el cuerpo con el nombre del rol
  });

  if (!res.ok) throw new Error(await parseError(res));  // Si la respuesta no es OK, lanza un error
  return res.json();  // Retorna la respuesta JSON del servidor
}
