'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  Search, Calendar, User as UserIcon, Package, Eye, XCircle,
  RefreshCw, CheckCircle2, Truck, FileText, Receipt, MapPinned
} from 'lucide-react';

import PedidoDetalleModal from './PedidoDetalleModal';
import PickingModal from './PickingModal';
import { useUser } from '../context/UserContext';
import { getOrdersByRole, approveOrder, rejectOrder } from '../services/ordersService';
import { Pedido } from '../utils/types/pedidos';
import { createGuiaFromOrder } from '../services/guiaService';
import { getSellersByWarehouse, SellerOption } from '../services/userServices';
import { buildPedidoPdfBlobFormal } from '../utils/guiainterna';

const JEFEVEN = 'Jefe Ventas';
const VENDEDO = 'Vendedor';
const ADMIN = 'Administrador';

export default function OrderListPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);
  const [pedidoEnPicking, setPedidoEnPicking] = useState<Pedido | null>(null);
  const [search, setSearch] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchVendedor, setSearchVendedor] = useState('');
  const [searchEstado, setSearchEstado] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useUser();
  const router = useRouter();
  const rolUsuario = user?.role?.name_role || '';
  const [loadingGuia, setLoadingGuia] = useState<string | null>(null);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const estadosPermitidos = ['Alistado', 'Despachado', 'Facturado'];
  const warehouseId = user?.warehouse_id || 0;
  const warehouseName = user?.warehouse?.warehouse_name || '';
  const token = user?.token || '';
  const canUse = useMemo(() => Boolean(token && warehouseId), [token, warehouseId]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [sellerId, setSellerId] = useState<string>('');
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) router.push('/login');
  }, [router]);

  const loadSellers = async () => {
    if (!canUse) return;
    setLoadingSellers(true);
    try {
      const r = await getSellersByWarehouse(warehouseId, token);
      setSellers(r || []);
    } catch { setSellers([]); } finally { setLoadingSellers(false); }
  };


  const fetchPedidos = async () => {
    if (!user?.token || !user?.id) return;
    setLoading(true);
    try {
      const params: any = { user_id: user.id, role: user.role };
      if (rolUsuario === JEFEVEN || rolUsuario === ADMIN) {
        if (searchEstado) params.status = searchEstado;
        if (searchDate) params.date_from = searchDate;
        if (searchVendedor) params.seller_id = searchVendedor;
      }
      const data = await getOrdersByRole(user.token, params);

      const mapped: Pedido[] = data.map((o: any) => ({
        id: String(o.id),
        cliente: {
          nombre: o.cliente?.nombre ?? 'Sin nombre',
          telefono: o.cliente?.telefono ?? '-',
          email: o.cliente?.email
        },
        vendedor: o.vendedor ?? 'No asignado',
        fechaRegistro: o.fechaRegistro?.split('T')[0] ?? '-',
        estado: o.estado ?? 'Pendiente',
        totalUnidades: o.totalUnidades ?? 0,
        totalPrecio: o.totalPrecio ?? 0,
        totalPares: o.totalUnidades ?? 0,
        totalMonto: o.totalPrecio ?? 0,
        items: o.items?.map((d: any) => ({
          id: d.id,
          nombre: d.descripcion ?? 'Sin descripción',
          codigo: d.codigo,
          serie: d.serie,
          precio: Number(d.precio) || 0,
          subtotal: d.total * d.precio,
          tallas: Array.isArray(d.cantidades)
            ? d.cantidades
            : Object.entries(d.cantidades || {}).map(([t, c]) => ({ talla: t, cantidad: Number(c) }))
        })) || []
      }));
      setPedidos(mapped);
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los pedidos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPedidos(); }, [user, searchEstado, searchDate, searchVendedor]);

  const handleAprobar = async (id: string) => {
    if (!user) return;
    const result = await Swal.fire({
      title: '¿Aprobar pedido?',
      text: "Se generará la proforma automáticamente",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Sí, aprobar'
    });
    if (result.isConfirmed) {
      try {
        await approveOrder(Number(id), user.id, user.token);
        Swal.fire('Éxito', 'Pedido aprobado', 'success');
        fetchPedidos();
      } catch { Swal.fire('Error', 'No se pudo aprobar', 'error'); }
    }
  };

  const handleAnular = async (id: string) => {
    if (!user) return;
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Anular Pedido',
      input: 'text',
      inputLabel: 'Motivo de anulación',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
    });
    if (isConfirmed) {
      try {
        await rejectOrder(Number(id), user.id, motivo, user.token);
        Swal.fire('Anulado', 'El pedido ha sido cancelado', 'success');
        fetchPedidos();
      } catch { Swal.fire('Error', 'No se pudo anular', 'error'); }
    }
  };

  const filtered = pedidos.filter((p) =>
    p.cliente.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerarGuia = async (pedido: Pedido) => {
    if (!user) return;

    setLoadingGuia(pedido.id);

    try {
      // Confirmación para generar la guía
      const result = await Swal.fire({
        title: '¿Generar guía interna?',
        text: 'Se generará la guía y se despachará el pedido',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Sí, generar',
      });

      if (!result.isConfirmed) {
        setLoadingGuia(null);
        return;
      }

      // Llamada al servicio que genera la guía
      const response = await createGuiaFromOrder(
        { order_id: Number(pedido.id), usuario_id: user.id },
        user.token
      );

      // Mostrar mensaje según la respuesta
      Swal.fire(
        response.ok ? 'Éxito' : 'Información',
        response.message,
        response.ok ? 'success' : 'info'
      );

      // Tomar los datos de la guía (ya sea nueva o existente)
      const guia = response.guia;

      if (!guia) throw new Error('No se obtuvo información de la guía');

      // Nombre del jefe de ventas (puede ser dinámico)
      const jefeVentas = user.full_name || 'Jefe de Ventas';

      // Generar el PDF formal con los datos de la guía
      const pdfBlob = await buildPedidoPdfBlobFormal(pedido, jefeVentas);

      // Descargar automáticamente el PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;

      // Diferenciar entre nueva guía y reimpresión
      const filename = response.message.includes('ya generada')
        ? `GUIA_REIMPRESION_${pedido.vendedor}_${pedido.cliente.nombre}.pdf`
        : `GUIA_${pedido.vendedor}_${pedido.cliente.nombre}.pdf`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      fetchPedidos(); // refrescar lista si es necesario

    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoadingGuia(null);
    }
  };

  useEffect(() => { loadSellers(); }, [canUse, warehouseId]);
  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tighter">
              <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
                <Package size={24} />
              </div>
              PANEL DE PEDIDOS
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Gestión logística y administrativa de ventas</p>
          </div>
          <button
            onClick={fetchPedidos}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl transition-all font-bold text-xs tracking-widest"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            ACTUALIZAR LISTADO
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm font-medium text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-sm font-medium"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
          <select
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm font-bold text-sm text-slate-700"
            value={searchEstado}
            onChange={(e) => setSearchEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="1">Pendiente</option>
            <option value="2">Aprobado</option>
            <option value="3">Rechazado</option>
            <option value="4">En Alistamiento</option>
            <option value="5">Alistado</option>
            <option value="6">Guía Generada</option>
            <option value="7">Despachado</option>
            <option value="8">Facturado</option>
            <option value="9">Cerrado</option>
          </select>

          <select
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm font-bold text-sm text-slate-700"
            value={sellerId}
            onChange={(e) => { setSearchVendedor(e.target.value); setSellerId(e.target.value); }}
          >
            <option value="">Todos los Vendedores</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">
                  <th className="px-6 py-4 text-center w-24">ID Pedido</th>
                  <th className="px-6 py-4">Información del Cliente</th>
                  <th className="px-6 py-4">Resumen Totales</th>
                  <th className="px-6 py-4">Registro</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones Disponibles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm">#{pedido.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-800 text-sm uppercase">{pedido.cliente.nombre}</div>
                      <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                        <UserIcon size={12} className="text-indigo-400" /> {pedido.vendedor}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-700 text-sm">S/ {pedido.totalPrecio.toFixed(2)}</div>
                      <div className="text-[10px] text-indigo-500 font-black italic">{pedido.totalUnidades} PARES</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-bold text-xs uppercase">{pedido.fechaRegistro}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border shadow-sm ${pedido.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        pedido.estado === 'Pendiente' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          pedido.estado === 'Rechazado' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end items-center gap-2">
                        {/* Botón Detalle: Visible para todos */}
                        <button
                          onClick={() => setPedidoSeleccionado(pedido)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                          title="Ver Detalle"
                        >
                          <Eye size={18} />
                        </button>

                        {/* ACCIONES JEFE / ADMIN - PENDIENTE */}
                        {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && pedido.estado === 'Pendiente' && (
                          <button
                            onClick={() => handleAprobar(pedido.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all uppercase tracking-widest"
                          >
                            <CheckCircle2 size={14} /> Aprobar
                          </button>
                        )}

                        {/* ACCIONES JEFE / ADMIN - APROBADO (CONFIRMADO) */}
                        {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && pedido.estado === 'En Alistamiento' && (
                          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <button
                              onClick={() => setPedidoEnPicking(pedido)}
                              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all uppercase"
                              title="Iniciar Picking"
                            >
                              <Truck size={14} /> Picking
                            </button>


                          </div>
                        )}

                        {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && estadosPermitidos.includes(pedido.estado) && (
                          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <button
                              onClick={() => handleGenerarGuia(pedido)}
                              disabled={loadingGuia === pedido.id}
                              className="p-2 text-slate-500 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all disabled:opacity-50"
                            >
                              {loadingGuia === pedido.id ? '...' : <FileText size={16} />}
                            </button>
                            <button className="p-2 text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all" title="Factura">
                              <Receipt size={16} />
                            </button>
                            <button className="p-2 text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all" title="Guía Remisión">
                              <MapPinned size={16} />
                            </button>
                          </div>
                        )}

                        {/* ACCIÓN ANULAR: Visible para todos los roles si no está confirmado/anulado */}
                        {(rolUsuario === VENDEDO || rolUsuario === JEFEVEN || rolUsuario === ADMIN) &&
                          pedido.estado !== 'Aprobado' && pedido.estado !== 'Rechazado' && (
                            <button
                              onClick={() => handleAnular(pedido.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                              title="Anular Pedido"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white">
                <Package size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold italic tracking-widest uppercase">No hay pedidos disponibles</p>
              </div>
            )}
          </div>
        </div>
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
          onFinalizar={() => {
            setPedidoEnPicking(null);
            fetchPedidos();
          }}
        />
      )}
    </div>
  );
}