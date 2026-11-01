import * as XLSX from 'xlsx';
import {
  SalesReportResponse,
  SellerSalesDetailResponse,
  WeeklyCategorySummary,
  normalizeSellerSalesDetailResponse,
} from '../services/reportServices';

export type CommissionRates = {
  Zapatillas: number;
  Accesorios: number;
};

function round2(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function commissionRate(category: string, rates: CommissionRates) {
  const normalized = String(category || '').toUpperCase();
  if (normalized.includes('ZAPATILLA') || normalized.includes('CALZADO')) {
    return rates.Zapatillas;
  }
  if (normalized.includes('ACCESORIO')) return rates.Accesorios;
  return 0;
}

function addSheet(workbook: XLSX.WorkBook, rows: Record<string, unknown>[], name: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(14, Math.min(35, key.length + 6)),
  }));
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

function weeklyCategories(report: SalesReportResponse): WeeklyCategorySummary[] {
  if (report.categories?.length) return report.categories;

  const categories = new Map<string, WeeklyCategorySummary>();
  report.sales?.forEach((sale) => {
    sale.details?.forEach((detail) => {
      const name = detail.category_name || 'Otros';
      const quantity = Number(detail.quantity || 0);
      const purchase = Number(detail.purchase_total ?? Number(detail.purchase_price || 0) * quantity);
      const sales = Number(detail.line_total ?? Number(detail.unit_price || 0) * quantity);
      const current = categories.get(name) || {
        category: name,
        quantity: 0,
        purchase_amount: 0,
        sales_amount: 0,
        profit: 0,
      };
      current.quantity += quantity;
      current.purchase_amount += purchase;
      current.sales_amount += sales;
      current.profit += sales - purchase;
      categories.set(name, current);
    });
  });

  return Array.from(categories.values()).map((category) => ({
    ...category,
    quantity: round2(category.quantity),
    purchase_amount: round2(category.purchase_amount),
    sales_amount: round2(category.sales_amount),
    profit: round2(category.profit),
  }));
}

export function buildWeeklyProfitExcel(report: SalesReportResponse) {
  const workbook = XLSX.utils.book_new();
  const categories = weeklyCategories(report);
  const meta = report.meta;

  addSheet(workbook, [{
    Ventas: Number(meta.total_sales || 0),
    CantidadVendida: Number(meta.total_quantity ?? report.total_quantity ?? 0),
    MontoCompra: Number(meta.total_purchase_amount ?? report.total_cost ?? 0),
    MontoVenta: Number(meta.total_sales_amount ?? meta.total_amount ?? 0),
    UtilidadBruta: Number(meta.total_profit ?? report.total_profit ?? 0),
    GastosOperativos: Number(meta.total_operating_expenses || 0),
    UtilidadNeta: Number(meta.net_profit ?? 0),
  }], 'Resumen general');

  addSheet(workbook, categories.map((category) => ({
    Categoria: category.category,
    CantidadVendida: category.quantity,
    MontoCompra: category.purchase_amount,
    MontoVenta: category.sales_amount,
    Utilidad: category.profit,
    MargenPorcentaje: category.sales_amount > 0
      ? round2((category.profit / category.sales_amount) * 100)
      : 0,
  })), 'Por categoria');

  const detailRows = report.sales?.flatMap((sale) =>
    (sale.details || []).map((detail) => {
      const quantity = Number(detail.quantity || 0);
      const purchaseTotal = Number(detail.purchase_total ?? Number(detail.purchase_price || 0) * quantity);
      const salesTotal = Number(detail.line_total ?? Number(detail.unit_price || 0) * quantity);
      return {
        Ticket: sale.sale_code,
        Fecha: new Date(sale.sale_date).toLocaleString('es-PE'),
        Vendedor: sale.user_name,
        Cliente: sale.customer_name || '',
        Categoria: detail.category_name || 'Otros',
        Codigo: detail.article_code,
        Producto: detail.article_description,
        Talla: detail.size || '',
        Cantidad: quantity,
        PrecioCompraUnitario: Number(detail.purchase_price || 0),
        MontoCompra: round2(purchaseTotal),
        PrecioVentaUnitario: Number(detail.unit_price || 0),
        MontoVenta: round2(salesTotal),
        Utilidad: round2(Number(detail.profit ?? salesTotal - purchaseTotal)),
        MetodoPago: sale.payment_method || '',
      };
    }),
  ) || [];
  addSheet(workbook, detailRows, 'Detalle de ventas');

  return workbook;
}

