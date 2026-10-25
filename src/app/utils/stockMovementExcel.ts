import * as XLSX from 'xlsx';

import type { StockMovementRow } from '../movements/types';

type ExportParams = {
  movements: StockMovementRow[];
  warehouseName: string;
  startDate: string;
  endDate: string;
};

type EntryGroup = {
  guide: string;
  referenceType: string;
  articleCode: string;
  description: string;
  sizes: Map<string, number>;
  total: number;
  movementCount: number;
  dates: string[];
  users: Set<string>;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isStockEntry = (row: StockMovementRow) =>
  String(row.movement?.direction ?? '').toUpperCase() === 'INGRESO' ||
  toNumber(row.movement?.quantity) > 0;

export const getStockEntryQuantity = (row: StockMovementRow) =>
  Math.abs(toNumber(row.movement?.absolute_quantity ?? row.movement?.quantity));

const formatDateTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const formatDateOnly = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : value;
};

const compareSizes = (a: string, b: string) =>
  a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

const safeFilePart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Almacen';

export function buildStockEntryReportData(movements: StockMovementRow[]) {
  const entries = movements.filter(isStockEntry);
  const allSizes = Array.from(
    new Set(
      entries
        .map((row) => String(row.size?.value ?? '').trim())
        .filter(Boolean),
    ),
  ).sort(compareSizes);
  const groups = new Map<string, EntryGroup>();

  for (const row of entries) {
    const guide = String(row.reference?.reference ?? '').trim() || 'SIN GUÍA';
    const articleCode =
      String(row.product?.article_code ?? '').trim() || 'SIN CÓDIGO';
    const productKey = row.product?.id
      ? 'product:' + row.product.id
      : 'article:' + articleCode.toUpperCase();
    const key = guide.toUpperCase() + '|' + productKey;
    const size = String(row.size?.value ?? '').trim() || 'SIN TALLA';
    const quantity = getStockEntryQuantity(row);
    const userName =
      String(row.user?.full_name ?? '').trim() || 'Sin usuario';
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        guide,
        referenceType: String(row.reference?.reference_type ?? '').trim(),
        articleCode,
        description:
          String(row.product?.article_description ?? '').trim() ||
          'Sin descripción',
        sizes: new Map([[size, quantity]]),
        total: quantity,
        movementCount: 1,
        dates: row.created_at ? [row.created_at] : [],
        users: new Set([userName]),
      });
      continue;
    }

    existing.sizes.set(size, (existing.sizes.get(size) ?? 0) + quantity);
    existing.total += quantity;
    existing.movementCount += 1;
    if (row.created_at) existing.dates.push(row.created_at);
    existing.users.add(userName);
  }

  const productRows = Array.from(groups.values())
    .map((group) => {
      const dates = [...group.dates].sort();
      const sizeKeys = allSizes.length
        ? allSizes
        : Array.from(group.sizes.keys()).sort(compareSizes);
      return {
        Guia: group.guide,
        TipoReferencia: group.referenceType,
        FechaPrimerIngreso: formatDateTime(dates[0] ?? ''),
        FechaUltimoIngreso: formatDateTime(dates.at(-1) ?? ''),
        CodigoArticulo: group.articleCode,
        Descripcion: group.description,
        TallasCantidades: sizeKeys
          .map((size) => size + '/' + (group.sizes.get(size) || ''))
          .join(' '),
        TotalIngresado: group.total,
        Movimientos: group.movementCount,
        Usuarios: Array.from(group.users).sort().join(', '),
      };
    })
    .sort(
      (a, b) =>
        a.Guia.localeCompare(b.Guia, 'es', { numeric: true }) ||
        a.CodigoArticulo.localeCompare(b.CodigoArticulo, 'es', {
          numeric: true,
        }),
    );

  const guideGroups = new Map<
    string,
    { articles: Set<string>; movements: number; total: number }
  >();
  for (const row of productRows) {
    const group = guideGroups.get(row.Guia) ?? {
      articles: new Set<string>(),
      movements: 0,
      total: 0,
    };
    group.articles.add(row.CodigoArticulo);
    group.movements += row.Movimientos;
    group.total += row.TotalIngresado;
    guideGroups.set(row.Guia, group);
  }
  const guideRows = Array.from(guideGroups.entries())
    .map(([guide, group]) => ({
      Guia: guide,
      Articulos: group.articles.size,
      Movimientos: group.movements,
      TotalIngresado: group.total,
    }))
    .sort((a, b) => a.Guia.localeCompare(b.Guia, 'es', { numeric: true }));

  const detailRows = entries.map((row) => ({
    Fecha: formatDateTime(row.created_at),
    Guia: String(row.reference?.reference ?? '').trim() || 'SIN GUÍA',
    TipoReferencia: String(row.reference?.reference_type ?? ''),
    CodigoArticulo:
      String(row.product?.article_code ?? '').trim() || 'SIN CÓDIGO',
    Descripcion:
      String(row.product?.article_description ?? '').trim() ||
      'Sin descripción',
    Talla: String(row.size?.value ?? '').trim() || 'SIN TALLA',
    CantidadIngresada: getStockEntryQuantity(row),
    Unidad: String(row.movement?.unit_of_measure ?? ''),
    Usuario: String(row.user?.full_name ?? '').trim() || 'Sin usuario',
    Notas: String(row.reference?.notes ?? ''),
  }));

  return {
    entries,
    productRows,
    guideRows,
    detailRows,
    totalEntered: productRows.reduce(
      (total, row) => total + row.TotalIngresado,
      0,
    ),
  };
}

