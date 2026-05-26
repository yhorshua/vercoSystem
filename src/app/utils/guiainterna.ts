import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Pedido } from '../utils/types/pedidos';
import { base64Img } from '../utils/logobase64';

pdfMake.vfs = pdfFonts.vfs;
const money = (v: number) => `S/ ${Number(v || 0).toFixed(2)}`;

export async function buildPedidoPdfBlobFormal(
  pedido: Pedido,
  jefeVentas: string // Nombre completo del jefe de ventas
): Promise<Blob> {
  const clienteDoc =
    pedido.cliente.numeroDocumento ||
    (pedido.cliente as any).ruc ||
    '---';

  const clienteDireccion =
    pedido.cliente.direccion ||
    (pedido.cliente as any).direccion ||
    '---';

  const clienteUbigeo = [
    pedido.cliente.distrito,
    pedido.cliente.provincia,
    pedido.cliente.departamento
  ]
    .filter(Boolean)
    .join(' - ') || '---';

  const fecha = new Date().toLocaleString('es-PE');

  // Filas de productos
  const rows = pedido.items.map((item) => {
    const tallasDespacho = item.tallas.map(t => `${t.talla}/${t.cantidad}`).join('   ');
    const totalUnidades = item.tallas.reduce((acc, t) => acc + t.cantidad, 0);

    return [
      {
        stack: [
          { text: item.codigo, style: 'codeText' },
          { text: item.nombre.toUpperCase(), style: 'productName' },
        ],
        margin: [0, 10, 0, 10]
      },
      { text: tallasDespacho, style: 'pickingData', alignment: 'center', margin: [0, 10, 0, 10] },
      { text: totalUnidades.toString(), style: 'qtyText', alignment: 'center', margin: [0, 10, 0, 10] },
      { text: money(item.precio * totalUnidades), style: 'priceText', alignment: 'right', margin: [0, 10, 0, 10] }
    ];
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 110, 40, 60],

    background: (currentPage: number) => [
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 595, h: 90, color: '#1e293b' }
        ]
      }
    ],

    header: {
      margin: [40, 20, 40, 0],
      columns: [
        { image: base64Img, width: 100 },
        {
          stack: [
            { text: 'GUIA INTERNA VERCO', color: '#ffffff', fontSize: 14, bold: true, alignment: 'right' },
            { text: `VENDEDOR: ${pedido.vendedor.toUpperCase()}`, color: '#60a5fa', fontSize: 11, bold: true, alignment: 'right' },
            { text: `GUIA INTERNA: ${pedido.id}`, color: '#4f5051', fontSize: 9, alignment: 'right' },
          ],
          margin: [0, 5, 0, 0]
        }
      ]
    },

    content: [
      // Datos del cliente
      {
        style: 'clientCard',
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                stack: [
                  { text: 'DATOS DEL CLIENTE', style: 'sectionLabel' },
                  { text: pedido.cliente.nombre.toUpperCase(), style: 'clientName' },
                  { text: `RUC/DOC: ${clienteDoc}`, style: 'clientDetailBold' },
                  { text: `TEL: ${pedido.cliente.telefono || '---'}`, style: 'clientDetail' },
                ]
              },
              {
                stack: [
                  { text: 'ENTREGA / DIRECCIÓN', style: 'sectionLabel' },
                  { text: clienteDireccion.toUpperCase(), style: 'clientDetailBold' },
                  { text: clienteUbigeo, style: 'clientDetail' },
                  { text: `FECHA DE PEDIDO: ${pedido.fechaRegistro}`, style: 'clientDetail' },
                ]
              }
            ]
          ]
        },
        layout: 'noBorders'
      },

      { text: '', margin: [0, 15] },

      // Tabla de productos
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 40, 70],
          body: [
            [
              { text: 'ARTÍCULO / DESCRIPCIÓN', style: 'th' },
              { text: 'TALLAS (TALLA/CANT)', style: 'th', alignment: 'center' },
              { text: 'PARES', style: 'th', alignment: 'center' },
              { text: 'SUBTOTAL', style: 'th', alignment: 'right' }
            ],
            ...rows
          ]
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number, node: any) => (i === 0 || i === 1) ? '#1e293b' : '#e2e8f0',
        }
      },

      // Resumen final
      {
        margin: [0, 20, 0, 0],
        columns: [
          {
            width: '40%',
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  { text: 'TOTAL PARES', style: 'totalLabel' },
                  { text: pedido.totalPares.toString(), style: 'totalValue' }
                ],
                [
                  { text: 'TOTAL A COBRAR', style: 'totalLabel' },
                  { text: money(pedido.totalMonto), style: 'totalValue', color: '#1e293b' }
                ]
              ]
            },
            layout: 'lightHorizontalLines'
          }
        ]
      },

      // SECCIÓN FORMAL DE FIRMAS
      {
        margin: [0, 30, 0, 0],
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                stack: [
                  { text: 'REVISA CLIENTE / VENDEDOR', style: 'sectionLabel' },
                  { text: `Vendedor: ${pedido.vendedor.toUpperCase()}`, style: 'signatureName' },
                  { text: 'Firma: ____________________________', style: 'signatureLine', margin: [0, 15, 0, 0] },
                ],
                alignment: 'center'
              },
              {
                stack: [
                  { text: 'APROBADO JEFE DE VENTAS', style: 'sectionLabel' },
                  { text: jefeVentas.toUpperCase(), style: 'signatureName' },
                  { text: 'Firma: ____________________________', style: 'signatureLine', margin: [0, 15, 0, 0] },
                ],
                alignment: 'center'
              }
            ]
          ]
        },
        layout: 'noBorders'
      }
    ],

    styles: {
      clientCard: { fillColor: '#f8fafc', margin: [0, -10, 0, 10] },
      sectionLabel: { fontSize: 7, bold: true, color: '#64748b', letterSpacing: 1, margin: [0, 0, 0, 3] },
      clientName: { fontSize: 12, bold: true, color: '#1e293b' },
      clientDetailBold: { fontSize: 9, bold: true, color: '#334155', margin: [0, 1, 0, 1] },
      clientDetail: { fontSize: 9, color: '#334155', margin: [0, 1, 0, 1] },
      th: { fillColor: '#1e293b', color: '#ffffff', fontSize: 9, bold: true, margin: [0, 4, 0, 4] },
      codeText: { fontSize: 11, bold: true, color: '#2563eb' },
      productName: { fontSize: 9, color: '#475569' },
      pickingData: { fontSize: 18, bold: true, color: '#000000', background: '#fefce8' },
      qtyText: { fontSize: 12, bold: true, color: '#1e293b' },
      priceText: { fontSize: 10, bold: true },
      statusBadge: { fontSize: 10, bold: true, color: '#059669' },
      totalLabel: { fontSize: 10, bold: true, color: '#64748b', margin: [0, 5, 0, 5] },
      totalValue: { fontSize: 13, bold: true, margin: [0, 5, 0, 5] },
      signatureName: { fontSize: 11, bold: true, color: '#1e293b', margin: [0, 3, 0, 0] },
      signatureLine: { fontSize: 9, italics: true }
    }
  };

  return new Promise((resolve) => {
    pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => resolve(blob));
  });
}