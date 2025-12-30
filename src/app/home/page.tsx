'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as echarts from 'echarts';
import type { FeatureCollection, Feature, Point, Polygon } from 'geojson';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

// =============================
// Tipos y adaptación GeoJSON
// =============================
interface AdaptedGeoJsonProperties {
  name?: string;
  cp?: number[];
  [key: string]: string | number | number[] | undefined;
}

type AdaptedGeometry = Point | Polygon;

interface AdaptedFeature extends Feature {
  geometry: AdaptedGeometry;
  properties: AdaptedGeoJsonProperties;
}

interface AdaptedFeatureCollection extends FeatureCollection {
  features: AdaptedFeature[];
}

const adaptGeoJson = (geoJson: FeatureCollection): AdaptedFeatureCollection => {
  const adaptedFeatures = geoJson.features.map((feature) => {
    const adaptedFeature = feature as AdaptedFeature;

    adaptedFeature.properties = {
      ...(adaptedFeature.properties as any),
      name: (adaptedFeature.properties as any)?.name || '',
      cp: (adaptedFeature.properties as any)?.cp || [],
    };

    if (adaptedFeature.geometry?.type === 'Point') {
      (adaptedFeature.geometry as Point).coordinates =
        (adaptedFeature.geometry as Point).coordinates || [];
    }

    return adaptedFeature;
  });

  return { ...(geoJson as any), features: adaptedFeatures };
};

export default function Home() {
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const didInit = useRef(false);

  // ✅ guardamos la instancia de echarts acá (sin ref del componente)
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    let alive = true;

    (async () => {
      try {
        const res = await fetch('/geojson/peru.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudo cargar /geojson/peru.json');

        const geo = (await res.json()) as FeatureCollection;
        const adaptedMap = adaptGeoJson(geo);

        // ✅ registra (en dev mejor registrar sin depender de getMap)
        try {
          echarts.registerMap('peru', adaptedMap);
        } catch {
          // noop
        }

        if (alive) setMapReady(true);
      } catch (e: any) {
        if (alive) setMapError(e?.message ?? 'Error cargando el mapa');
      }
    })();

    return () => {
      alive = false;

      // ✅ dispose seguro al salir (logout / navigate)
      try {
        const inst = mapInstanceRef.current;
        if (inst && !inst.isDisposed?.()) inst.dispose();
      } catch {
        // noop
      } finally {
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const optionVentasDia = useMemo(
    () => ({
      title: { text: 'Ventas por Día' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [120, 200, 150, 80, 70, 110, 130], smooth: true }],
    }),
    []
  );

  const optionVentasMes = useMemo(
    () => ({
      title: { text: 'Ventas por Mes' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [500, 800, 600, 900, 750, 950] }],
    }),
    []
  );

  const optionMapaClientes = useMemo(() => {
    // ✅ Solo damos option con map cuando ya está registrado
    if (!mapReady) {
      return { title: { text: 'Clientes por Provincia', left: 'center' }, series: [] };
    }

    return {
      title: { text: 'Clientes por Provincia', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}<br/>Clientes: {c}' },
      visualMap: {
        min: 0,
        max: 100,
        left: 'left',
        bottom: 0,
        text: ['Más', 'Menos'],
        calculable: true,
      },
      series: [
        {
          name: 'Clientes',
          type: 'map',
          map: 'peru',
          roam: true,
          label: { show: false },
          data: [
            { name: 'Lima', value: 80 },
            { name: 'Arequipa', value: 35 },
            { name: 'Cusco', value: 20 },
            { name: 'La Libertad', value: 15 },
          ],
        },
      ],
    };
  }, [mapReady]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard de Ventas</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <ReactECharts option={optionVentasDia} style={{ height: 320 }} notMerge lazyUpdate />
        </div>

        <div style={{ flex: 1, minWidth: 320 }}>
          <ReactECharts option={optionVentasMes} style={{ height: 320 }} notMerge lazyUpdate />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {mapError ? (
          <div
            style={{
              padding: 14,
              border: '1px solid #f2c6c6',
              background: '#fff5f5',
              borderRadius: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            ❌ {mapError}
          </div>
        ) : !mapReady ? (
          <div
            style={{
              height: 500,
              border: '1px solid #eee',
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            Cargando mapa...
          </div>
        ) : (
          <ReactECharts
            key="peru-map"
            option={optionMapaClientes}
            style={{ height: 500 }}
            notMerge
            lazyUpdate
            // ✅ aquí guardas la instancia
            onChartReady={(chart) => {
              mapInstanceRef.current = chart;
            }}
          />
        )}
      </div>
    </div>
  );
}
