import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Cambia este valor si manejas comisión por porcentaje de utilidad.
 * Ejemplo:
 * 0.05 = 5% de la utilidad
 * 0.10 = 10% de la utilidad
 */
const COMISION_RATE = 0;

type RowValue = string | number | null | undefined;

function n(value: any): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function cleanSheetName(name: string) {
    return String(name || 'Hoja')
        .replace(/[\\/:*?\[\]]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 31);
}

function uniqueSheetName(baseName: string, used: Set<string>) {
    let name = cleanSheetName(baseName);
    let finalName = name;
    let index = 1;

    while (used.has(finalName)) {
        const suffix = `_${index}`;
        finalName = cleanSheetName(name.substring(0, 31 - suffix.length) + suffix);
        index++;
    }

    used.add(finalName);
    return finalName;
}

function formatDate(value: any): string {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString('es-PE');
}

function getGuiaVenta(v: any): string {
    return (
        v.guia_interna ||
        v.guia ||
        v.numero_guia ||
        v.id_guia_interna ||
        v.envio?.codigo_envio ||
        v.ticket ||
        ''
    );
}

function getClienteNombre(v: any): string {
    return v.cliente?.nombre || v.cliente?.business_name || 'Sin cliente';
}

function getClienteDocumento(v: any): string {
    return v.cliente?.dni || v.cliente?.ruc || v.cliente?.documento || '';
}

function getVendedorNombre(v: any): string {
    return v.vendedor?.nombre || v.vendedor || 'Sin vendedor';
}

function getVendedorId(v: any): string {
    return String(v.vendedor?.id || v.vendedor_id || getVendedorNombre(v));
}

function getEstadoDetalle(d: any): string {
    if (d.estado_detalle) return d.estado_detalle;
    if (d.vendido) return 'VENDIDO';
    if (d.devuelto) return 'DEVUELTO';
    if (d.pendiente) return 'PENDIENTE';
    return '';
}

function getPrecioCompra(d: any): number {
    return n(d.precio_compra_unitario);
}

function getPrecioVenta(d: any): number {
    return n(d.precio_venta_unitario);
}

function getCantidad(d: any): number {
    return n(d.cantidad_pares);
}

function getSubtotalRegistrado(d: any): number {
    const fromApi = n(d.subtotal_registrado);
    if (fromApi > 0) return fromApi;

    return round2(getCantidad(d) * getPrecioVenta(d));
}

function getImporteFinal(d: any): number {
    if (d.importe_final !== undefined && d.importe_final !== null) {
        return n(d.importe_final);
    }

    if (d.vendido) {
        return getSubtotalRegistrado(d);
    }

    return 0;
}

function getCostoTotal(d: any): number {
    if (d.costo_compra_total !== undefined && d.costo_compra_total !== null) {
        return n(d.costo_compra_total);
    }

    if (d.vendido) {
        return round2(getCantidad(d) * getPrecioCompra(d));
    }

    return 0;
}

function getUtilidad(d: any): number {
    if (d.utilidad !== undefined && d.utilidad !== null) {
        return n(d.utilidad);
    }

    return round2(getImporteFinal(d) - getCostoTotal(d));
}

function getMargen(utilidad: number, importe: number): number {
    if (importe <= 0) return 0;
    return round2((utilidad / importe) * 100);
}

function addSheet(
    workbook: XLSX.WorkBook,
    name: string,
    rows: RowValue[][],
    widths?: number[],
) {
    const ws = XLSX.utils.aoa_to_sheet(rows);

    if (widths?.length) {
        ws['!cols'] = widths.map((wch) => ({ wch }));
    }

    XLSX.utils.book_append_sheet(workbook, ws, name);

    return ws;
}

function applyMoneyFormat(
    ws: XLSX.WorkSheet,
    columnIndexes: number[],
    startRow = 0,
) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

    for (let r = startRow; r <= range.e.r; r++) {
        for (const c of columnIndexes) {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            const cell = ws[cellRef];

            if (cell && typeof cell.v === 'number') {
                cell.z = '"S/ "#,##0.00';
            }
        }
    }
}

