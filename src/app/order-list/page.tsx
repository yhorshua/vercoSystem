'use client';

import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  Search, Calendar, User as UserIcon, Package, Eye, XCircle,
  RefreshCw, CheckCircle2, Truck, FileText, Receipt, MapPinned,
  SlidersHorizontal, ChevronRight, AlertCircle, Sparkles, Filter
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
const VENDEDO_WEB = 'Vendedor Web';

const useRouter = () => {
  return {
    push: (url: string) => {
      console.log("[Navegación] Redirigiendo a:", url);
    }
  };
};

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
  const warehouseId = user?.warehouse_id || 1;
  const warehouseName = user?.warehouse?.warehouse_name || 'Almacén Central';
  const token = user?.token || 'temp-session-token';
  const canUse = useMemo(() => Boolean(token && warehouseId), [token, warehouseId]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [sellerId, setSellerId] = useState<string>('');


  useEffect(() => {
    if (rolUsuario === JEFEVEN || rolUsuario === ADMIN) {
      loadSellers();
    }
  }, [canUse, warehouseId, rolUsuario]);

  useEffect(() => {
    const access_token = localStorage.getItem('access_token') || token;
    if (!access_token) router.push('/login');
  }, [router]);

  const loadSellers = async () => {
    if (!(rolUsuario === JEFEVEN || rolUsuario === ADMIN)) return;
    if (!canUse) return;

    setLoadingSellers(true);
    try {
      const r = await getSellersByWarehouse(warehouseId, token);
      setSellers(r || []);
    } catch {
      setSellers([]);
    } finally {
      setLoadingSellers(false);
    }
  };

  const fetchPedidos = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: any = {};
      if (user?.id) params.user_id = user.id;
      if (user?.role) params.role = user.role;

      if (rolUsuario === JEFEVEN || rolUsuario === ADMIN) {
        if (searchEstado) params.status = searchEstado;
        if (searchDate) params.date_from = searchDate;
        if (searchVendedor) params.seller_id = searchVendedor;
      }

      const data = await getOrdersByRole(token, params);

      const mapped: Pedido[] = data.map((o: any) => ({
        id: String(o.id),
        cliente: {
          nombre: o.cliente?.nombre ?? 'Sin nombre',
          telefono: o.cliente?.telefono ?? '-',
          email: o.cliente?.email
        },
        vendedor: o.vendedor ?? 'No asignado',
        fechaRegistro: o.fechaRegistro ? (o.fechaRegistro.includes('T') ? o.fechaRegistro.split('T')[0] : o.fechaRegistro) : '-',
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
          subtotal: (d.total || 0) * (d.precio || 0),
          tallas: Array.isArray(d.tallas)
            ? d.tallas
            : Object.entries(d.cantidades || {}).map(([t, c]) => ({ talla: t, cantidad: Number(c) }))
        })) || []
      }));
      setPedidos(mapped);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Carga',
        text: 'Ocurrió un problema al leer el listado de pedidos.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, [user, searchEstado, searchDate, searchVendedor, token]);

  useEffect(() => {
    loadSellers();
  }, [canUse, warehouseId]);

  const handleAprobar = async (id: string) => {
    if (!user) return;
    const result = await Swal.fire({
      title: '¿Confirmar Aprobación?',
      text: "El pedido pasará oficialmente a la cadena de empaque y distribución.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, aprobar pedido',
      cancelButtonText: 'Dar marcha atrás'
    });
    if (result.isConfirmed) {
      try {
        await approveOrder(Number(id), user.id || 1, user.token || token);
        Swal.fire({
          icon: 'success',
          title: 'Pedido Aprobado',
          text: 'El estatus se actualizó correctamente.',
          confirmButtonColor: '#10b981'
        });
        fetchPedidos();
      } catch {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo completar la aprobación del pedido.',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const handleAnular = async (id: string) => {
    if (!user) return;
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Anulación de Pedido',
      input: 'text',
      inputLabel: 'Detalla el motivo de rechazo/cancelación:',
      inputPlaceholder: 'E.g. Sin existencias en almacenes, error de datos...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Suspender Pedido',
      cancelButtonText: 'Regresar'
    });
    if (isConfirmed) {
      try {
        await rejectOrder(Number(id), user.id || 1, motivo, user.token || token);
        Swal.fire({
          icon: 'success',
          title: 'Pedido Anulado',
          text: 'La orden ha sido suspendida en el historial del adquirente.',
          confirmButtonColor: '#4f46e5'
        });
        fetchPedidos();
      } catch {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo reportar el cambio.',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const filtered = pedidos.filter((p) =>
    p.cliente.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerarGuia = async (pedido: Pedido) => {
    if (!token) return;
    setLoadingGuia(pedido.id);
    try {
      const result = await Swal.fire({
        title: '¿Generar Guía de Remisión?',
        text: 'Se consolidará una guía interna valorada y se despachará el calzado físicamente de almacén.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, emitir despacho'
      });
      if (!result.isConfirmed) {
        setLoadingGuia(null);
        return;
      }
      const response = await createGuiaFromOrder(
        { order_id: Number(pedido.id), usuario_id: user?.id || 1 },
        token
      );
      Swal.fire({
        icon: response.ok ? 'success' : 'info',
        title: response.ok ? 'Operación Exitosa' : 'Información',
        text: response.message,
        confirmButtonColor: '#4f46e5'
      });
      const guia = response.guia;
      if (!guia) throw new Error('No se obtuvo información de la guía de remisión');

      const jefeVentas = user?.full_name || 'Jefe de Ventas';
      const pdfBlob = await buildPedidoPdfBlobFormal(pedido, jefeVentas);

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;

      const isReimpresion = response.message.toLowerCase().includes('ya generada') || response.message.toLowerCase().includes('re-despacho');
      const filename = isReimpresion
        ? `GUIA_REIMPRESION_DOC_${pedido.id}_${pedido.cliente.nombre.replace(/\s+/g, '_')}.pdf`
        : `GUIA_DESPACHO_DOC_${pedido.id}_${pedido.cliente.nombre.replace(/\s+/g, '_')}.pdf`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      fetchPedidos();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Despacho',
        text: error.message || 'No se pudo generar la guía interna.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoadingGuia(null);
    }
  };

  const orderStats = useMemo(() => {
    const totalParesSurtidos = pedidos.reduce((acc, p) => acc + (p.totalUnidades || 0), 0);
    const montoTotalSoles = pedidos.reduce((acc, p) => acc + (p.totalPrecio || 0), 0);
    return {
      totalPedidos: pedidos.length,
      paresSurtidos: totalParesSurtidos,
      solesContados: montoTotalSoles,
      pendientes: pedidos.filter(p => p.estado.toLowerCase() === 'pendiente').length,
    };
  }, [pedidos]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8 font-sans select-none">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER DE CONTROL */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600/5 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 shadow-3xs">
              <Package size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-display">
                  PANEL PRINCIPAL DE PEDIDOS
                </h1>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black rounded border border-indigo-200 uppercase tracking-wide">
                  {warehouseName}
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Consola integrada de logística, asignación de surtido en almacenes y despacho a couriers.
              </p>
            </div>
          </div>

          <button
            onClick={fetchPedidos}
            disabled={loading}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black active:scale-98 text-white rounded-xl transition-all cursor-pointer shadow-sm font-bold text-xs tracking-wider"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sincronizar Pedidos</span>
          </button>
        </div>

        {/* CONTENEDOR DE INDICADORES (KPIs) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/70 p-4 rounded-xl shadow-3xs">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest block">Surtido Acumulado</span>
              <span className="text-xs">📦</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 font-mono tracking-tight mt-1.5 leading-none">
              {orderStats.paresSurtidos} pares
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Gamas autorizadas totales</p>
          </div>

          <div className="bg-white border border-slate-200/70 p-4 rounded-xl shadow-3xs">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest block font-display">Valor Total Ventas</span>
              <span className="text-xs">💰</span>
            </div>
            <h3 className="text-xl font-black text-emerald-700 font-mono tracking-tight mt-1.5 leading-none">
              S/ {orderStats.solesContados.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">Ingresos canalizados</p>
          </div>

          <div className="bg-white border border-slate-200/70 p-4 rounded-xl shadow-3xs">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest block">Pendientes Surtido</span>
              <span className="text-xs text-amber-500 animate-pulse">●</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 font-mono tracking-tight mt-1.5 leading-none">
              {orderStats.pendientes} pedidos
            </h3>
            <p className="text-[10px] text-amber-600 font-semibold mt-1">Esperando validación</p>
          </div>

          <div className="bg-white border border-slate-200/70 p-4 rounded-xl shadow-3xs">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest block">Carga Total Operaciones</span>
              <span className="text-xs">📈</span>
            </div>
            <h3 className="text-xl font-black text-indigo-700 font-mono tracking-tight mt-1.5 leading-none">
              {orderStats.totalPedidos} de hoy
            </h3>
            <p className="text-[10px] text-indigo-500 font-bold mt-1">Concurrencia de registros</p>
          </div>
        </div>

        {/* FILTROS RESPONSIVOS */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 font-mono">
              Filtros Avanzados de Distribución:
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Escribir nombre comprador..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-xs font-semibold text-slate-700"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <input
                type="date"
                title="Fecha registro pedido"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-xs font-extrabold text-slate-700"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
            </div>

            <div>
              <select
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-xs font-bold text-slate-700 cursor-pointer"
                value={searchEstado}
                onChange={(e) => setSearchEstado(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Rechazado">Rechazado</option>
                <option value="En Alistamiento">En Alistamiento</option>
                <option value="Alistado">Alistado</option>
                <option value="Despachado">Despachado</option>
                <option value="Facturado">Facturado</option>
                <option value="Cerrado">Cerrado</option>
              </select>
            </div>

            {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && (
              <div>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-xs font-bold text-slate-700 cursor-pointer"
                  value={sellerId}
                  onChange={(e) => {
                    setSearchVendedor(e.target.value);
                    setSellerId(e.target.value);
                  }}
                >
                  <option value="">Todos los Vendedores</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* LISTADOS Y TABLAS */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="animate-spin mb-3 text-indigo-500" size={24} />
            <span className="text-xs font-bold italic">Buscando en servidor central...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center max-w-lg mx-auto shadow-3xs">
            <p className="text-4xl mb-3">📭</p>
            <h4 className="text-sm font-bold text-slate-800">No hay pedidos disponibles</h4>
            <p className="text-xs text-slate-400 mt-1">
              No encontramos órdenes activas con los filtros elegidos en este momento.
            </p>
          </div>
        ) : (
          <>
            {/* VISTA MOBILE CARDS */}
            <div className="md:hidden space-y-3.5">
              {filtered.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-3.5 shadow-3xs hover:border-slate-350 transition-all active:scale-98"
                >
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100/60">
                    <span className="font-mono font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                      #{pedido.id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-3xs border ${pedido.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      pedido.estado === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        pedido.estado === 'Rechazado' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                      {pedido.estado}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 block uppercase tracking-widest">Adquirente</span>
                      <p className="font-extrabold text-slate-800 uppercase tracking-tight">{pedido.cliente.nombre}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 block uppercase tracking-widest">Surtidor Logístico</span>
                      <p className="font-bold text-slate-500">{pedido.vendedor}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-2.5 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono">Pares</span>
                      <span className="text-xs font-black text-indigo-600 font-mono">{pedido.totalUnidades} pares</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono">Importe</span>
                      <span className="text-xs font-black text-slate-800 font-mono">S/ {pedido.totalPrecio.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-end gap-2">
                    <button
                      onClick={() => setPedidoSeleccionado(pedido)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-all"
                    >
                      <Eye size={14} />
                    </button>

                    {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && pedido.estado === 'Pendiente' && (
                      <button
                        onClick={() => handleAprobar(pedido.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 text-white font-extrabold text-[10px] rounded-lg shadow-sm"
                      >
                        Aprobar
                      </button>
                    )}

                    {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && pedido.estado === 'En Alistamiento' && (
                      <button
                        onClick={() => setPedidoEnPicking(pedido)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] rounded-lg tracking-wider"
                      >
                        Picking
                      </button>
                    )}

                    {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && estadosPermitidos.includes(pedido.estado) && (
                      <button
                        onClick={() => handleGenerarGuia(pedido)}
                        disabled={loadingGuia === pedido.id}
                        className="p-1.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg text-xs"
                      >
                        Guía
                      </button>
                    )}

                    {(rolUsuario === VENDEDO || rolUsuario === VENDEDO_WEB || rolUsuario === JEFEVEN || rolUsuario === ADMIN) &&
                      pedido.estado !== 'Aprobado' && pedido.estado !== 'Rechazado' && (
                        <button
                          onClick={() => handleAnular(pedido.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA DESKTOP TABLA */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto font-sans">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#FAFBFD] border-b border-slate-200/60 font-black tracking-wider uppercase text-[9px] text-slate-400">
                    <tr>
                      <th className="px-5 py-4 text-center w-28 text-[9px]">Ref. Orden</th>
                      <th className="px-5 py-4">Ficha Cliente / Surtidor</th>
                      <th className="px-5 py-4 text-center">Pares Solicitados</th>
                      <th className="px-5 py-4 text-right">Importe Neto</th>
                      <th className="px-5 py-4">Registro</th>
                      <th className="px-5 py-4">Estado</th>
                      <th className="px-5 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filtered.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                        <td className="px-5 py-4 text-center">
                          <span className="font-mono font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded text-xs select-none">
                            #{pedido.id}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-slate-800 uppercase tracking-tight text-xs leading-none">
                            {pedido.cliente.nombre}
                          </p>
                          <div className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1 leading-none uppercase">
                            <UserIcon size={11} className="text-indigo-400" />
                            {pedido.vendedor}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-mono font-black text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded shadow-3xs">
                            {pedido.totalUnidades} pares
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-black text-slate-800 text-xs font-mono leading-none">
                          S/ {pedido.totalPrecio.toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wide font-mono">
                          {pedido.fechaRegistro}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-3xs border ${pedido.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            pedido.estado === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              pedido.estado === 'Rechazado' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                            {pedido.estado}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => setPedidoSeleccionado(pedido)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                              title="Inspeccionar Orden Completa"
                            >
                              <Eye size={14} />
                            </button>

                            {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && pedido.estado === 'Pendiente' && (
                              <button
                                onClick={() => handleAprobar(pedido.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-3xs"
                              >
                                <CheckCircle2 size={11} />
                                <span>Aprobar</span>
                              </button>
                            )}

                            {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && pedido.estado === 'En Alistamiento' && (
                              <button
                                onClick={() => setPedidoEnPicking(pedido)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-3xs"
                              >
                                <Truck size={11} />
                                <span>Picking</span>
                              </button>
                            )}

                            {(rolUsuario === JEFEVEN || rolUsuario === ADMIN) && estadosPermitidos.includes(pedido.estado) && (
                              <div className="flex items-center gap-1 flex-row">
                                <button
                                  onClick={() => handleGenerarGuia(pedido)}
                                  disabled={loadingGuia === pedido.id}
                                  className="p-1.5 text-slate-500 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-150 rounded-lg transition-all active:scale-98 cursor-pointer shadow-3xs"
                                  title="Emitir Guía"
                                >
                                  {loadingGuia === pedido.id ? '...' : <FileText size={13} />}
                                </button>
                                <button className="p-1.5 text-slate-400 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-all shadow-3xs" title="Factura Comercial">
                                  <Receipt size={13} />
                                </button>
                                <button className="p-1.5 text-slate-400 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-all shadow-3xs" title="Remisión Olva/Cargo">
                                  <MapPinned size={13} />
                                </button>
                              </div>
                            )}

                            {(rolUsuario === VENDEDO || rolUsuario === VENDEDO_WEB || rolUsuario === JEFEVEN || rolUsuario === ADMIN) &&
                              pedido.estado !== 'Aprobado' && pedido.estado !== 'Rechazado' && (
                                <button
                                  onClick={() => handleAnular(pedido.id)}
                                  className="p-1.5 text-slate-350 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all cursor-pointer"
                                  title="Anular / Cancelar Orden"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

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
          onFinalizar={() => {
            setPedidoEnPicking(null);
            fetchPedidos();
          }}
        />
      )}
    </div>
  );
}