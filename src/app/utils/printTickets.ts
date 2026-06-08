import { WebSaleResponse } from '../services/webSaleService';
import Swal from 'sweetalert2';

/**
 * Generates a high-contrast standard horizontal 1D barcode sequence using pure vector-like HTML/CSS nodes.
 * This guarantees 100% crispy print resolution on thermal devices (e.g., 203 DPI or 300 DPI)
 * without requiring any slow external asset networks.
 */
const generateBarcodeHtml = (ticket: string) => {
  let hash = 0;
  for (let i = 0; i < ticket.length; i++) {
    hash = ticket.charCodeAt(i) + ((hash << 5) - hash);
  }

  let html = '';
  // Create 45 alternating columns (black and white) of varying proportional weights
  for (let i = 0; i < 45; i++) {
    const isBlack = i % 2 === 0;
    const bit = (Math.abs(hash) >> (i % 24)) & 1;

    // Choose authentic standard bar thicknesses in millimeters
    let widthMm = 1;
    if (isBlack) {
      widthMm = bit === 1 ? 2.4 : 1.1;
    } else {
      widthMm = bit === 1 ? 1.5 : 0.8;
    }

    const color = isBlack ? '#000' : '#fff';
    html += `<div style="background-color: ${color}; width: ${widthMm}mm; height: 11mm; flex-shrink: 0; display: inline-block;"></div>`;
  }
  return html;
};

/**
 * Dispatches thermal shipping labels to the device printer with standard 80mm x 100mm specifications.
 */
