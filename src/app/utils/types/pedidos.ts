export type EstadoPedido =
  | 'Pendiente'
  | 'Aprobado'
  | 'Rechazado'
  | 'En Alistamiento'
  | 'Alistado'
  | 'Guia Generada'
  | 'Despachado'
  | 'Facturado'
  | 'Cerrado';

export interface Cliente {
  id: number;

  // Identificación
  tipoDocumento: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE';
  numeroDocumento: string;

  // Datos principales
  nombre: string;
  razonSocial?: string;
  nombreComercial?: string;

  // Contacto
  telefono?: string;
  email?: string;

  // Ubigeo estructurado
  departamento?: string;
  provincia?: string;
  distrito?: string;

  // Dirección
  direccion?: string;
  referencia?: string;

  // Metadata
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DireccionEnvio {
  pais: string;

  departamento: string;
  provincia: string;
  distrito: string;

  direccion: string;
  referencia?: string;

  // Opcional PRO
  codigoPostal?: string;
}

export interface PedidoItem {
  id: string;

  // 🔥 NUEVOS CAMPOS IMPORTANTES
  codigo: string;
  serie?: string;

  // Datos del producto
  nombre: string; // (mapear desde descripcion)
  imagen?: string;
  tiendaOrigen?: string;

  // Cantidades
  tallas: { talla: string; cantidad: number }[];

  // 🔥 opcional pero útil
  cantidadesRaw?: Record<string, number>;

  // Precios
  precio: number;
  subtotal: number;

  // 🔥 NUEVO
  total: number; // cantidad total del item
}

export interface Pedido {
    id: string;
    cliente: Cliente;
    totalUnidades: number;
    totalPrecio: number;
    estado: EstadoPedido;
    envio: DireccionEnvio & { metodo: string; costo: number };
    fechaRegistro: string;
    vendedor: string;
    items: PedidoItem[];
    totalDiscount?: number;
    taxAmount?: number;
    totalPares: number;
    totalMonto: number;
}

export interface PedidoApi {
  id: string;
  cliente: {
    codigo: number;
    nombre: string;
    ruc: string;
    direccion: string;
  };
  vendedor: string;
  fechaRegistro: string;
  estado: EstadoPedido;
  totalUnidades: number;
  totalPrecio: number;
  items: PedidoItemApi[];
}

export interface PedidoItemApi {
  codigo: string;
  descripcion: string;
  serie?: string;
  precio: number;
  total: number;
  cantidades: Record<string, number>; // 👈 clave
}