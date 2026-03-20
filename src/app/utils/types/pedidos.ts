export type EstadoPedido = 'pendiente' | 'confirmado' | 'despachado' | 'entregado' | 'cancelado';

export interface Cliente {
    nombre: string;
    telefono: string;
    email?: string;
}

export interface DireccionEnvio {
    pais: string;
    provincia: string;
    distrito: string;
    direccion: string;
    referencia: string;
}

export interface PedidoItem {
    id: string;
    nombre: string;
    imagen: string;
    tiendaOrigen: string;
    tallas: { talla: string; cantidad: number }[];
    precio: number;
    subtotal: number;
}

export interface Pedido {
    id: string;
    fecha: string;
    cliente: Cliente;
    envio: DireccionEnvio & { metodo: string; costo: number };
    items: PedidoItem[];
    totalPares: number;
    totalMonto: number;
    estado: EstadoPedido;
}