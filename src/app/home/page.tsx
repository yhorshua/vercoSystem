'use client';
import { useEffect, useState } from 'react';
import { getSalesReport } from '../services/reportServices'; // Ajusta la ruta de la importación
import { useUser } from '../context/UserContext';
import dynamic from 'next/dynamic';
import * as echarts from 'echarts';
import type { FeatureCollection, Feature, Point, Polygon } from 'geojson';



export default function Dashboard() {
  const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

  const { user } = useUser();
  const token = user?.token || '';
  const warehouseId = user?.warehouse_id || 0;

  const [dailySales, setDailySales] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSalesData = async () => {
    if (!warehouseId || !token) return;

    setLoading(true);
    try {
      const salesData = await getSalesReport({
        warehouseId,
        type: 'DAY',
        date: new Date().toISOString().split('T')[0], // Hoy
      }, token);
      
      setDailySales(salesData.sales.map((s) => s.total_amount)); // Ajusta si es necesario
    } catch (error) {
      console.error('Error fetching sales data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchSalesData();

    // Set interval to update sales data every minute (60000ms)
    const interval = setInterval(() => {
      fetchSalesData();
    }, 60000); // 1 minute

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [warehouseId, token]);

  const optionVentasDia = {
    title: { text: 'Ventas por Día' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: dailySales, smooth: true }],
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard de Ventas</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <ReactECharts
            option={optionVentasDia}
            style={{ height: 320 }}
            notMerge
            lazyUpdate
            showLoading={loading}
          />
        </div>
      </div>
    </div>
  );
}
