import { WebSaleResponse } from "../services/webSaleService";

export const generateLabelHtml = (
  sale: WebSaleResponse
) => {

  const products = sale.details
    .map(
      p => `
      <tr>
        <td>${p.article_code}</td>
        <td>${p.size}</td>
        <td>${p.quantity}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div class="label">

      <div class="header">
        <h1>VERCO STORE</h1>
        <h2>${sale.ticket}</h2>
      </div>

      <div class="section">
        <strong>Cliente</strong>
        <p>${sale.customer_name}</p>
        <p>${sale.customer_phone}</p>
      </div>

      <div class="section">
        <strong>Dirección</strong>
        <p>${sale.customer_address}</p>
        <p>
          ${sale.department}
          /
          ${sale.province}
          /
          ${sale.district}
        </p>
      </div>

      <table>
        ${products}
      </table>

      <div id="barcode-${sale.id}"></div>

    </div>
  `;
};