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
  webMonthly: any | null;
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

    const pedidos = web?.pedidos || {};
    const importes = web?.importes || {};
    const pares = web?.pares || {};
    const metaMensual = web?.meta_mensual || {};

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

            <button
              onClick={fetchData}
              className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5">
              <KpiCard
                variant="master"
                title="Ventas Web Reales"
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
                title="Pares Vendidos Web"
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
                title="Pedidos Web del Mes"
                value={`${Number(pedidos.total || 0)} pedidos`}
                icon={<Target size={24} />}
              >
                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 font-bold uppercase text-[10px]">
                      Pendientes
                    </p>

                    <p className="text-lg font-black text-amber-500">
                      {pedidos.pendiente || 0}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 font-bold uppercase text-[10px]">
                      Entregados
                    </p>

                    <p className="text-lg font-black text-emerald-500">
                      {pedidos.entregado || 0}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 font-bold uppercase text-[10px]">
                      Devueltos
                    </p>

                    <p className="text-lg font-black text-rose-500">
                      {pares.devueltos || 0}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 font-bold uppercase text-[10px]">
                      Despachados
                    </p>

                    <p className="text-lg font-black text-indigo-500">
                      {pedidos.despachado || 0}
                    </p>
                  </div>
                </div>
              </KpiCard>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-[32px] p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Resumen financiero web
                  </h3>

                  <p className="text-sm text-slate-500 font-medium">
                    Importes calculados según pedidos del mes actual.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-600">
                    S/ {Number(importes.total_registrado || 0).toFixed(2)}
                  </p>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Registrado
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-emerald-600 uppercase">
                    Vendido real
                  </p>

                  <p className="text-2xl font-black text-emerald-700 mt-2">
                    S/ {Number(importes.total_vendido_real || 0).toFixed(2)}
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-amber-600 uppercase">
                    Pendiente
                  </p>

                  <p className="text-2xl font-black text-amber-700 mt-2">
                    S/ {Number(importes.total_pendiente || 0).toFixed(2)}
                  </p>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-rose-600 uppercase">
                    Devuelto
                  </p>

                  <p className="text-2xl font-black text-rose-700 mt-2">
                    S/ {Number(importes.total_devuelto || 0).toFixed(2)}
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