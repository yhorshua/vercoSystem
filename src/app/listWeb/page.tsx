'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  Search,
  Eye,
  Phone,
  Calendar,
  Hash,
  X,
  User,
  Map,
  MapPin,
  CreditCard,
  Package,
  Printer,
  Route,
  RefreshCw,
  TrendingUp,
  Clock,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Compass,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  Info,
  Layers,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { PedidoStatusBadge } from '../components/badge';

import {
  getWebSales,
  updateWebSaleStatus,
  WebSaleResponse, deliverSaleRequest
} from '../services/webSaleService';
import Swal from 'sweetalert2';
import { printLabels } from '../utils/printTickets';
import {
  getDashboardSocket,
  WebSaleNotification,
  OrderNotification,
  DashboardCounters,
} from '../services/dashboardSocketService';
import { useDashboardSocket } from '../context/DashboardSocketContext';


export default function ListaPedidosPage() {
  const [filter, setFilter] = useState('todos');
  const [sales, setSales] = useState<WebSaleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useUser();
  const [detailStatusMap, setDetailStatusMap] = useState<
    Record<number, string>
  >({});

  const token = user?.token;

  const [selectedSale, setSelectedSale] = useState<WebSaleResponse | null>(null);
  const [shippingCodeInput, setShippingCodeInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const { counters } = useDashboardSocket();
  const { refreshKey } = useDashboardSocket();


  const role = user?.role?.name_role;
  const isSalesManager = user?.role?.name_role === 'Jefe Ventas';
  const isDelivery = role === 'Delivery';

  const canViewAgencyInfo =
    role === 'Jefe Ventas' ||
    role === 'Vendedor Web' ||
    role === 'Delivery';

  // State counts for reactive filter badges
  const stateCounts = useMemo(() => {
    return {
      todos: sales.length,
      PENDIENTE: sales.filter(s => s.status === 'PENDIENTE').length,
      APROBADO: sales.filter(s => s.status === 'APROBADO').length,
      DESPACHADO: sales.filter(s => s.status === 'DESPACHADO').length,
      ENTREGADO: sales.filter(s => s.status === 'ENTREGADO').length,
      CANCELADO: sales.filter(s => s.status === 'CANCELADO').length,
    };
  }, [sales]);

  const runAction = async (key: string, callback: () => Promise<void>) => {
    if (actionLoading) return; // bloquea spam general

    try {
      setActionLoading(key);
      await callback();
    } finally {
      setActionLoading(null);
    }
  };


  // Status Change handler using SweetAlert2 with bespoke enterprise theme
  const changeStatus = async (status: string) => {
    if (!selectedSale || !token) return;

    const result = await Swal.fire({
      title: '¿Confirmar Operación?',
      text: `¿Desea cambiar el estado del pedido ${selectedSale.ticket} a "${status.toUpperCase()}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-2xl border border-slate-100 shadow-2xl p-6 font-sans',
        title: 'text-lg font-bold text-slate-800',
        htmlContainer: 'text-sm text-slate-500',
        confirmButton: 'px-5 py-2.5 rounded-xl font-semibold text-xs',
        cancelButton: 'px-5 py-2.5 rounded-xl font-semibold text-xs'
      }
    });

    if (!result.isConfirmed) return;

    try {
      await updateWebSaleStatus(
        selectedSale.id,
        status,
        token,
        selectedSale.shipping_code ?? ''
      );

      setSelectedSale({
        ...selectedSale,
        status
      });

      setSales(prev =>
        prev.map(s =>
          s.id === selectedSale.id
            ? { ...s, status }
            : s
        )
      );

      await Swal.fire({
        icon: 'success',
        title: '¡Operación Exitosa!',
        text: `Estado cambiado a ${status} correctamente.`,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#4f46e5',
        timer: 2000
      });

    } catch (error) {
      console.error(error);
      await Swal.fire({
        icon: 'error',
        title: 'Error de Red',
        text: 'Ocurrió un problema al interactuar con el servidor de ventas.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  // Autorefresh logic (every 100 seconds)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      loadSales();
    }, 100000);
    return () => clearInterval(interval);
  }, [token, filter, refreshKey]);

  // Trigger loads on filter/token change
  useEffect(() => {
    if (token) {
      loadSales();
    }
  }, [filter, token]);

  const loadSales = async () => {
    try {
      setLoading(true);
      if (!token) return;

      const data = await getWebSales(
        token,
        {
          status: filter !== 'todos' ? filter : undefined
        }
      );
      setSales(data);
    } catch (error) {
      console.error("Error loading sales:", error);
    } finally {
      // Small graceful timeout to enjoy the skeleton rendering feedback
      setTimeout(() => {
        setLoading(false);
      }, 350);
    }
  };

  // Delivery rider checkout confirmation
  const handleDelivered = async (sale: WebSaleResponse) => {
    if (!token) return;

    if (
      sale.is_agency_delivery &&
      !shippingCodeInput.trim()
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Código de Agencia Requerido',
        text: 'Es obligatorio registrar la guía de encomienda para entregas por Agencia.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    try {
      // 1. actualizar detalles
      await deliverSaleRequest(
        sale.id,
        {
          details: sale.details.map((d: any) => ({
            detail_id: d.id,
            status: detailStatusMap[d.id] || 'VENDIDO'
          }))
        },
        token
      );

      // 2. actualizar estado general
      await updateWebSaleStatus(
        sale.id,
        'ENTREGADO',
        token,
        shippingCodeInput
      );

      Swal.fire({
        icon: 'success',
        title: '¡Entrega Realizada!',
        text: 'La logística del pedido ha sido despachada y almacenada con éxito.',
        confirmButtonColor: '#10b981'
      });

      loadSales();
      handleCloseModal();

    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error de Despacho',
        text: 'La base de datos rechazó la confirmación del estado actual.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  // Memoized search filtering
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const text = `
        ${sale.customer_name}
        ${sale.customer_phone}
        ${sale.ticket}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [sales, search]);

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSale(null);
  };

  const openWaze = () => {
    if (!selectedSale) return;
    const address = `${selectedSale.customer_address}, ${selectedSale.district}`;
    window.open(
      `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
      '_blank'
    );
  };

  const openGoogleMaps = () => {
    if (!selectedSale) return;
    const address = encodeURIComponent(
      `${selectedSale.customer_address}, ${selectedSale.district}`
    );
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${address}`,
      '_blank'
    );
  };

  const generateRoute = () => {
    const deliveries = sales.filter(
      sale => sale.status === 'DESPACHADO' && !sale.is_agency_delivery
    );

    const addresses = deliveries.map(
      sale => `${sale.customer_address}, ${sale.district}`
    );

    const origin = 'Calle Los Pacaes 965, San Juan de Lurigancho';

    const routeUrl = `https://www.google.com/maps/dir/${[
      origin,
      ...addresses
    ]
      .map(a => encodeURIComponent(a))
      .join('/')}`;

    window.open(routeUrl, '_blank');
  };

  const pendingDeliveries = sales.filter(
    sale => sale.status === 'DESPACHADO' && !sale.is_agency_delivery
  ).length;

  const updateDetailStatus = (detailId: number, status: string) => {
    setDetailStatusMap(prev => ({
      ...prev,
      [detailId]: status
    }));
  };

  // Complete KPI live state computations
  const stats = useMemo(() => {
    const totalSalesAmount = sales
      .filter(s => s.status !== 'CANCELADO')
      .reduce((sum, s) => sum + Number(s.total_amount), 0);

    const countPendientes = sales.filter(s => s.status === 'PENDIENTE').length;
    const countAprobados = sales.filter(s => s.status === 'APROBADO').length;
    const countDespachados = sales.filter(s => s.status === 'DESPACHADO').length;
    const countEntregados = sales.filter(s => s.status === 'ENTREGADO').length;
    const countCancelados = sales.filter(s => s.status === 'CANCELADO').length;

    return {
      totalSalesAmount,
      countPendientes,
      countAprobados,
      countDespachados,
      countEntregados,
      countCancelados,
    };
  }, [sales]);

  // Graceful state view if token/session is missing
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Sesión Inválida</h1>
          <p className="text-slate-500 text-sm mb-6">
            No se detectó un token de seguridad activo. Por favor ingresa desde la plataforma central.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER BLOCK */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/5 flex items-center justify-center text-indigo-600 border border-indigo-100">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                  Ventas y Envíos
                </h1>
              </div>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Plataforma de rastreo y administración de envíos.
              </p>
            </div>
          </div>

          {/* Sincronización feedback */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Ingresos de hoy</span>
              <span className="text-base font-extrabold text-indigo-600 font-mono">
                S/ {stats.totalSalesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <button
              onClick={loadSales}
              className="p-2.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-950 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Recargar base de datos"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>

        {/* 5-STATE KPI DASHBOARD */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">

          {/* 1. PENDIENTES */}
          <div className="bg-white border border-slate-200/50 p-4 rounded-xl shadow-3xs hover:border-slate-300 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Espera</span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={12} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-mono mt-2 tracking-tight">
              {stats.countPendientes}
            </h3>
            <p className="text-[10px] text-amber-600 font-semibold mt-1">Nuevos Pedidos</p>
          </div>

          {/* 2. APROBADOS */}
          <div className="bg-white border border-slate-200/50 p-4 rounded-xl shadow-3xs hover:border-slate-300 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Aprobados</span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle size={12} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-mono mt-2 tracking-tight">
              {stats.countAprobados}
            </h3>
            <p className="text-[10px] text-blue-600 font-semibold mt-1">Listos etiquetas</p>
          </div>

          {/* 3. DESPACHADOS */}
          <div className="bg-white border border-slate-200/50 p-4 rounded-xl shadow-3xs hover:border-slate-300 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">En Ruta</span>
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Route size={12} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-mono mt-2 tracking-tight">
              {stats.countDespachados}
            </h3>
            <p className="text-[10px] text-indigo-600 font-semibold mt-1">Con Motorizado</p>
          </div>

          {/* 4. ENTREGADOS */}
          <div className="bg-white border border-slate-200/50 p-4 rounded-xl shadow-3xs hover:border-slate-300 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Entregados</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle size={12} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-mono mt-2 tracking-tight">
              {stats.countEntregados}
            </h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">Exitosos hoy</p>
          </div>

          {/* 5. CANCELADOS */}
          <div className="bg-white border border-slate-200/50 p-4 rounded-xl shadow-3xs hover:border-slate-300 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Cancelados</span>
              <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-650 flex items-center justify-center">
                <AlertCircle size={12} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-rose-700 font-mono mt-2 tracking-tight">
              {stats.countCancelados}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Anulaciones</p>
          </div>

        </div>

        {/* CONTROLES PRINCIPALES: FILTROS & BUSCADOR */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-4">

          {/* TABS DE ESTADOS RE-DISEÑADOS */}
          <div className="border-b border-slate-100 pb-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
              <SlidersHorizontal size={13} className="text-slate-450" />
              <span>Etapas de Despacho:</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth">
              {[
                { ID: 'todos', label: '📁 Ver Todos', count: stateCounts.todos },
                { ID: 'PENDIENTE', label: '⏳ En Espera', count: stateCounts.PENDIENTE },
                { ID: 'APROBADO', label: '✓ Aprobados', count: stateCounts.APROBADO },
                { ID: 'DESPACHADO', label: '🚚 En Ruta', count: stateCounts.DESPACHADO },
                { ID: 'ENTREGADO', label: '🎉 Entregados', count: stateCounts.ENTREGADO },
                { ID: 'CANCELADO', label: '✕ Cancelados', count: stateCounts.CANCELADO }
              ].map((tab) => (
                <button
                  key={tab.ID}
                  onClick={() => setFilter(tab.ID)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-tight transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${filter === tab.ID
                    ? 'bg-indigo-650 text-white shadow-xs'
                    : 'bg-slate-55 bg-slate-50 text-slate-605 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full leading-none ${filter === tab.ID
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 text-slate-600'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* BUSCADOR Y ACCIONES MASIVO */}
          <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">

            {/* Buscador Modernizado */}
            <div className="flex-1 min-w-0 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 hover:border-slate-300 focus-within:border-indigo-550 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <Search className="text-slate-410 text-slate-400 shrink-0" size={16} />
              <input
                type="text"
                placeholder="Buscar por cliente, teléfono o ticket..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none font-medium text-slate-700 text-xs placeholder-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="p-1 hover:bg-slate-200 text-slate-400 rounded-full transition-colors"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {/* Fila botones logísticos */}
            <div className="flex flex-wrap items-center gap-2">
              {isSalesManager && (
                <button
                  onClick={() => {
                    const approvedSales = sales.filter(s => s.status === 'APROBADO');
                    printLabels(approvedSales);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Printer size={13} />
                  <span>Imprimir Etiquetas ({sales.filter(s => s.status === 'APROBADO').length})</span>
                </button>
              )}
              {/* Botón generar ruta visible solo para transportistas (Delivery) */}
              {isDelivery && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                  <div className="px-3 py-1.5 bg-orange-50 border border-orange-100 text-orange-700 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <span>{pendingDeliveries} Directos</span>
                  </div>

                  <button
                    onClick={generateRoute}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Route size={13} />
                    <span>Trazar Mapa Ruta</span>
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* TABLA MODERNIZADA (DESKTOP) & LISTA RESPONSIVA (MOBILE CARD LAYOUT) */}

        {/* LOADING O SKELETON LOADERS DEL SERVIDOR */}
        {loading ? (
          <div className="space-y-3.5">
            {/* Desktop skeleton render helper */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 p-4 bg-slate-50/50">
                <div className="h-4 bg-slate-200/80 rounded w-1/4 animate-pulse"></div>
              </div>
              <table className="w-full">
                <tbody>
                  {[1, 2, 3, 4].map((i) => (
                    <tr key={i} className="animate-pulse border-b border-slate-50 last:border-none">
                      <td className="p-6 w-1/4"><div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div><div className="h-3 bg-slate-100 rounded w-1/3"></div></td>
                      <td className="p-6 w-1/4"><div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div><div className="h-3 bg-slate-100 rounded w-1/3"></div></td>
                      <td className="p-6 text-center w-12"><div className="h-6 bg-slate-200 rounded-md w-10 mx-auto"></div></td>
                      <td className="p-6 text-right w-24"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
                      <td className="p-6 w-32"><div className="h-6 bg-slate-200 rounded-full w-24"></div></td>
                      <td className="p-6 w-16"><div className="h-8 w-8 bg-slate-200 rounded-xl ml-auto"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile skeleton render helper */}
            <div className="md:hidden space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between"><div className="h-4 bg-slate-200 rounded w-1/3"></div><div className="h-5 bg-slate-100 rounded w-20"></div></div>
                  <div className="space-y-1.5"><div className="h-3 bg-slate-200 rounded w-2/3"></div><div className="h-3 bg-slate-100 rounded w-1/2"></div></div>
                  <div className="flex justify-between items-center"><div className="h-4 bg-slate-100 rounded w-12"></div><div className="h-5 bg-slate-200 rounded w-16"></div></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredSales.length === 0 ? (
          /* NO RECORDS FOUND BANNER */
          <div className="bg-white border border-slate-200/60 rounded-xl p-16 text-center shadow-3xs max-w-lg mx-auto">
            <p className="text-4xl mb-4 select-none">🗂️</p>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Sin ventas registradas</h3>
            <p className="text-slate-450 text-slate-500 text-xs mt-1">
              No se han encontrado registros de {filter === 'todos' ? 'ventas generales' : `estado "${filter}"`} que coincidan con la búsqueda.
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-4 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Limpiar Buscador
              </button>
            )}
          </div>
        ) : (
          <>
            {/* MOBILE LAYOUT (< 768px): Card Lists */}
            <div className="md:hidden space-y-3">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => {
                    setSelectedSale(sale);
                    setShowModal(true);
                    setShippingCodeInput(sale.shipping_code || '');
                  }}
                  className="bg-white border border-slate-200/70 p-4 rounded-xl space-y-3 active:scale-98 transition-all cursor-pointer shadow-3xs hover:border-slate-300"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs font-mono tracking-tight">
                        {sale.ticket}
                      </h4>
                      <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5 font-mono">
                        <Calendar size={10} />
                        {new Date(sale.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <PedidoStatusBadge estado={sale.status} />
                  </div>

                  <div className="border-t border-slate-50 pt-2.5 flex flex-col gap-1 text-xs">
                    <p className="font-bold text-slate-700 flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      {sale.customer_name}
                    </p>
                    <a
                      href={`tel:${sale.customer_phone}`}
                      className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 hover:text-indigo-650"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={11} />
                      {sale.customer_phone}
                    </a>
                  </div>

                  <div className="border-t border-slate-50 pt-2.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {sale.total_products} par{sale.total_products !== 1 && 'es'}
                    </span>
                    <span className="text-xs font-extrabold text-indigo-650 font-mono">
                      S/ {Number(sale.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP LAYOUT (>= 768px): Corporate Admin Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-250 border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#FAFBFD] border-b border-slate-200/60 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Referencia / Fecha
                      </th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Cliente de Outlet
                      </th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider text-center">
                        Cantidad Pares
                      </th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider text-right">
                        Importe Total
                      </th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Estado Logístico
                      </th>
                      <th className="px-6 py-4 w-16"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-slate-50/50 transition-colors duration-150 border-b border-slate-100/60 last:border-none"
                      >
                        {/* Reference Ticket */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-300 font-extrabold font-mono text-xs">#</span>
                            <span className="font-extrabold text-slate-800 text-xs font-mono tracking-tight">
                              {sale.ticket}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-1 font-mono uppercase">
                            <Calendar size={11} className="text-slate-450 text-slate-400" />
                            {new Date(sale.created_at).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Customer Info */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-850 text-xs text-slate-800 tracking-tight">
                            {sale.customer_name}
                          </p>
                          <a
                            href={`tel:${sale.customer_phone}`}
                            className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1 hover:text-indigo-600 transition-colors"
                          >
                            <Phone size={10} className="text-slate-400" />
                            {sale.customer_phone}
                          </a>
                        </td>

                        {/* Total items (Pares) */}
                        <td className="px-6 py-4 text-center font-bold text-slate-605 font-mono text-xs">
                          <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-600">
                            {sale.total_products} par{sale.total_products !== 1 && 'es'}
                          </span>
                        </td>

                        {/* Amount PEN */}
                        <td className="px-6 py-4 text-right font-black text-slate-850 font-mono tracking-tight text-xs text-slate-800">
                          S/ {Number(sale.total_amount).toFixed(2)}
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4">
                          <PedidoStatusBadge estado={sale.status} />
                        </td>

                        {/* Inspect details button */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowModal(true);
                              setShippingCodeInput(sale.shipping_code || '');
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-slate-900 border border-slate-200/60 text-slate-500 hover:text-white rounded-lg transition-all cursor-pointer active:scale-95 shadow-3xs"
                            title="Gestionar Pedido"
                          >
                            <Eye size={13} />
                          </button>
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

      {/* LINEAR/STRIPE INSPIRED REDESIGNED HIGH-DENSITY DRAWER MODAL */}
      {showModal && selectedSale && (
        <div className="fixed top-[70px]  inset-0 z-50 flex items-center justify-center p-3 md:p-6">

          {/* Backdrop with elegant glassmorphism blur */}
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={handleCloseModal}
          />

          {/* Modal layout container */}
          <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-150 animate-in zoom-in-95 duration-200">

            {/* HEADER */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-[#FAFBFD]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <Hash size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 tracking-tight font-mono text-sm leading-none">
                      {selectedSale.ticket}
                    </span>
                    <PedidoStatusBadge estado={selectedSale.status} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Operación de Venta e-Commerce • Registrado por {selectedSale.seller.full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* MODAL WORKSPACE BODY (Scrollable content) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-slate-55/40 bg-slate-50/20">

              {/* Informative Banner */}
              <div className="bg-gradient-to-r from-indigo-500/5 to-indigo-600/0 border border-indigo-100/50 p-3 rounded-xl flex items-center gap-2.5">
                <Info size={14} className="text-indigo-600 shrink-0" />
                <p className="text-[10px] text-slate-500 font-medium">
                  Atención: la modificación de estado notificará de inmediato al panel de courier externo / Olva correspondientes.
                </p>
              </div>

              {/* Grid 2 Columnas de Ficha Técnica */}
              <div className="grid md:grid-cols-2 gap-4">

                {/* 1. FICHA CLIENTE CARD */}
                <div className="bg-white border border-slate-200/50 rounded-xl p-4 space-y-3.5 shadow-3xs">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User size={13} className="text-indigo-400" />
                    <span>Ficha técnica de entrega</span>
                  </h3>

                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400 font-medium">Comprador:</span>
                      <span className="font-bold text-slate-800 text-right">{selectedSale.customer_name}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400 font-medium">Documento Identidad:</span>
                      <span className="font-bold font-mono text-slate-600">{selectedSale.customer_dni || 'No registrado'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400 font-medium">Celular:</span>
                      <span className="font-bold font-mono text-slate-600">{selectedSale.customer_phone || 'No registrado'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Asesor:</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {selectedSale.seller.full_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. DIRECCIÓN DE DESPACHO CARD */}
                <div className="bg-white border border-slate-200/50 rounded-xl p-4 space-y-3.5 shadow-3xs">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <MapPin size={13} className="text-indigo-400" />
                    <span>Geolocalización & Ubicación</span>
                  </h3>

                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-start gap-2 border-b border-slate-50 pb-1.5">
                      <Map size={14} className="text-slate-450 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{selectedSale.customer_address}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{selectedSale.district}, {selectedSale.province}, {selectedSale.department}</p>
                      </div>
                    </div>

                    {/* Quick Maps Helpers for Delivery */}
                    {isDelivery && selectedSale.status === 'DESPACHADO' && (
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          onClick={openWaze}
                          className="flex items-center justify-center gap-1 bg-cyan-50 hover:bg-cyan-100 border border-cyan-150 text-cyan-800 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer transition-all active:scale-97"
                        >
                          <Compass size={11} className="text-cyan-600" />
                          <span>Abrir Waze</span>
                        </button>
                        <button
                          onClick={openGoogleMaps}
                          className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-800 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer transition-all active:scale-97"
                        >
                          <MapPin size={11} className="text-rose-600" />
                          <span>Google Maps</span>
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-405 text-slate-400 font-medium">Método de Cobro:</span>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                        <CreditCard size={10} /> {selectedSale.payment_method}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded-lg leading-relaxed">
                      <span className="font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Notas logísticas:</span>
                      {selectedSale.observations || 'Sin especificaciones ni horarios especiales.'}
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. COURIER / AGENCY COMPONENT */}
              {canViewAgencyInfo && selectedSale.is_agency_delivery && (
                <div className="bg-sky-50/20 border border-sky-100 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-850 text-sky-900 flex items-center gap-1.5">
                      <Compass size={13} className="text-sky-600" />
                      RECEPCIÓN EN DEPARTAMENTOS / AGENCIA EXTERNA
                    </span>
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-extrabold rounded">
                      Courier Cargo
                    </span>
                  </div>

                  <div className="grid grid-cols-2 text-xs gap-3">
                    <div>
                      <span className="text-slate-400 block font-medium">Nombre de Agencia:</span>
                      <span className="font-bold text-slate-700">{selectedSale.agency_name || 'Agencia Encomienda'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Código Tracker / Remitente:</span>
                      <span className={`font-bold font-mono ${selectedSale.shipping_code ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selectedSale.shipping_code || 'Por consolidar guía'}
                      </span>
                    </div>
                  </div>

                  {/* Input de transportista para registrar tracking */}
                  {isDelivery && selectedSale.status === 'DESPACHADO' && (
                    <div className="bg-white border border-sky-100 rounded-lg p-3 mt-1 space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-650 text-slate-600 uppercase">
                        Número de Guía / Tracking Oficial:
                      </label>
                      <input
                        type="text"
                        value={shippingCodeInput}
                        onChange={(e) => setShippingCodeInput(e.target.value)}
                        placeholder="Ej.: OLV-8947192"
                        className="w-full max-w-sm px-3 py-1.5 border border-slate-200 outline-none text-xs rounded-lg focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 4. PRODUCT LIST DETAIL */}
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Package size={13} className="text-indigo-400" />
                  <span>Items Comprados ({selectedSale.details.length} pares)</span>
                </h3>

                <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-3xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAFBFD] border-b border-slate-100 text-slate-400">
                        <tr>
                          <th className="px-4 py-2.5 text-[10px] font-bold uppercase">Clave Art.</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold uppercase">Descripción</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold uppercase text-center">Talla</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold uppercase text-center">Cantidad</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold uppercase text-right">Precio Unitario</th>
                          {role === 'Delivery' && <th className="px-4 py-2.5 text-[10px] font-bold uppercase">Acción Física</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedSale.details.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-4 py-3 font-semibold font-mono text-slate-600 text-xs">{item.article_code}</td>
                            <td className="px-4 py-3 font-semibold text-slate-805 text-slate-705 text-slate-700">{item.product_name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-slate-100 border border-slate-200/50 font-bold px-1.5 py-0.5 rounded text-[10px] text-slate-700 font-mono">
                                {item.size}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-500 font-mono">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700 font-mono">S/ {Number(item.sale_price).toFixed(2)}</td>

                            {/* Personal Delivery driver single item return action */}
                            {role === 'Delivery' && (
                              <td className="px-4 py-3">
                                <select
                                  value={detailStatusMap[item.id] || 'VENDIDO'}
                                  onChange={(e) => updateDetailStatus(item.id, e.target.value)}
                                  className="bg-white border border-slate-200 hover:border-slate-300 rounded px-2 py-1 outline-none text-[10px] font-semibold tracking-tight"
                                >
                                  <option value="VENDIDO">📦 VENDIDO</option>
                                  <option value="DEVUELTO">↩ RECHAZADO</option>
                                </select>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>

            {/* FIXED/STICKY LOGISTIC FOOTER (Drawer bottom layout) */}
            <div className="px-5 py-4 bg-[#FAFBFD] border-t border-slate-150 flex flex-col md:flex-row justify-between items-center gap-4">

              {/* Dynamic Action controls per context-specific logged permissions */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">

                {/* Jefe Ventas Print capability */}
                {isSalesManager && (selectedSale.status === 'APROBADO' || selectedSale.status === 'DESPACHADO') && (
                  <button
                    onClick={() =>
                      runAction('print', async () => {
                        printLabels([selectedSale]);
                      })
                    }
                    disabled={actionLoading === 'print'}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-3xs active:scale-97 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Imprimir Ticket</span>
                  </button>
                )}

                {/* Jefe Ventas Approval capability when PENDING */}
                {isSalesManager && selectedSale.status === 'PENDIENTE' && (
                  <>
                    <button
                      onClick={() =>
                        runAction('approve', async () => {
                          await changeStatus('APROBADO');
                        })
                      }
                      disabled={actionLoading === 'approve'}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 hover:shadow-xs hover:shadow-emerald-100 text-white rounded-xl text-xs font-bold transition-all active:scale-97 cursor-pointer"
                    >
                      Aprobar Venta
                    </button>
                    <button
                      onClick={() =>
                        runAction('cancel', async () => {
                          await changeStatus('CANCELADO');
                        })
                      }
                      disabled={actionLoading === 'cancel'}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all active:scale-97 cursor-pointer"
                    >
                      Anular Venta
                    </button>
                  </>
                )}

                {/* Jefe Ventas Dispatch capability when APPROVED */}
                {isSalesManager && selectedSale.status === 'APROBADO' && (
                  <button
                    onClick={() =>
                      runAction('dispatch', async () => {
                        await changeStatus('DESPACHADO');
                      })
                    }
                    disabled={actionLoading === 'dispatch'}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 hover:shadow-xs hover:shadow-indigo-100 text-white rounded-xl text-xs font-bold transition-all active:scale-97 cursor-pointer"
                  >
                    Despachar Envíos
                  </button>
                )}

                {/* Delivery Driver logistics delivery/cancellation checkout */}
                {role === 'Delivery' && selectedSale.status === 'DESPACHADO' && (
                  <>
                    <button
                      onClick={() =>
                        runAction('deliver', async () => {
                          await handleDelivered(selectedSale);
                        })
                      }
                      disabled={selectedSale.is_agency_delivery && !shippingCodeInput.trim()}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-97 cursor-pointer text-white ${selectedSale.is_agency_delivery && !shippingCodeInput.trim()
                        ? 'bg-slate-300 border-slate-300 cursor-not-allowed text-slate-500'
                        : 'bg-emerald-650 bg-emerald-600 hover:bg-emerald-700'
                        }`}
                    >
                      Marcar Entregado (OK)
                    </button>
                    <button
                      onClick={() =>
                        runAction('cancel', async () => {
                          await changeStatus('CANCELADO');
                        })
                      }
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all active:scale-97 cursor-pointer"
                    >
                      Rechazar Venta
                    </button>
                  </>
                )}

              </div>

              {/* Total display with secure close drawer helper */}
              <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end border-t border-slate-100 md:border-none pt-3 md:pt-0">
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Pedido</span>
                  <span className="text-lg font-black text-indigo-650 font-mono">
                    S/ {Number(selectedSale.total_amount).toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleCloseModal}
                  className="px-5 py-2 bg-slate-900 override-bg hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-97 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
