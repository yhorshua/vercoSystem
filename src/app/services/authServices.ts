const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Warehouse {
  id: number;
  warehouse_name: string;
  type: string;
  location: string;
  status: { type: string; data: number[] };
}
// src/services/authService.ts
export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    full_name: string;
    id_cedula: string;
    address_home: string;
    email: string;
    cellphone: string;
    rol_id: number;
    role: { id: number; name_role: string };
    warehouse_id: number; // ✅ AGREGA ESTO
    warehouse: Warehouse;
    date_register: string;
    state_user: string;
  };
}


export const loginService = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let message = "Credenciales incorrectas o error en el servidor";

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === 'string') {
        message = errorBody.message;
      } else if (Array.isArray(errorBody?.message)) {
        message = errorBody.message.join('. ');
      }
    } catch {
      // Conserva el mensaje seguro cuando la API no devuelve JSON.
    }

    throw new Error(message);
  }

  const data: LoginResponse = await response.json();
  return data;
};
