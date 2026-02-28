import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { SalesReportResponse } from '../services/reportServices';

pdfMake.vfs = pdfFonts.vfs;

type Computed = {
  totalSales: number;
  totalAmount: number;
  avgTicket: number;
  totalProfit: number;
  totalCashAmount: number;
  totalVirtualAmount: number;
  operatingExpenses: number;
  bySeller: Array<{ user_id: number | null; user_name: string; total_sales: number; total_amount: number }>;
  byMethod: Array<{ method: string; count: number; total_amount: number }>;
  byCategory: Array<{ category: string; total_sales: number; total_amount: number; total_profit: number }>;
  totalZapatillasAmount: number;
  totalZapatillasProfit: number;
};

const n = (v: any) => {
  const x = typeof v === 'string' ? Number(v) : Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};

const money = (v: any) => `S/ ${n(v).toFixed(2)}`;

function computeFromSales(report: SalesReportResponse): Computed {
  const sales = report.sales ?? [];
  const sellerMap = new Map<string, { user_id: number | null; user_name: string; total_sales: number; total_amount: number }>();
  const methodMap = new Map<string, { method: string; count: number; total_amount: number }>();
  const categoryMap = new Map<string, { category: string; total_sales: number; total_amount: number; total_profit: number }>();

  let totalAmount = 0;
  let totalProfit = 0;
  let totalCashAmount = 0;
  let totalVirtualAmount = 0;
  let operatingExpenses = 0;
  let totalZapatillasAmount = 0;
  let totalZapatillasProfit = 0;

  for (const s of sales) {
    const saleTotal = n(s.total_amount);
    totalAmount += saleTotal;

    // Agregar ganancias por producto
    s.details?.forEach(d => {
      const productProfit = n(d.profit); // Utilidad por producto, ya calculada en el backend
      totalProfit += productProfit;

      // Cálculo para Zapatillas
      if (d.article_description?.includes('ZAPATILLA')) {
        totalZapatillasAmount += n(d.unit_price) * n(d.quantity); // Total de ventas de Zapatillas
        totalZapatillasProfit += productProfit; // Total de utilidad de Zapatillas
      }

      // Agregar categorías al map
      const category = d.article_description?.includes('ZAPATILLA') ? 'Zapatillas' : 'Otros'; 
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { category, total_sales: 0, total_amount: 0, total_profit: 0 });
      }
      const categoryData = categoryMap.get(category)!;
      categoryData.total_sales += n(d.quantity);
      categoryData.total_amount += n(d.quantity) * n(d.unit_price);
      categoryData.total_profit += productProfit;
    });

    // Separar por métodos de pago
    const paymentMethod = s.payment_method || 'unknown';
    if (paymentMethod === 'efectivo') {
      totalCashAmount += saleTotal;
    } else if (paymentMethod === 'YAPE' || paymentMethod === 'tarjetaCredito' || paymentMethod === 'tarjetaDebito') {
      totalVirtualAmount += saleTotal;
    }

    // Agregar los egresos
    operatingExpenses += n(report.meta?.total_operating_expenses || 0);  // Asegúrate de que los egresos estén en los metadatos del reporte
  }

  return {
    totalSales: sales.length,
    totalAmount,
    avgTicket: sales.length > 0 ? totalAmount / sales.length : 0,
    totalProfit,
    totalCashAmount,
    totalVirtualAmount,
    operatingExpenses,
    bySeller: [],  // Aquí puedes agregar la lógica de agregación por vendedor si lo necesitas.
    byMethod: [],  // Aquí puedes agregar la lógica de agregación por método de pago si lo necesitas.
    byCategory: Array.from(categoryMap.values()),  // Retornar el array de categorías
    totalZapatillasAmount,  // Total de ventas de zapatillas
    totalZapatillasProfit,  // Total de utilidad por zapatillas
  };
}

export async function buildWeeklyProfitReportPdfBlob(
  report: SalesReportResponse,
  opts?: { periodLabel?: string }
): Promise<Blob> {
  const c = computeFromSales(report);
  const meta: any = report.meta ?? {};
  const warehouseName = meta.warehouse_name ?? `Tienda #${meta.warehouse_name ?? ''}`;
  const period = opts?.periodLabel ?? 'Periodo según consulta';
  const generatedAt = new Date().toLocaleString('es-PE');

  const salesContentRows: any[] = [];

  // Detalles de productos vendidos
  report.sales?.forEach((s: any) => {
    s.details?.forEach((d: any) => {
      const saleDateObj = new Date(s.sale_date);
      const formattedDate = saleDateObj.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

      // Verificar si las propiedades existen
      if (d.article_code && d.article_description) {
        salesContentRows.push([
          { text: d.article_code ?? '-', bold: true, color: '#2563eb' },
          { text: formattedDate },
          { text: d.article_description ?? 'Producto sin descripción' },
          { text: money(d.unit_price), bold: true, alignment: 'right' },
          { text: money(d.purchase_price), bold: true, alignment: 'right' }, // Precio de compra
          { text: money(n(d.unit_price - d.purchase_price) * n(d.quantity)), bold: true, alignment: 'right' } // Utilidad por producto
        ]);
      }
    });
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 80, 40, 60],
    background: function () {
      return {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 595, h: 5, color: '#1e293b' }
        ]
      };
    },
    header: function () {
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
              { text: 'REPORTE DE UTILIDAD SEMANAL', fontSize: 12, bold: true, alignment: 'right', color: '#2563eb' },
              { text: warehouseName, fontSize: 10, alignment: 'right', margin: [0, 2, 0, 0] },
              { text: `Periodo: ${period}`, fontSize: 9, alignment: 'right', color: '#475569' },
            ],
            width: '*'
          }
        ]
      };
    },
    footer: function (currentPage: number, pageCount: number) {
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
          kpiBox('TICKET PROMEDIO', money(c.avgTicket), '#f5f3ff', '#7c3aed'),
          kpiBox('UTILIDAD NETA', money(c.totalProfit), '#e0fdf4', '#166534')
        ],
        columnGap: 15
      },

      // Tabla de ventas por producto
      { text: 'DETALLE DE PRODUCTOS VENDIDOS', style: 'sectionTitle' },
      {
        style: 'mainTable',
        table: {
          headerRows: 1,
          widths: [80, 80, '*', 70, 70, 70],
          body: [
            [
              { text: 'CÓDIGO', style: 'tableHeader' },
              { text: 'FECHA', style: 'tableHeader' },
              { text: 'PRODUCTO', style: 'tableHeader' },
              { text: 'P. VENTA', style: 'tableHeader', alignment: 'right' },
              { text: 'P. COMPRA', style: 'tableHeader', alignment: 'right' },
              { text: 'UTILIDAD', style: 'tableHeader', alignment: 'right' }
            ],
            ...(salesContentRows.length > 0 ? salesContentRows : [[{ text: 'Sin registros', colSpan: 6, alignment: 'center', margin: [0, 10, 0, 10] }, '', '', '', '', '']])
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
              { text: 'RESUMEN POR CATEGORÍA', style: 'sectionTitle' },
              {
                table: {
                  widths: ['*', 50, 70],
                  body: [
                    [{ text: 'Categoría', style: 'tableHeaderSmall' }, { text: 'Ventas', style: 'tableHeaderSmall' }, { text: 'Total', style: 'tableHeaderSmall', alignment: 'right' }],
                    ...(c.byCategory.length > 0
                      ? c.byCategory.map(x => [x.category, String(x.total_sales), { text: money(x.total_amount), alignment: 'right' }])
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