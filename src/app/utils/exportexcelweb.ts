import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportWebSalesReportExcel(data: any) {
  const workbook = XLSX.utils.book_new();

  // ========================
  // 1. RESUMEN GENERAL
  // ========================
  const resumen = [
    {
      total_pedidos: data.resumen_general.total_pedidos,
      vendidos: data.resumen_general.pedidos_entregados,
      pendientes: data.resumen_general.pedidos_pendientes,
      cancelados: data.resumen_general.pedidos_cancelados,
      ingresos: data.resumen_general.total_importe_vendido,
      costos: data.resumen_general.total_costo_compra,
      utilidad: data.resumen_general.total_utilidad,
      margen: data.resumen_general.margen_utilidad_porcentaje,
    },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(resumen),
    'Resumen'
  );

  // ========================
  // 2. VENTAS POR VENDEDOR
  // ========================
  const vendedores = data.resumen_por_vendedor.map((v: any) => ({
    vendedor: v.vendedor,
    pedidos: v.total_pedidos,
    vendidos: v.pedidos_entregados,
    rechazados: v.pedidos_cancelados,
    ingresos: v.total_importe_vendido,
    costo: v.total_costo_compra,
    utilidad: v.total_utilidad,
    margen: v.margen_utilidad_porcentaje,
  }));

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(vendedores),
    'Vendedores'
  );

  // ========================
  // 3. DETALLE VENTAS
  // ========================
  const detalle: any[] = [];

  data.resumen_por_vendedor.forEach((v: any) => {
    v.ventas.forEach((venta: any) => {
      detalle.push({
        vendedor: v.vendedor,
        ticket: venta.ticket,
        cliente: venta.cliente.nombre,
        dni: venta.cliente.dni,
        celular: venta.cliente.telefono,
        distrito: venta.cliente.distrito,
        estado: venta.estado_pedido,
        total: venta.pago.total_pedido_actual,
        costo: venta.resumen_venta.costo_compra_total,
        utilidad: venta.resumen_venta.total_utilidad,
      });
    });
  });

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(detalle),
    'Detalle'
  );

  // ========================
  // 4. PRODUCTOS RECHAZADOS
  // ========================
  const rechazados: any[] = [];

  data.resumen_por_vendedor.forEach((v: any) => {
    v.ventas.forEach((venta: any) => {
      venta.detalles.forEach((d: any) => {
        if (d.estado_detalle === 'DEVUELTO') {
          rechazados.push({
            vendedor: v.vendedor,
            producto: d.article_description,
            talla: d.talla,
            cantidad: d.cantidad_pares,
            motivo: 'DEVUELTO',
          });
        }
      });
    });
  });

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rechazados),
    'Rechazados'
  );

  // ========================
  // 5. POR DISTRITO
  // ========================
  const distritosMap: Record<string, any> = {};

  data.resumen_por_vendedor.forEach((v: any) => {
    v.ventas.forEach((venta: any) => {
      const d = venta.cliente.distrito;

      if (!distritosMap[d]) {
        distritosMap[d] = {
          distrito: d,
          ventas: 0,
          total: 0,
          utilidad: 0,
        };
      }

      distritosMap[d].ventas += 1;
      distritosMap[d].total += venta.pago.total_pedido_actual;
      distritosMap[d].utilidad += venta.resumen_venta.total_utilidad;
    });
  });

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(Object.values(distritosMap)),
    'Distritos'
  );

  // ========================
  // DESCARGA
  // ========================
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const file = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(file, `REPORTE_VENTAS_WEB_${Date.now()}.xlsx`);
}