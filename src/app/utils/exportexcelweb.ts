import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const COMISION_POR_PAR = 3;

function n(value: any): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeSheetName(name: string): string {
  return String(name || 'Hoja')
    .replace(/[\\/:*?\[\]]/g, '')
    .substring(0, 31);
}

function getGuiaOTicket(venta: any): string {
  return (
    venta.envio?.codigo_envio ||
    venta.guia ||
    venta.guia_interna ||
    venta.ticket ||
    ''
  );
}

function detalleVendido(d: any): boolean {
  return d.vendido === true || d.estado_detalle === 'VENDIDO';
}

function detalleDevuelto(d: any): boolean {
  return d.devuelto === true || d.estado_detalle === 'DEVUELTO';
}

function getParesVendidosDetalle(venta: any): number {
  return (venta.detalles || []).reduce((acc: number, d: any) => {
    if (detalleVendido(d) && !detalleDevuelto(d)) {
      return acc + n(d.cantidad_pares);
    }
    return acc;
  }, 0);
}

function getImporteVendidoVenta(venta: any): number {
  const resumen = venta.resumen_venta || {};

  const totalResumen = n(resumen.total_importe_vendido);
  if (totalResumen > 0) return totalResumen;

  return (venta.detalles || []).reduce((acc: number, d: any) => {
    if (detalleVendido(d) && !detalleDevuelto(d)) {
      return acc + n(d.importe_final || d.subtotal_registrado);
    }
    return acc;
  }, 0);
}

function esPromocionDosPares150(venta: any): boolean {
  const paresVendidos = getParesVendidosDetalle(venta);
  const totalVendido = getImporteVendidoVenta(venta);

  return (
    paresVendidos === 2 &&
    totalVendido >= 149 &&
    totalVendido <= 150
  );
}

function getParesComisionablesVenta(venta: any): number {
  const paresVendidos = getParesVendidosDetalle(venta);

  if (paresVendidos <= 0) return 0;

  if (esPromocionDosPares150(venta)) {
    return 1;
  }

  return paresVendidos;
}

function getComisionVenta(venta: any): number {
  return round2(getParesComisionablesVenta(venta) * COMISION_POR_PAR);
}

function getComisionLinea(venta: any, detalle: any): number {
  if (!detalleVendido(detalle) || detalleDevuelto(detalle)) {
    return 0;
  }

  const paresVendidosVenta = getParesVendidosDetalle(venta);
  const paresComisionablesVenta = getParesComisionablesVenta(venta);

  if (paresVendidosVenta <= 0 || paresComisionablesVenta <= 0) {
    return 0;
  }

  const factorComision = paresComisionablesVenta / paresVendidosVenta;
  const cantidadLinea = n(detalle.cantidad_pares);

  return round2(cantidadLinea * COMISION_POR_PAR * factorComision);
}

function getTotalesVenta(venta: any) {
  const resumen = venta.resumen_venta || {};

  const paresVendidos = n(resumen.total_pares_vendidos || getParesVendidosDetalle(venta));
  const totalVendido = n(resumen.total_importe_vendido || getImporteVendidoVenta(venta));
  const costo = n(resumen.total_costo_compra);
  const utilidad = n(resumen.total_utilidad);

  const paresComisionables = getParesComisionablesVenta(venta);
  const comision = getComisionVenta(venta);

  return {
    paresVendidos,
    totalVendido,
    costo,
    utilidad,
    paresComisionables,
    comision,
  };
}

function getMargen(utilidad: number, total: number): number {
  if (total <= 0) return 0;
  return round2((utilidad / total) * 100);
}

