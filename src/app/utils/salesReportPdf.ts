'use client';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { SalesReportResponse } from '../services/reportServices';

pdfMake.vfs = pdfFonts.vfs;

// --- Tipos para el cálculo interno ---
type Computed = {
  totalSales: number;
  totalAmount: number;
  avgTicket: number;
  bySeller: Array<{ user_id: number | null; user_name: string; total_sales: number; total_amount: number }>;
  byMethod: Array<{ method: string; count: number; total_amount: number }>;
};

// --- Helpers de formato ---
const n = (v: any) => {
  const x = typeof v === 'string' ? Number(v) : Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};
const money = (v: any) => `S/ ${n(v).toFixed(2)}`;

/**
 * Procesa la data del reporte para obtener métricas agregadas
 */
function computeFromSales(report: SalesReportResponse): Computed {
  const sales = report.sales ?? [];
  const sellerMap = new Map<string, { user_id: number | null; user_name: string; total_sales: number; total_amount: number }>();
  const methodMap = new Map<string, { method: string; count: number; total_amount: number }>();

  let totalAmount = 0;

  for (const s of sales as any[]) {
    const saleTotal = n(s.total_amount);
    totalAmount += saleTotal;

    // Agregación por Vendedor
    const sellerKey = String(s.user_id ?? 'null');
    const sellerName = s.user_name ?? 'SIN VENDEDOR';
    if (!sellerMap.has(sellerKey)) {
      sellerMap.set(sellerKey, { user_id: s.user_id ?? null, user_name: sellerName, total_sales: 0, total_amount: 0 });
    }
    const sellerAgg = sellerMap.get(sellerKey)!;
    sellerAgg.total_sales += 1;
    sellerAgg.total_amount += saleTotal;

    // Agregación por Métodos de Pago
    if (Array.isArray(s.payments) && s.payments.length) {
      for (const p of s.payments) {
        const m = p.method ?? 'desconocido';
        if (!methodMap.has(m)) methodMap.set(m, { method: m, count: 0, total_amount: 0 });
        const agg = methodMap.get(m)!;
        agg.count += 1;
        agg.total_amount += n(p.amount);
      }
    } else {
      const m = s.payment_method ?? 'desconocido';
      if (!methodMap.has(m)) methodMap.set(m, { method: m, count: 0, total_amount: 0 });
      const agg = methodMap.get(m)!;
      agg.count += 1;
      agg.total_amount += saleTotal;
    }
  }

  return {
    totalSales: sales.length,
    totalAmount,
    avgTicket: sales.length > 0 ? totalAmount / sales.length : 0,
    bySeller: Array.from(sellerMap.values()).sort((a, b) => b.total_amount - a.total_amount),
    byMethod: Array.from(methodMap.values()).sort((a, b) => b.total_amount - a.total_amount),
  };
}

/**
 * Función principal para construir el BLOB del PDF
 */
