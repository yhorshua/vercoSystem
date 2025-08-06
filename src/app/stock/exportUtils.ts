import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportToExcel = (data: any[]) => {
  const transformed = data.map((item) => ({
    Código: item.codigo,
    Serie: item.serie,
    Descripción: item.descripcion,
    ...item.tallas,
    Saldo: item.saldo
  }));
  const ws = XLSX.utils.json_to_sheet(transformed);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock');
  const excelFile = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([excelFile]), 'stock.xlsx');
};