function applyNumberFormat(
    ws: XLSX.WorkSheet,
    columnIndexes: number[],
    startRow = 0,
) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

    for (let r = startRow; r <= range.e.r; r++) {
        for (const c of columnIndexes) {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            const cell = ws[cellRef];

            if (cell && typeof cell.v === 'number') {
                cell.z = '#,##0';
            }
        }
    }
}

function applyPercentFormat(
    ws: XLSX.WorkSheet,
    columnIndexes: number[],
    startRow = 0,
) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

    for (let r = startRow; r <= range.e.r; r++) {
        for (const c of columnIndexes) {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            const cell = ws[cellRef];

            if (cell && typeof cell.v === 'number') {
                cell.z = '0.00"%"';
            }
        }
    }
}

function buildDetalleArticulos(data: any) {
    const rows: any[] = [];

    (data.detalle_ventas || []).forEach((venta: any) => {
        const guia = getGuiaVenta(venta);
        const vendedor = getVendedorNombre(venta);
        const cliente = getClienteNombre(venta);
        const documento = getClienteDocumento(venta);

        (venta.detalles || []).forEach((d: any) => {
            const cantidad = getCantidad(d);
            const precioCompra = getPrecioCompra(d);
            const precioVenta = getPrecioVenta(d);
            const diferenciaUnitaria = round2(precioVenta - precioCompra);

            const subtotalRegistrado = getSubtotalRegistrado(d);
            const importeFinal = getImporteFinal(d);
            const costoTotal = getCostoTotal(d);
            const utilidad = getUtilidad(d);
            const margen = getMargen(utilidad, importeFinal);

            rows.push({
                vendedor_id: venta.vendedor?.id || '',
                vendedor,
                guia,
                fecha: formatDate(venta.fecha_registro),
                estado_pedido: venta.estado_pedido || '',

                cliente,
                documento,
                telefono: venta.cliente?.telefono || '',
                distrito: venta.cliente?.distrito || '',

                codigo: d.article_code || '',
                articulo: d.article_description || '',
                talla: d.talla || '',

                cantidad_pares: cantidad,
                precio_compra_unitario: precioCompra,
                precio_venta_unitario: precioVenta,
                diferencia_unitaria: diferenciaUnitaria,

                subtotal_registrado: subtotalRegistrado,
                importe_final: importeFinal,
                costo_compra_total: costoTotal,
                utilidad,
                margen_porcentaje: margen,

                base_comision: utilidad,
                comision_calculada: round2(utilidad * COMISION_RATE),

                estado_detalle: getEstadoDetalle(d),
            });
        });
    });

    return rows;
}

function buildGuias(data: any) {
    const rows: any[] = [];

    (data.detalle_ventas || []).forEach((v: any) => {
        const resumen = v.resumen_venta || {};
        const importeVendido = n(resumen.total_importe_vendido);
        const costoCompra = n(resumen.total_costo_compra);
        const utilidad = n(resumen.total_utilidad);

        rows.push({
            vendedor_id: v.vendedor?.id || '',
            vendedor: getVendedorNombre(v),

            guia: getGuiaVenta(v),
            fecha: formatDate(v.fecha_registro),
            estado: v.estado_pedido || '',

            cliente: getClienteNombre(v),
            documento: getClienteDocumento(v),
            telefono: v.cliente?.telefono || '',
            distrito: v.cliente?.distrito || '',

            total_articulos: (v.detalles || []).length,

            pares_registrados: n(resumen.total_pares_registrados),
            pares_vendidos: n(resumen.total_pares_vendidos),
            pares_pendientes: n(resumen.total_pares_pendientes),
            pares_devueltos: n(resumen.total_pares_devueltos),

            importe_registrado: n(resumen.total_importe_registrado),
            importe_vendido: importeVendido,
            importe_pendiente: n(resumen.total_importe_pendiente),
            importe_devuelto: n(resumen.total_importe_devuelto),

            costo_compra: costoCompra,
            utilidad,
            margen_porcentaje: getMargen(utilidad, importeVendido),

            base_comision: utilidad,
            comision_calculada: round2(utilidad * COMISION_RATE),
        });
    });

    return rows;
}

