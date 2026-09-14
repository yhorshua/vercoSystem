import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011';
const outputDir = join(process.cwd(), 'artifacts', 'responsive-audit');
const edgePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 9337;
const profileDir = mkdtempSync(join(tmpdir(), 'verco-responsive-'));
mkdirSync(outputDir, { recursive: true });

const edge = spawn(edgePath, [
  '--headless=new',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  '--disable-gpu',
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--disable-gpu-shader-disk-cache',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-allow-origins=*',
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
edge.stderr.on('data', (chunk) => {
  const message = chunk.toString().trim();
  if (message) console.error(`[browser] ${message}`);
});
edge.on('exit', (code) => console.error(`[browser] proceso finalizado con código ${code}`));
let activeClient = null;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function retryJson(url, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await sleep(250);
  }
  throw new Error(`No se pudo conectar con Edge en ${url}`);
}

class CdpClient {
  constructor(url) {
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
    this.socket.binaryType = 'arraybuffer';
    this.ready = new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = reject;
    });
    this.socket.onmessage = async (event) => {
      const raw = typeof event.data === 'string'
        ? event.data
        : Buffer.from(event.data instanceof ArrayBuffer ? event.data : await event.data.arrayBuffer()).toString('utf8');
      const message = JSON.parse(raw);
      if (message.id) {
        const callback = this.pending.get(message.id);
        if (!callback) return;
        this.pending.delete(message.id);
        clearTimeout(callback.timer);
        if (message.error) callback.reject(new Error(message.error.message));
        else callback.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params);
    };
    this.socket.onclose = (event) => {
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(new Error(`Conexión CDP cerrada (${event.code})`));
      }
      this.pending.clear();
    };
  }

  async connect() {
    await this.ready;
  }

  on(method, listener) {
    const entries = this.listeners.get(method) || [];
    entries.push(listener);
    this.listeners.set(method, entries);
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Tiempo agotado en CDP: ${method}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

const longClient = 'DISTRIBUIDORA INTERNACIONAL DE CALZADO Y ACCESORIOS DEL PACÍFICO S.A.C.';
const quotation = {
  id: 1, quote_number: 'CO-2026-000001', business_date: '2026-09-13', expires_on: '2026-09-20',
  client_name: longClient, seller_name: 'VENDEDOR DE PRUEBA RESPONSIVE', subtotal: '500.00',
  discount_total: '0.00', tax_total: '0.00', total: '500.00', remaining_quantity: 8,
  status: 'ISSUED', effective_status: 'ISSUED', observations: null,
};
const quotationLines = [
  { id: 10, sku_snapshot: 'SKU-EXTREMADAMENTE-LARGO-001', description_snapshot: 'Zapatilla deportiva de nombre deliberadamente extenso para comprobar el ajuste responsive', size_snapshot: '42', quantity: 10, used_quantity: 2, remaining_quantity: 8, unit_price: '50.00', line_total: '500.00' },
];
const inventoryRows = [
  { stock_id: 1, warehouse_id: 1, product_id: 1, product_size_id: 1, sku: 'SKU-MUY-LARGO-RESPONSIVE-001', barcode: null, description: 'Producto con una descripción muy extensa para validar saltos de línea en dispositivos pequeños', brand_name: 'MARCA EXTENSA', model_code: 'MODELO-001', color: 'NEGRO', category_id: 1, category_name: 'CALZADO DEPORTIVO', size: '42', stock_current: 12, stock_reserved: 2, stock_available: 10, unit_of_measure: 'PAR', product_active: true, version: 1, last_modified_utc: '2026-09-13T12:00:00Z' },
];

function mockResponse(url) {
  const path = new URL(url).pathname;
  if (path === '/clients/mine') return [{ id: 1, document_type: '06', document_number: '20123456789', business_name: longClient, trade_name: null, address: 'Avenida con un nombre suficientemente largo 123', district: 'Miraflores', province: 'Lima', department: 'Líma', country: 'Perú', phone: '999999999', email: 'cliente.responsive@example.com', seller_id: 1, created_at: '2026-09-13T12:00:00Z', updated_at: null, last_order_at: null }];
  if (path === '/quotations/1') return { quotation, details: quotationLines };
  if (path === '/quotations') return { data: [quotation], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
  if (path === '/inventory-adjustments/warehouses') return [{ id: 1, warehouse_name: 'ALMACÉN PRINCIPAL CON NOMBRE EXTENSO', type: 'PRINCIPAL', location: 'Lima' }];
  if (path === '/inventory-adjustments/warehouses/1/inventory') return { warehouse: { id: 1, warehouse_name: 'ALMACÉN PRINCIPAL CON NOMBRE EXTENSO', type: 'PRINCIPAL', location: 'Lima' }, items: inventoryRows, snapshot: { captured_at_utc: '2026-09-13T12:00:00Z', captured_at_lima: '13/09/2026 07:00', item_count: 1 } };
  if (path === '/pending-payments/count') return { pendingCredits: 1, definition: 'credit_sales_with_pending_balance', businessDate: '2026-09-13', timeZone: 'America/Lima' };
  if (path === '/pending-payments/1') return { sale: { id: 1, sale_code: 'VENTA-CREDITO-0000000001', sale_date: '2026-09-01', customer_id: 1, customer_name: longClient, total_amount: '500.00', monto_adelanto: '100.00', amount_paid: '100.00', monto_restante: '400.00', fecha_proximo_pago: '2026-09-10', days_remaining: -3, payment_state: 'vencido', warehouse_id: 1, user_id: 1, metodo_pago_adelanto: 'efectivo', payment_status: 'PENDING' }, items: [{ id: 1, article_code: 'ARTICULO-CODIGO-MUY-LARGO-001', article_description: 'Descripción larga de producto para prueba responsive', size: '42', quantity: '2', unit_price: '250.00', line_total: '500.00' }], payments: [] };
  if (path === '/pending-payments') return { data: [{ id: 1, sale_code: 'VENTA-CREDITO-0000000001', sale_date: '2026-09-01', customer_id: 1, customer_name: longClient, total_amount: '500.00', monto_adelanto: '100.00', amount_paid: '100.00', monto_restante: '400.00', fecha_proximo_pago: '2026-09-10', days_remaining: -3, payment_state: 'vencido' }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
  if (path === '/whatsapp/leads') return { data: [{ id: 1, nombre: longClient, telefono: '51999999999', estado: 'CONTACTADO', ultimoMensaje: 'Mensaje muy largo sin espacios_ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ', fechaUltimoMensaje: '2026-09-13T12:00:00Z', mensajesNoLeidos: 2 }], meta: { page: 1, limit: 25, total: 1, totalPages: 1 } };
  return null;
}

async function evaluate(client, expression) {
  const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function main() {
  await retryJson(`http://127.0.0.1:${debugPort}/json/version`);
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${baseUrl}/login`)}`, { method: 'PUT' }).then((response) => response.json());
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  activeClient = client;
  console.log('Edge conectado; preparando datos de prueba...');
  await Promise.all([
    client.send('Page.enable'), client.send('Runtime.enable'), client.send('Network.enable'),
    client.send('Fetch.enable', { patterns: [{ urlPattern: '*', resourceType: 'XHR', requestStage: 'Request' }] }),
  ]);

  client.on('Fetch.requestPaused', async ({ requestId, request }) => {
    const mocked = request.url.startsWith(baseUrl) ? null : mockResponse(request.url);
    if (mocked !== null) {
      await client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(JSON.stringify(mocked)).toString('base64') });
    } else {
      await client.send('Fetch.continueRequest', { requestId });
    }
  });

  const user = { id: 1, full_name: 'USUARIO DE PRUEBA RESPONSIVE', email: 'test@example.com', cellphone: '', address_home: '', id_cedula: '', rol_id: 1, role: { id: 1, name_role: 'Administrador' }, date_register: '', state_user: null, warehouse_id: 1, warehouse: null, token: 'visual-test-token' };
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('access_token', 'visual-test-token'); localStorage.setItem('user_data', ${JSON.stringify(JSON.stringify(user))}); } catch {}` });
  await client.send('Network.setCookie', { name: 'access_token', value: 'visual-test-token', url: baseUrl, path: '/' });
  await client.send('Network.setCookie', { name: 'role', value: 'Administrador', url: baseUrl, path: '/' });

  const widths = [320, 360, 375, 390, 414, 768, 1024, 1440];
  const routes = ['/cotizacion', '/quotation-list', '/register-requested', '/crm', '/pendientes-pago', '/pendientes-pago/1', '/inventorySystem'];
  const expectedText = {
    '/cotizacion': 'GENERAR COTIZACIÓN',
    '/quotation-list': 'Cotizaciones',
    '/register-requested': 'Registrar Pedido',
    '/crm': 'CRM WhatsApp',
    '/pendientes-pago': 'Pendientes de pago',
    '/pendientes-pago/1': 'Detalle de operación',
    '/inventorySystem': 'Actualización de inventario',
  };
  const results = [];

  for (const route of routes) {
    for (const width of widths) {
      console.log(`Verificando ${route} en ${width}px`);
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 768 });
      await client.send('Page.navigate', { url: `${baseUrl}${route}` });
      await sleep(1800);

      if (route === '/cotizacion') {
        await evaluate(client, `(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('BUSCAR O CREAR CLIENTE')); button?.click(); })()`);
        await sleep(500);
        await evaluate(client, `(() => { const card = [...document.querySelectorAll('div.cursor-pointer')].find((item) => item.textContent?.includes(${JSON.stringify(longClient)})); card?.click(); })()`);
        await sleep(300);
      }

      const measurement = await evaluate(client, `(() => {
        const overflowing = [...document.querySelectorAll('body *')].filter((element) => {
          const style = getComputedStyle(element); if (style.display === 'none' || style.position === 'fixed') return false;
          const rect = element.getBoundingClientRect(); return rect.right > innerWidth + 1 || rect.left < -1;
        }).slice(0, 8).map((element) => ({ tag: element.tagName, className: String(element.className).slice(0, 160), right: Math.round(element.getBoundingClientRect().right) }));
        return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, pageText: document.body.innerText.slice(0, 500), overflowing, selectValues: [...document.querySelectorAll('select')].map((select) => ({ value: select.value, label: select.options[select.selectedIndex]?.text || '' })) };
      })()`);
      const loaded = measurement.pageText.includes(expectedText[route]);
      const ubigeoSelected = route !== '/cotizacion' || ['15', '1501', '150122'].every((value) => measurement.selectValues.some((select) => select.value === value));
      results.push({ route, width, loaded, ubigeoSelected, pass: loaded && ubigeoSelected && measurement.documentWidth <= measurement.viewport && measurement.bodyWidth <= measurement.viewport && measurement.overflowing.length === 0, ...measurement });

      if (width === 320 || (route === '/cotizacion' && [390, 768, 1024, 1440].includes(width))) {
        const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
        writeFileSync(join(outputDir, `${route.replaceAll('/', '_').replace(/^_/, '') || 'home'}-${width}.png`), Buffer.from(screenshot.data, 'base64'));
      }
    }
  }

  const report = { generatedAt: new Date().toISOString(), baseUrl, results };
  writeFileSync(join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  const failures = results.filter((item) => !item.pass);
  console.log(JSON.stringify({ checks: results.length, passed: results.length - failures.length, failed: failures.length, failures, cotizacionUbigeo: results.find((item) => item.route === '/cotizacion' && item.width === 390)?.selectValues }, null, 2));
  await client.send('Browser.close').catch(() => undefined);
  client.close();
  activeClient = null;
  if (failures.length) process.exitCode = 1;
}

const keepAlive = setInterval(() => {}, 1000);
try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  clearInterval(keepAlive);
  if (activeClient) {
    await activeClient.send('Browser.close').catch(() => undefined);
    activeClient.close();
  }
  edge.kill();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      rmSync(profileDir, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 9) console.warn(`No se pudo eliminar el perfil temporal: ${error.message}`);
      else await sleep(300);
    }
  }
}
