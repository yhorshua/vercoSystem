'use client';
import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, ShoppingBag, CreditCard, RefreshCw, DollarSign, Target, Calendar, ArrowUpRight } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { getSalesReport, getSneakersGoal } from '../services/reportServices';
import KpiCard from './components/kpiCard';
import ProgressBar from './components/progressBar';

export default function Dashboard() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ goals: null, trend: [] });

  const fetchData = async () => {
    if (!user?.warehouse_id || !user?.token) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const startMonth = today.substring(0, 7) + "-01";

      const [goals, report] = await Promise.all([
        getSneakersGoal({ warehouseId: user.warehouse_id, type: 'RANGE', from: startMonth, to: today }, user.token),
        getSalesReport({ warehouseId: user.warehouse_id, type: 'RANGE', from: startMonth, to: today }, user.token)
      ]);

      const trendMap: any = {};
      report.sales?.forEach((s: any) => {
        const d = s.sale_date.split('T')[0];
        trendMap[d] = (trendMap[d] || 0) + Number(s.total_amount);
      });

      setData({ goals, trend: Object.keys(trendMap).map(k => ({ label: k, value: trendMap[k] })) });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user]);

  const chartOption = useMemo(() => ({
    tooltip: { trigger: 'axis', backgroundColor: '#1e293b', textStyle: { color: '#fff' }, borderRadius: 12 },
    grid: { left: '0%', right: '0%', bottom: '0%', top: '5%', containLabel: false },
    xAxis: { type: 'category', data: data.trend.map((t: any) => t.label), show: false },
    yAxis: { type: 'value', show: false },
    series: [{
      data: data.trend.map((t: any) => t.value),
      type: 'line',
      smooth: 0.4,
      symbol: 'none',
      lineStyle: { width: 3, color: '#6366f1' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99, 102, 241, 0.15)' }, { offset: 1, color: 'rgba(99, 102, 241, 0)' }] } }
    }]
  }), [data.trend]);

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400 font-bold animate-pulse">Sincronizando datos maestros...</div>;

  const { progress, meta } = data.goals;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 p-4 md:p-10 font-sans tracking-tight">

      {/* SECCIÓN SUPERIOR: HEADER & UTILIDAD MAESTRA */}
      <div className="max-w-[1400px] mx-auto space-y-8">

        <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
              Dashboard
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 uppercase tracking-widest">v2.1</span>
            </h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Calendar size={16} /> Rendimiento operativo de {meta.warehouse_name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="h-12 w-px bg-slate-200 mx-2 hidden md:block" />
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Global</p>
              <p className={`text-lg font-black ${progress.pairs_percentage >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {progress.pairs_percentage >= 100 ? 'OBJETIVOS LOGRADOS' : 'OPERACIÓN EN CURSO'}
              </p>
            </div>
          </div>
        </header>

        {/* GRID DE IMPACTO */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* CARD DE UTILIDAD (TU INGRESO TOTAL - EL MÁS IMPORTANTE) */}
          <div className="md:col-span-5">
            <KpiCard
              variant="master"
              title="Utilidad Total (Ingreso Neto)"
              // Mostramos el monto en soles
              value={`S/ ${progress.profit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              // Usamos el porcentaje de margen real que viene del API
              percentage={progress.profit_margin_percentage}
              icon={<DollarSign size={24} />}
            >
              <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Eficiencia de Margen</span>
                  {/* Mostramos el porcentaje real aquí */}
                  <span className="text-indigo-400 font-black">{progress.profit_margin_percentage}%</span>
                </div>
                {/* La barra de progreso refleja el porcentaje de margen */}
                <ProgressBar percentage={progress.profit_margin_percentage} />
              </div>
            </KpiCard>
          </div>

          {/* PARES VENDIDOS */}
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
                <span className="text-slate-600">Faltan {progress.pairs_remaining}</span>
              </div>
            </KpiCard>
          </div>

          {/* COSTO DE OPERACIÓN */}
          <div className="md:col-span-4">
            <KpiCard
              title="Costo de Inversión"
              value={`S/ ${progress.cost.toLocaleString()}`}
              icon={<CreditCard size={24} />}
            >
              <div className="h-[60px] w-full mt-4">
                <ReactECharts option={chartOption} style={{ height: '100%' }} />
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-2 italic">* Flujo proyectado basado en stock</p>
            </KpiCard>
          </div>
        </div>

        {/* SEGUNDA FILA: TENDENCIA & METAS FINANCIERAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-[32px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Análisis de Ingresos Brutos</h3>
                <p className="text-sm text-slate-500 font-medium">Desempeño financiero acumulado este mes</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-indigo-600">S/ {progress.revenue.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recaudación Total</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Cumplimiento de Meta</p>
                    <p className="text-sm font-bold text-slate-700">{progress.revenue_percentage}% alcanzado</p>
                  </div>
                </div>
                <ProgressBar percentage={progress.revenue_percentage} />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para alcanzar la meta de **S/ {progress.revenue_goal.toLocaleString()}**, aún es necesario generar **S/ {progress.revenue_remaining.toLocaleString()}**.
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
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">Balance Proyectado</p>
              <h4 className="text-3xl font-black leading-tight">Tu negocio está operando al <span className="text-indigo-900 bg-white px-2 rounded-lg">{progress.pairs_percentage}%</span> de capacidad de venta.</h4>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}