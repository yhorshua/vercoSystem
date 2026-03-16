import * as XLSX from 'xlsx';
import { SalesReportResponse } from '../services/reportServices';

export function buildWeeklyProfitExcel(report: SalesReportResponse) {

  const rows: any[] = [];

  report.sales?.forEach((s: any) => {
    s.details?.forEach((d: any) => {

      const saleDate = new Date(s.sale_date).toLocaleString('es-PE');

      rows.push({
        Codigo: d.article_code,
        Fecha: saleDate,
        Producto: d.article_description,
        PrecioVenta: Number(d.unit_price),
        PrecioCompra: Number(d.purchase_price),
        Cantidad: Number(d.quantity),
        Utilidad: (Number(d.unit_price) - Number(d.purchase_price)) * Number(d.quantity),
        Vendedor: s.user_name,
        MetodoPago: s.payment_method
      });

    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');

  return workbook;
}