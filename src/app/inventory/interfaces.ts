// interfaces.ts
export interface Item {
  codigo: string;
  descripcion: string;
  serie: string;
  precio: number;
  cantidades: Record<number, number>; // Tallas con su cantidad
  total: number;
}
