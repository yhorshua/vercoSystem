// services/attendanceService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const markAttendance = async (userId: number, type: 'entrada' | 'salida', ubicacion: string) => {
  try {
    const response = await fetch(`${API_URL}/attendance/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