function buildComisionesPorVendedor(guias: any[]) {
    const map = new Map<string, any>();

    guias.forEach((g) => {
        const key = String(g.vendedor_id || g.vendedor);

        if (!map.has(key)) {
            map.set(key, {
                vendedor_id: g.vendedor_id,
                vendedor: g.vendedor,

                total_guias: 0,
                clientes_unicos: new Set<string>(),

                pares_registrados: 0,
                pares_vendidos: 0,
                pares_devueltos: 0,

                importe_registrado: 0,
                importe_vendido: 0,
                costo_compra: 0,
                utilidad: 0,

                margen_porcentaje: 0,
                base_comision: 0,
                comision_calculada: 0,
            });
        }

        const item = map.get(key);

        item.total_guias += 1;
        item.clientes_unicos.add(String(g.documento || g.cliente));

        item.pares_registrados += n(g.pares_registrados);
        item.pares_vendidos += n(g.pares_vendidos);
        item.pares_devueltos += n(g.pares_devueltos);

        item.importe_registrado += n(g.importe_registrado);
        item.importe_vendido += n(g.importe_vendido);
        item.costo_compra += n(g.costo_compra);
        item.utilidad += n(g.utilidad);

        item.base_comision += n(g.base_comision);
        item.comision_calculada += n(g.comision_calculada);
    });

    return Array.from(map.values()).map((v) => ({
        vendedor_id: v.vendedor_id,
        vendedor: v.vendedor,

        total_guias: v.total_guias,
        clientes_unicos: v.clientes_unicos.size,

        pares_registrados: v.pares_registrados,
        pares_vendidos: v.pares_vendidos,
        pares_devueltos: v.pares_devueltos,

        importe_registrado: round2(v.importe_registrado),
        importe_vendido: round2(v.importe_vendido),
        costo_compra: round2(v.costo_compra),
        utilidad: round2(v.utilidad),

        margen_porcentaje: getMargen(v.utilidad, v.importe_vendido),

        base_comision: round2(v.base_comision),
        porcentaje_comision: COMISION_RATE * 100,
        comision_calculada: round2(v.comision_calculada),
    }));
}

function objectRowsToAoa(items: any[], headers: { key: string; label: string }[]) {
    const rows: RowValue[][] = [];

    rows.push(headers.map((h) => h.label));

    items.forEach((item) => {
        rows.push(headers.map((h) => item[h.key]));
    });

    return rows;
}

function groupByVendedor(data: any) {
    const map = new Map<string, any>();

    (data.detalle_ventas || []).forEach((venta: any) => {
        const key = getVendedorId(venta);

        if (!map.has(key)) {
            map.set(key, {
                vendedor_id: venta.vendedor?.id || '',
                vendedor: getVendedorNombre(venta),
                email: venta.vendedor?.email || '',
                ventas: [],
            });
        }

        map.get(key).ventas.push(venta);
    });

    return Array.from(map.values());
}

