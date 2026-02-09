// src/app/components/types.ts
export interface ItemUI {
  codigo: string;
  descripcion: string;
  serie: string;
  precio: number;

  cantidades: Record<string, number>;
  total: number;

  product_id: number;
  unit_of_measure: string;

  sizeIdBySizeNumber: Record<string, number>;
}
