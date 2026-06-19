import jsPDF from 'jspdf';
import { default as autoTable } from 'jspdf-autotable';

export function exportWebSalesReportPDF(data: any) {
  const doc = new jsPDF();

  // TITULO
  doc.setFontSize(16);
  doc.text('REPORTE DE VENTAS WEB', 14, 15);

  // =====================
  // KPIs
  // =====================
  autoTable(doc, {
    startY: 25,
    head: [['KPI', 'Valor']],
    body: [
      ['Pedidos', data.resumen_general.total_pedidos],
      ['Vendidos', data.resumen_general.pedidos_entregados],
      ['Cancelados', data.resumen_general.pedidos_cancelados],
      ['Ingresos', data.resumen_general.total_importe_vendido],
      ['Costos', data.resumen_general.total_costo_compra],
      ['Utilidad', data.resumen_general.total_utilidad],
      ['Margen %', data.resumen_general.margen_utilidad_porcentaje],
    ],
  });

  // =====================
  // VENDEDORES
  // =====================
  autoTable(doc, {
    startY: 80,
    head: [['Vendedor', 'Ventas', 'Ingresos', 'Utilidad']],
    body: data.resumen_por_vendedor.map((v: any) => [
      v.vendedor,
      v.total_pedidos,
      v.total_importe_vendido,
      v.total_utilidad,
    ]),
  });

  doc.save(`REPORTE_VENTAS_${Date.now()}.pdf`);
}