export function exportWebSalesReportExcel(data: any) {
  if (!data) return;

  const workbook = XLSX.utils.book_new();

  // ========================
  // 1. RESUMEN GENERAL
  // ========================
  let comisionGeneral = 0;
  let paresComisionablesGeneral = 0;

  (data.detalle_ventas || []).forEach((venta: any) => {
    comisionGeneral += getComisionVenta(venta);
    paresComisionablesGeneral += getParesComisionablesVenta(venta);
  });

  const resumen = [
    {
      total_pedidos: data.resumen_general?.total_pedidos || 0,
      vendidos: data.resumen_general?.pedidos_entregados || 0,
      pendientes: data.resumen_general?.pedidos_pendientes || 0,
      cancelados: data.resumen_general?.pedidos_cancelados || 0,

      pares_vendidos: data.resumen_general?.total_pares_vendidos || 0,
      pares_comisionables: paresComisionablesGeneral,

      ingresos: data.resumen_general?.total_importe_vendido || 0,
      costos: data.resumen_general?.total_costo_compra || 0,
      utilidad: data.resumen_general?.total_utilidad || 0,
      margen: data.resumen_general?.margen_utilidad_porcentaje || 0,

      comision_total: round2(comisionGeneral),
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
  const vendedores = (data.resumen_por_vendedor || []).map((v: any) => {
    let comisionVendedor = 0;
    let paresComisionablesVendedor = 0;

    (v.ventas || []).forEach((venta: any) => {
      comisionVendedor += getComisionVenta(venta);
      paresComisionablesVendedor += getParesComisionablesVenta(venta);
    });

    return {
      vendedor: v.vendedor,
      pedidos: v.total_pedidos,
      vendidos: v.pedidos_entregados,
      rechazados: v.pedidos_cancelados,

      pares_vendidos: v.total_pares_vendidos,
      pares_comisionables: paresComisionablesVendedor,

      ingresos: v.total_importe_vendido,
      costo: v.total_costo_compra,
      utilidad: v.total_utilidad,
      margen: v.margen_utilidad_porcentaje,

      comision_total: round2(comisionVendedor),
    };
  });

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(vendedores),
    'Vendedores'
  );

  // ========================
  // 3. DETALLE VENTAS GENERAL
  // ========================
  const detalle: any[] = [];

  let totalParesVendidos = 0;
  let totalVendido = 0;
  let totalCosto = 0;
  let totalUtilidad = 0;
  let totalParesComisionables = 0;
  let totalComision = 0;

  (data.resumen_por_vendedor || []).forEach((v: any) => {
    (v.ventas || []).forEach((venta: any) => {
      const totales = getTotalesVenta(venta);

      detalle.push({
        vendedor: v.vendedor,
        ticket: venta.ticket,
        cliente: venta.cliente?.nombre || '',
        dni: venta.cliente?.dni || '',
        celular: venta.cliente?.telefono || '',
        distrito: venta.cliente?.distrito || '',
        estado: venta.estado_pedido,

        pares_vendidos: totales.paresVendidos,
        pares_comisionables: totales.paresComisionables,

        total: totales.totalVendido,
        costo: totales.costo,
        utilidad: totales.utilidad,
        margen: getMargen(totales.utilidad, totales.totalVendido),

        comision: totales.comision,
      });

      totalParesVendidos += totales.paresVendidos;
      totalVendido += totales.totalVendido;
      totalCosto += totales.costo;
      totalUtilidad += totales.utilidad;
      totalParesComisionables += totales.paresComisionables;
      totalComision += totales.comision;
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
    pares_comisionables: totalParesComisionables,

    total: round2(totalVendido),
    costo: round2(totalCosto),
    utilidad: round2(totalUtilidad),
    margen: getMargen(totalUtilidad, totalVendido),

    comision: round2(totalComision),
  });

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(detalle),
    'Detalle'
  );

  // ========================
  // 4. DETALLE POR VENDEDOR
  // ========================
  (data.resumen_por_vendedor || []).forEach((v: any) => {
    const detalleVendedor: any[] = [];

    let totalPedidos = 0;
    let totalParesVendidosVendedor = 0;
    let totalParesComisionablesVendedor = 0;
    let totalVendidoVendedor = 0;
    let totalCostoVendedor = 0;
    let totalUtilidadVendedor = 0;
    let totalComisionVendedor = 0;

    const ventasOrdenadas = [...(v.ventas || [])].sort((a: any, b: any) => {
      const ticketA = Number(String(a.ticket).replace(/\D/g, ''));
      const ticketB = Number(String(b.ticket).replace(/\D/g, ''));
      return ticketA - ticketB;
    });

    ventasOrdenadas.forEach((venta: any) => {
      totalPedidos++;

      const totalesVenta = getTotalesVenta(venta);
      const esPromo = esPromocionDosPares150(venta);

      totalParesVendidosVendedor += totalesVenta.paresVendidos;
      totalParesComisionablesVendedor += totalesVenta.paresComisionables;
      totalVendidoVendedor += totalesVenta.totalVendido;
      totalCostoVendedor += totalesVenta.costo;
      totalUtilidadVendedor += totalesVenta.utilidad;
      totalComisionVendedor += totalesVenta.comision;

      // Encabezado de guía/ticket
      detalleVendedor.push({
        ticket: venta.ticket,
        fecha: venta.fecha_registro,
        cliente: venta.cliente?.nombre || '',
        dni: venta.cliente?.dni || '',
        celular: venta.cliente?.telefono || '',
        distrito: venta.cliente?.distrito || '',
        estado: venta.estado_pedido,

        codigo: '',
        producto: '',
        talla: '',
        cantidad: '',
        precio_compra_unitario: '',
        precio_venta_unitario: '',
        subtotal_registrado: '',
        importe_final: '',
        costo_compra_total: '',
        utilidad: '',
        margen: '',

        pares_comisionables: '',
        comision: '',
        observacion_comision: '',
      });

      // Detalle de artículos
      (venta.detalles || []).forEach((d: any) => {
        const cantidad = n(d.cantidad_pares);
        const precioCompra = n(d.precio_compra_unitario);
        const precioVenta = n(d.precio_venta_unitario);
        const subtotalRegistrado = n(d.subtotal_registrado);
        const importeFinal = n(d.importe_final);
        const costoCompraTotal = n(d.costo_compra_total);
        const utilidad = n(d.utilidad);
        const margen = getMargen(utilidad, importeFinal);
        const comisionLinea = getComisionLinea(venta, d);

        detalleVendedor.push({
          ticket: '',
          fecha: '',
          cliente: '',
          dni: '',
          celular: '',
          distrito: '',
          estado: d.estado_detalle || venta.estado_pedido,

          codigo: d.article_code || '',
          producto: d.article_description || '',
          talla: d.talla || '',
          cantidad,

          precio_compra_unitario: precioCompra,
          precio_venta_unitario: precioVenta,
          subtotal_registrado: subtotalRegistrado,
          importe_final: importeFinal,
          costo_compra_total: costoCompraTotal,
          utilidad,
          margen,

          pares_comisionables:
            detalleVendido(d) && !detalleDevuelto(d)
              ? round2(
                  cantidad *
                    (totalesVenta.paresVendidos > 0
                      ? totalesVenta.paresComisionables /
                        totalesVenta.paresVendidos
                      : 0),
                )
              : 0,

          comision: comisionLinea,

          observacion_comision: detalleDevuelto(d)
            ? 'NO COMISIONA - DEVUELTO'
            : !detalleVendido(d)
              ? 'NO COMISIONA'
              : esPromo
                ? 'PROMO 2 PARES 149/150 - COMISIÓN PRORRATEADA'
                : 'COMISIÓN NORMAL S/ 3 POR PAR',
        });
      });

      // Total por guía/ticket
      detalleVendedor.push({
        guia_ticket: 'TOTAL TICKET',
        ticket: venta.ticket,
        fecha: '',
        cliente: venta.cliente?.nombre || '',
        dni: '',
        celular: '',
        distrito: '',
        estado: venta.estado_pedido,

        codigo: '',
        producto: '',
        talla: '',
        cantidad: totalesVenta.paresVendidos,

        precio_compra_unitario: '',
        precio_venta_unitario: '',
        subtotal_registrado:
          venta.resumen_venta?.total_importe_registrado || 0,
        importe_final: totalesVenta.totalVendido,
        costo_compra_total: totalesVenta.costo,
        utilidad: totalesVenta.utilidad,
        margen: getMargen(totalesVenta.utilidad, totalesVenta.totalVendido),

        pares_comisionables: totalesVenta.paresComisionables,
        comision: totalesVenta.comision,
        observacion_comision: esPromo
          ? 'PROMO 2 PARES 149/150 CUENTA COMO 1 COMISIÓN'
          : 'TOTAL COMISIÓN DE LA GUÍA',
      });

      detalleVendedor.push({});
    });

    detalleVendedor.push({});

    detalleVendedor.push({
      guia_ticket: 'RESUMEN VENDEDOR',
      ticket: '',
      fecha: '',
      cliente: v.vendedor,
      dni: '',
      celular: '',
      distrito: '',
      estado: '',

      codigo: '',
      producto: '',
      talla: '',
      cantidad: totalParesVendidosVendedor,

      precio_compra_unitario: '',
      precio_venta_unitario: '',
      subtotal_registrado: '',
      importe_final: round2(totalVendidoVendedor),
      costo_compra_total: round2(totalCostoVendedor),
      utilidad: round2(totalUtilidadVendedor),
      margen: getMargen(totalUtilidadVendedor, totalVendidoVendedor),

      pares_comisionables: round2(totalParesComisionablesVendedor),
      comision: round2(totalComisionVendedor),
      observacion_comision: 'TOTAL COMISIÓN DEL VENDEDOR',
    });

    detalleVendedor.push({
      ticket: 'TOTAL PEDIDOS',
      fecha: totalPedidos,
    });

    const nombreHoja = safeSheetName(
      `Detalle_${String(v.vendedor).substring(0, 20)}`
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detalleVendedor),
      nombreHoja
    );
  });

  // ========================
  // 5. PRODUCTOS RECHAZADOS / DEVUELTOS
  // ========================
  const rechazados: any[] = [];

  (data.resumen_por_vendedor || []).forEach((v: any) => {
    (v.ventas || []).forEach((venta: any) => {
      (venta.detalles || []).forEach((d: any) => {
        if (detalleDevuelto(d)) {
          rechazados.push({
            vendedor: v.vendedor,
            ticket: venta.ticket,
            cliente: venta.cliente?.nombre || '',
            codigo: d.article_code,
            producto: d.article_description,
            talla: d.talla,
            cantidad: d.cantidad_pares,
            precio_venta: d.precio_venta_unitario,
            precio_compra: d.precio_compra_unitario,
            importe_devuelto: d.subtotal_registrado,
            motivo: 'DEVUELTO',
            comision: 0,
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
  // 6. POR DISTRITO
  // ========================
  const distritosMap: Record<string, any> = {};

  (data.resumen_por_vendedor || []).forEach((v: any) => {
    (v.ventas || []).forEach((venta: any) => {
      const distrito = venta.cliente?.distrito || 'SIN DISTRITO';
      const totalesVenta = getTotalesVenta(venta);

      if (!distritosMap[distrito]) {
        distritosMap[distrito] = {
          distrito,
          ventas: 0,
          pares_vendidos: 0,
          pares_comisionables: 0,
          total: 0,
          utilidad: 0,
          comision: 0,
        };
      }

      distritosMap[distrito].ventas += 1;
      distritosMap[distrito].pares_vendidos += totalesVenta.paresVendidos;
      distritosMap[distrito].pares_comisionables +=
        totalesVenta.paresComisionables;
      distritosMap[distrito].total += totalesVenta.totalVendido;
      distritosMap[distrito].utilidad += totalesVenta.utilidad;
      distritosMap[distrito].comision += totalesVenta.comision;
    });
  });

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(Object.values(distritosMap)),
    'Distritos'
  );

  // ========================
  // 7. COMISIONES
  // ========================
  const comisiones = (data.resumen_por_vendedor || []).map((v: any) => {
    let paresVendidos = 0;
    let paresComisionables = 0;
    let importeVendido = 0;
    let utilidad = 0;
    let comision = 0;
    let promos2x150 = 0;

    (v.ventas || []).forEach((venta: any) => {
      const totales = getTotalesVenta(venta);

      paresVendidos += totales.paresVendidos;
      paresComisionables += totales.paresComisionables;
      importeVendido += totales.totalVendido;
      utilidad += totales.utilidad;
      comision += totales.comision;

      if (esPromocionDosPares150(venta)) {
        promos2x150 += 1;
      }
    });

    return {
      vendedor: v.vendedor,
      email: v.email,
      pedidos: v.total_pedidos,
      pedidos_entregados: v.pedidos_entregados,
      pedidos_cancelados: v.pedidos_cancelados,

      pares_vendidos: paresVendidos,
      promociones_2x150: promos2x150,
      pares_comisionables: paresComisionables,

      pago_por_par: COMISION_POR_PAR,
      comision_total: round2(comision),

      importe_vendido: round2(importeVendido),
      utilidad: round2(utilidad),
    };
  });

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(comisiones),
    'Comisiones'
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