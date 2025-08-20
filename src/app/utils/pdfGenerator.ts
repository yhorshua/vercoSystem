import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = vfsFonts.vfs;

// Interfaces definidas
interface Tallas {
  [talla: string]: number;
}

interface Item {
  codigo: string;
  descripcion: string;
  serie: string;
  cantidades: Tallas;
  total: number;
  precio: number;
}

interface Cliente {
  nombre: string;
}

interface Pedido {
  cliente: Cliente;
  estado: string;
  totalUnidades: number;
  totalPrecio: number;
  items: Item[];
}

export function generarProformaPDF(pedido: Pedido) {
  const fechaActual = new Date().toLocaleDateString('es-PE');
  const totalPares = pedido.totalUnidades;
  const total = pedido.totalPrecio.toFixed(2);

  // Generar columna "cantidades por talla" como string: ej. "34/2 35/2 36/2"
  const body = pedido.items.map((item) => {
    const tallas = Object.entries(item.cantidades)
      .map(([talla, cantidad]) => `${talla}/${cantidad}`)
      .join(' ');

    const valor = (item.precio * item.total).toFixed(2);

    return [
      { text: item.codigo, style: 'tableData' },
      { text: item.descripcion, style: 'tableData' },
      { text: item.serie, style: 'tableData' },
      { text: tallas, style: 'tableData' },
      { text: item.total.toString(), style: 'tableData' },
      { text: item.precio.toFixed(2), style: 'tableData' },
      { text: valor, style: 'tableData' },
    ];
  });

  const docDefinition = {
    content: [
      { text: 'DETALLE DEL PEDIDO', style: 'header' },
      {
        columns: [
          { text: `Cliente: ${pedido.cliente.nombre}`, bold: true },
          { text: `Estado: ${pedido.estado}`, bold: true, alignment: 'right' },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Artículo', style: 'tableHeader' },
              { text: 'Descripción', style: 'tableHeader' },
              { text: 'Serie', style: 'tableHeader' },
              { text: 'Cantidades por talla', style: 'tableHeader' },
              { text: 'Pares', style: 'tableHeader' },
              { text: 'Precio', style: 'tableHeader' },
              { text: 'Valor', style: 'tableHeader' },
            ],
            ...body,
            [
              { text: 'Total General', colSpan: 4, alignment: 'right', bold: true },
              {}, {}, {},
              { text: totalPares.toString(), bold: true },
              {},
              { text: total, bold: true },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
      },
      { text: `\nFecha: ${fechaActual}`, alignment: 'right' },
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
      tableHeader: {
        bold: true,
        fillColor: '#eeeeee',
      },
      tableData: {
        margin: [2, 2],
      },
    },
  };

  pdfMake.createPdf(docDefinition).open();
}
