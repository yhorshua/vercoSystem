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
  origin: string;
  precioventa: string;
}

export const exportToExcel = (data: StockItem[]) => {
  // Crear las columnas estáticas (sin tallas)
  const transformed = data.map((item) => {
    const row: any = {
      Código: item.codigo,
      Serie: item.serie,
      Descripción: item.descripcion,
      Saldo: item.saldo,
      Origen: item.origin,
      PrecioVenta: item.precioventa
    };

    // Agregar las tallas dinámicas después de los campos estáticos
    Object.entries(item.tallas).forEach(([size, qty]) => {
      row[size] = qty; // Agregar la talla como columna con el nombre de la talla
    });

    return row;
  });

  // Crear la hoja de Excel con el formato adecuado
  const ws = XLSX.utils.json_to_sheet(transformed);

  // Definir el libro y agregar la hoja
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock');

  // Generar el archivo Excel
  const excelFile = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  // Descargar el archivo Excel
  saveAs(new Blob([excelFile]), 'stock.xlsx');
};
