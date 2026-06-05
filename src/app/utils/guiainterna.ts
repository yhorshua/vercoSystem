import { Pedido, PedidoItem } from './types/pedidos';
// @ts-ignore
import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Intialize virtual fonts safely for pdfmake
if (pdfMake && pdfFonts && (pdfFonts as any).pdfMake && (pdfFonts as any).pdfMake.vfs) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
}


/**
 * Builds a highly professional, high-contrast, print-optimized document for internal dispatch.
 * Calibrated specifically for clear visual hierarchy and physical signature zones.
 * Returns the raw HTML string representing the complete document.
 */
export function buildPedidoHtmlFormal(pedido: Pedido, jefeVentas: string): string {
  const formattedDate = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedOrderDate = pedido.fechaRegistro
    ? (pedido.fechaRegistro.includes('T') ? pedido.fechaRegistro.split('T')[0] : pedido.fechaRegistro)
    : '---';

  const clienteDoc =
    (pedido.cliente as any).numeroDocumento ||
    (pedido.cliente as any).ruc ||
    (pedido.cliente as any).codigo ||
    '---';

  const clienteDireccion =
    (pedido.cliente as any).direccion ||
    '---';

  const clienteUbigeo = [
    (pedido.cliente as any).distrito,
    (pedido.cliente as any).provincia,
    (pedido.cliente as any).departamento
  ]
    .filter(Boolean)
    .join(' - ') || '---';

  // Total pares/unidades calculation
  const totalPares = pedido.items.reduce((acc, item) => {
    const itemQty = item.tallas.reduce((sum, t) => sum + t.cantidad, 0);
    return acc + itemQty;
  }, 0);

  const moneyFormatter = (val: number) => `S/ ${val.toFixed(2)}`;



  // Generate table rows dynamically
  const tableRowsHtml = pedido.items.map((item, index) => {
    const itemUnits = item.tallas.reduce((sum, t) => sum + t.cantidad, 0);
    const subtotal = item.precio * itemUnits;

    // Beautiful tags representation for sizes
    const tallasPills = item.tallas.map(t => `
      <span class="talla-pill">
        <span class="t-num">T.${t.talla}</span>
        <span class="t-qty">${t.cantidad}</span>
      </span>
    `).join('');

    return `
      <tr class="${index % 2 === 0 ? '' : 'alt-row'}">
        <td class="col-code">${item.codigo}</td>
        <td class="col-desc">
          <div class="prod-name">${item.nombre.toUpperCase()}</div>
          ${item.serie ? `<div class="prod-spec">Serie / Lote: ${item.serie}</div>` : ''}
        </td>
        <td class="col-tallas">${tallasPills}</td>
        <td class="col-price">${moneyFormatter(item.precio)}</td>
        <td class="col-qty">${itemUnits}</td>
        <td class="col-subtotal">${moneyFormatter(subtotal)}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Guía de Despacho Interno #${pedido.id}</title>
      <style>
        /* CSS reset & layout rules for precise standard A4 dimensions */
        @page {
          size: A4 portrait;
          margin: 0; /* Important: prevents parent browsers from scale squeezing */
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background-color: #f1f5f9; /* Contrast background for digital viewing */
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          font-size: 8.5pt;
          line-height: 1.35;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          -webkit-font-smoothing: antialiased;
        }

        /* 
          Container that emulates paper on screen and fits page perfectly on print.
          Width is set to exact 210mm (A4 size width).
        */
        .container {
          box-sizing: border-box;
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 15mm 20mm 15mm; /* Classic document margins */
          background-color: #ffffff;
          position: relative;
          box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          margin: 40px auto; /* Centers container on physical screens */
        }

        /* PDF specific style overrides to ensure exact A4 fit without screen margins or shadows */
        .container.pdf-render-mode {
          width: 210mm !important;
          min-height: 297mm !important;
          margin: 0 !important;
          padding: 15mm 15mm 20mm 15mm !important;
          box-shadow: none !important;
          box-sizing: border-box !important;
        }

        /* Top ribbon decoration */
        .color-strip {
          height: 4px;
          background: linear-gradient(to right, #4f46e5, #3b82f6, #10b981);
          border-radius: 2px;
          margin-bottom: 6mm;
          width: 100%;
        }

        /* Grid Header Area */
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 4mm;
          margin-bottom: 6mm;
          width: 100%;
        }

        .brand-block {
          line-height: 1.25;
        }

        .brand-title {
          font-size: 21pt;
          font-weight: 950;
          letter-spacing: -1px;
          color: #0f172a;
          margin: 0;
        }

        .brand-subtitle {
          font-size: 7.5pt;
          font-weight: 900;
          color: #4f46e5;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          margin-top: 1.5mm;
        }

        .doc-badge-container {
          text-align: right;
        }

        .doc-title {
          font-size: 13pt;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          margin: 0;
        }

        .doc-id-box {
          display: inline-block;
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 1.5mm 4mm;
          margin-top: 2mm;
          font-family: monospace;
          font-size: 12pt;
          font-weight: 900;
          color: #0f172a;
        }

        /* Metadata Information Cards Grid */
        .info-grid {
          display: flex;
          justify-content: space-between;
          gap: 5mm;
          margin-bottom: 6mm;
          width: 100%;
        }

        .card {
          flex: 1;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4mm 5mm;
          background-color: #f8fafc;
        }

        .card-title {
          font-size: 7pt;
          font-weight: 900;
          letter-spacing: 1px;
          color: #475569;
          text-transform: uppercase;
          border-bottom: 1.5px solid #cbd5e1;
          padding-bottom: 1.5mm;
          margin-bottom: 3.5mm;
        }

        .meta-row {
          display: flex;
          margin-bottom: 1.8mm;
        }

        .meta-row:last-child {
          margin-bottom: 0;
        }

        .meta-label {
          font-weight: 700;
          color: #64748b;
          width: 32mm;
          text-transform: uppercase;
          font-size: 7.5pt;
        }

        .meta-val {
          color: #0f172a;
          font-weight: 800;
          word-break: break-all;
          font-size: 8.5pt;
        }

        /* Items Manifest Table styling */
        .manifest-title {
          font-size: 8.5pt;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
          margin-bottom: 3mm;
          display: flex;
          align-items: center;
          gap: 2mm;
        }

        .manifest-title::after {
          content: "";
          flex-grow: 1;
          height: 1px;
          background-color: #cbd5e1;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #cbd5e1;
          margin-bottom: 6mm;
        }

        .items-table th {
          background-color: #0f172a;
          color: #ffffff;
          font-size: 7.5pt;
          font-weight: bold;
          text-transform: uppercase;
          padding: 2.5mm 2mm;
          border: 1px solid #0f172a;
        }

        .items-table td {
          padding: 2.5mm 2mm;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #cbd5e1;
          border-left: 1px solid #cbd5e1;
          vertical-align: middle;
        }

        .alt-row {
          background-color: #f8fafc;
        }

        /* Calculated widths for standard A4 layout */
        .col-code {
          font-family: monospace;
          font-weight: 950;
          color: #2563eb;
          width: 25mm;
          font-size: 8.5pt;
        }

        .col-desc {
          font-size: 8.5pt;
        }

        .prod-name {
          font-weight: 900;
          color: #1e293b;
        }

        .prod-spec {
          font-size: 7pt;
          color: #64748b;
          margin-top: 0.8mm;
          font-family: monospace;
        }

        .col-tallas {
          width: 60mm;
        }

        .talla-pill {
          display: inline-flex;
          align-items: center;
          background-color: #fefce8;
          border: 1px solid #fde047;
          border-radius: 4px;
          overflow: hidden;
          margin-right: 1.5mm;
          margin-bottom: 1.5mm;
          font-family: monospace;
          font-size: 7.5pt;
        }

        .talla-pill .t-num {
          background-color: #fef3c7;
          color: #b45309;
          font-weight: bold;
          padding: 0.4mm 1.5mm;
        }

        .talla-pill .t-qty {
          color: #1e1b4b;
          font-weight: 900;
          padding: 0.4mm 1.5mm;
          min-width: 4mm;
          text-align: center;
        }

        .col-price {
          width: 24mm;
          text-align: right;
          font-weight: 700;
          color: #475569;
          font-family: monospace;
          white-space: nowrap;
        }

        .col-qty {
          width: 15mm;
          text-align: center;
          font-weight: 900;
          color: #0f172a;
          font-family: monospace;
          font-size: 8.5pt;
        }

        .col-subtotal {
          width: 26mm;
          text-align: right;
          font-weight: 900;
          color: #0f172a;
          font-family: monospace;
          white-space: nowrap;
        }

        /* Summary Total Card Layout */
        .summary-block {
          display: flex;
          justify-content: flex-end;
          margin-top: 4mm;
          margin-bottom: 12mm;
          width: 100%;
        }

        .summary-card {
          width: 75mm;
          border: 1.8px solid #0f172a;
          border-radius: 6px;
          overflow: hidden;
          background-color: #f8fafc;
        }

        .sum-row {
          display: flex;
          justify-content: space-between;
          padding: 2.5mm 4mm;
          font-size: 8.5pt;
        }

        .sum-row.border-top {
          border-top: 1.5px solid #cbd5e1;
        }

        .sum-row.grand-total {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 900;
          font-size: 11pt;
        }

        .sum-label {
          color: #475569;
          font-weight: bold;
          text-transform: uppercase;
        }

        .grand-total .sum-label {
          color: #94a3b8;
        }

        .sum-val {
          font-weight: 900;
          text-align: right;
          font-family: monospace;
        }

        /* Signatures blocks layout */
        .signature-section {
          display: flex;
          justify-content: space-between;
          gap: 15mm;
          margin-top: 14mm;
          width: 100%;
          page-break-inside: avoid;
        }

        .sig-box {
          flex: 1;
          text-align: center;
          position: relative;
        }

        .sig-line {
          width: 100%;
          border-top: 1.5px dashed #64748b;
          margin-bottom: 2.5mm;
        }

        .sig-title {
          font-size: 7pt;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .sig-name {
          font-size: 10pt;
          font-weight: 950;
          color: #0f172a;
          margin-top: 1.5mm;
        }

        .sig-meta {
          font-size: 7.5pt;
          color: #475569;
          margin-top: 0.8mm;
        }

        /* Metadata tag watermark footer anchored perfectly at printable sheet bottom */
        .tag-footer {
          position: absolute;
          bottom: 8mm; /* Anchoring safety spacing */
          left: 15mm;
          right: 15mm;
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #cbd5e1;
          padding-top: 3mm;
          font-family: monospace;
          font-size: 6.8pt;
          color: #94a3b8;
          text-transform: uppercase;
        }

        /* Adaptive view for screens smaller than standard A4 width */
        @media (max-width: 210mm) {
          html, body {
            background-color: #ffffff;
            display: block;
          }
          .container {
            width: 100%;
            margin: 0;
            padding: 10mm;
            box-shadow: none;
            min-height: auto;
          }
          .tag-footer {
            position: relative;
            bottom: auto;
            left: auto;
            right: auto;
            margin-top: 12mm;
          }
        }

        /* High fidelity browser print media definitions for 100% layout execution */
        @media print {
          html, body {
            background-color: #ffffff !important;
            display: block !important;
            width: 210mm !important;
            height: 297mm !important;
          }
          .container {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 12mm 15mm 20mm 15mm !important;
            width: 210mm !important;
            height: 297mm !important;
          }
          .tag-footer {
            bottom: 8mm !important;
            position: absolute !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        
        <!-- TOP MULTICOLOR STRIP -->
        <div class="color-strip"></div>

        <!-- HEADER SECTION -->
        <div class="header-section">
          <div class="brand-block">
            <h1 class="brand-title">VERCO STORE</h1>
            <div class="brand-subtitle">Centro Central de Logística y Despachos</div>
          </div>
          
          <div class="doc-badge-container">
            <h2 class="doc-title">Guía de Despacho Interna</h2>
            <div class="doc-id-box">Nº ${pedido.id}</div>
          </div>
        </div>

        <!-- METADATA BLOCK GRID -->
        <div class="info-grid">
          
          <!-- DATOS DEL CLIENTE CARD -->
          <div class="card">
            <div class="card-title">1. Información del Destinatario (Cliente)</div>
            
            <div class="meta-row">
              <span class="meta-label">Cliente:</span>
              <span class="meta-val">${pedido.cliente.nombre.toUpperCase()}</span>
            </div>
            
            <div class="meta-row">
              <span class="meta-label">Documento:</span>
              <span class="meta-val">${clienteDoc}</span>
            </div>
            
            <div class="meta-row">
              <span class="meta-label">Dirección:</span>
              <span class="meta-val">${clienteDireccion.toUpperCase()}</span>
            </div>

            <div class="meta-row">
              <span class="meta-label">Distrito:</span>
              <span class="meta-val">${clienteUbigeo.toUpperCase()}</span>
            </div>

            <div class="meta-row">
              <span class="meta-label">Teléfono:</span>
              <span class="meta-val">${pedido.cliente.telefono || '---'}</span>
            </div>
          </div>

          <!-- DATOS DE DESPACHO CARD -->
          <div class="card">
            <div class="card-title">2. Detalles del Despacho y Operador</div>
            
            <div class="meta-row">
              <span class="meta-label">Asesor Asignado:</span>
              <span class="meta-val">${pedido.vendedor.toUpperCase()}</span>
            </div>
            
            <div class="meta-row">
              <span class="meta-label">Autorizador Almacén:</span>
              <span class="meta-val">${jefeVentas.toUpperCase()}</span>
            </div>

            <div class="meta-row">
              <span class="meta-label">Fecha del Pedido:</span>
              <span class="meta-val">${formattedOrderDate}</span>
            </div>
            
           <div class="meta-row">
            <span class="meta-label">Estado de Transito:</span>
            <span class="meta-val" style="color: #10b981; font-weight: 900;">Aprobad. Almacén (${pedido.estado})</span> -->
          </div>
          </div> 

        </div>

        <!-- ITEMS MANIFEST TABLE -->
        <div class="manifest-title">3. Artículos Autorizados para Empaque y Distribución</div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align: left; width: 25mm;">CÓDIGO (SKU)</th>
              <th style="text-align: left;">DESCRIPCIÓN DEL CALZADO</th>
              <th style="text-align: left; width: 60mm;">TALLAS × CANTIDADES DE DESPACHO</th>
              <th style="text-align: right; width: 24mm;">PRECIO UNIT.</th>
              <th style="text-align: center; width: 15mm;">PARES</th>
              <th style="text-align: right; width: 26mm;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <!-- TOTALS SUMMARY BLOCK -->
        <div class="summary-block">
          <div class="summary-card">
            <div class="sum-row">
              <span class="sum-label">Total Unidades (Pares)</span>
              <span class="sum-val" style="font-size: 10pt; color: #0f172a;">${totalPares} u.</span>
            </div>
            <div class="sum-row grand-total">
              <span class="sum-label">Total Valorizado</span>
              <span class="sum-val">${moneyFormatter(pedido.totalMonto || pedido.totalPrecio)}</span>
            </div>
          </div>
        </div>

        <!-- PHYSICAL SIGNATURES ZONE -->
        <div class="signature-section">
          
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">Operaciones de Ventas / Distribuidor</div>
            <div class="sig-name">${pedido.vendedor.toUpperCase()}</div>
            <div class="sig-meta">Cargo: Asesor de Ventas</div>
          </div>

          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">Aprobador de Almacén / Caja General</div>
            <div class="sig-name">${jefeVentas.toUpperCase()}</div>
            <div class="sig-meta">Director de Logística de Operaciones</div>
          </div>

        </div>

        <!-- WATERMARK TAG FOOTER (Perfect absolute positioning inside relative sheet layout) -->
        <div class="tag-footer">
          <div>Impreso con Sistema Central VERCO Logística. ID de Rastreo de Guía Oficial: GI-${pedido.id}</div>
          <div>Fecha de Emisión del Documento: ${formattedDate}</div>
        </div>

      </div>

      <!-- Self executing print triggers to launch printer selection dialogue immediately upon file opening -->
      <script>
        window.onload = function() {
          if (window.self === window.top) {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        }
      </script>
    </body>
    </html>
  `;

  return htmlContent;
}

/**
 * Generates the pdfmake document definition matching the clean A4 physical print design.
 */
export function buildPedidoPdfMakeDefinition(pedido: Pedido, jefeVentas: string): any {
  const formattedDate = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedOrderDate = pedido.fechaRegistro
    ? (pedido.fechaRegistro.includes('T') ? pedido.fechaRegistro.split('T')[0] : pedido.fechaRegistro)
    : '---';

  const clienteDoc =
    (pedido.cliente as any).numeroDocumento ||
    (pedido.cliente as any).ruc ||
    (pedido.cliente as any).codigo ||
    '---';

  const clienteDireccion =
    (pedido.cliente as any).direccion ||
    '---';

  const clienteUbigeo = [
    (pedido.cliente as any).distrito,
    (pedido.cliente as any).provincia,
    (pedido.cliente as any).departamento
  ]
    .filter(Boolean)
    .join(' - ') || '---';

  const totalPares = pedido.items.reduce((acc, item) => {
    const itemQty = item.tallas.reduce((sum, t) => sum + t.cantidad, 0);
    return acc + itemQty;
  }, 0);

  const moneyFormatter = (val: number) => `S/ ${val.toFixed(2)}`;

  const tableHeader = [
    { text: 'CÓDIGO (SKU)', style: 'tableHeader', alignment: 'left', fillColor: '#0f172a', color: '#ffffff' },
    { text: 'DESCRIPCIÓN DEL CALZADO', style: 'tableHeader', alignment: 'left', fillColor: '#0f172a', color: '#ffffff' },
    { text: 'TALLAS × CANTIDADES DE DESPACHO', style: 'tableHeader', alignment: 'left', fillColor: '#0f172a', color: '#ffffff' },
    { text: 'PRECIO UNIT.', style: 'tableHeader', alignment: 'right', fillColor: '#0f172a', color: '#ffffff' },
    { text: 'PARES', style: 'tableHeader', alignment: 'center', fillColor: '#0f172a', color: '#ffffff' },
    { text: 'SUBTOTAL', style: 'tableHeader', alignment: 'right', fillColor: '#0f172a', color: '#ffffff' }
  ];

  const groupedItems = Object.values(
    pedido.items.reduce((acc, item) => {
      const key = `${item.codigo}_${item.precio}`;

      if (!acc[key]) {
        acc[key] = {
          ...item,
          tallas: [...item.tallas]
        };
      } else {
        item.tallas.forEach((tallaNueva) => {
          const tallaExistente = acc[key].tallas.find(
            t => t.talla === tallaNueva.talla
          );

          if (tallaExistente) {
            tallaExistente.cantidad += tallaNueva.cantidad;
          } else {
            acc[key].tallas.push({ ...tallaNueva });
          }
        });
      }

      return acc;
    }, {} as Record<string, PedidoItem>)
  );

  groupedItems.forEach(item => {
    item.tallas.sort(
      (a, b) => Number(a.talla) - Number(b.talla)
    );
  });
  const tableRows = groupedItems.map((item, index) => {
    const itemUnits = item.tallas.reduce(
      (sum: number, t: any) => sum + t.cantidad,
      0
    );

    const subtotal = item.precio * itemUnits;
    const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';

    const descStack: any[] = [
      { text: item.nombre.toUpperCase(), fontSize: 8, bold: true, color: '#1e293b' }
    ];
    if (item.serie) {
      descStack.push({ text: `Serie / Lote: ${item.serie}`, fontSize: 6.5, color: '#64748b', margin: [0, 2, 0, 0] });
    }

    const sizeTextArray: any[] = [];
    item.tallas.forEach((t, i) => {
      sizeTextArray.push({ text: ` T.${t.talla} `, color: '#b45309', bold: true, background: '#fef3c7', fontSize: 7 });
      sizeTextArray.push({ text: ` ${t.cantidad} `, color: '#1e1b4b', bold: true, background: '#fefce8', fontSize: 7 });
      if (i < item.tallas.length - 1) {
        sizeTextArray.push({ text: '  ' });
      }
    });

    return [
      { text: item.codigo, fontSize: 8, bold: true, color: '#2563eb', fillColor: rowBgColor, margin: [0, 4, 0, 4] },
      { stack: descStack, fillColor: rowBgColor, margin: [0, 4, 0, 4] },
      { text: sizeTextArray, fillColor: rowBgColor, margin: [0, 4, 0, 4] },
      { text: moneyFormatter(item.precio), fontSize: 8, bold: true, color: '#475569', alignment: 'right', fillColor: rowBgColor, margin: [0, 4, 0, 4] },
      { text: String(itemUnits), fontSize: 8, bold: true, color: '#0f172a', alignment: 'center', fillColor: rowBgColor, margin: [0, 4, 0, 4] },
      { text: moneyFormatter(subtotal), fontSize: 8, bold: true, color: '#0f172a', alignment: 'right', fillColor: rowBgColor, margin: [0, 4, 0, 4] }
    ];
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [35, 35, 35, 35],
    content: [
      // 1. Color strip
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 180, h: 4, color: '#4f46e5' },
          { type: 'rect', x: 180, y: 0, w: 180, h: 4, color: '#3b82f6' },
          { type: 'rect', x: 360, y: 0, w: 165, h: 4, color: '#10b981' }
        ],
        margin: [0, 0, 0, 15]
      },
      // 2. Header
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'VERCO', fontSize: 21, bold: true, color: '#0f172a', characterSpacing: -0.5 },
              { text: 'Avanza Sin Limites', fontSize: 7, bold: true, color: '#4f46e5', margin: [0, 2, 0, 0], characterSpacing: 1 }
            ]
          },
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              { text: 'GUÍA DE DESPACHO INTERNA', fontSize: 13, bold: true, color: '#0f172a' },
              {
                margin: [0, 4, 0, 0],
                table: {
                  body: [
                    [
                      {
                        text: `Nº ${pedido.id}`,
                        fontSize: 12,
                        bold: true,
                        color: '#0f172a',
                        fillColor: '#f1f5f9',
                        alignment: 'center',
                        margin: [8, 4, 8, 4]
                      }
                    ]
                  ]
                },
                layout: {
                  hLineWidth: () => 1,
                  vLineWidth: () => 1,
                  hLineColor: () => '#cbd5e1',
                  vLineColor: () => '#cbd5e1'
                }
              }
            ]
          }
        ],
        margin: [0, 0, 0, 15]
      },
      // 3. Grid line
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 525, y2: 0, lineWidth: 1.5, lineColor: '#0f172a' }
        ],
        margin: [0, 0, 0, 15]
      },
      // 4. Info cards
      {
        columns: [
          {
            width: '*',
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: '#f8fafc',
                    margin: [10, 8, 10, 8],
                    stack: [
                      { text: '1. INFORMACIÓN DEL DESTINATARIO (CLIENTE)', fontSize: 7.2, bold: true, color: '#475569', margin: [0, 0, 0, 6] },
                      {
                        columns: [
                          { text: 'Cliente:', fontSize: 7.5, bold: true, color: '#64748b', width: 68 },
                          { text: pedido.cliente.nombre.toUpperCase(), fontSize: 8.5, bold: true, color: '#0f172a', width: '*' }
                        ],
                        margin: [0, 2, 0, 2]
                      },
                      {
                        columns: [
                          { text: 'Documento:', fontSize: 7.5, bold: true, color: '#64748b', width: 68 },
                          { text: clienteDoc, fontSize: 8.5, bold: true, color: '#0f172a', width: '*' }
                        ],
                        margin: [0, 2, 0, 2]
                      },
                      {
                        columns: [
                          { text: 'Dirección:', fontSize: 7.5, bold: true, color: '#64748b', width: 68 },
                          { text: clienteDireccion.toUpperCase(), fontSize: 8.5, bold: true, color: '#0f172a', width: '*' }
                        ],
                        margin: [0, 2, 0, 2]
                      },
                      {
                        columns: [
                          { text: 'Distrito:', fontSize: 7.5, bold: true, color: '#64748b', width: 68 },
                          { text: clienteUbigeo.toUpperCase(), fontSize: 8.5, bold: true, color: '#0f172a', width: '*' }
                        ],
                        margin: [0, 2, 0, 2]
                      },
                      {
                        columns: [
                          { text: 'Teléfono:', fontSize: 7.5, bold: true, color: '#64748b', width: 68 },
                          { text: pedido.cliente.telefono || '---', fontSize: 8.5, bold: true, color: '#0f172a', width: '*' }
                        ],
                        margin: [0, 2, 0, 2]
                      }
                    ]
                  }
                ]
              ]
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => '#cbd5e1',
              vLineColor: () => '#cbd5e1'
            }
          },
          { width: 15, text: '' },
          {
            width: '*',
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: '#f8fafc',
                    margin: [10, 8, 10, 8],
                    stack: [
                      { text: '2. DETALLES DEL DESPACHO Y OPERADOR', fontSize: 7.2, bold: true, color: '#475569', margin: [0, 0, 0, 6] },
                      {
                        columns: [
                          { text: 'Vendedor Asignado:', fontSize: 7.5, bold: true, color: '#64748b', width: 90 },
                          { text: pedido.vendedor.toUpperCase(), fontSize: 8.5, bold: true, color: '#0f172a', width: '*' }
                        ],
                        margin: [0, 2, 0, 2]
                      },
                      {
                        columns: [
                          { text: 'Autorizado por:', fontSize: 7.5, bold: true, color: '#64748b', width: 90 },
                          { text: jefeVentas.toUpperCase(), fontSize: 8.5, bold: true, color: '#0f172a', width: '*' }
                        ],
                        margin: [0, 2, 0, 2]
                      },
                      {
                        columns: [
                          { text: 'Fecha del Pedido:', fontSize: 7.5, bold: true, color: '#64748b', width: 90 },
                          { text: formattedOrderDate, fontSize: 8.5, bold: true, color: '#0f172a', width: '*' }
                        ],
                        margin: [0, 2, 0, 2]
                      },
                      {/*
                      {
                        columns: [
                          { text: 'Estado de Transito:', fontSize: 7.5, bold: true, color: '#64748b', width: 90 },
                          { text: `Aprobad. Almacén (${pedido.estado})`, fontSize: 8.5, bold: true, color: '#10b981', width: '*' }
                        ],
                        margin: [0, 2, 0, 2]
                      }
                        */}
                    ]
                  }
                ]
              ]
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => '#cbd5e1',
              vLineColor: () => '#cbd5e1'
            }
          }
        ],
        margin: [0, 0, 0, 15]
      },
      // 5. Manifest section header
      {
        text: '3. ARTÍCULOS AUTORIZADOS PARA EMPAQUE Y DISTRIBUCIÓN',
        fontSize: 8.5,
        bold: true,
        color: '#0f172a',
        margin: [0, 10, 0, 8]
      },
      // 6. Items table
      {
        table: {
          widths: [65, '*', 160, 50, 40, 60],
          headerRows: 1,
          body: [
            tableHeader,
            ...tableRows
          ]
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 1,
          vLineWidth: () => 0,
          hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#0f172a' : '#cbd5e1'
        },
        margin: [0, 0, 0, 15]
      },
      // 7. Summary totals
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  { text: 'TOTAL UNIDADES (PARES)', fontSize: 7.5, bold: true, color: '#475569', margin: [5, 4, 5, 4], border: [true, true, true, false] },
                  { text: `${totalPares} u.`, fontSize: 9.5, bold: true, color: '#0f172a', alignment: 'right', margin: [5, 4, 5, 4], border: [true, true, true, false] }
                ],
                [
                  { text: 'TOTAL VALORIZADO', fontSize: 9, bold: true, color: '#ffffff', fillColor: '#0f172a', margin: [5, 6, 5, 6], border: [true, false, true, true] },
                  { text: moneyFormatter(pedido.totalMonto || pedido.totalPrecio), fontSize: 11, bold: true, color: '#ffffff', fillColor: '#0f172a', alignment: 'right', margin: [5, 6, 5, 6], border: [true, false, true, true] }
                ]
              ]
            },
            layout: {
              hLineWidth: () => 1.5,
              vLineWidth: () => 1.5,
              hLineColor: () => '#0f172a',
              vLineColor: () => '#0f172a'
            }
          }
        ],
        margin: [0, 5, 0, 15]
      },
      // 8. Signatures Section
      {
        columns: [
          {
            width: '*',
            alignment: 'center',
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: '#64748b', dash: { length: 4 } }] },
              { text: 'OPERACIONES DE VENTAS / DISTRIBUIDOR', fontSize: 7, bold: true, color: '#64748b', margin: [0, 6, 0, 0] },
              { text: pedido.vendedor.toUpperCase(), fontSize: 9.5, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
              { text: 'Cargo: Asesor de Ventas', fontSize: 7.2, color: '#475569', margin: [0, 1, 0, 0] }
            ]
          },
          { width: 30, text: '' },
          {
            width: '*',
            alignment: 'center',
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: '#64748b', dash: { length: 4 } }] },
              { text: 'APROBADOR DE ALMACÉN', fontSize: 7, bold: true, color: '#64748b', margin: [0, 6, 0, 0] },
              { text: jefeVentas.toUpperCase(), fontSize: 9.5, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
              { text: 'Logística de Operaciones', fontSize: 7.2, color: '#475569', margin: [0, 1, 0, 0] }
            ]
          }
        ],
        margin: [0, 20, 0, 20],
        unbreakable: true
      },
      // 9. Watermark footer
      {
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525, y2: 0, lineWidth: 1, lineColor: '#cbd5e1' }], margin: [0, 0, 0, 4] },
          {
            columns: [
              { text: `IMPRESO CON SISTEMA CENTRAL VERCO LOGÍSTICA. ID DE RASTREO: GI-${pedido.id}`, fontSize: 6.5, bold: true, color: '#94a3b8' },
              { text: `EMISIÓN: ${formattedDate}`, fontSize: 6.5, bold: true, color: '#94a3b8', alignment: 'right' }
            ]
          }
        ],
        margin: [0, 10, 0, 0]
      }
    ],
    styles: {
      tableHeader: {
        fontSize: 7.5,
        bold: true,
        margin: [0, 2, 0, 2]
      }
    }
  };

  return docDefinition;
}

/**
 * Builds a highly professional, high-contrast, print-optimized document for internal dispatch.
 * Calibrated specifically to fit full A4 print dimensions perfectly on physical printers.
 * Generates it as a Blob via pdfmake for superior layout density.
 */
export async function buildPedidoPdfBlobFormal(pedido: Pedido, jefeVentas: string): Promise<Blob> {
  const docDefinition = buildPedidoPdfMakeDefinition(pedido, jefeVentas);
  return new Promise((resolve, reject) => {
    try {
      ((pdfMake as any).createPdf(docDefinition) as any).getBlob((blob: Blob) => {
        resolve(blob);
      });
    } catch (err) {
      reject(err);
    }
  });
}

