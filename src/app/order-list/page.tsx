'use client';

import { useState, useEffect } from 'react';
import styles from './orderList.module.css';
import PedidoDetalleModal from './PedidoDetalleModal';
import Swal from 'sweetalert2';
import { generarProformaPDF } from '../utils/pdfGenerator';
import PickingModal from './PickingModal';
import { useUser } from '../context/UserContext'; // Usar el contexto de usuario para obtener el rol

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
  estado: 'Pendiente' | 'Aprobado' | 'Alistado' | 'Anulado' | 'Facturado';
  items: {
    codigo: string;
    descripcion: string;
    serie: string;
    precio: number;
    total: number;
    cantidades: Record<number, number>;
  }[];
}

export default function OrderListPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);
  const [pedidoEnPicking, setPedidoEnPicking] = useState<Pedido | null>(null);

  const { userArea: rolUsuario } = useUser(); // Usamos el contexto para obtener el rol del usuario

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('pedidos') || '[]');
    setPedidos(data);
  }, []); // Solo cargar los pedidos

  const actualizarEstadoPedido = (id: string, nuevoEstado: Pedido['estado']) => {
    const actualizados = pedidos.map((pedido) =>
      pedido.id === id ? { ...pedido, estado: nuevoEstado } : pedido
    );
    setPedidos(actualizados);
    localStorage.setItem('pedidos', JSON.stringify(actualizados));
  };

  const handleAprobar = (id: string) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return;

    Swal.fire({
      title: '¿Aprobar este pedido?',
      text: 'Se generará la proforma en PDF',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        actualizarEstadoPedido(id, 'Aprobado');
        generarProformaPDF(pedido);
        Swal.fire('¡Aprobado!', 'El pedido ha sido aprobado y el PDF fue generado.', 'success');
      }
    });
  };

  const handleAnular = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Anular este pedido?',
      text: 'No podrás revertir esta acción.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      actualizarEstadoPedido(id, 'Anulado');
      Swal.fire('Anulado', 'El pedido ha sido anulado.', 'info');
    }
  };

  const handleDetalle = (id: string) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (pedido) setPedidoSeleccionado(pedido);
  };

  const generarGuiaInterna = (pedido: Pedido) => {
    Swal.fire({
      icon: 'info',
      title: 'Guía Interna en proceso',
      text: `Pedido #${pedido.id} será alistado.`,
    });
  };

  const emitirFactura = (pedido: Pedido) => {
    Swal.fire({
      icon: 'success',
      title: 'Factura lista para emitir',
      text: `Cliente: ${pedido.cliente.nombre} - Pedido #${pedido.id}`,
    });
  };

  const emitirGuiaRemision = (pedido: Pedido) => {
    Swal.fire({
      icon: 'question',
      title: '¿Emitir Guía de Remisión?',
      text: `Verifica los datos antes de proceder.`,
      confirmButtonText: 'Emitir',
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Lista de Pedidos</h1>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Total Unidades</th>
              <th>Total Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.id}>
                <td>{pedido.cliente.nombre}</td>
                <td>{pedido.totalUnidades}</td>
                <td>{pedido.totalPrecio.toFixed(2)}</td>
                <td>{pedido.estado}</td>
                <td>
                  <button
                    onClick={() => handleDetalle(pedido.id)}
                    className={`${styles.button} ${styles.detailButton}`}
                  >
                    Detalle
                  </button>

                  {rolUsuario === 'jefeVentas' && pedido.estado === 'Pendiente' && (
                    <button
                      onClick={() => handleAprobar(pedido.id)}
                      className={`${styles.button} ${styles.approveButton}`}
                    >
                      Aprobar
                    </button>
                  )}

                  {rolUsuario === 'jefeVentas' && pedido.estado === 'Aprobado' && (
                    <>
                      <button
                        onClick={() => setPedidoEnPicking(pedido)}
                        className={`${styles.button} ${styles.pickingButton}`}
                      >
                        Picking
                      </button>

                      <button
                        onClick={() => generarGuiaInterna(pedido)}
                        className={`${styles.button} ${styles.guiaButton}`}
                      >
                        Guía Interna
                      </button>

                      <button
                        onClick={() => emitirFactura(pedido)}
                        className={`${styles.button} ${styles.facturaButton}`}
                      >
                        Emitir Factura
                      </button>

                      <button
                        onClick={() => emitirGuiaRemision(pedido)}
                        className={`${styles.button} ${styles.guiaRemisionButton}`}
                      >
                        Guía Remisión
                      </button>
                    </>
                  )}

                  {rolUsuario === 'vendedor' && (
                    <button
                      onClick={() => handleAnular(pedido.id)}
                      className={`${styles.button} ${styles.cancelButton}`}
                      disabled={pedido.estado === 'Anulado'}
                    >
                      Anular
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pedidoSeleccionado && (
        <PedidoDetalleModal
          pedido={pedidoSeleccionado}
          onClose={() => setPedidoSeleccionado(null)}
        />
      )}

      {pedidoEnPicking && (
        <PickingModal
          pedido={pedidoEnPicking}
          onClose={() => setPedidoEnPicking(null)}
          onFinalizar={(pedidoActualizado) => {
            actualizarEstadoPedido(pedidoActualizado.id, 'Alistado');
            setPedidoEnPicking(null);
          }}
        />
      )}
    </div>
  );
}