export function buildSellerCommissionExcel(
  report: SellerSalesDetailResponse,
  rates: CommissionRates,
) {
  const safeReport = normalizeSellerSalesDetailResponse(report);
  const workbook = XLSX.utils.book_new();
  const totals = safeReport.totals;
  const totalCommission = safeReport.categories.reduce(
    (sum, category) => sum + category.commissionable_quantity * commissionRate(category.category, rates),
    0,
  );

  addSheet(workbook, [{
    Tienda: safeReport.meta.warehouse_name,
    Desde: safeReport.meta.start ? new Date(safeReport.meta.start).toLocaleDateString('es-PE') : '',
    Hasta: safeReport.meta.end ? new Date(safeReport.meta.end).toLocaleDateString('es-PE') : '',
    Vendedores: safeReport.meta.sellers,
    CantidadVendida: totals.quantity,
    CantidadComisionable: totals.commissionable_quantity,
    MontoCompra: totals.purchase_amount,
    MontoVenta: totals.sales_amount,
    Utilidad: totals.profit,
    ComisionCalculada: round2(totalCommission),
  }], 'Resumen general');

  addSheet(workbook, safeReport.categories.map((category) => {
    const rate = commissionRate(category.category, rates);
    return {
      Categoria: category.category,
      CantidadVendida: category.quantity,
      CantidadComisionable: category.commissionable_quantity,
      MontoPorUnidad: rate,
      MontoCompra: category.purchase_amount,
      MontoVenta: category.sales_amount,
      Utilidad: category.profit,
      ComisionCalculada: round2(category.commissionable_quantity * rate),
    };
  }), 'Por categoria');

  addSheet(workbook, safeReport.sellers.map((seller) => ({
    Vendedor: seller.seller_name,
    CantidadVendida: seller.total_quantity,
    CantidadComisionable: seller.total_commissionable_quantity,
    MontoCompra: seller.total_purchase_amount,
    MontoVenta: seller.total_sales_amount,
    Utilidad: seller.total_profit,
    ComisionCalculada: round2(seller.categories.reduce(
      (sum, category) => sum + category.commissionable_quantity * commissionRate(category.category, rates),
      0,
    )),
  })), 'Por vendedor');

  const detailRows = safeReport.sellers.flatMap((seller) =>
    seller.categories.flatMap((category) => {
      const rate = commissionRate(category.category, rates);
      return category.sales.map((sale) => ({
        Vendedor: seller.seller_name,
        Categoria: category.category,
        Ticket: sale.sale_code,
        Fecha: new Date(sale.sale_date).toLocaleString('es-PE'),
        Cliente: sale.customer_name ?? '',
        NotaVenta: sale.notes ?? '',
        MetodoPago: sale.payment_method ?? '',
        TotalTicket: sale.sale_total ?? 0,
        Codigo: sale.article_code,
        Producto: sale.article_description,
        Talla: sale.size ?? '',
        CantidadVendida: sale.quantity,
        CantidadComisionable: sale.commissionable_quantity,
        MontoPorUnidad: rate,
        PrecioCompraUnitario: sale.purchase_price,
        MontoCompra: sale.purchase_total,
        PrecioVentaUnitario: sale.unit_price,
        MontoVenta: sale.sales_total,
        Utilidad: sale.profit,
        ComisionCalculada: round2(sale.commissionable_quantity * rate),
      }));
    }),
  );
  addSheet(workbook, detailRows, 'Detalle de ventas');

  return workbook;
}