export function exportWholesaleSalesReportExcel(data: any) {
    if (!data) return;

    const workbook = XLSX.utils.book_new();
    workbook.Props = {
        Title: 'Reporte Venta por Mayor',
        Subject: 'Reporte para comisiones',
        Author: 'Sistema de Ventas',
        CreatedDate: new Date(),
    };

    const usedSheetNames = new Set<string>();

    const detalleArticulos = buildDetalleArticulos(data);
    const guias = buildGuias(data);
    const comisiones = buildComisionesPorVendedor(guias);

    // ========================
    // 1. RESUMEN GENERAL
    // ========================
    const rg = data.resumen_general || {};

    const resumenRows: RowValue[][] = [
        ['REPORTE DE VENTA POR MAYOR'],
        [],
        ['Filtros'],
        ['Fecha inicio', data.filtros?.fecha_inicio || ''],
        ['Fecha fin', data.filtros?.fecha_fin || ''],
        ['Vendedor ID', data.filtros?.vendedor_id || 'TODOS'],
        [],
        ['KPI', 'Valor'],
        ['Total pedidos / guías', n(rg.total_pedidos)],
        ['Pedidos pendientes', n(rg.pedidos_pendientes)],
        ['Pedidos aprobados', n(rg.pedidos_aprobados)],
        ['Pedidos despachados', n(rg.pedidos_despachados)],
        ['Pedidos entregados', n(rg.pedidos_entregados)],
        ['Pedidos cancelados', n(rg.pedidos_cancelados)],
        [],
        ['Pares registrados', n(rg.total_pares_registrados)],
        ['Pares vendidos', n(rg.total_pares_vendidos)],
        ['Pares pendientes', n(rg.total_pares_pendientes)],
        ['Pares devueltos', n(rg.total_pares_devueltos)],
        [],
        ['Importe registrado', n(rg.total_importe_registrado)],
        ['Importe vendido', n(rg.total_importe_vendido)],
        ['Importe pendiente', n(rg.total_importe_pendiente)],
        ['Importe devuelto', n(rg.total_importe_devuelto)],
        ['Costo compra', n(rg.total_costo_compra)],
        ['Utilidad / diferencia total', n(rg.total_utilidad)],
        ['Margen utilidad %', n(rg.margen_utilidad_porcentaje)],
        [],
        ['Configuración de comisión'],
        ['Porcentaje comisión sobre utilidad', COMISION_RATE * 100],
    ];

    const resumenSheetName = uniqueSheetName('Resumen', usedSheetNames);
    const wsResumen = addSheet(workbook, resumenSheetName, resumenRows, [32, 22, 18, 18]);
    applyMoneyFormat(wsResumen, [1], 19);
    applyPercentFormat(wsResumen, [1], 26);

    // ========================
    // 2. COMISIONES POR VENDEDOR
    // ========================
    const comisionHeaders = [
        { key: 'vendedor_id', label: 'ID Vendedor' },
        { key: 'vendedor', label: 'Vendedor' },
        { key: 'total_guias', label: 'Total Guías' },
        { key: 'clientes_unicos', label: 'Clientes Únicos' },
        { key: 'pares_registrados', label: 'Pares Registrados' },
        { key: 'pares_vendidos', label: 'Pares Vendidos' },
        { key: 'pares_devueltos', label: 'Pares Devueltos' },
        { key: 'importe_registrado', label: 'Importe Registrado' },
        { key: 'importe_vendido', label: 'Importe Vendido' },
        { key: 'costo_compra', label: 'Costo Compra' },
        { key: 'utilidad', label: 'Utilidad / Diferencia' },
        { key: 'margen_porcentaje', label: 'Margen %' },
        { key: 'base_comision', label: 'Base Comisión' },
        { key: 'porcentaje_comision', label: '% Comisión' },
        { key: 'comision_calculada', label: 'Comisión Calculada' },
    ];

    const comisionesRows: RowValue[][] = [
        ['COMISIONES POR VENDEDOR'],
        [],
        ...objectRowsToAoa(comisiones, comisionHeaders),
    ];

    const wsComisiones = addSheet(
        workbook,
        uniqueSheetName('Comisiones', usedSheetNames),
        comisionesRows,
        [12, 28, 14, 16, 18, 16, 16, 18, 18, 16, 20, 12, 18, 14, 18],
    );

    applyNumberFormat(wsComisiones, [2, 3, 4, 5, 6], 3);
    applyMoneyFormat(wsComisiones, [7, 8, 9, 10, 12, 14], 3);
    applyPercentFormat(wsComisiones, [11, 13], 3);

    // ========================
    // 3. GUÍAS CONSOLIDADAS
    // ========================
    const guiasHeaders = [
        { key: 'vendedor_id', label: 'ID Vendedor' },
        { key: 'vendedor', label: 'Vendedor' },
        { key: 'guia', label: 'Guía' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'estado', label: 'Estado' },

        { key: 'cliente', label: 'Cliente' },
        { key: 'documento', label: 'Documento' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'distrito', label: 'Distrito' },

        { key: 'total_articulos', label: 'Total Artículos' },
        { key: 'pares_registrados', label: 'Pares Registrados' },
        { key: 'pares_vendidos', label: 'Pares Vendidos' },
        { key: 'pares_pendientes', label: 'Pares Pendientes' },
        { key: 'pares_devueltos', label: 'Pares Devueltos' },

        { key: 'importe_registrado', label: 'Importe Registrado' },
        { key: 'importe_vendido', label: 'Importe Vendido' },
        { key: 'importe_pendiente', label: 'Importe Pendiente' },
        { key: 'importe_devuelto', label: 'Importe Devuelto' },

        { key: 'costo_compra', label: 'Costo Compra' },
        { key: 'utilidad', label: 'Utilidad / Diferencia' },
        { key: 'margen_porcentaje', label: 'Margen %' },
        { key: 'base_comision', label: 'Base Comisión' },
        { key: 'comision_calculada', label: 'Comisión Calculada' },
    ];

    const guiasRows: RowValue[][] = [
        ['GUÍAS CONSOLIDADAS'],
        [],
        ...objectRowsToAoa(guias, guiasHeaders),
    ];

    const wsGuias = addSheet(
        workbook,
        uniqueSheetName('Guias', usedSheetNames),
        guiasRows,
        [
            12, 28, 18, 18, 12, 14,
            34, 16, 16, 18,
            16, 18, 16, 18, 18,
            18, 18, 18, 18,
            16, 20, 12, 18, 18,
        ],
    );

    applyNumberFormat(wsGuias, [10, 11, 12, 13, 14], 3);
    applyMoneyFormat(wsGuias, [15, 16, 17, 18, 19, 20, 22, 23], 3);
    applyPercentFormat(wsGuias, [21], 3);

    // ========================
    // 4. DETALLE GENERAL DE ARTÍCULOS
    // ========================
    const detalleHeaders = [
        { key: 'vendedor_id', label: 'ID Vendedor' },
        { key: 'vendedor', label: 'Vendedor' },
        { key: 'guia', label: 'Guía' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'estado_pedido', label: 'Estado Pedido' },

        { key: 'cliente', label: 'Cliente' },
        { key: 'documento', label: 'Documento' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'distrito', label: 'Distrito' },

        { key: 'codigo', label: 'Código' },
        { key: 'articulo', label: 'Artículo' },
        { key: 'talla', label: 'Talla' },

        { key: 'cantidad_pares', label: 'Cantidad Pares' },
        { key: 'precio_compra_unitario', label: 'Precio Compra Unit.' },
        { key: 'precio_venta_unitario', label: 'Precio Venta Unit.' },
        { key: 'diferencia_unitaria', label: 'Diferencia Unit.' },

        { key: 'subtotal_registrado', label: 'Subtotal Registrado' },
        { key: 'importe_final', label: 'Importe Final' },
        { key: 'costo_compra_total', label: 'Costo Compra Total' },
        { key: 'utilidad', label: 'Utilidad / Diferencia' },
        { key: 'margen_porcentaje', label: 'Margen %' },

        { key: 'base_comision', label: 'Base Comisión' },
        { key: 'comision_calculada', label: 'Comisión Calculada' },
        { key: 'estado_detalle', label: 'Estado Detalle' },
    ];

    const detalleRows: RowValue[][] = [
        ['DETALLE GENERAL DE ARTÍCULOS'],
        [],
        ...objectRowsToAoa(detalleArticulos, detalleHeaders),
    ];

    const wsDetalle = addSheet(
        workbook,
        uniqueSheetName('Detalle Articulos', usedSheetNames),
        detalleRows,
        [
            12, 28, 18, 18, 12, 16,
            34, 16, 16, 18,
            14, 46, 16, 16, 16, 10,
            16, 18, 18, 18,
            20, 16, 20, 20, 12,
            18, 18, 16,
        ],
    );

    applyNumberFormat(wsDetalle, [16], 3);
    applyMoneyFormat(wsDetalle, [17, 18, 19, 20, 21, 22, 23, 25, 26], 3);
    applyPercentFormat(wsDetalle, [24], 3);

    // ========================
    // 5. HOJAS POR VENDEDOR
    // ========================
    const vendedores = groupByVendedor(data);

    vendedores.forEach((seller) => {
        const rows: RowValue[][] = [];

        rows.push(['REPORTE POR VENDEDOR']);
        rows.push([]);
        rows.push(['Vendedor', seller.vendedor]);
        rows.push(['Fecha inicio', data.filtros?.fecha_inicio || '']);
        rows.push(['Fecha fin', data.filtros?.fecha_fin || '']);
        rows.push([]);

        let vendedorParesRegistrados = 0;
        let vendedorParesVendidos = 0;
        let vendedorImporteVendido = 0;
        let vendedorCostoCompra = 0;
        let vendedorUtilidad = 0;
        let vendedorBaseComision = 0;
        let vendedorComision = 0;

        seller.ventas.forEach((venta: any) => {
            const resumen = venta.resumen_venta || {};

            const guia = getGuiaVenta(venta);
            const cliente = getClienteNombre(venta);
            const documento = getClienteDocumento(venta);
            const fecha = formatDate(venta.fecha_registro);
            const estado = venta.estado_pedido || '';

            const paresRegistrados = n(resumen.total_pares_registrados);
            const paresVendidos = n(resumen.total_pares_vendidos);
            const importeVendido = n(resumen.total_importe_vendido);
            const costoCompra = n(resumen.total_costo_compra);
            const utilidad = n(resumen.total_utilidad);
            const margen = getMargen(utilidad, importeVendido);
            const baseComision = utilidad;
            const comision = round2(baseComision * COMISION_RATE);

            vendedorParesRegistrados += paresRegistrados;
            vendedorParesVendidos += paresVendidos;
            vendedorImporteVendido += importeVendido;
            vendedorCostoCompra += costoCompra;
            vendedorUtilidad += utilidad;
            vendedorBaseComision += baseComision;
            vendedorComision += comision;

            rows.push(['GUÍA', guia, 'FECHA', fecha, 'ESTADO', estado]);
            rows.push(['CLIENTE', cliente, 'DOCUMENTO', documento, 'TELÉFONO', venta.cliente?.telefono || '']);
            rows.push([]);

            rows.push([
                'Código',
                'Artículo',
                'Talla',
                'Cantidad',
                'P. Compra Unit.',
                'P. Venta Unit.',
                'Dif. Unit.',
                'Subtotal Reg.',
                'Importe Final',
                'Costo Total',
                'Utilidad',
                'Margen %',
                'Estado',
            ]);

            (venta.detalles || []).forEach((d: any) => {
                const cantidad = getCantidad(d);
                const precioCompra = getPrecioCompra(d);
                const precioVenta = getPrecioVenta(d);
                const diferenciaUnitaria = round2(precioVenta - precioCompra);

                const subtotalRegistrado = getSubtotalRegistrado(d);
                const importeFinal = getImporteFinal(d);
                const costoTotal = getCostoTotal(d);
                const utilidadLinea = getUtilidad(d);
                const margenLinea = getMargen(utilidadLinea, importeFinal);

                rows.push([
                    d.article_code || '',
                    d.article_description || '',
                    d.talla || '',
                    cantidad,
                    '',
                    precioVenta,
                    diferenciaUnitaria,
                    subtotalRegistrado,
                    importeFinal,
                    costoTotal,
                    utilidadLinea,
                    margenLinea,
                    getEstadoDetalle(d),
                ]);
            });

            rows.push([
                'TOTAL GUÍA',
                '',
                '',
                '',
                '',
                '',
                paresVendidos,
                '',
                '',
                '',
                n(resumen.total_importe_registrado),
                importeVendido,
                costoCompra,
                utilidad,
                margen,
                '',
            ]);

            rows.push([
                'BASE COMISIÓN GUÍA',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                baseComision,
                COMISION_RATE * 100,
                comision,
            ]);

            rows.push([]);
            rows.push([]);
        });

        rows.push(['RESUMEN TOTAL VENDEDOR']);
        rows.push([
            'Vendedor',
            'Total Guías',
            'Pares Registrados',
            'Pares Vendidos',
            'Importe Vendido',
            'Costo Compra',
            'Utilidad / Diferencia',
            'Margen %',
            'Base Comisión',
            '% Comisión',
            'Comisión Calculada',
        ]);

        rows.push([
            seller.vendedor,
            seller.ventas.length,
            vendedorParesRegistrados,
            vendedorParesVendidos,
            round2(vendedorImporteVendido),
            round2(vendedorCostoCompra),
            round2(vendedorUtilidad),
            getMargen(vendedorUtilidad, vendedorImporteVendido),
            round2(vendedorBaseComision),
            COMISION_RATE * 100,
            round2(vendedorComision),
        ]);

        const sheetName = uniqueSheetName(`Vend_${seller.vendedor}`, usedSheetNames);

        const wsSeller = addSheet(
            workbook,
            sheetName,
            rows,
            [
                18, 46, 16, 16, 16, 12,
                14, 18, 18, 18, 18, 18, 18, 18, 12, 18,
            ],
        );

        applyNumberFormat(wsSeller, [6], 0);
        applyMoneyFormat(wsSeller, [7, 8, 9, 10, 11, 12, 13, 15], 0);
        applyPercentFormat(wsSeller, [14], 0);
    });

    // ========================
    // 6. PRODUCTOS
    // ========================
    const productosRows: RowValue[][] = [
        ['RESUMEN POR PRODUCTO'],
        [],
        [
            'Código',
            'Descripción',
            'Precio Compra',
            'Precio Venta Prom.',
            'Pares Registrados',
            'Pares Vendidos',
            'Pares Pendientes',
            'Pares Devueltos',
            'Importe Vendido',
            'Costo Compra',
            'Utilidad',
            'Margen %',
        ],
    ];

    (data.resumen_por_producto || []).forEach((p: any) => {
        productosRows.push([
            p.article_code || '',
            p.article_description || '',
            n(''),
            n(p.precio_venta_promedio),
            n(p.total_pares_registrados),
            n(p.total_pares_vendidos),
            n(p.total_pares_pendientes),
            n(p.total_pares_devueltos),
            n(p.total_importe_vendido),
            n(p.total_costo_compra),
            n(p.total_utilidad),
            n(p.margen_utilidad_porcentaje),
        ]);
    });

    const wsProductos = addSheet(
        workbook,
        uniqueSheetName('Productos', usedSheetNames),
        productosRows,
        [14, 46, 16, 16, 16, 16, 18, 18, 16, 18, 18, 18, 16, 16, 12],
    );

    applyNumberFormat(wsProductos, [7, 8, 9, 10], 3);
    applyMoneyFormat(wsProductos, [5, 6, 11, 12, 13], 3);
    applyPercentFormat(wsProductos, [14], 3);

    // ========================
    // 7. TALLAS
    // ========================
    const tallasRows: RowValue[][] = [
        ['RESUMEN POR TALLA'],
        [],
        [
            'Talla',
            'Pares Registrados',
            'Pares Vendidos',
            'Pares Pendientes',
            'Pares Devueltos',
            'Importe Vendido',
            'Utilidad',
        ],
    ];

    (data.resumen_por_talla || []).forEach((t: any) => {
        tallasRows.push([
            t.talla || '',
            n(t.total_pares_registrados),
            n(t.total_pares_vendidos),
            n(t.total_pares_pendientes),
            n(t.total_pares_devueltos),
            n(t.total_importe_vendido),
            n(t.total_utilidad),
        ]);
    });

    const wsTallas = addSheet(
        workbook,
        uniqueSheetName('Tallas', usedSheetNames),
        tallasRows,
        [14, 18, 18, 18, 18, 18, 18],
    );

    applyNumberFormat(wsTallas, [1, 2, 3, 4], 3);
    applyMoneyFormat(wsTallas, [5, 6], 3);

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

    saveAs(file, `REPORTE_VENTA_POR_MAYOR_${Date.now()}.xlsx`);
}