import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type {
  AdjustmentReason,
  InventoryAdjustmentResult,
} from '../services/inventoryAdjustmentService';

export const adjustmentReasonLabels: Record<AdjustmentReason, string> = {
  PHYSICAL_COUNT: 'Conteo físico',
  DATA_ENTRY_CORRECTION: 'Corrección de digitación',
  DAMAGED_PRODUCT: 'Producto dañado',
  LOSS_SHRINKAGE: 'Pérdida o merma',
  RETURN: 'Devolución',
  UNREGISTERED_TRANSFER: 'Transferencia no registrada',
  INVENTORY_REGULARIZATION: 'Regularización de inventario',
  OTHER: 'Otro',
};

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
}

function baseName(result: InventoryAdjustmentResult) {
  const date = result.operation.business_date.replaceAll('-', '');
  return `Ajuste_Inventario_${safeName(result.operation.warehouse_name)}_${result.operation.operation_code}_${date}`;
}

function shareText(result: InventoryAdjustmentResult) {
  return `Se comparte el reporte de actualización de inventario del almacén ${result.operation.warehouse_name}, operación ${result.operation.operation_code}, realizado el ${result.operation.occurred_at_lima} por ${result.operation.user_name_snapshot}. Motivo: ${adjustmentReasonLabels[result.operation.reason_code]}.`;
}

export function createAdjustmentExcel(result: InventoryAdjustmentResult) {
  const metadata = [
    ['REPORTE DE ACTUALIZACIÓN DE INVENTARIO'],
    ['Operación', result.operation.operation_code],
    ['Fecha y hora Perú', result.operation.occurred_at_lima],
    ['Usuario', result.operation.user_name_snapshot],
    ['Rol', result.operation.role_snapshot],
    ['Almacén', result.operation.warehouse_name],
    ['Tipo / sede', result.operation.warehouse_type || 'Sin tipo'],
    ['Motivo', adjustmentReasonLabels[result.operation.reason_code]],
    ['Observación', result.operation.observation || 'Sin observación'],
    [],
    ['SKU', 'Descripción', 'Talla', 'Stock anterior', 'Stock nuevo', 'Diferencia', 'Resultado'],
    ...result.items.map((item) => [
      item.sku,
      item.description,
      item.size || 'N/A',
      item.previous_quantity,
      item.new_quantity,
      item.difference,
      item.result,
    ]),
    [],
    ['Resumen', `Filas: ${result.summary.item_count}`, `Aumentos: ${result.summary.total_increase}`, `Disminuciones: ${result.summary.total_decrease}`, `Neto: ${result.summary.net_difference}`],
    [],
    ['Conformidad / firma', '________________________________________'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(metadata);
  sheet['!cols'] = [
    { wch: 22 }, { wch: 44 }, { wch: 14 }, { wch: 16 },
    { wch: 16 }, { wch: 14 }, { wch: 14 },
  ];
  sheet['!autofilter'] = { ref: `A11:G${10 + result.items.length + 1}` };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Ajuste confirmado');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new File(
    [bytes],
    `${baseName(result)}.xlsx`,
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  );
}

export function createAdjustmentPdf(result: InventoryAdjustmentResult) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(17);
  doc.text('Reporte de actualización de inventario', 14, 16);
  doc.setFontSize(9);
  const lines = [
    `Operación: ${result.operation.operation_code}`,
    `Fecha y hora Perú: ${result.operation.occurred_at_lima}`,
    `Usuario / rol: ${result.operation.user_name_snapshot} / ${result.operation.role_snapshot}`,
    `Almacén: ${result.operation.warehouse_name} (${result.operation.warehouse_type || 'Sin tipo'})`,
    `Motivo: ${adjustmentReasonLabels[result.operation.reason_code]}`,
    `Observación: ${result.operation.observation || 'Sin observación'}`,
  ];
  const wrappedLines = lines.flatMap((line) => doc.splitTextToSize(line, 265));
  doc.text(wrappedLines, 14, 23);
  const tableStartY = 23 + wrappedLines.length * 4.2 + 4;
  autoTable(doc, {
    startY: tableStartY,
    head: [['SKU', 'Descripción', 'Talla', 'Anterior', 'Nuevo', 'Diferencia', 'Resultado']],
    body: result.items.map((item) => [
      item.sku, item.description, item.size || 'N/A',
      item.previous_quantity, item.new_quantity,
      item.difference > 0 ? `+${item.difference}` : item.difference,
      item.result,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 1: { cellWidth: 75 } },
    didDrawPage: ({ pageNumber }) => {
      doc.setFontSize(8);
      doc.text(`Operación ${result.operation.operation_code} · Página ${pageNumber}`, 14, 202);
    },
  });
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60;
  let summaryY = finalY + 8;
  if (summaryY > 184) {
    doc.addPage();
    summaryY = 20;
  }
  doc.text(
    `Filas: ${result.summary.item_count} · Aumentos: ${result.summary.total_increase} · Disminuciones: ${result.summary.total_decrease} · Diferencia neta: ${result.summary.net_difference}`,
    14,
    summaryY,
  );
  doc.text('Conformidad / firma: __________________________________________', 14, summaryY + 8);
  return new File([doc.output('arraybuffer')], `${baseName(result)}.pdf`, { type: 'application/pdf' });
}

export function downloadAdjustmentReport(result: InventoryAdjustmentResult, format: 'pdf' | 'xlsx') {
  const file = format === 'pdf' ? createAdjustmentPdf(result) : createAdjustmentExcel(result);
  saveAs(file, file.name);
}

export async function shareAdjustmentReport(result: InventoryAdjustmentResult, format: 'pdf' | 'xlsx') {
  const file = format === 'pdf' ? createAdjustmentPdf(result) : createAdjustmentExcel(result);
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `Ajuste ${result.operation.operation_code}`,
      text: shareText(result),
      files: [file],
    });
    return true;
  }
  saveAs(file, file.name);
  return false;
}

export function openAdjustmentWhatsApp(result: InventoryAdjustmentResult) {
  window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText(result)} El archivo fue descargado; adjúntalo manualmente.`)}`, '_blank', 'noopener,noreferrer');
}

export function openAdjustmentEmail(result: InventoryAdjustmentResult) {
  const subject = `Reporte de inventario ${result.operation.operation_code}`;
  const body = `${shareText(result)}\n\nEl archivo fue descargado; adjúntalo manualmente antes de enviar.`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
