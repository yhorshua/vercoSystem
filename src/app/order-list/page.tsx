'use client';

import { useState, useEffect } from 'react';
import styles from './orderList.module.css';
import PedidoDetalleModal from './PedidoDetalleModal';
import Swal from 'sweetalert2';
import { generarProformaPDF } from '../utils/pdfGenerator';
import PickingModal from './PickingModal';
import { useUser } from '../context/UserContext'; // Usar el contexto de usuario para obtener el rol

// Definimos los roles como constantes
const JEFEVEN = 'jefeVentas';
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
  fechaRegistro: string; // Añadimos fecha de registro para el filtro
  vendedor: string; // Vendedor que gestionó el pedido
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
  const [search, setSearch] = useState(''); // Filtro por cliente
  const [searchDate, setSearchDate] = useState(''); // Filtro por fecha
  const [searchVendedor, setSearchVendedor] = useState(''); // Filtro por vendedor
  const [searchEstado, setSearchEstado] = useState(''); // Filtro por estado

  // Accedemos al contexto para obtener el rol del usuario
  const { userArea: rolUsuario } = useUser(); // El rol viene del contexto

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

  // Filtrado de artículos basado en la búsqueda
  const filtered = pedidos.filter((pedido) => {
    const clienteCodigo = pedido.cliente.codigo || '';
    const clienteNombre = pedido.cliente.nombre.toLowerCase() || '';
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

      {/* Filtros de búsqueda */}
      <div className={styles.filters}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())} // Actualiza el estado de 'search'
          className={styles.inputField}
          placeholder="Buscar por cliente (código o nombre)"
        />
        <input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)} // Actualiza el estado de 'searchDate'
          className={styles.inputField}
          placeholder="Filtrar por fecha"
        />
        <select
          value={searchVendedor}
          onChange={(e) => setSearchVendedor(e.target.value)} // Actualiza el estado de 'searchVendedor'
          className={styles.inputField}
        >
          <option value="">Seleccionar vendedor</option>
          <option value="JOSE NIEVA">JOSE NIEVA</option>
          <option value="MARIA PEREZ">MARIA PEREZ</option>
          {/* Agregar más vendedores según sea necesario */}
        </select>
        <select
          value={searchEstado}
          onChange={(e) => setSearchEstado(e.target.value)} // Actualiza el estado de 'searchEstado'
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
              <th>Fecha de Registro</th>
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

                  {/* Mostrar botones si el rol es 'jefeVentas' */}
                  {rolUsuario === JEFEVEN && pedido.estado === 'Pendiente' && (
                    <button
                      onClick={() => handleAprobar(pedido.id)}
                      className={`${styles.button} ${styles.approveButton}`}
                    >
                      Aprobar
                    </button>
                  )}

                  {/* Mostrar botones para 'jefeVentas' cuando el pedido está aprobado */}
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

                  {/* Mostrar botón de anulación si el rol es 'vendedor' o 'jefeVentas' */}
                  {(rolUsuario === VENDEDO || rolUsuario === JEFEVEN) && pedido.estado !== 'Aprobado' && (
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
