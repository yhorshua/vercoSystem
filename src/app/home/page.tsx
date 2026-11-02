'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  RefreshCw,
  DollarSign,
  Target,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import {
  getSalesReport,
  getSneakersGoal,
  getMonthlyWebSalesTotal,
  MonthlyWebSalesResponse,
} from '../services/reportServices';

import KpiCard from './components/kpiCard';
import ProgressBar from './components/progressBar';


type TrendItem = {
  label: string;
  value: number;
};

type DashboardData = {
  storeGoals: any | null;
  storeTrend: TrendItem[];
  webMonthly: MonthlyWebSalesResponse | null;
};

function toNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function percentage(actual: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return Number(((actual / goal) * 100).toFixed(2));
}

function percentageForBar(value: number) {
  return Math.min(100, Math.max(0, value));
}

export default function Dashboard() {
  const { user } = useUser();

  const [loading, setLoading] = useState(true);

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    storeGoals: null,
    storeTrend: [],
    webMonthly: null,
  });

  const roleName = user?.role?.name_role || user?.role;
  const isWebSeller = roleName === 'Vendedor Web';

  const fetchData = useCallback(async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextData: DashboardData = {
        storeGoals: null,
        storeTrend: [],
        webMonthly: null,
      };

      /**
       * DASHBOARD PARA VENDEDOR WEB
       * Solo consume el token.
       * El backend obtiene el user_id desde req.user.
       */
      if (isWebSeller) {
        const webMonthly = await getMonthlyWebSalesTotal(user.token);

        nextData.webMonthly = webMonthly;

        setDashboardData(nextData);
        return;
      }

      /**
       * DASHBOARD PARA VENDEDORES DE TIENDA
       * Este sí necesita warehouse_id.
       */
      if (user?.warehouse_id == null) {
        setDashboardData(nextData);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const startMonth = today.substring(0, 7) + '-01';

      const [goals, report] = await Promise.all([
        getSneakersGoal(
          {
            warehouseId: user.warehouse_id,
            type: 'RANGE',
            from: startMonth,
            to: today,
          },
          user.token
        ),

        getSalesReport(
          {
            warehouseId: user.warehouse_id,
            type: 'RANGE',
            from: startMonth,
            to: today,
          },
          user.token
        ),
      ]);

      const trendMap: Record<string, number> = {};

      report.sales?.forEach((sale: any) => {
        const date = sale.sale_date.split('T')[0];

        trendMap[date] =
          (trendMap[date] || 0) + Number(sale.total_amount || 0);
      });

      nextData.storeGoals = goals;
      nextData.storeTrend = Object.keys(trendMap).map((date) => ({
        label: date,
        value: trendMap[date],
      }));

      setDashboardData(nextData);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.token, user?.warehouse_id, isWebSeller]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        textStyle: {
          color: '#fff',
        },
        borderRadius: 12,
      },
      grid: {
        left: '0%',
        right: '0%',
        bottom: '0%',
        top: '5%',
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: dashboardData.storeTrend.map((item: any) => item.label),
        show: false,
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          data: dashboardData.storeTrend.map((item: any) => item.value),
          type: 'line',
          smooth: 0.4,
          symbol: 'none',
          lineStyle: {
            width: 3,
            color: '#6366f1',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(99, 102, 241, 0.15)',
                },
                {
                  offset: 1,
                  color: 'rgba(99, 102, 241, 0)',
                },
              ],
            },
          },
        },
      ],
    }),
    [dashboardData.storeTrend]
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-400 font-bold animate-pulse">
        Sincronizando datos maestros...
      </div>
    );
  }

  if (isWebSeller && !dashboardData.webMonthly) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-slate-400 font-bold">
        <p>No se encontraron datos de ventas web para este mes.</p>

        <button
          onClick={fetchData}
          className="mt-4 px-5 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!isWebSeller && !dashboardData.storeGoals) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-slate-400 font-bold">
        <p>No se encontraron datos de tienda para este mes.</p>

        <button
          onClick={fetchData}
          className="mt-4 px-5 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black"
        >
          Reintentar
        </button>
      </div>
    );
  }

  /**
   * ==============================
   * DASHBOARD VENDEDOR WEB
   * ==============================
   */
  if (isWebSeller) {
    const web = dashboardData.webMonthly;

    const pedidos = web?.pedidos ?? {
      total: 0, pendiente: 0, aprobado: 0, despachado: 0, entregado: 0, cancelado: 0,
    };
    const importes = web?.importes ?? {
      total_registrado: 0, total_entregado: 0, total_vendido_real: 0, total_pendiente: 0, total_devuelto: 0,
    };
    const pares = web?.pares ?? {
      registrados: 0, vendidos: 0, pendientes: 0, devueltos: 0,
    };
    const canales = web?.canales ?? {
      unidad: { pedidos: 0, pares_vendidos: 0, monto_vendido: 0 },
      mayor: { pedidos: 0, pares_vendidos: 0, monto_vendido: 0 },
    };
    const unidad = canales.unidad;
    const mayor = canales.mayor;
    const metaMensual = web?.meta_mensual ?? {
      monto_objetivo: 0, pares_objetivo: 0,
    };

    /**
     * METAS DEL WAREHOUSE
     * Ajusta los nombres según cómo estén en tu UserContext.
     */
    const warehouse = user?.warehouse as any;

    /**
     * Usa primero la meta del warehouse.
     * Si no existe, usa la que venga del backend en meta_mensual.
     */
    const montoObjetivo = toNumber(
      warehouse?.monto ?? metaMensual?.monto_objetivo
    );

    const paresObjetivo = toNumber(
      warehouse?.cantidad_pares ?? metaMensual?.pares_objetivo
    );

    const totalVendidoReal = toNumber(importes.total_vendido_real);
    const paresVendidos = toNumber(pares.vendidos);

    const porcentajeMonto = percentage(totalVendidoReal, montoObjetivo);
    const porcentajePares = percentage(paresVendidos, paresObjetivo);

    const porcentajeMontoBar = percentageForBar(porcentajeMonto);
    const porcentajeParesBar = percentageForBar(porcentajePares);

    const montoFaltante = Math.max(montoObjetivo - totalVendidoReal, 0);
    const paresFaltantes = Math.max(paresObjetivo - paresVendidos, 0);
    const tieneMeta = montoObjetivo > 0 || paresObjetivo > 0;
    const metaMontoCumplida = montoObjetivo <= 0 || totalVendidoReal >= montoObjetivo;
    const metaParesCumplida = paresObjetivo <= 0 || paresVendidos >= paresObjetivo;
    const metaCumplida = tieneMeta && metaMontoCumplida && metaParesCumplida;
    const ticketPromedioEntregado = toNumber(pedidos.entregado) > 0
      ? totalVendidoReal / toNumber(pedidos.entregado)
      : 0;

    return (
      <div className="min-h-screen bg-[#FDFDFD] text-slate-900 p-4 md:p-10 font-sans tracking-tight">
        <div className="max-w-[1400px] mx-auto space-y-8">
          <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-8">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                Dashboard Web

                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 uppercase tracking-widest">
                  Vendedor Web
                </span>
              </h1>

              <p className="text-slate-500 font-medium flex items-center gap-2">
                <Calendar size={16} />
                Rendimiento mensual de {user?.full_name || 'vendedor web'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className={`rounded-2xl border px-4 py-3 text-right ${metaCumplida ? 'border-emerald-200 bg-emerald-50' : tieneMeta ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Estado de mi meta</p>
                <p className={`text-sm font-black ${metaCumplida ? 'text-emerald-700' : tieneMeta ? 'text-amber-700' : 'text-slate-600'}`}>
                  {metaCumplida ? 'META CUMPLIDA' : tieneMeta ? 'META EN PROGRESO' : 'META NO CONFIGURADA'}
                </p>
              </div>
              <button
                onClick={fetchData}
                aria-label="Actualizar dashboard"
                className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5">
              <KpiCard
                variant="master"
                title="Monto Total Entregado"
                value={`S/ ${Number(
                  importes.total_vendido_real || 0
                ).toLocaleString('es-PE', {
                  minimumFractionDigits: 2,
                })}`}
                percentage={porcentajeMontoBar}
                icon={<DollarSign size={24} />}
              >
                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Avance de meta mensual
                    </span>

                    <span className="text-indigo-400 font-black">
                      {porcentajeMonto}%
                    </span>
                  </div>

                  <ProgressBar percentage={porcentajeMontoBar} />

                  <div className="mt-4 flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>
                      Meta: S/ {montoObjetivo.toFixed(2)}
                    </span>

                    <span>
                      Faltan: S/ {montoFaltante.toFixed(2)}
                    </span>
                  </div>
                </div>
              </KpiCard>
            </div>

            <div className="md:col-span-3">
              <KpiCard
                title="Pares Entregados"
                value={`${Number(pares.vendidos || 0)} Pares`}
                percentage={porcentajeParesBar}
                icon={<ShoppingBag size={24} />}
              >
                <ProgressBar percentage={porcentajeParesBar} />

                <div className="mt-4 flex justify-between text-[10px] font-black uppercase text-slate-400">
                  <span>Meta: {paresObjetivo || 0}</span>

                  <span className="text-slate-600">
                    Faltan {paresFaltantes || 0}
                  </span>
                </div>
              </KpiCard>
            </div>

            <div className="md:col-span-4">
              <KpiCard
                title="Pedidos Entregados"
                value={`${Number(pedidos.entregado || 0)} pedidos`}
                icon={<Target size={24} />}
              >
                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <p className="text-slate-400 font-bold uppercase text-[10px]">
                      Pares entregados
                    </p>

                    <p className="text-lg font-black text-emerald-500">
                      {paresVendidos}
                    </p>
                  </div>

                  <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                    <p className="text-slate-400 font-bold uppercase text-[10px]">
                      Monto entregado
                    </p>

                    <p className="text-lg font-black text-indigo-600">
                      S/ {totalVendidoReal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </KpiCard>
            </div>
          </div>

          <section className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Mi rendimiento por canal</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Pares entregados por unidad y por mayor</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                Total: {paresVendidos} pares
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-2">
              <article className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-7 text-white shadow-xl shadow-indigo-100">
                <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
                <div className="relative z-10 flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-200">Venta por unidad</p>
                    <p className="mt-3 text-5xl font-black tracking-tight">{toNumber(unidad.pares_vendidos)}</p>
                    <p className="mt-1 text-sm font-bold text-indigo-100">pares entregados</p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3 backdrop-blur"><ShoppingBag size={25} /></div>
                </div>
                <div className="relative z-10 mt-7 grid grid-cols-2 gap-3 border-t border-white/15 pt-5">
                  <div><p className="text-[9px] font-black uppercase text-indigo-200">Monto entregado</p><p className="mt-1 text-lg font-black">S/ {toNumber(unidad.monto_vendido).toFixed(2)}</p></div>
                  <div><p className="text-[9px] font-black uppercase text-indigo-200">Pedidos</p><p className="mt-1 text-lg font-black">{toNumber(unidad.pedidos)}</p></div>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-7 text-white shadow-xl shadow-orange-100">
                <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/15" />
                <div className="relative z-10 flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-50">Venta por mayor</p>
                    <p className="mt-3 text-5xl font-black tracking-tight">{toNumber(mayor.pares_vendidos)}</p>
                    <p className="mt-1 text-sm font-bold text-orange-50">pares entregados</p>
                  </div>
                  <div className="rounded-2xl bg-white/20 p-3 backdrop-blur"><CreditCard size={25} /></div>
                </div>
                <div className="relative z-10 mt-7 grid grid-cols-2 gap-3 border-t border-white/20 pt-5">
                  <div><p className="text-[9px] font-black uppercase text-orange-50">Monto entregado</p><p className="mt-1 text-lg font-black">S/ {toNumber(mayor.monto_vendido).toFixed(2)}</p></div>
                  <div><p className="text-[9px] font-black uppercase text-orange-50">Pedidos</p><p className="mt-1 text-lg font-black">{toNumber(mayor.pedidos)}</p></div>
                </div>
              </article>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-[32px] p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Resultado de pedidos entregados
                  </h3>

                  <p className="text-sm text-slate-500 font-medium">
                    Solo considera pedidos con estado ENTREGADO durante el mes actual.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-600">
                    S/ {Number(importes.total_entregado || 0).toFixed(2)}
                  </p>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Total entregado
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-emerald-600 uppercase">
                    Monto entregado
                  </p>

                  <p className="text-2xl font-black text-emerald-700 mt-2">
                    S/ {Number(importes.total_entregado || 0).toFixed(2)}
                  </p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-indigo-600 uppercase">
                    Pares entregados
                  </p>

                  <p className="text-2xl font-black text-indigo-700 mt-2">
                    {paresVendidos}
                  </p>
                </div>

                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-violet-600 uppercase">
                    Ticket promedio entregado
                  </p>

                  <p className="text-2xl font-black text-violet-700 mt-2">
                    S/ {ticketPromedioEntregado.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-indigo-200">
              <div className="absolute top-0 right-0 p-8 opacity-20">
                <TrendingUp size={120} />
              </div>

              <div className="relative z-10">
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">
                  Avance mensual web
                </p>

                <h4 className="text-3xl font-black leading-tight">
                  Vas al{' '}
                  <span className="text-indigo-900 bg-white px-2 rounded-lg">
                    {porcentajeMonto}%
                  </span>{' '}
                  de tu meta de ventas web.
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * ==============================
   * DASHBOARD TIENDA
   * ==============================
   */
  const { progress, meta } = dashboardData.storeGoals;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 p-4 md:p-10 font-sans tracking-tight">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
              Dashboard

              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 uppercase tracking-widest">
                v2.1
              </span>
            </h1>

            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Calendar size={16} />
              Rendimiento operativo de {meta.warehouse_name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>

            <div className="h-12 w-px bg-slate-200 mx-2 hidden md:block" />

            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Estado Global
              </p>

              <p
                className={`text-lg font-black ${progress.pairs_percentage >= 100
                  ? 'text-emerald-500'
                  : 'text-amber-500'
                  }`}
              >
                {progress.pairs_percentage >= 100
                  ? 'OBJETIVOS LOGRADOS'
                  : 'OPERACIÓN EN CURSO'}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5">
            <KpiCard
              variant="master"
              title="Utilidad Total (Ingreso Neto)"
              value={`S/ ${Number(progress.profit || 0).toLocaleString(
                'es-PE',
                {
                  minimumFractionDigits: 2,
                }
              )}`}
              percentage={progress.profit_margin_percentage}
              icon={<DollarSign size={24} />}
            >
              <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Eficiencia de Margen
                  </span>

                  <span className="text-indigo-400 font-black">
                    {progress.profit_margin_percentage}%
                  </span>
                </div>

                <ProgressBar percentage={progress.profit_margin_percentage} />
              </div>
            </KpiCard>
          </div>

          <div className="md:col-span-3">
            <KpiCard
              title="Volumen de Ventas"
              value={`${progress.pairs_sold} Pares`}
              percentage={progress.pairs_percentage}
              icon={<ShoppingBag size={24} />}
            >
              <ProgressBar percentage={progress.pairs_percentage} />

              <div className="mt-4 flex justify-between text-[10px] font-black uppercase text-slate-400">
                <span>Meta: {progress.pairs_goal}</span>

                <span className="text-slate-600">
                  Faltan {progress.pairs_remaining}
                </span>
              </div>
            </KpiCard>
          </div>

          <div className="md:col-span-4">
            <KpiCard
              title="Costo de Inversión"
              value={`S/ ${Number(progress.cost || 0).toLocaleString('es-PE')}`}
              icon={<CreditCard size={24} />}
            >
              <div className="h-[60px] w-full mt-4">
                <ReactECharts option={chartOption} style={{ height: '100%' }} />
              </div>

              <p className="text-[10px] text-slate-400 font-bold mt-2 italic">
                * Flujo proyectado basado en stock
              </p>
            </KpiCard>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-[32px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Análisis de Ingresos Brutos
                </h3>

                <p className="text-sm text-slate-500 font-medium">
                  Desempeño financiero acumulado este mes
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black text-indigo-600">
                  S/{' '}
                  {Number(progress.revenue || 0).toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                  })}
                </p>

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Recaudación Total
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <ArrowUpRight size={20} />
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      Cumplimiento de Meta
                    </p>

                    <p className="text-sm font-bold text-slate-700">
                      {progress.revenue_percentage}% alcanzado
                    </p>
                  </div>
                </div>

                <ProgressBar percentage={progress.revenue_percentage} />

                <p className="text-xs text-slate-500 leading-relaxed">
                  Para alcanzar la meta de{' '}
                  <strong>
                    S/{' '}
                    {Number(progress.revenue_goal || 0).toLocaleString(
                      'es-PE'
                    )}
                  </strong>
                  , aún es necesario generar{' '}
                  <strong>
                    S/{' '}
                    {Number(progress.revenue_remaining || 0).toLocaleString(
                      'es-PE'
                    )}
                  </strong>
                  .
                </p>
              </div>

              <div className="h-[180px] w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <ReactECharts option={chartOption} style={{ height: '100%' }} />
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-indigo-200">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <TrendingUp size={120} />
            </div>

            <div className="relative z-10">
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">
                Balance Proyectado
              </p>

              <h4 className="text-3xl font-black leading-tight">
                Tu negocio está operando al{' '}
                <span className="text-indigo-900 bg-white px-2 rounded-lg">
                  {progress.pairs_percentage}%
                </span>{' '}
                de capacidad de venta.
              </h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
