// utils/printLabels.ts

import JsBarcode from 'jsbarcode';
import { WebSaleResponse } from '../services/webSaleService';
import { generateLabelHtml } from '../components/TicketTemplate';

export const printLabels = (
  sales: WebSaleResponse[]
) => {

  const labels = sales
    .map(generateLabelHtml)
    .join('');

  const printWindow = window.open(
    '',
    '_blank',
    'width=1000,height=800'
  );

  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Etiquetas de Envío</title>

        <style>

          @page{
            size:100mm 150mm;
            margin:5mm;
          }

          body{
            margin:0;
            font-family:Arial, sans-serif;
          }

          .label{
            width:90mm;
            min-height:140mm;
            border:2px solid #000;
            padding:10px;
            margin:auto;
            page-break-after:always;
            box-sizing:border-box;
          }

          .header{
            text-align:center;
            border-bottom:2px solid #000;
            padding-bottom:10px;
            margin-bottom:10px;
          }

          .header h1{
            margin:0;
            font-size:20px;
          }

          .header h2{
            margin:5px 0 0;
            font-size:16px;
          }

          .section{
            margin-bottom:10px;
          }

          .section strong{
            display:block;
            font-size:12px;
            margin-bottom:4px;
          }

          .section p{
            margin:0;
            font-size:14px;
          }

          table{
            width:100%;
            border-collapse:collapse;
            margin-top:10px;
          }

          td{
            border:1px solid #000;
            padding:4px;
            font-size:12px;
          }

          svg{
            width:100%;
            height:60px;
            margin-top:15px;
          }

        </style>
      </head>

      <body>

        ${labels}

      </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = () => {

    sales.forEach((sale) => {

      const svg =
        printWindow.document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg'
        );

      const container =
        printWindow.document.getElementById(
          `barcode-${sale.id}`
        );

      if (!container) return;

      container.appendChild(svg);

      JsBarcode(svg, sale.ticket, {
        format: 'CODE128',
        displayValue: true,
        width: 2,
        height: 50
      });

    });

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
};