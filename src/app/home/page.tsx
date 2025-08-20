'use client';

import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import peruMap from '../../geojson/peru.json'; // Asegúrate que es un FeatureCollection válido
import { FeatureCollection, Feature } from 'geojson';

// Definir un tipo más estricto para las propiedades
interface AdaptedGeoJsonProperties {
  name?: string;
  cp?: number[];  // Tipo más específico para "cp", puede ser un arreglo de números
  [key: string]: string | number | number[] | undefined;  // Permitir otros tipos de propiedades
}

interface AdaptedFeature extends Feature {
  properties: AdaptedGeoJsonProperties;
}

interface AdaptedFeatureCollection extends FeatureCollection {
  features: AdaptedFeature[];
}

// Adaptar el geoJSON a las propiedades necesarias
const adaptGeoJson = (geoJson: FeatureCollection): AdaptedFeatureCollection => {
  const adaptedFeatures = geoJson.features.map((feature) => {
    const adaptedFeature = feature as AdaptedFeature;
    adaptedFeature.properties = {
      ...adaptedFeature.properties,
      name: adaptedFeature.properties?.name || '',  // Aseguramos que 'name' no sea null
      cp: adaptedFeature.properties?.cp || [],     // Aseguramos que 'cp' sea un arreglo, si no, asignamos un arreglo vacío
    };
    return adaptedFeature;
  });

  return {
    ...geoJson,
    features: adaptedFeatures,
  };
};

export default function Home() {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Adaptar el geoJSON antes de registrarlo
    const adaptedMap = adaptGeoJson(peruMap as FeatureCollection);
    echarts.registerMap('peru', adaptedMap); // Registrar el mapa adaptado
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
