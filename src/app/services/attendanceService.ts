// services/attendanceService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const markAttendance = async (userId: number, type: 'entrada' | 'salida', ubicacion: string) => {
  const token = localStorage.getItem('access_token'); // Obtener el token del localStorage

  if (!token) {
    throw new Error('No se ha encontrado un token válido');
  }

  try {
    const response = await fetch(`${API_URL}/attendance/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Agregar el token en los encabezados
      },
      body: JSON.stringify({ userId, type, ubicacion }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Error ${response.status}: ${text || response.statusText}`);
    }

    return 'Asistencia registrada correctamente';
  } catch (error) {
    console.error('Error al realizar la petición:', error);
    throw error;
  }
};


export const hasUserEnteredToday = async (userId: number) => {
  const token = localStorage.getItem('access_token'); // Obtener el token

  if (!token) {
    throw new Error('No se ha encontrado un token válido');
  }

  try {
    const response = await fetch(`${API_URL}/attendance/has-entered-today/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Agregar el token
      },
    });

    if (!response.ok) {
      throw new Error('Error al verificar la entrada del usuario');
    }

    const data = await response.json();

    // Asumiendo que la respuesta contiene hasEnteredToday, userId, tipo
    return {
      hasEnteredToday: data.hasEnteredToday,
      userId: data.userId,
      tipo: data.tipo,
    };
  } catch (error) {
    console.error('Error al verificar la entrada del usuario:', error);
    throw error;
  }
};