export async function buildSalesReportPdfBlob(
  report: SalesReportResponse,
  opts?: { periodLabel?: string }
): Promise<Blob> {
  const c = computeFromSales(report);
  const meta: any = report.meta ?? {};
  const warehouseName = meta.warehouse_name ?? `Tienda #${meta.warehouse_id ?? ''}`;
  const period = opts?.periodLabel ?? 'Periodo según consulta';
  const generatedAt = new Date().toLocaleString('es-PE');

  // Estructura de filas para la tabla detallada
  const salesContentRows: any[] = [];
  
  (report.sales ?? []).forEach((s: any) => {
    // Validar fecha para evitar errores de formateo
    const saleDateObj = s.sale_date ? new Date(s.sale_date) : new Date();
    const formattedDate = isNaN(saleDateObj.getTime()) 
      ? 'Fecha Inválida' 
      : saleDateObj.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

    // Fila de encabezado de la venta
    salesContentRows.push([
      { text: s.sale_code ?? '-', bold: true, color: '#2563eb' },
      { text: formattedDate },
      { text: s.user_name ?? 'SIN VENDEDOR' },
      { text: money(s.total_amount), bold: true, alignment: 'right' },
      { text: s.payments?.length ? s.payments.map((p: any) => p.method).join(', ') : (s.payment_method ?? '-'), fontSize: 8 }
    ]);

    // Si existen items, agregamos una sub-tabla con el detalle de productos/tallas
    if (Array.isArray(s.items) && s.items.length > 0) {
      const itemRows = s.items.map((it: any) => [
        { text: ` • ${it.product_name || it.article_description || 'Producto'}`, fontSize: 8, color: '#64748b' },
        { text: it.size ?? '-', fontSize: 8, alignment: 'center', color: '#64748b' },
        { text: it.quantity ?? '1', fontSize: 8, alignment: 'center', color: '#64748b' },
        { text: money(it.unit_price), fontSize: 8, alignment: 'right', color: '#64748b' },
        { text: money(it.subtotal || (n(it.quantity) * n(it.unit_price))), fontSize: 8, alignment: 'right', color: '#64748b' }
      ]);

      salesContentRows.push([
        {
          colSpan: 5,
          margin: [15, 0, 0, 5],
          table: {
            widths: ['*', 40, 40, 60, 60],
            body: [
              [
                { text: 'Producto', fontSize: 7, bold: true, color: '#94a3b8' },
                { text: 'Talla', fontSize: 7, bold: true, color: '#94a3b8', alignment: 'center' },
                { text: 'Cant.', fontSize: 7, bold: true, color: '#94a3b8', alignment: 'center' },
                { text: 'P. Unit', fontSize: 7, bold: true, color: '#94a3b8', alignment: 'right' },
                { text: 'Subtotal', fontSize: 7, bold: true, color: '#94a3b8', alignment: 'right' }
              ],
              ...itemRows
            ]
          },
          layout: 'noBorders'
        },
        '', '', '', ''
      ]);
    }
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 80, 40, 60],
    background: function() {
        return {
            canvas: [
                {
                    type: 'rect',
                    x: 0, y: 0, w: 595, h: 5,
                    color: '#1e293b'
                }
            ]
        };
    },
    header: function() {
      return {
        margin: [40, 25, 40, 0],
        columns: [
          {
            stack: [
              { text: 'VERCO', fontSize: 22, bold: true, color: '#1e293b', letterSpacing: 2 },
              { text: 'SISTEMA DE GESTIÓN COMERCIAL', fontSize: 8, color: '#64748b', margin: [0, 2, 0, 0] },
            ],
            width: '*'
          },
          {
            stack: [
              { text: 'REPORTE DE VENTAS DETALLADO', fontSize: 12, bold: true, alignment: 'right', color: '#2563eb' },
              { text: warehouseName, fontSize: 10, alignment: 'right', margin: [0, 2, 0, 0] },
              { text: `Periodo: ${period}`, fontSize: 9, alignment: 'right', color: '#475569' },
            ],
            width: '*'
          }
        ]
      };
    },
    footer: function(currentPage: number, pageCount: number) {
      return {
        margin: [40, 0, 40, 0],
        columns: [
          { text: `Fecha de impresión: ${generatedAt}`, fontSize: 8, color: '#94a3b8' },
          { text: `Página ${currentPage} de ${pageCount}`, fontSize: 8, alignment: 'right', color: '#94a3b8' }
        ]
      };
    },
    content: [
      // KPIs
      {
        margin: [0, 10, 0, 25],
        columns: [
          kpiBox('TOTAL VENTAS', String(c.totalSales), '#eff6ff', '#2563eb'),
          kpiBox('MONTO RECAUDADO', money(c.totalAmount), '#f0fdf4', '#166534'),
          kpiBox('TICKET PROMEDIO', money(c.avgTicket), '#f5f3ff', '#7c3aed')
        ],
        columnGap: 15
      },

      // Tabla Principal
      { text: 'DETALLE CRONOLÓGICO DE OPERACIONES', style: 'sectionTitle' },
      {
        style: 'mainTable',
        table: {
          headerRows: 1,
          widths: [80, 80, '*', 70, 80],
          body: [
            [
              { text: 'CÓDIGO', style: 'tableHeader' },
              { text: 'FECHA', style: 'tableHeader' },
              { text: 'VENDEDOR', style: 'tableHeader' },
              { text: 'TOTAL', style: 'tableHeader', alignment: 'right' },
              { text: 'PAGO', style: 'tableHeader' }
            ],
            ...(salesContentRows.length > 0 ? salesContentRows : [[{ text: 'Sin registros', colSpan: 5, alignment: 'center', margin: [0, 10, 0, 10] }, '', '', '', '']])
          ]
        },
        layout: {
          hLineColor: (i: number) => (i <= 1 ? '#1e293b' : '#e2e8f0'),
          vLineColor: () => '#ffffff',
          paddingTop: () => 8,
          paddingBottom: () => 8,
        }
      },

      // Resúmenes Inferiores
      {
        margin: [0, 30, 0, 0],
        columns: [
          {
            width: '*',
            stack: [
              { text: 'RESUMEN POR VENDEDOR', style: 'sectionTitle' },
              {
                table: {
                  widths: ['*', 50, 70],
                  body: [
                    [{ text: 'Nombre', style: 'tableHeaderSmall' }, { text: 'Cant.', style: 'tableHeaderSmall' }, { text: 'Total', style: 'tableHeaderSmall', alignment: 'right' }],
                    ...(c.bySeller.length > 0 
                      ? c.bySeller.map(x => [x.user_name, String(x.total_sales), { text: money(x.total_amount), alignment: 'right' }])
                      : [[{ text: 'No hay datos', colSpan: 3, alignment: 'center' }, '', '']])
                  ]
                },
                layout: 'lightHorizontalLines'
              }
            ]
          },
          { width: 20, text: '' },
          {
            width: '*',
            stack: [
              { text: 'RESUMEN POR PAGO', style: 'sectionTitle' },
              {
                table: {
                  widths: ['*', 50, 70],
                  body: [
                    [{ text: 'Método', style: 'tableHeaderSmall' }, { text: 'Ops.', style: 'tableHeaderSmall' }, { text: 'Total', style: 'tableHeaderSmall', alignment: 'right' }],
                    ...(c.byMethod.length > 0
                      ? c.byMethod.map(x => [x.method.toUpperCase(), String(x.count), { text: money(x.total_amount), alignment: 'right' }])
                      : [[{ text: 'No hay datos', colSpan: 3, alignment: 'center' }, '', '']])
                  ]
                },
                layout: 'lightHorizontalLines'
              }
            ]
          }
        ]
      }
    ],
    styles: {
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: '#1e293b',
        margin: [0, 0, 0, 10],
        letterSpacing: 1
      },
      tableHeader: {
        fontSize: 8,
        bold: true,
        color: '#ffffff',
        fillColor: '#1e293b',
        margin: [0, 2, 0, 2]
      },
      tableHeaderSmall: {
        fontSize: 7,
        bold: true,
        color: '#475569',
        fillColor: '#f8fafc'
      },
      mainTable: {
        margin: [0, 5, 0, 15],
        fontSize: 9
      }
    }
  };

  return new Promise((resolve) => {
    pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => resolve(blob));
  });
}

/**
 * Crea una caja de KPI estilizada usando una tabla (más estable que canvas)
 */
function kpiBox(label: string, value: string, bgColor: string, textColor: string) {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: [
              { text: label, fontSize: 7, bold: true, color: '#64748b', characterSpacing: 0.5 },
              { text: value, fontSize: 14, bold: true, color: textColor, margin: [0, 2, 0, 0] }
            ],
            margin: [10, 8, 10, 8]
          }
        ]
      ]
    },
    layout: {
      defaultBorder: false,
      fillColor: bgColor,
      hLineColor: () => '#ffffff',
      vLineColor: () => '#ffffff',
    }
  };
}
