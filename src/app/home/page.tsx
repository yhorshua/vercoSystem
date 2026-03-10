'use client';

import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useUser } from '../context/UserContext';
import { getSalesReport } from '../services/reportServices';
import { 
  TrendingUp, 
  ShoppingBag, 
  CreditCard, 
  RefreshCw, 
  DollarSign, 
  Package 
} from 'lucide-react';

import styles from './dashboard.module.css';

// --- Tipos Auxiliares ---
interface KpiData {
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
  topProduct: string;
}

interface ChartData {
  label: string;
  value: number;
}

export default function Dashboard() {
  const { user } = useUser();
  const token = user?.token || '';
  const warehouseId = user?.warehouse_id || 0;

  const [loading, setLoading] = useState(false);
  
  // Estados para datos
  const [kpis, setKpis] = useState<KpiData>({ totalSales: 0, transactionCount: 0, averageTicket: 0, topProduct: '-' });
  const [salesTrend, setSalesTrend] = useState<ChartData[]>([]);
  const [topProducts, setTopProducts] = useState<ChartData[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<ChartData[]>([]);

  // Función auxiliar para fechas
  const getDateStr = (daysAgo: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const fetchData = async () => {
    if (!warehouseId || !token) return;

    setLoading(true);
    try {
      const today = getDateStr(0);
      const weekAgo = getDateStr(6); // Últimos 7 días

      // 1. Obtener Ventas de Hoy
      const todayReport = await getSalesReport({
        warehouseId,
        type: 'DAY',
        date: today
      }, token);

      // 2. Obtener Ventas de la Semana
      const rangeReport = await getSalesReport({
        warehouseId,
        type: 'RANGE',
        from: weekAgo,
        to: today
      }, token);

      // 3. Obtener Top Productos
      let productReport: { sales: any[] } = { sales: [] }; 
      try {
        productReport = await getSalesReport({
            warehouseId,
            type: 'DAY',
            from: today, 
            to: today
        }, token);
      } catch (e) {
        console.warn('Reporte de productos no disponible o falló', e);
      }

      // --- PROCESAMIENTO DE DATOS ---

      // A) Cálculos KPIs (De hoy)
      const salesToday = todayReport.sales || [];
      const totalHoy = todayReport.meta?.total_amount || 0;
      const countHoy = todayReport.meta?.total_sales || 0;
      const avgTicket = countHoy > 0 ? totalHoy / countHoy : 0;

      // B) Métodos de Pago (De hoy)
      const methodsMap: Record<string, number> = {};
      salesToday.forEach((s: any) => {
         if (s.payments && Array.isArray(s.payments)) {
             s.payments.forEach((p: any) => {
                 methodsMap[p.method] = (methodsMap[p.method] || 0) + 1;
             });
         } else if (s.payment_method) {
             methodsMap[s.payment_method] = (methodsMap[s.payment_method] || 0) + 1;
         }
      });
      const methodsChartData = Object.keys(methodsMap).map(k => ({ label: k, value: methodsMap[k] }));

      // C) Tendencia Semanal
      const trendMap: Record<string, number> = {};
      for(let i=6; i>=0; i--) {
          trendMap[getDateStr(i)] = 0;
      }
      
      (rangeReport.sales || []).forEach((s: any) => {
          const dateKey = s.sale_date.split('T')[0];
          if (trendMap[dateKey] !== undefined) {
              trendMap[dateKey] += Number(s.total_amount);
          }
      });

      const trendChartData = Object.keys(trendMap).sort().map(date => ({
          label: new Date(date).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }),
          value: trendMap[date]
      }));

      // D) Top Productos
      const productsRaw = productReport.sales || [];
      const topProdData = productsRaw
          .map((p: any) => ({ 
              label: p.product_name || p.article_description || 'Desconocido', 
              value: Number(p.total_quantity || p.quantity || 0) 
          }))
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, 5); // Top 5

      const bestProduct = topProdData.length > 0 ? topProdData[0].label : 'Sin ventas';

      setKpis({
          totalSales: totalHoy,
          transactionCount: countHoy,
          averageTicket: avgTicket,
          topProduct: bestProduct
      });
      setSalesTrend(trendChartData);
      setPaymentMethods(methodsChartData);
      setTopProducts(topProdData);

    } catch (error) {
      console.error('Error cargando dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); 
    return () => clearInterval(interval);
  }, [warehouseId, token]);


  // --- CONFIGURACIÓN ECHARTS (Memoized for performance and stability) ---

  const trendOption = useMemo(() => ({
    tooltip: { trigger: 'axis', formatter: '{b}: S/ {c}' },
    grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
    xAxis: { 
        type: 'category', 
        data: salesTrend.map(d => d.label),
        axisLine: { lineStyle: { color: '#94a3b8' } },
        axisLabel: { fontSize: 10 }
    },
    yAxis: { 
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { fontSize: 10 }
    },
    series: [{
      data: salesTrend.map(d => d.value),
      type: 'line',
      smooth: true,
      symbolSize: 8,
      itemStyle: { color: '#2563eb' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(37, 99, 235, 0.2)' }, { offset: 1, color: 'rgba(37, 99, 235, 0)' }]
        }
      }
    }]
  }), [salesTrend]);

  const productsOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: { 
        type: 'category', 
        data: topProducts.map(d => d.label.length > 12 ? d.label.substring(0, 12) + '...' : d.label),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 10 }
    },
    series: [{
      name: 'Cantidad',
      type: 'bar',
      data: topProducts.map(d => d.value),
      itemStyle: { borderRadius: [0, 4, 4, 0], color: '#10b981' },
      label: { show: true, position: 'right', fontSize: 10 },
      barWidth: '60%'
    }]
  }), [topProducts]);

  const paymentsOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { 
      bottom: '0%', 
      left: 'center', 
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 10 }
    },
    series: [{
      name: 'Pagos',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '40%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: { show: false },
      data: paymentMethods.map(p => ({ 
          value: p.value, 
          name: p.label.charAt(0).toUpperCase() + p.label.slice(1) 
      })),
      color: ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981']
    }]
  }), [paymentMethods]);

  return (
    <div className={styles.container}>
      
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Dashboard General</h1>
          <p>
             Resumen para <span className={styles.warehouseName}>{user?.warehouse?.warehouse_name || 'Almacén'}</span>
          </p>
        </div>
        <button 
            onClick={fetchData} 
            disabled={loading}
            className={styles.refreshButton}
        >
          <RefreshCw size={18} className={loading ? styles.spin : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* KPI GRID */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
            <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Ventas Hoy</span>
                <span className={styles.kpiValue}>S/ {kpis.totalSales.toFixed(2)}</span>
            </div>
            <div className={`${styles.iconBox} ${styles.iconBlue}`}>
                <DollarSign size={20} />
            </div>
        </div>

        <div className={styles.kpiCard}>
            <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Transacciones</span>
                <span className={styles.kpiValue}>{kpis.transactionCount}</span>
            </div>
            <div className={`${styles.iconBox} ${styles.iconPurple}`}>
                <ShoppingBag size={20} />
            </div>
        </div>

        <div className={styles.kpiCard}>
            <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Ticket Promedio</span>
                <span className={styles.kpiValue}>S/ {kpis.averageTicket.toFixed(2)}</span>
            </div>
            <div className={`${styles.iconBox} ${styles.iconGreen}`}>
                <CreditCard size={20} />
            </div>
        </div>

        <div className={styles.kpiCard}>
            <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Top Producto</span>
                <span className={styles.kpiValue} title={kpis.topProduct}>
                    {kpis.topProduct}
                </span>
            </div>
            <div className={`${styles.iconBox} ${styles.iconAmber}`}>
                <Package size={20} />
            </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className={styles.chartsGrid}>
        
        {/* Chart 1: Tendencia */}
        <div className={`${styles.chartCard} ${styles.lgCol2}`}>
            <div className={styles.chartHeader}>
                <TrendingUp className="text-blue-500" size={18} />
                <h3 className={styles.chartTitle}>Tendencia de Ingresos (7 Días)</h3>
            </div>
            <div className={styles.chartContainer}>
                 <ReactECharts 
                    option={trendOption} 
                    style={{ height: '100%', width: '100%' }} 
                    notMerge={true}
                    lazyUpdate={true}
                 />
            </div>
        </div>

        {/* Chart 2: Métodos de Pago */}
        <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
                <CreditCard className="text-violet-500" size={18} />
                <h3 className={styles.chartTitle}>Pagos (Hoy)</h3>
            </div>
            <div className={styles.chartContainer}>
                 <ReactECharts 
                    option={paymentsOption} 
                    style={{ height: '100%', width: '100%' }} 
                    notMerge={true}
                    lazyUpdate={true}
                 />
            </div>
        </div>

        {/* Chart 3: Top Productos */}
        <div className={`${styles.chartCard} ${styles.fullWidth}`}>
            <div className={styles.chartHeader}>
                <ShoppingBag className="text-emerald-500" size={18} />
                <h3 className={styles.chartTitle}>Top Productos Vendidos (Hoy)</h3>
            </div>
            <div className={styles.chartContainer}>
                {topProducts.length > 0 ? (
                    <ReactECharts 
                        option={productsOption} 
                        style={{ height: '100%', width: '100%' }} 
                        notMerge={true}
                        lazyUpdate={true}
                    />
                ) : (
                    <div className={styles.emptyState}>
                        <Package size={40} style={{ marginBottom: 10, opacity: 0.3 }} />
                        <p>No hay datos de productos vendidos hoy.</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
