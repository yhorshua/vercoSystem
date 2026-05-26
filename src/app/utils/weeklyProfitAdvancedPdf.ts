import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.vfs;

// ================= TYPES =================
export type SalesReportResponse = {
  meta: {
    warehouse_name?: string; // Nombre de la tienda
    total_sales?: number;
    total_amount?: number;
  };
  sales: any[];
};

type ChartImages = {
  salesChart?: string;      // Evolución de ingresos
  paymentChart?: string;    // Métodos de pago
  catAmountChart?: string;  // Ventas por categoría (S/)
  catUnitsChart?: string;   // Unidades por categoría (Cant)
  unitsChart?: string;      // Top productos (Unidades)
};

// ================= HELPERS =================
const money = (v: any) =>
  `S/ ${Number(v ?? 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const qty = (v: any) => Math.round(Number(v ?? 0)).toString();

// ================= COMPUTE REAL DATA =================
function computeReport(report: SalesReportResponse) {
  const sales = report.sales ?? [];
  
  // Extraer nombre de la tienda del meta o del primer registro de venta
  const storeName = report.meta?.warehouse_name || (sales.length > 0 ? sales[0].warehouse_name : 'TIENDA GENERAL');
  
  const totalSales = report.meta?.total_sales ?? sales.length;
  const totalAmount = Number(report.meta?.total_amount ?? 0);

  let reportMonth = 'SIN FECHA';
  if (sales.length > 0) {
    const date = new Date(sales[0].sale_date);

    reportMonth = date.toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric'
    }).toUpperCase();
  }
  const paymentMethods: Record<string, number> = {};
  const productsMap = new Map<string, any>();
  const categoryMap = new Map<string, any>();

  sales.forEach(s => {
    const method = (s.payment_method || 'OTROS').toUpperCase();
    paymentMethods[method] = (paymentMethods[method] || 0) + Number(s.total_amount);

    s.details?.forEach((d: any) => {
      const q = Number(d.quantity);
      const lineAmount = Number(d.unit_price) * q;
      const catName = d.category_name || 'SIN CATEGORÍA';

      // DATA DE PRODUCTOS
      const prodKey = d.article_code || d.article_description;
      const currentProd = productsMap.get(prodKey) || {
        desc: d.article_description,
        qty: 0,
        revenue: 0,
        price: d.unit_price
      };
      currentProd.qty += q;
      currentProd.revenue += lineAmount;
      productsMap.set(prodKey, currentProd);

      // DATA DE CATEGORÍAS
      const currentCat = categoryMap.get(catName) || { name: catName, qty: 0, amount: 0 };
      currentCat.qty += q;
      currentCat.amount += lineAmount;
      categoryMap.set(catName, currentCat);
    });
  });

  return {
    storeName,
    reportMonth,
    totalSales,
    totalAmount,
    avgTicket: totalSales ? totalAmount / totalSales : 0,
    paymentMethods: Object.entries(paymentMethods),
    topSold: [...productsMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10),
    categories: [...categoryMap.values()].sort((a, b) => b.amount - a.amount)
  };
}

// ================= PDF BUILDER =================
export async function buildWeeklyProfitAdvancedPdf(
  report: SalesReportResponse,
  charts?: ChartImages
) {
  const c = computeReport(report);

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      // HEADER
      {
        columns: [
          {
            stack: [
              { text: 'REPORTE ESTRATÉGICO DE VENTAS', fontSize: 18, bold: true, color: '#1e293b' },
              { text: `TIENDA: ${c.storeName}`, fontSize: 13, color: '#0f172a', bold: true, margin: [0, 5, 0, 0] },
              { text: `VENTA MENSUAL: ${c.reportMonth}`, fontSize: 9, color: '#94a3b8' }
            ]
          },
          {
            stack: [
              { text: 'VENTA TOTAL RECUPERADA', fontSize: 10, bold: true, alignment: 'right', color: '#64748b' },
              { text: money(c.totalAmount), fontSize: 20, bold: true, alignment: 'right', color: '#1e293b' }
            ]
          }
        ]
      },

      { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#e2e8f0' }], margin: [0, 0, 0, 20] },

      // RESUMEN KPI
      {
        columns: [
          kpi('VENTAS TOTALES (S/)', money(c.totalAmount)),
          kpi('NRO. DE VENTAS', c.totalSales.toString()),
          kpi('TICKET PROMEDIO', money(c.avgTicket))
        ],
        margin: [0, 0, 0, 25]
      },


      // SECCIÓN 1: CATEGORÍAS
      { text: 'ANÁLISIS POR CATEGORÍAS', style: 'sectionHeader' },
      {
        columns: [
          charts?.catAmountChart ? { image: charts.catAmountChart, fit: [250, 500] } : {},
          charts?.catUnitsChart ? { image: charts.catUnitsChart, fit: [250, 500] } : {}
        ],
        columnGap: 15,
        margin: [0, 0, 0, 10]
      },

      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [
            [
              { text: 'Categoría', style: 'tableHeader' },
              { text: 'Unidades', style: 'tableHeader' },
              { text: 'Venta (S/)', style: 'tableHeader' }
            ],
            ...c.categories.map(cat => [
              cat.name,
              { text: qty(cat.qty), alignment: 'center' },
              { text: money(cat.amount), alignment: 'right' }
            ])
          ]
        },
        margin: [0, 0, 0, 25]
      },

      // SECCIÓN 2: PRODUCTOS
      { text: 'TOP 10 PRODUCTOS MÁS VENDIDOS', style: 'sectionHeader' },
      charts?.unitsChart && { image: charts.unitsChart, width: 515, margin: [0, 0, 0, 15] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [
            [
              { text: 'Producto', style: 'tableHeader' },
              { text: 'Cant. Vendida', style: 'tableHeader' },
              { text: 'P. Unitario Prom.', style: 'tableHeader' }
            ],
            ...c.topSold.map(p => [
              { text: p.desc, fontSize: 9 },
              { text: qty(p.qty), alignment: 'center', bold: true },
              { text: money(p.price), alignment: 'right' }
            ])
          ]
        },
        margin: [0, 0, 0, 25]
      },

      // SECCIÓN 3: MÉTODOS DE PAGO
      { text: 'DISTRIBUCIÓN POR MÉTODOS DE PAGO', style: 'sectionHeader' },
      {
        columns: [
          charts?.paymentChart ? { image: charts.paymentChart, fit: [250, 500] } : { text: '' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Método', style: 'tableHeader' }, { text: 'Total Recaudado', style: 'tableHeader' }],
                ...c.paymentMethods.map(m => [m[0], { text: money(m[1]), bold: true, alignment: 'right' }])
              ]
            },
            margin: [10, 0, 0, 0]
          }
        ]
      }
    ],

    styles: {
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: '#1e293b',
        margin: [0, 10, 0, 10],
        background: '#f8fafc',
        padding: [5, 5]
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: '#ffffff',
        fillColor: '#475569',
        alignment: 'center'
      }
    },
    defaultStyle: {
      fontSize: 10,
      color: '#334155'
    }
  };

  return new Promise<Blob>((resolve) => {
    pdfMake.createPdf(docDefinition).getBlob(resolve);
  });
}

function kpi(label: string, value: any) {
  return {
    stack: [
      { text: label, fontSize: 8, color: '#64748b', bold: true, margin: [0, 0, 0, 2] },
      { text: value, fontSize: 16, bold: true, color: '#0f172a' }
    ]
  };
}