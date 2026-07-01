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

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resumen), 'Resumen');

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

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(vendedores), 'Vendedores');

  // ========================
  // 3. DETALLE VENTAS
  // ========================
  const detalle: any[] = [];

  let totalParesVendidos = 0;
  let totalVendido = 0;
  let totalCosto = 0;
  let totalUtilidad = 0;

  data.resumen_por_vendedor.forEach((v: any) => {
    v.ventas.forEach((venta: any) => {
      const resumenVenta = venta.resumen_venta;

      detalle.push({
        vendedor: v.vendedor,
        ticket: venta.ticket,
        cliente: venta.cliente.nombre,
        dni: venta.cliente.dni,
        celular: venta.cliente.telefono,
        distrito: venta.cliente.distrito,
        estado: venta.estado_pedido,
        pares_vendidos: resumenVenta.total_pares_vendidos,
        total: resumenVenta.total_importe_vendido,
        costo: resumenVenta.total_costo_compra,
        utilidad: resumenVenta.total_utilidad,
      });

      totalParesVendidos += Number(resumenVenta.total_pares_vendidos || 0);
      totalVendido += Number(resumenVenta.total_importe_vendido || 0);
      totalCosto += Number(resumenVenta.total_costo_compra || 0);
      totalUtilidad += Number(resumenVenta.total_utilidad || 0);
    });
  });

  detalle.sort((a, b) => {
    const ticketA = Number(String(a.ticket).replace(/\D/g, ''));
    const ticketB = Number(String(b.ticket).replace(/\D/g, ''));
    return ticketA - ticketB;
  });

  detalle.push({});

  detalle.push({
    vendedor: 'TOTAL GENERAL',
    ticket: '',
    cliente: '',
    dni: '',
    celular: '',
    distrito: '',
    estado: 'VENTAS EFECTIVAS',
    pares_vendidos: totalParesVendidos,
    total: totalVendido,
    costo: totalCosto,
    utilidad: totalUtilidad,
  });

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detalle), 'Detalle');

  // ========================
  // DETALLE POR VENDEDOR
  // ========================
  data.resumen_por_vendedor.forEach((v: any) => {
    const detalleVendedor: any[] = [];

    let totalPedidos = 0;
    let totalPares = 0;
    let totalVendido = 0;
    let totalCosto = 0;
    let totalUtilidad = 0;

    const ventasOrdenadas = [...v.ventas].sort((a: any, b: any) => {
      const ticketA = Number(String(a.ticket).replace(/\D/g, ''));
      const ticketB = Number(String(b.ticket).replace(/\D/g, ''));
      return ticketA - ticketB;
    });

    ventasOrdenadas.forEach((venta: any) => {
      totalPedidos++;

      const resumenVenta = venta.resumen_venta;

      totalPares += Number(resumenVenta.total_pares_vendidos || 0);
      totalVendido += Number(resumenVenta.total_importe_vendido || 0);
      totalCosto += Number(resumenVenta.total_costo_compra || 0);
      totalUtilidad += Number(resumenVenta.total_utilidad || 0);

      detalleVendedor.push({
        ticket: venta.ticket,
        cliente: venta.cliente.nombre,
        dni: venta.cliente.dni,
        celular: venta.cliente.telefono,
        distrito: venta.cliente.distrito,
        estado: venta.estado_pedido,
        pares_vendidos: resumenVenta.total_pares_vendidos,
        total: resumenVenta.total_importe_vendido,
        costo: resumenVenta.total_costo_compra,
        utilidad: resumenVenta.total_utilidad,
      });
    });

    detalleVendedor.push({});

    detalleVendedor.push({
      ticket: 'RESUMEN',
      cliente: '',
      dni: '',
      celular: '',
      distrito: '',
      estado: '',
      pares_vendidos: totalPares,
      total: totalVendido,
      costo: totalCosto,
      utilidad: totalUtilidad,
    });

    detalleVendedor.push({
      ticket: 'TOTAL PEDIDOS',
      cliente: totalPedidos,
    });

    const nombreHoja = `Detalle_${String(v.vendedor)
      .replace(/[\\/:*?\[\]]/g, '')
      .substring(0, 20)}`;

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detalleVendedor),
      nombreHoja
    );
  });

  // ========================
  // 4. PRODUCTOS RECHAZADOS
  // ========================
  const rechazados: any[] = [];

  data.resumen_por_vendedor.forEach((v: any) => {
    v.ventas.forEach((venta: any) => {
      venta.detalles?.forEach((d: any) => {
        if (d.estado_detalle === 'DEVUELTO') {
          rechazados.push({
            vendedor: v.vendedor,
            producto: d.article_description,
            talla: d.talla,
            cantidad: d.cantidad_pares,
            precio_venta: d.precio_venta_unitario,
            precio_compra: d.precio_compra_unitario,
            importe_devuelto: d.subtotal_registrado,
            motivo: 'DEVUELTO',
          });
        }
      });
    });
  });

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rechazados), 'Rechazados');

  // ========================
  // 5. POR DISTRITO
  // ========================
  const distritosMap: Record<string, any> = {};

  data.resumen_por_vendedor.forEach((v: any) => {
    v.ventas.forEach((venta: any) => {
      const distrito = venta.cliente.distrito || 'SIN DISTRITO';
      const resumenVenta = venta.resumen_venta;

      if (!distritosMap[distrito]) {
        distritosMap[distrito] = {
          distrito,
          ventas: 0,
          total: 0,
          utilidad: 0,
        };
      }

      distritosMap[distrito].ventas += 1;
      distritosMap[distrito].total += Number(resumenVenta.total_importe_vendido || 0);
      distritosMap[distrito].utilidad += Number(resumenVenta.total_utilidad || 0);
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