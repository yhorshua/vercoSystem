import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Definimos las interfaces para los datos
interface Tallas {
  [talla: string]: number;
}

interface StockItem {
  codigo: string;
  serie: string;
  descripcion: string;
  tallas: Tallas;
  saldo: number;
}

export const exportToExcel = (data: StockItem[]) => {
  const transformed = data.map((item) => ({
    Código: item.codigo,
    Serie: item.serie,
    Descripción: item.descripcion,
    ...item.tallas,  // Convertir las tallas en columnas dinámicas
    Saldo: item.saldo
  }));
  const ws = XLSX.utils.json_to_sheet(transformed);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock');
  const excelFile = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([excelFile]), 'stock.xlsx');
};
