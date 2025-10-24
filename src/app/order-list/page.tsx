'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from './orderList.module.css';
import PedidoDetalleModal from './PedidoDetalleModal';
import PickingModal from './PickingModal';
import { generarProformaPDF } from '../utils/pdfGenerator';
import { useUser } from '../context/UserContext';

const JEFEVEN = 'jefeventas';
const VENDEDO = 'vendedor';

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
  fechaRegistro: string;
  vendedor: string;
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
  const [search, setSearch] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchVendedor, setSearchVendedor] = useState('');
  const [searchEstado, setSearchEstado] = useState('');
  const { user } = useUser();
  const router = useRouter();

  const rolUsuario = user?.role?.toLowerCase() || '';

  // Proteger acceso sin token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Cargar pedidos almacenados
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('pedidos') || '[]');
    setPedidos(data);
  }, []);

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

  // Filtrado
  const filtered = pedidos.filter((pedido) => {
    const clienteCodigo = pedido.cliente.codigo || '';
    const clienteNombre = pedido.cliente.nombre || '';
    const fechaRegistro = pedido.fechaRegistro || '';
    const vendedor = pedido.vendedor || '';
    const estado = pedido.estado || '';

    return (
      (clienteCodigo.includes(search) || clienteNombre.includes(search.toLowerCase())) &&
      (searchDate ? fechaRegistro.includes(searchDate) : true) &&
      (searchVendedor ? vendedor.includes(searchVendedor) : true) &&
      (searchEstado ? estado.includes(searchEstado) : true)
    );
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Lista de Pedidos</h1>

      {/* Filtros */}
      <div className={styles.filters}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
          className={styles.inputField}
          placeholder="Buscar por cliente"
        />
        <input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className={styles.inputField}
        />
        <select
          value={searchVendedor}
          onChange={(e) => setSearchVendedor(e.target.value)}
          className={styles.inputField}
        >
          <option value="">Seleccionar vendedor</option>
          <option value="JOSE NIEVA">JOSE NIEVA</option>
          <option value="MARIA PEREZ">MARIA PEREZ</option>
        </select>
        <select
          value={searchEstado}
          onChange={(e) => setSearchEstado(e.target.value)}
          className={styles.inputField}
        >
          <option value="">Seleccionar estado</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Alistado">Alistado</option>
          <option value="Anulado">Anulado</option>
          <option value="Facturado">Facturado</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vendedor</th>
              <th>Cliente</th>
              <th>Total Unidades</th>
              <th>Total Precio</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pedido) => (
              <tr key={pedido.id}>
                <td>{pedido.vendedor}</td>
                <td>{pedido.cliente.nombre}</td>
                <td>{pedido.totalUnidades}</td>
                <td>{pedido.totalPrecio.toFixed(2)}</td>
                <td>{pedido.fechaRegistro}</td>
                <td>{pedido.estado}</td>
                <td>
                  <button
                    onClick={() => handleDetalle(pedido.id)}
                    className={`${styles.button} ${styles.detailButton}`}
                  >
                    Detalle
                  </button>

                  {rolUsuario === JEFEVEN && pedido.estado === 'Pendiente' && (
                    <button
                      onClick={() => handleAprobar(pedido.id)}
                      className={`${styles.button} ${styles.approveButton}`}
                    >
                      Aprobar
                    </button>
                  )}

                  {rolUsuario === JEFEVEN && pedido.estado === 'Aprobado' && (
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
                        Factura
                      </button>
                      <button
                        onClick={() => emitirGuiaRemision(pedido)}
                        className={`${styles.button} ${styles.guiaRemisionButton}`}
                      >
                        Guía Remisión
                      </button>
                    </>
                  )}

                  {(rolUsuario === VENDEDO || rolUsuario === JEFEVEN) &&
                    pedido.estado !== 'Aprobado' && (
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
        <PedidoDetalleModal pedido={pedidoSeleccionado} onClose={() => setPedidoSeleccionado(null)} />
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
