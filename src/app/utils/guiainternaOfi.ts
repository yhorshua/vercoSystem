import { Pedido, PedidoItem } from './types/pedidos';



export function buildPedidoPdfMakeDefinitionOfi(pedido: Pedido, jefeVentas: string): any {
  // Formateo de fecha estilo imagen: 10 / July / 2026
  const dateObj = pedido.fechaRegistro ? new Date(pedido.fechaRegistro) : new Date();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const formattedDate = `${dateObj.getDate()} / ${months[dateObj.getMonth()]} / ${dateObj.getFullYear()}`;

  // Timestamp exacto como en la imagen
  const timestamp = new Date().toLocaleString('en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  }).toUpperCase();

  const clienteDoc = (pedido.cliente as any).numeroDocumento || (pedido.cliente as any).ruc || (pedido.cliente as any).codigo || '---';

  const moneyFormatter = (val: number) => val.toFixed(2);

  // Generar filas de la tabla
  const tableRows = pedido.items.map((item) => {
    const itemUnits = item.tallas.reduce((sum, t) => sum + t.cantidad, 0);
    const subtotal = item.precio * itemUnits;

    // Formato de tallas: "40/1 41/2"
    const tallasStr = item.tallas.map(t => `${t.talla}/${t.cantidad}`).join('  ');

    return [
      { text: item.codigo, fontSize: 10 },
      { text: item.nombre.toUpperCase(), fontSize: 9 },
      { text: tallasStr, fontSize: 10 },
      { text: itemUnits.toString(), fontSize: 10, alignment: 'right' },
      { text: moneyFormatter(item.precio), fontSize: 10, alignment: 'right' },
      { text: moneyFormatter(subtotal), fontSize: 10, alignment: 'right' }
    ];
  });

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: {
      font: 'Roboto',
      color: '#000000',
    },
    content: [
      // HEADER: NOMBRE EMPRESA Y FECHA
      {
        columns: [
          { text: 'VERCO', fontSize: 16, bold: true, decoration: 'underline', width: 'auto' },
          { text: formattedDate, alignment: 'right', fontSize: 11 }
        ]
      },

      // TIPO DE DOCUMENTO Y VENDEDOR
      {
        columns: [
          { text: `Guia Interna #${pedido.id}`, fontSize: 11, margin: [0, 8, 0, 0] },
          { text: `Vendedor: ${pedido.vendedor.toUpperCase()}`, alignment: 'right', fontSize: 11, margin: [0, 8, 0, 0] }
        ]
      },

      // DATOS DEL CLIENTE
      {
        columns: [
          { text: `Cliente: ${clienteDoc}`, fontSize: 11, width: 120 },
          { text: (pedido.cliente.nombre || '').toUpperCase(), fontSize: 11, width: '*' }
        ],
        margin: [0, 8, 0, 20]
      },

      // TABLA DE PRODUCTOS (Estilo matricial)
      {
        table: {
          headerRows: 1,
          widths: [80, '*', 150, 40, 60, 60],
          body: [
            // Cabecera
            [
              { text: 'ARTICULO', style: 'tableHeader' },
              { text: 'DESCRIPCION', style: 'tableHeader' },
              { text: 'Cantidades por talla', style: 'tableHeader' },
              { text: 'Pares', style: 'tableHeader', alignment: 'right' },
              { text: 'Precio', style: 'tableHeader', alignment: 'right' },
              { text: 'Valor', style: 'tableHeader', alignment: 'right' }
            ],
            ...tableRows
          ]
        },
        layout: {
          // Líneas horizontales punteadas como en la imagen
          hLineWidth: (i: number, node: any) => (i === 1 || i === node.table.body.length) ? 1 : 0,
          vLineWidth: () => 0,
          hLineStyle: () => ({ dash: { length: 2, space: 2 } }),
        }
      },

      // RESUMEN TOTAL
      {
        table: {
          widths: ['*', 40, 60, 60],
          body: [
            [
              { text: 'Total General', alignment: 'right', bold: true, fontSize: 11, margin: [0, 5, 0, 0] },
              {
                text: pedido.items.reduce((acc, item) => acc + item.tallas.reduce((s, t) => s + t.cantidad, 0), 0).toString(),
                alignment: 'right', bold: true, fontSize: 11, margin: [0, 5, 0, 0]
              },
              { text: 'S/', alignment: 'right', fontSize: 11, margin: [0, 5, 0, 0] },
              { text: moneyFormatter(pedido.totalMonto || pedido.totalPrecio), alignment: 'right', bold: true, fontSize: 11, margin: [0, 5, 0, 0] }
            ]
          ]
        },
        layout: {
          hLineWidth: (i: number) => (i === 0) ? 1 : 0,
          vLineWidth: () => 0,
          hLineStyle: () => ({ dash: { length: 1, space: 1 } }),
        },
        margin: [0, 0, 0, 40]
      },

      // FIRMA Y SELLO
      {
        columns: [
          {
            stack: [
              { text: 'AUTORIZADO POR', fontSize: 10, bold: true },
              {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5, dash: { length: 3 } }],
                margin: [0, 40, 0, 0]
              }
            ],
            width: 'auto'
          },
          {
            // Fecha y hora al final
            text: timestamp,
            alignment: 'right',
            fontSize: 9,
            margin: [0, 45, 0, 0]
          }
        ]
      }
    ],
    styles: {
      tableHeader: {
        fontSize: 10,
        bold: true,
        margin: [0, 5, 0, 5]
      }
    }
  };
}

export async function buildPedidoPdfBlobOfi(
  pedido: Pedido,
  jefeVentas: string
): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error(
      'La generación del PDF solo está disponible en el navegador'
    );
  }

  try {
    const [pdfMakeModule, pdfFontsModule] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]);

    const pdfMake: any =
      (pdfMakeModule as any).default ||
      pdfMakeModule;

    /**
     * No se debe buscar manualmente pdfMake.vfs.
     * Se entrega el módulo completo a pdfMake.
     */
    const pdfFonts: any =
      (pdfFontsModule as any).default ||
      pdfFontsModule;

    if (
      typeof pdfMake.addVirtualFileSystem === 'function'
    ) {
      pdfMake.addVirtualFileSystem(pdfFonts);
    } else {
      /**
       * Respaldo para versiones antiguas.
       */
      const possibleVfs =
        pdfFonts?.pdfMake?.vfs ||
        pdfFonts?.vfs ||
        pdfFonts;

      pdfMake.vfs = possibleVfs;
    }

    const definition =
      buildPedidoPdfMakeDefinitionOfi(
        pedido,
        jefeVentas
      );

    return await new Promise<Blob>(
      (resolve, reject) => {
        pdfMake
          .createPdf(definition)
          .getBlob((blob: Blob) => {
            if (!blob) {
              reject(
                new Error(
                  'pdfMake no pudo generar el archivo PDF'
                )
              );
              return;
            }

            resolve(blob);
          });
      }
    );
  } catch (error: any) {
    console.error(
      'Error generando PDF con pdfMake:',
      error
    );

    throw new Error(
      error?.message ||
      'No se pudo generar el PDF'
    );
  }
}