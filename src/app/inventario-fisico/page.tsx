'use client';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useUser } from '../context/UserContext';
import { getAllowedAdjustmentWarehouses, getInventorySnapshot, registerInventoryAdjustment, AllowedWarehouse, InventorySnapshotResponse } from '../services/inventoryAdjustmentService';
import { generateLabelsPDF } from '../utils/generateLabels';

export default function PhysicalInventory() {
  const { user } = useUser();
  const [warehouses, setWarehouses] = useState<AllowedWarehouse[]>([]);
  const [snapshot, setSnapshot] = useState<InventorySnapshotResponse | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const scanner = useRef<HTMLInputElement>(null);
  useEffect(() => { if (user?.token) getAllowedAdjustmentWarehouses(user.token).then(setWarehouses).catch(e => setMessage(e.message)); }, [user?.token]);
  async function load(id: number) {
    if (!user?.token || !id) return;
    if (Object.keys(counts).length && !window.confirm('¿Descartar el conteo actual?')) return;
    setBusy(true);
    try { setSnapshot(await getInventorySnapshot(id, user.token)); setCounts({}); key.current = crypto.randomUUID(); setMessage(''); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Error al cargar'); }
    finally { setBusy(false); scanner.current?.focus(); }
  }
  function scan() {
    const value = code.trim();
    const matches = snapshot?.items.filter(r => r.barcode === value || `${r.sku}'${r.size ?? ''}` === value) ?? [];
    if (matches.length !== 1) { setMessage('Código desconocido o ambiguo. Revise artículo y talla.'); return; }
    const row = matches[0];
    setCounts(c => ({ ...c, [row.stock_id]: (c[row.stock_id] ?? 0) + 1 }));
    key.current = crypto.randomUUID(); setCode(''); setMessage('Unidad contada');
  }
  const rows = snapshot?.items ?? [];
  function exportExcel() {
    const sheet = XLSX.utils.json_to_sheet(rows.map(r => ({ Almacen: snapshot?.warehouse.warehouse_name, SKU: r.sku, Talla: r.size, Sistema: r.stock_current, Conteo: counts[r.stock_id] ?? '', Diferencia: counts[r.stock_id] === undefined ? '' : counts[r.stock_id] - r.stock_current })));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Conteo físico'); XLSX.writeFile(book, 'inventario-fisico.xlsx');
  }
  async function apply() {
    if (!snapshot || !user?.token || busy) return;
    if (rows.some(r => counts[r.stock_id] === undefined)) { setMessage('Complete todas las filas, incluyendo las cantidades cero.'); return; }
    const changed = rows.filter(r => counts[r.stock_id] !== r.stock_current);
    if (!changed.length) { setMessage('Conteo completo sin diferencias.'); return; }
    if (!window.confirm('¿Autorizar y aplicar las diferencias al stock?')) return;
    setBusy(true);
    try {
      const result = await registerInventoryAdjustment({ warehouse_id: snapshot.warehouse.id, reason: 'PHYSICAL_COUNT', idempotency_key: key.current, items: changed.map(r => ({ stock_id: r.stock_id, product_id: r.product_id, product_size_id: r.product_size_id, observed_quantity: r.stock_current, observed_version: r.version, new_quantity: counts[r.stock_id] })) }, user.token);
      setCounts({}); setSnapshot(null); setMessage(`Ajuste aplicado: ${result.operation.operation_code}`);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo aplicar'); }
    finally { setBusy(false); }
  }
  return <main style={{ padding: 24, overflowX: 'auto' }}>
    <h1>Inventario físico</h1>
    <p>Seleccione un almacén. Configure Zebra DataWedge con salida de teclado y sufijo Enter. Cada lectura suma una unidad. Las filas sin contar no equivalen a cero.</p>
    <select disabled={busy} value={snapshot?.warehouse.id ?? ''} onChange={e => void load(Number(e.target.value))}><option value="">Seleccione almacén</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}</select>
    <form onSubmit={e => { e.preventDefault(); scan(); }}><input ref={scanner} aria-label="Código Zebra" placeholder="Escanear código y talla" value={code} disabled={!snapshot || busy} onChange={e => setCode(e.target.value)} /><button disabled={!snapshot || busy}>Contar unidad</button></form>
    <p role="status">{message}</p>
    <button disabled={!snapshot || busy} onClick={exportExcel}>Exportar Excel</button>
    <button disabled={!rows.length || busy} onClick={() => generateLabelsPDF(rows.map(r => ({ codigo: r.sku, talla: r.size ?? '' })))}>Imprimir etiquetas PDF 50 × 25 mm</button>
    <button disabled={!snapshot || busy} onClick={() => void apply()}>Autorizar ajuste</button>
    <p>{Object.keys(counts).length} de {rows.length} filas contadas</p>
    <table><thead><tr>{['SKU', 'Descripción', 'Talla', 'Stock', 'Conteo', 'Diferencia'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.stock_id}><td>{r.sku}</td><td>{r.description}</td><td>{r.size}</td><td>{r.stock_current}</td><td><input aria-label={`Conteo ${r.sku} ${r.size}`} type="number" min="0" step="1" disabled={busy} value={counts[r.stock_id] ?? ''} onChange={e => { const raw = e.target.value; if (raw !== '' && (!Number.isSafeInteger(Number(raw)) || Number(raw) < 0)) return; setCounts(c => { const next = { ...c }; if (raw === '') delete next[r.stock_id]; else next[r.stock_id] = Number(raw); return next; }); key.current = crypto.randomUUID(); }} /></td><td>{counts[r.stock_id] === undefined ? 'Pendiente' : counts[r.stock_id] - r.stock_current}</td></tr>)}</tbody></table>
  </main>;
}