const configureSheet = (
  sheet: XLSX.WorkSheet,
  widths: number[],
  rows: number,
) => {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
  if (rows > 0) {
    sheet['!autofilter'] = {
      ref: XLSX.utils.encode_range(
        { r: 0, c: 0 },
        { r: rows, c: widths.length - 1 },
      ),
    };
  }
};

export function exportStockEntryReportExcel({
  movements,
  warehouseName,
  startDate,
  endDate,
}: ExportParams) {
  const report = buildStockEntryReportData(movements);
  if (!report.entries.length) {
    throw new Error(
      'No existen movimientos de ingreso para exportar en este rango.',
    );
  }

  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: 'Ingresos de stock - ' + warehouseName,
    Subject: 'Ingresos por guía, artículo y talla',
    Author: 'VERCO',
    CreatedDate: new Date(),
  };

  const summary = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE INGRESOS DE STOCK'],
    ['Almacén', warehouseName],
    ['Fecha inicio', formatDateOnly(startDate)],
    ['Fecha fin', formatDateOnly(endDate)],
    ['Total ingresado', report.totalEntered],
    ['Guías', report.guideRows.length],
    ['Artículos por guía', report.productRows.length],
    ['Movimientos de ingreso', report.entries.length],
    [],
    ['Guía', 'Artículos', 'Movimientos', 'Total ingresado'],
    ...report.guideRows.map((row) => [
      row.Guia,
      row.Articulos,
      row.Movimientos,
      row.TotalIngresado,
    ]),
  ]);
  summary['!cols'] = [
    { wch: 30 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, summary, 'Resumen');

  const productSheetRows = report.productRows.map((row) => ({
    Guía: row.Guia,
    'Tipo de referencia': row.TipoReferencia,
    'Primer ingreso': row.FechaPrimerIngreso,
    'Último ingreso': row.FechaUltimoIngreso,
    'Código de artículo': row.CodigoArticulo,
    Descripción: row.Descripcion,
    'Tallas / cantidades': row.TallasCantidades,
    'Total ingresado': row.TotalIngresado,
    Movimientos: row.Movimientos,
    Usuarios: row.Usuarios,
  }));
  const products = XLSX.utils.json_to_sheet(productSheetRows);
  configureSheet(
    products,
    [18, 18, 22, 22, 18, 48, 52, 16, 14, 28],
    report.productRows.length,
  );
  XLSX.utils.book_append_sheet(workbook, products, 'Ingresos por guía');

  const detailSheetRows = report.detailRows.map((row) => ({
    Fecha: row.Fecha,
    Guía: row.Guia,
    'Tipo de referencia': row.TipoReferencia,
    'Código de artículo': row.CodigoArticulo,
    Descripción: row.Descripcion,
    Talla: row.Talla,
    'Cantidad ingresada': row.CantidadIngresada,
    Unidad: row.Unidad,
    Usuario: row.Usuario,
    Notas: row.Notas,
  }));
  const detail = XLSX.utils.json_to_sheet(detailSheetRows);
  configureSheet(
    detail,
    [22, 18, 18, 18, 48, 12, 18, 12, 28, 38],
    report.detailRows.length,
  );
  XLSX.utils.book_append_sheet(workbook, detail, 'Detalle de ingresos');

  const fileName = [
    'Ingresos_Stock',
    safeFilePart(warehouseName),
    startDate,
    endDate,
  ].join('_');
  XLSX.writeFile(workbook, fileName + '.xlsx', { compression: true });
}
