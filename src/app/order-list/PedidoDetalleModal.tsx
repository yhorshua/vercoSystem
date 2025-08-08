// components/PedidoDetalleModal.tsx
'use client';

import styles from './pedidoDetalleModal.module.css';

interface Pedido {
  cliente: {
    codigo: string;
    nombre: string;
  };
  totalUnidades: number;
  totalPrecio: number;
  estado: string;
  items: {
    codigo: string;
    descripcion: string;
    serie: string;
    precio: number;
    total: number;
    cantidades: Record<number, number>;
  }[];
}

interface Props {
  pedido: Pedido;
  onClose: () => void;
}

export default function PedidoDetalleModal({ pedido, onClose }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h1><strong>Detalle del Pedido</strong></h1>
        <p><strong>Cliente:</strong> {pedido.cliente.nombre}</p>
        <p><strong>Estado:</strong> {pedido.estado}</p>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Descripción</th>
                <th>Serie</th>
                <th>Cantidades por talla</th>
                <th>Pares</th>
                <th>Precio</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {pedido.items.map((item, idx) => {
                const tallas = Object.keys(item.cantidades).map(Number).sort((a, b) => a - b);
                const cantidades = tallas.map((t) => `${t}/${item.cantidades[t]}`).join(' ');
                return (
                  <tr key={idx}>
                    <td>{item.codigo}</td>
                    <td>{item.descripcion}</td>
                    <td>{item.serie}</td>
                    <td>{cantidades}</td>
                    <td>{item.total}</td>
                    <td>{item.precio.toFixed(2)}</td>
                    <td>{(item.precio * item.total).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}><strong>Total General</strong></td>
                <td>{pedido.totalUnidades}</td>
                <td></td>
                <td><strong>{pedido.totalPrecio.toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button className={styles.closeButton} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
