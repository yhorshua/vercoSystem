'use client';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import  { SalesReportResponse } from '../services/reportServices';

pdfMake.vfs = pdfFonts.vfs;

type Computed = {
  totalSales: number;
  totalAmount: number;
  bySeller: Array<{ user_id: number | null; user_name: string; total_sales: number; total_amount: number }>;
  byMethod: Array<{ method: string; count: number; total_amount: number }>;
};

// helpers
const n = (v: any) => {
  const x = typeof v === 'string' ? Number(v) : Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};
const money = (v: any) => n(v).toFixed(2);

function computeFromSales(report: SalesReportResponse): Computed {
  const sales = report.sales ?? [];

  const sellerMap = new Map<string, { user_id: number | null; user_name: string; total_sales: number; total_amount: number }>();
  const methodMap = new Map<string, { method: string; count: number; total_amount: number }>();

  let totalAmount = 0;

  for (const s of sales as any[]) {
    const saleTotal = n(s.total_amount);
    totalAmount += saleTotal;

    // ---- vendedor
    const sellerKey = String(s.user_id ?? 'null');
    const sellerName = s.user_name ?? 'SIN VENDEDOR';
    if (!sellerMap.has(sellerKey)) {
      sellerMap.set(sellerKey, { user_id: s.user_id ?? null, user_name: sellerName, total_sales: 0, total_amount: 0 });
    }
    const sellerAgg = sellerMap.get(sellerKey)!;
    sellerAgg.total_sales += 1;
    sellerAgg.total_amount += saleTotal;

    // ---- métodos
    // Si viene payments => sumamos payments.
    // Si no viene payments => usamos payment_method y el total de la venta.
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

  const bySeller = Array.from(sellerMap.values()).sort((a, b) => b.total_amount - a.total_amount);
  const byMethod = Array.from(methodMap.values()).sort((a, b) => b.total_amount - a.total_amount);

  return {
    totalSales: sales.length,
    totalAmount,
    bySeller,
    byMethod,
  };
}

export async function buildSalesReportPdfBlob(
  report: SalesReportResponse,
  opts?: { periodLabel?: string }
): Promise<Blob> {
  const c = computeFromSales(report);

  const meta: any = report.meta ?? {};
  const warehouseName = meta.warehouse_name ?? `Tienda #${meta.warehouse_id ?? ''}`;
  const period = opts?.periodLabel ?? 'Periodo según consulta';
  const generatedAt = new Date().toLocaleString();

  const salesRows = (report.sales ?? []).map((s: any) => {
    const methods =
      s.payments?.length ? s.payments.map((p: any) => p.method).join(', ') : (s.payment_method ?? '-');

    return [
      s.sale_code ?? '-',
      new Date(s.sale_date).toLocaleString(),
      s.user_name ?? 'SIN VENDEDOR',
      `S/ ${money(s.total_amount)}`,
      methods,
    ];
  });

  const sellerRows = c.bySeller.map((x) => [
    x.user_name,
    String(x.total_sales),
    `S/ ${money(x.total_amount)}`,
  ]);

  const methodRows = c.byMethod.map((x) => [
    x.method,
    String(x.count),
    `S/ ${money(x.total_amount)}`,
  ]);

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [30, 70, 30, 40],

    header: {
      margin: [30, 18, 30, 0],
      columns: [
        {
          stack: [
            { text: 'VERCO', fontSize: 16, bold: true },
            { text: 'REPORTE DE VENTAS', fontSize: 12, bold: true, margin: [0, 2, 0, 0] },
            { text: warehouseName, fontSize: 10, color: '#555' },
          ],
        },
        {
          width: 210,
          alignment: 'right',
          stack: [
            { text: `Generado: ${generatedAt}`, fontSize: 8.5, color: '#333' },
            { text: `Periodo: ${period}`, fontSize: 8.5, color: '#333' },
          ],
        },
      ],
    },

    content: [
      {
        margin: [0, 10, 0, 12],
        columns: [
          kpiBox('Total ventas', String(c.totalSales)),
          kpiBox('Total S/', money(c.totalAmount)),
          kpiBox('Vendedor', meta.user_name ?? 'Todos'),
        ],
        columnGap: 10,
      },

      { text: 'Ventas', fontSize: 11, bold: true, margin: [0, 0, 0, 6] },
      tableBlock(['Código', 'Fecha', 'Vendedor', 'Total', 'Métodos'], salesRows),

      { text: ' ', margin: [0, 8] },

      { text: 'Resumen por vendedor', fontSize: 11, bold: true, margin: [0, 0, 0, 6] },
      tableBlock(['Vendedor', 'Ventas', 'Total'], sellerRows),

      { text: ' ', margin: [0, 8] },

      { text: 'Resumen por método de pago', fontSize: 11, bold: true, margin: [0, 0, 0, 6] },
      tableBlock(['Método', 'Registros', 'Total'], methodRows),
    ],
  };

  return new Promise((resolve) => {
    pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => resolve(blob));
  });
}

function kpiBox(label: string, value: string) {
  return {
    stack: [
      { text: label, fontSize: 9, color: '#666' },
      { text: value, fontSize: 16, bold: true, margin: [0, 3, 0, 0] },
    ],
    margin: [10, 10, 10, 10],
    canvas: [{ type: 'rect', x: 0, y: 0, w: 170, h: 55, r: 6, lineColor: '#dddddd' }],
  };
}

function tableBlock(headers: string[], rows: any[][]) {
  return {
    table: {
      headerRows: 1,
      widths: headers.map(() => '*'),
      body: [headers, ...rows],
    },
    layout: {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f3f4f6' : null),
      hLineColor: () => '#e5e7eb',
      vLineColor: () => '#e5e7eb',
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  };
}
