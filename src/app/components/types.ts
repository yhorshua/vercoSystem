// src/app/components/types.ts
export interface ItemUI {
  codigo: string;
  descripcion: string;
  serie: string;
  precio: number;

  cantidades: Record<number, number>; // 👈 CAMBIAR
  total: number;

  product_id: number;
  unit_of_measure: string;

  sizeIdBySizeNumber: Record<number, number>; // 👈 CAMBIAR
}


export type AttendanceType = 'entrada' | 'salida';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

export interface AttendanceRecord {
  id: number;
  userId: number;
  type: AttendanceType;
  timestamp: string; // ISO String (UTC from server)
  location: string;
}

export interface TimezoneConfig {
  locale: string;
  timeZone: string;
}
