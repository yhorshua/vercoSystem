export type ProcessArea = 'Corte' | 'Desbaste' | 'Aparado' | 'Habilitado' | 'Conformado' | 'Círculo' | 'Prensado' | 'Prefabricado' | 'Frecuencia' | 'Picado';
export type ProcessStatus = 'PENDIENTE' | 'PROCESO' | 'TERMINADO';

export interface ProductionOrder {
  id: string;
  productoId: string;
  modelo: string;
  serie: string;
  color: string;
  talla: number;
  cantidadTotal: number;
  procesos: Array<{
    area: ProcessArea;
    status: ProcessStatus;
    responsable?: string;
    fechaInicio?: string;
    fechaFin?: string;
    cantidadProcesada: number;
  }>;
}

export interface Client {
  id: string;
  razonSocial: string;
  documento: string;
  tipoDocumento: 'DNI' | 'RUC';
  vendedorAsignado: string;
  saldo: number;
}