import { useState } from 'react';
import styles from './pedidoDetalleModal.module.css';

interface Pedido {
  id: string;
  cliente: {
    codigo: string;
    nombre: string;
    ruc?: string;
    direccion?: string;
  };
  totalUnidades: number;
  totalPrecio: number;
  estado: string;
  fechaRegistro: string;
  vendedor: string;
  items: {
    codigo: string;
    descripcion: string;
    serie: string;
    precio: number;
    total: number;
    cantidades: Record<string, number>;
  }[];
  totalDiscount?: number;
  taxAmount?: number;
}


// PedidoDetalleModal.tsx
export default function PedidoDetalleModal({ pedido, onClose }: { pedido: Pedido, onClose: () => void }) {
  if (!pedido) return null;  // Si no hay pedido, no renderizamos el modal

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h1><strong>Detalle del Pedido</strong></h1>
        <p><strong>Cliente:</strong> {pedido.cliente?.nombre || 'Sin nombre'}</p>
        <p><strong>Estado:</strong> {pedido.estado || 'Estado desconocido'}</p>
        <p><strong>Total Unidades:</strong> {pedido.totalUnidades}</p>
        <p><strong>Total Precio:</strong> {pedido.totalPrecio?.toFixed(2) ?? '0.00'}</p>

        {/* Nuevos campos */}
        {pedido.totalDiscount !== undefined && (
          <p><strong>Total Descuento:</strong> {pedido.totalDiscount?.toFixed(2) ?? '0.00'}</p>
        )}
        {pedido.taxAmount !== undefined && (
          <p><strong>Monto Impuestos:</strong> {pedido.taxAmount?.toFixed(2) ?? '0.00'}</p>
        )}

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
              {pedido.items?.map((item, idx) => {
                console.log(item.cantidades);
                const tallas = Object.keys(item.cantidades).map(Number).sort((a, b) => a - b);
                const cantidades = tallas.map((t) => `${t}/${item.cantidades[t]}`).join(' ');
                return (
                  <tr key={idx}>
                    <td>{item.codigo}</td>
                    <td>{item.descripcion}</td>
                    <td>{item.serie}</td>
                    <td>{cantidades}</td>
                    <td>{item.total}</td>
                    <td>{item.precio?.toFixed(2) ?? '0.00'}</td>
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
                <td><strong>{pedido.totalPrecio?.toFixed(2) ?? '0.00'}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button className={styles.closeButton} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
