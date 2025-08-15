'use client';
import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import peruMap from '../../geojson/peru.json'; // Asegúrate que es un FeatureCollection válido

export default function Home() {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    echarts.registerMap('peru', peruMap as any);
    setMapReady(true);
  }, []);

  // 📊 Ventas por día
  const optionVentasDia = {
    title: { text: 'Ventas por Día' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [120, 200, 150, 80, 70, 110, 130] }]
  };

  // 📊 Ventas por mes
  const optionVentasMes = {
    title: { text: 'Ventas por Mes' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [500, 800, 600, 900, 750, 950] }]
  };

  // 🗺️ Clientes por provincia (mapa Perú)
  const optionMapaClientes = {
    title: { text: 'Clientes por Provincia', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}<br/>Clientes: {c}' },
    visualMap: {
      min: 0,
      max: 100,
      left: 'left',
      bottom: 0,
      text: ['Más', 'Menos'],
      calculable: true
    },
    series: [
      {
        name: 'Clientes',
        type: 'map',
        map: 'peru',
        roam: true,
        label: { show: true },
        data: [
          { name: 'Lima', value: 80 },
          { name: 'Arequipa', value: 35 },
          { name: 'Cusco', value: 20 },
          { name: 'La Libertad', value: 15 }
        ]
      }
    ]
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard de Ventas</h1>

      {/* Gráficos de ventas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        <ReactECharts option={optionVentasDia} style={{ height: 300, flex: 1 }} />
        <ReactECharts option={optionVentasMes} style={{ height: 300, flex: 1 }} />
      </div>

      {/* Mapa de clientes */}
      <div style={{ marginTop: '20px' }}>
        {mapReady && (
          <ReactECharts option={optionMapaClientes} style={{ height: 500 }} />
        )}
      </div>
    </div>
  );
}