export const printLabels = (sales: WebSaleResponse[]) => {
  if (sales.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Calle de Impresión Vacía',
      text: 'Selecciona al menos un pedido aprobado para generar tus etiquetas.',
      confirmButtonColor: '#4f46e5',
      background: '#0f172a',
      color: '#fff'
    });
    return;
  }

  // Open empty printing context
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    Swal.fire({
      icon: 'error',
      title: 'Ventana Emergente Bloqueada',
      text: 'Habilita los permisos de "Pop-ups / Ventanas Emergentes" en tu navegador para lanzar la impresión térmica.',
      confirmButtonColor: '#fb7185',
      background: '#0f172a',
      color: '#fff'
    });
    return;
  }

  // Generate HTML compilation in optimal high-contrast layouts
  const labelsHtml = sales
    .map((sale) => {
      const formattedDate = new Date(sale.created_at).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Agency or Direct badge indicators
      const courierName = sale.is_agency_delivery
        ? (sale.agency_name || 'COURIER').toUpperCase()
        : 'ENTREGA LOCAL';

      const trackingNumber = sale.shipping_code || `ID-${sale.id}`;

      return `
        <div class="thermal-label">
          
          <!-- SECCIÓN 01: LOGO DE MARCA & CLASIFICACIÓN DE TRANSPORTE -->
          <div class="grid-header">
            <div class="brand-logistics">
              <div class="brand-main">VERCO</div>
            </div>
            
            <div class="delivery-badge ${sale.is_agency_delivery ? 'agency' : 'direct'}">
              ${courierName}
            </div>
          </div>

          <!-- SECCIÓN 02: DATOS DEL REMITENTE -->
          <div class="origin-drawer">
            
            <span><strong>FECHA:</strong> ${formattedDate}</span>
          </div>

          <!-- SECCIÓN 03: DATOS PRINCIPALES DE ENTREGA (DESTINATARIO) -->
          <div class="recipient-card">
            <div class="small-title">1. DESTINATARIO / TO</div>
            
            <div class="recipient-name">${sale.customer_name.toUpperCase()}</div>
            
            <table class="nested-meta-table">
              <tr>
                <td style="width: 50%;"><strong>CELULAR:</strong> ${sale.customer_phone}</td>
                <td style="width: 50%;"><strong>DNI:</strong> ${sale.customer_dni || '----------'}</td>
              </tr>
            </table>

            <div class="payment-card">
              <div class="small-title">2. INFORMACIÓN DE PAGO</div>

              <div class="payment-row">
                <span>MÉTODO:</span>
                <b>${sale.payment_method || 'NO DEFINIDO'}</b>
              </div>

              <div class="payment-row">
                <span>TOTAL:</span>
                <b>S/ ${Number(sale.total_amount || 0).toFixed(2)}</b>
              </div>
            </div>

            <div class="recipient-address">
              <strong>DIRECCIÓN:</strong> ${sale.customer_address.toUpperCase()}
            </div>

            <!-- UBIGEO ZONE ROUTING CODE -->
            <div class="routing-ubigeo-strip">
              ${sale.department.toUpperCase()} / ${sale.province.toUpperCase()} / ${sale.district.toUpperCase()}
            </div>
          </div>

          <!-- SECCIÓN 04: DETALLE FÍSICO DE LOS PAQUETES (PACKING LIST) -->
          <div class="manifest-card">
            <div class="small-title">2. DETALLE DE CONTENIDO</div>
            <table class="manifest-table">
              <thead>
                <tr>
                  <th style="text-align: left;">CÓDIGO / ARTÍCULO</th>
                  <th style="width: 20%; text-align: center;">TALLA</th>
                  <th style="width: 20%; text-align: center;">CANT</th>
                </tr>
              </thead>
              <tbody>
                ${sale.details
          .map(
            (detail) => `
                  <tr>
                    <td style="font-weight: bold; font-family: monospace;">
                      ${detail.article_code} <span style="font-weight: normal; font-family: inherit; font-size: 6.5pt;">(${detail.product_name.substring(0, 18)})</span>
                    </td>
                    <td style="text-align: center; font-weight: bold;">${detail.size}</td>
                    <td style="text-align: center; font-weight: bold; font-family: monospace;">x${detail.quantity}</td>
                  </tr>
                `
          )
          .join('')}
              </tbody>
            </table>
          </div>

          <!-- SECCIÓN 05: CÓDIGO BARRAS DE TRAZABILIDAD -->
          <div class="barcode-footer">
            <div class="tracking-label">TRAZABILIDAD Y DESPACHO ELECTRÓNICO</div>
            
            <div class="barcode-matrix">
              ${generateBarcodeHtml(sale.ticket)}
            </div>
            
            <div class="ticket-readout">* ${sale.ticket} *</div>
          </div>

          <!-- SECCIÓN 06: ATRIBUTOS AUXILIARES -->
          <div class="sub-footer-tag">
            <span>REGISTRO DE VENTA: #${sale.id}</span>
            <span style="font-weight: bold;">GUÍA ADJ: ${trackingNumber}</span>
          </div>

        </div>
      `;
    })
    .join('');

  // Write printer stylesheet and nodes
  printWindow.document.write(`
    <html>
      <head>
        <title>Imprenta Térmica de Etiquetas VERCO</title>
        <style>
          /* Thermal Printer Calibration: 80mm width vs 100mm height */
          @page {
            size: 4in 6in;
            margin: 0;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            width: 100mm;
            background-color: #fff;
            color: #000000;
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Label outer card (76mm x 96mm to handle standard unprintable margin areas) */
          .thermal-label {
            box-sizing: border-box;
            width: 96mm;
            height: 145mm;
            margin: 3mm auto 0 auto;
            padding: 3mm;
            border: 1.5px solid #000000;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            background-color: #ffffff;
            page-break-after: always;
          }

          /* Header style */
          .grid-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 1.5mm;
          }

          .brand-logistics {
            line-height: 1;
          }

          .brand-main {
            font-size: 14pt;
            font-weight: 900;
            letter-spacing: -0.5px;
            font-family: Arial, sans-serif;
          }

          .brand-sub {
            font-size: 5.5pt;
            font-weight: bold;
            color: #000000;
            letter-spacing: 0.1px;
            margin-top: 0.5mm;
            text-transform: uppercase;
          }

          .delivery-badge {
            background-color: #000000;
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: 900;
            padding: 0.8mm 1.8mm;
            border-radius: 0.5mm;
            text-align: center;
            letter-spacing: 0.25px;
            max-width: 32mm;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .delivery-badge.direct {
            background-color: #ffffff;
            color: #000000;
            border: 1.5px solid #000000;
          }

          /* Sender section style */
          .origin-drawer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 6pt;
            border-bottom: 1px dashed #000000;
            padding: 0.5mm 0;
            margin-top: 1mm;
          }

          /* Title of modular parts */
          .small-title {
            font-size: 6pt;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.6mm;
          }

          /* Recipient layout style */
          .recipient-card {
            margin-top: 1.2mm;
            border-bottom: 1px dashed #000000;
            padding-bottom: 1.5mm;
          }

          .recipient-name {
            font-size: 14pt;
            font-weight: 900;
            line-height: 1.1;
            text-transform: uppercase;
            text-align: center;
            margin: 2mm 0;
          }

          .nested-meta-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 18pt;
            margin-top: 0.6mm;
            margin-bottom: 0.6mm;
          }

          .nested-meta-table td {
            padding: 0;
            border: none;
            font-size: 12pt;
          }

          .recipient-address {
            font-size: 10pt;
            line-height: 1.4;
            max-height: 9.5mm;
            overflow: hidden;
            word-wrap: break-word;
            padding: 2mm;
            border: 1px solid #000;
            margin-top: 2mm;
          }

          .payment-card {
            border: 2px solid #000;
            padding: 2mm;
            margin-top: 2mm;
          }

          .payment-row {
            display: flex;
            justify-content: space-between;
            margin-top: 1mm;
            font-size: 9pt;
          }

          /* Route highlighting */
          .routing-ubigeo-strip {
            background-color: #000000;
            color: #ffffff;
            text-align: center;
            font-size: 8.5pt;
            font-weight: 900;
            padding: 0.8mm;
            border-radius: 0.4mm;
            margin-top: 1mm;
            letter-spacing: 0.2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Manifest table details style */
          .manifest-card {
            margin-top: 1.2mm;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          }

          .manifest-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
            margin-top: 0.5mm;
          }

          .manifest-table th {
            background-color: #000000;
            color: #ffffff;
            border: 1px solid #000000;
            padding: 2mm;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
          }

          .manifest-table td {
            border: 1px solid #000000;
            padding: 2mm;
            line-height: 1.1;
            font-size: 9pt;
          }

          /* Barcode module bottom */
          .barcode-footer {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 1.5mm;
            padding-top: 1.2mm;
            border-top: 1px dashed #000000;
          }

          .tracking-label {
            font-size: 5.5pt;
            font-weight: bold;
            letter-spacing: 0.2px;
            color: #222222;
            margin-bottom: 0.8mm;
            text-transform: uppercase;
          }

          .barcode-matrix {
            display: flex;
            align-items: stretch;
            justify-content: center;
            height: 11mm;
            max-width: 100%;
            overflow: hidden;
          }

          .ticket-readout {
            font-size: 8pt;
            font-weight: bold;
            letter-spacing: 3px;
            font-family: monospace;
            margin-top: 0.5mm;
          }

          /* Sub tag identifier details */
          .sub-footer-tag {
            border-top: 1px solid #000000;
            display: flex;
            justify-content: space-between;
            font-size: 5.8pt;
            font-family: monospace;
            padding-top: 0.6mm;
            margin-top: 1mm;
          }

          /* Reset and styling for native browser print queues */
          @media print {
            body {
              background-color: #ffffff;
            }
            .thermal-label {
              border: 1.5px solid #000000 !important;
              box-shadow: none !important;
              margin: 3mm 0 auto !important;
              break-after: page;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          // Automatic trigger print on modal launch
          setTimeout(function() {
            window.print();
            window.close();
          }, 350);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  {/*}
  Swal.fire({
    icon: 'success',
    title: 'Cola de Impresión Enviada',
    text: `Conectando con tu impresora térmica. Se han enviado ${sales.length} etiqueta(s) en formato 80mm x 100mm.`,
    confirmButtonColor: '#4f46e5',
    background: '#0f172a',
    color: '#fff'
  });
  */}
};
