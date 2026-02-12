'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from './orderList.module.css';
import PedidoDetalleModal from './PedidoDetalleModal';
import PickingModal from './PickingModal';
import { useUser } from '../context/UserContext';
import {
  getOrdersByRole,
  approveOrder,
  rejectOrder,
  getOrderById,
} from '../services/ordersService';

const JEFEVEN = 'jefeventas';
const VENDEDO = 'vendedor';
const ADMIN = 'administrador';


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
    cantidades: Record<string, number>;
  }[];
  totalDiscount?: number;
  taxAmount?: number;
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

  const rolUsuario = user?.role?.name_role || '';

  console.log("rol usuario", rolUsuario);

  // Proteger acceso sin token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Cargar pedidos desde backend
  useEffect(() => {
    if (!user?.token || !user?.id) return;

    const fetchPedidos = async () => {
      try {
        const params: any = {
          user_id: user.id,
          role: user.role,
        };

        if (rolUsuario === JEFEVEN || rolUsuario === ADMIN) {
          if (searchEstado) params.status = searchEstado;
          if (searchDate) params.date_from = searchDate;
          if (searchVendedor) params.seller_id = searchVendedor;
        }

        const data = await getOrdersByRole(user.token, params);

        console.log("Datos recibidos del backend:", data);  // Asegúrate de que los datos se vean aquí

        const mapped: Pedido[] = data.map((o: any) => ({
          id: String(o.id),
          cliente: {
            codigo: o.cliente?.codigo ?? 'Sin código',  // Ajustado al formato correcto
            nombre: o.cliente?.nombre ?? 'Sin nombre',  // Ajustado al formato correcto
            ruc: o.cliente?.ruc ?? 'Sin RUC',            // Ajustado al formato correcto
            direccion: o.cliente?.direccion ?? 'Sin dirección',  // Ajustado al formato correcto
          },
          vendedor: o.vendedor ?? 'Vendedor no asignado',  // Ajuste al formato correcto
          fechaRegistro: o.fechaRegistro?.split('T')[0] ?? 'Fecha no disponible',  // Fecha formateada
          estado: o.estado ?? 'Estado desconocido',  // Mapeo del estado correctamente
          totalUnidades: o.totalUnidades ?? 0,  // Verifica que `totalUnidades` esté bien mapeado
          totalPrecio: o.totalPrecio ?? 0,      // Verifica que `totalPrecio` esté bien mapeado
          items: o.items?.map((d: any) => ({
            codigo: d.codigo ?? 'Sin código',  // Ajuste al formato correcto
            descripcion: d.descripcion ?? 'Descripción no disponible',  // Ajuste al formato correcto
            serie: d.serie ?? 'Sin serie',  // Ajuste al formato correcto
            precio: Number(d.precio) || 0,  // Verifica que el precio esté correctamente convertido a número
            total: d.total || 0,  // Verifica que la cantidad no sea undefined
            cantidades: Object.fromEntries(
      Object.entries(d.cantidades).map(([key, value]) => [Number(key), value])  // Convertimos claves a números
    ),
  })) || [],
          totalDiscount: o.totalDiscount ?? 0,
          taxAmount: o.taxAmount ?? 0,
        }));




        console.log("Datos mapeados:", mapped);
        setPedidos(mapped);  // Asegúrate de que los datos mapeados se asignen correctamente
      } catch (error) {
        console.error("Error al cargar los pedidos:", error);
        Swal.fire('Error', 'No se pudieron cargar los pedidos', 'error');
      }
    };


    fetchPedidos();
  }, [user, searchEstado, searchDate, searchVendedor]);

  // Aprobar pedido
  const handleAprobar = async (id: string) => {
    if (!user) return;

    const result = await Swal.fire({
      title: '¿Aprobar este pedido?',
      text: 'Se generará la proforma en PDF',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
    });

    if (!result.isConfirmed) return;

    try {
      await approveOrder(Number(id), user.id, user.token);

      Swal.fire('Aprobado', 'Pedido aprobado correctamente', 'success');

      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: 'Aprobado' } : p))
      );
    } catch {
      Swal.fire('Error', 'No se pudo aprobar el pedido', 'error');
    }
  };

  // Anular pedido
  const handleAnular = async (id: string) => {
    if (!user) return;

    const result = await Swal.fire({
      title: '¿Anular este pedido?',
      input: 'text',
      inputLabel: 'Motivo (opcional)',
      showCancelButton: true,
      confirmButtonText: 'Anular',
    });

    if (!result.isConfirmed) return;

    try {
      await rejectOrder(Number(id), user.id, result.value, user.token);

      Swal.fire('Anulado', 'Pedido anulado correctamente', 'success');

      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: 'Anulado' } : p))
      );
    } catch {
      Swal.fire('Error', 'No se pudo anular el pedido', 'error');
    }
  };

  // Ver detalle del pedido
  const handleDetalle = (id: string) => {
    if (!user) return;

    const pedidoDetalle = pedidos.find((pedido) => pedido.id === id);

    if (pedidoDetalle) {
      setPedidoSeleccionado(pedidoDetalle); // Pasamos el pedido directamente desde el estado
    } else {
      Swal.fire('Error', 'No se encontró el pedido', 'error');
    }
  };


  const filtered = pedidos.filter((pedido) => {
    const clienteCodigo = String(pedido.cliente.codigo) || '';  // Convertimos a string
    const clienteNombre = pedido.cliente.nombre || '';
    const fechaRegistro = pedido.fechaRegistro || '';
    const vendedor = pedido.vendedor || '';
    const estado = pedido.estado || '';

    // Aquí agregamos los filtros para los campos que vienen del backend (clienteCodigo, clienteNombre, etc.)
    return (
      (clienteCodigo.includes(search) ||
        clienteNombre.toLowerCase().includes(search.toLowerCase())) &&
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

      {/* Tabla de pedidos */}
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
                  <button onClick={() => handleDetalle(pedido.id)} className={`${styles.button} ${styles.detailButton}`}>
                    Detalle
                  </button>

                  {rolUsuario === JEFEVEN || rolUsuario === ADMIN && pedido.estado === 'Pendiente' && (
                    <button onClick={() => handleAprobar(pedido.id)} className={`${styles.button} ${styles.approveButton}`}>
                      Aprobar
                    </button>
                  )}

                  {rolUsuario === JEFEVEN || rolUsuario === ADMIN && pedido.estado === 'Aprobado' && (
                    <>
                      <button onClick={() => setPedidoEnPicking(pedido)} className={`${styles.button} ${styles.pickingButton}`}>
                        Picking
                      </button>
                      <button className={`${styles.button} ${styles.guiaButton}`}>Guía Interna</button>
                      <button className={`${styles.button} ${styles.facturaButton}`}>Factura</button>
                      <button className={`${styles.button} ${styles.guiaRemisionButton}`}>Guía Remisión</button>
                    </>
                  )}

                  {(rolUsuario === VENDEDO || rolUsuario === JEFEVEN || rolUsuario === ADMIN) &&
                    pedido.estado !== 'Aprobado' && (
                      <button onClick={() => handleAnular(pedido.id)} className={`${styles.button} ${styles.cancelButton}`} disabled={pedido.estado === 'Anulado'}>
                        Anular
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modales */}
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
            setPedidos((prev) =>
              prev.map((p) =>
                p.id === pedidoActualizado.id ? { ...p, estado: 'Alistado' } : p
              )
            );
            setPedidoEnPicking(null);
          }}
        />
      )}
    </div>
  );
}
