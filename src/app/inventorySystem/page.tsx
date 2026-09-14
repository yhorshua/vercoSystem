'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileText, Mail,
  PackageSearch, RefreshCcw, RotateCcw, Save, Search, Share2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';
import {
  AdjustmentReason, AllowedWarehouse, getAllowedAdjustmentWarehouses,
  getInventorySnapshot, InventoryAdjustmentResult, InventoryAdjustmentRow,
  InventorySnapshotResponse, registerInventoryAdjustment,
} from '../services/inventoryAdjustmentService';
import {
  adjustmentReasonLabels, downloadAdjustmentReport, openAdjustmentEmail,
  openAdjustmentWhatsApp, shareAdjustmentReport,
} from '../utils/inventoryAdjustmentReport';

const PAGE_SIZE = 50;
const reasonEntries = Object.entries(adjustmentReasonLabels) as Array<[AdjustmentReason, string]>;

export default function InventorySystemPage() {
  const { user, loading: userLoading } = useUser();
  const [warehouses, setWarehouses] = useState<AllowedWarehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<InventorySnapshotResponse | null>(null);
  const [changes, setChanges] = useState<Record<number, number>>({});
  const [reason, setReason] = useState<AdjustmentReason | ''>('');
  const [observation, setObservation] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState<InventoryAdjustmentResult | null>(null);
  const savingRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const resetRequestIdentity = () => { idempotencyKeyRef.current = null; };

  useEffect(() => {
    if (userLoading || !user?.token) return;
    let active = true;
    setLoadingWarehouses(true);
    getAllowedAdjustmentWarehouses(user.token)
      .then((rows) => {
        if (!active) return;
        setWarehouses(rows);
        const assigned = rows.find((warehouse) => warehouse.id === Number(user.warehouse_id));
        setWarehouseId((current) => current ?? assigned?.id ?? rows[0]?.id ?? null);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los almacenes autorizados');
      })
      .finally(() => { if (active) setLoadingWarehouses(false); });
    return () => { active = false; };
  }, [user, userLoading]);

  const loadInventory = useCallback(async () => {
    if (!warehouseId || !user?.token) return;
    setLoadingInventory(true);
    setError('');
    try {
      const data = await getInventorySnapshot(warehouseId, user.token);
      setSnapshot(data);
      setChanges({});
      setSearch('');
      setCategory('all');
      setPage(1);
      resetRequestIdentity();
    } catch (caught) {
      setSnapshot(null);
      setError(caught instanceof Error ? caught.message : 'No se pudo obtener el inventario');
    } finally {
      setLoadingInventory(false);
    }
  }, [user, warehouseId]);

  useEffect(() => { void loadInventory(); }, [loadInventory]);

  const categories = useMemo(() => {
    const unique = new Map<number, string>();
    snapshot?.items.forEach((item) => {
      if (item.category_id && item.category_name) unique.set(item.category_id, item.category_name);
    });
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [snapshot]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-PE');
    return (snapshot?.items ?? []).filter((item) => {
      const matchesCategory = category === 'all' || String(item.category_id) === category;
      const haystack = [item.sku, item.barcode, item.description, item.brand_name, item.model_code, item.size]
        .filter(Boolean).join(' ').toLocaleLowerCase('es-PE');
      return matchesCategory && (!term || haystack.includes(term));
    });
  }, [category, search, snapshot]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const modifiedRows = useMemo(() => {
    const byId = new Map((snapshot?.items ?? []).map((item) => [item.stock_id, item]));
    return Object.entries(changes).flatMap(([stockId, newQuantity]) => {
      const row = byId.get(Number(stockId));
      return row ? [{ row, newQuantity, difference: newQuantity - row.stock_current }] : [];
    });
  }, [changes, snapshot]);
  const totalIncrease = modifiedRows.reduce((sum, item) => sum + Math.max(0, item.difference), 0);
  const totalDecrease = modifiedRows.reduce((sum, item) => sum + Math.abs(Math.min(0, item.difference)), 0);

  const updateQuantity = (row: InventoryAdjustmentRow, raw: string) => {
    if (raw === '') {
      setChanges((current) => {
        const next = { ...current };
        delete next[row.stock_id];
        return next;
      });
      resetRequestIdentity();
      return;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) return;
    setChanges((current) => {
      const next = { ...current };
      if (value === row.stock_current) delete next[row.stock_id];
      else next[row.stock_id] = value;
      return next;
    });
    resetRequestIdentity();
  };

  const changeWarehouse = async (nextId: number) => {
    if (modifiedRows.length) {
      const result = await Swal.fire({
        icon: 'warning', title: 'Descartar cambios sin guardar',
        text: 'Cambiar de almacén eliminará los ajustes pendientes de esta pantalla.',
        showCancelButton: true, confirmButtonText: 'Descartar y cambiar',
        cancelButtonText: 'Continuar revisando',
      });
      if (!result.isConfirmed) return;
    }
    setLastResult(null);
    setWarehouseId(nextId);
  };

  const save = async () => {
    if (!user?.token || !warehouseId || !snapshot || savingRef.current) return;
    if (!modifiedRows.length) {
      await Swal.fire('Sin cambios', 'Modifica al menos una cantidad antes de guardar.', 'info');
      return;
    }
    if (!reason) {
      await Swal.fire('Motivo requerido', 'Selecciona el motivo del ajuste.', 'warning');
      return;
    }
    if (reason === 'OTHER' && observation.trim().length < 10) {
      await Swal.fire('Observación requerida', 'Para “Otro”, explica el motivo con al menos 10 caracteres.', 'warning');
      return;
    }
    const confirmation = await Swal.fire({
      icon: 'question', title: 'Confirmar ajuste atómico',
      text: `${snapshot.warehouse.warehouse_name}: ${modifiedRows.length} filas · +${totalIncrease} / -${totalDecrease}. Motivo: ${adjustmentReasonLabels[reason]}. Si una fila cambió en el servidor, no se aplicará ninguna.`,
      showCancelButton: true, confirmButtonText: 'Confirmar y guardar',
      cancelButtonText: 'Volver a revisar', reverseButtons: true,
      confirmButtonColor: '#2563eb',
    });
    if (!confirmation.isConfirmed) return;

    savingRef.current = true;
    setSaving(true);
    setError('');
    idempotencyKeyRef.current ||= crypto.randomUUID();
    try {
      const result = await registerInventoryAdjustment({
        warehouse_id: warehouseId,
        reason,
        observation: observation.trim() || undefined,
        idempotency_key: idempotencyKeyRef.current,
        items: modifiedRows.map(({ row, newQuantity }) => ({
          stock_id: row.stock_id, product_id: row.product_id,
          product_size_id: row.product_size_id,
          observed_quantity: row.stock_current, new_quantity: newQuantity,
          observed_version: row.version,
        })),
      }, user.token);
      setLastResult(result);
      const confirmed = new Map(result.items.map((item) => [item.stock_id, item]));
      setSnapshot((current) => current ? {
        ...current,
        items: current.items.map((item) => {
          const saved = confirmed.get(item.stock_id);
          return saved ? {
            ...item, stock_current: saved.new_quantity,
            stock_available: saved.new_quantity - item.stock_reserved,
            version: saved.stock_version_after,
            last_modified_utc: result.operation.occurred_at_utc,
          } : item;
        }),
      } : current);
      setChanges({});
      setReason('');
      setObservation('');
      idempotencyKeyRef.current = null;
      await Swal.fire({
        icon: 'success',
        title: result.duplicate ? 'Operación ya registrada' : 'Inventario actualizado',
        text: `${result.operation.operation_code} · ${result.summary.item_count} filas confirmadas`,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'No se pudo guardar el ajuste';
      setError(message);
      await Swal.fire('Ajuste no aplicado', message, 'error');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const share = async (format: 'pdf' | 'xlsx') => {
    if (!lastResult) return;
    try {
      const shared = await shareAdjustmentReport(lastResult, format);
      if (!shared) {
        await Swal.fire('Archivo descargado', 'Tu navegador no permite compartir archivos directamente. Usa WhatsApp o correo y adjunta manualmente el archivo descargado.', 'info');
      }
    } catch (caught) {
      if ((caught as DOMException)?.name !== 'AbortError') {
        await Swal.fire('No se pudo compartir', 'Descarga el archivo e inténtalo desde la aplicación elegida.', 'error');
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Control trazable por almacén</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Actualización de inventario</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Compara el conteo físico con una instantánea del servidor. Cada cambio exige motivo y queda auditado.</p></div>
            <div className="min-w-0 w-full lg:w-72"><label htmlFor="warehouse" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-300">Almacén autorizado</label><select id="warehouse" value={warehouseId ?? ''} disabled={loadingWarehouses || saving} onChange={(event) => void changeWarehouse(Number(event.target.value))} className="min-w-0 w-full max-w-full rounded-xl border border-white/20 bg-white px-3 py-3 font-bold text-slate-950 outline-none ring-blue-400 focus:ring-2 disabled:opacity-60 sm:px-4"><option value="" disabled>Selecciona un almacén</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.warehouse_name} · {warehouse.type || 'Sin tipo'}</option>)}</select></div>
          </div>
        </header>

        {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"><AlertCircle className="mt-0.5 shrink-0" size={20} /><div><p className="font-black">No se completó la operación</p><p className="mt-1 whitespace-pre-wrap text-sm">{error}</p></div></div>}

        {lastResult && <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-start gap-3 text-emerald-900"><CheckCircle2 className="mt-1 shrink-0" /><div><p className="font-black">Operación confirmada: {lastResult.operation.operation_code}</p><p className="text-sm">{lastResult.operation.occurred_at_lima} · {lastResult.summary.item_count} filas · diferencia neta {lastResult.summary.net_difference}</p></div></div><div className="flex flex-wrap gap-2"><ReportButton icon={FileSpreadsheet} label="Excel" onClick={() => downloadAdjustmentReport(lastResult, 'xlsx')} /><ReportButton icon={FileText} label="PDF" onClick={() => downloadAdjustmentReport(lastResult, 'pdf')} /><ReportButton icon={Share2} label="Compartir PDF" onClick={() => void share('pdf')} /><ReportButton icon={Share2} label="WhatsApp" onClick={() => openAdjustmentWhatsApp(lastResult)} /><ReportButton icon={Mail} label="Correo" onClick={() => openAdjustmentEmail(lastResult)} /></div></div></section>}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_240px_auto]"><label className="relative block min-w-0"><span className="sr-only">Buscar inventario</span><Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={19} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por SKU, descripción, marca, modelo o talla" className="min-w-0 w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><select aria-label="Filtrar por categoría" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="min-w-0 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"><option value="all">Todas las categorías</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><button type="button" onClick={() => void loadInventory()} disabled={loadingInventory || saving || !warehouseId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-black text-white disabled:opacity-50"><RefreshCcw className={loadingInventory ? 'animate-spin' : ''} size={18} /> Recargar</button></div>{snapshot && <p className="mt-3 break-words text-xs font-semibold text-slate-500">Instantánea: {snapshot.snapshot.captured_at_lima} · {snapshot.snapshot.item_count} filas. Código de barras no existe en el esquema actual.</p>}</section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loadingInventory ? <div className="flex min-h-72 items-center justify-center gap-3 text-slate-500"><RefreshCcw className="animate-spin" /> Cargando inventario completo…</div> : !snapshot?.items.length ? <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center text-slate-500"><PackageSearch size={46} className="mb-3 text-slate-300" /><p className="font-bold">Este almacén no tiene inventario activo.</p></div> : <><div className="hidden overflow-x-auto lg:block"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600"><tr><th className="px-4 py-3">Artículo</th><th className="px-4 py-3">Talla / atributos</th><th className="px-4 py-3 text-right">Actual</th><th className="px-4 py-3 text-right">Reservado</th><th className="px-4 py-3 text-right">Disponible</th><th className="px-4 py-3">Nuevo conteo</th><th className="px-4 py-3 text-right">Diferencia</th><th className="px-4 py-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody className="divide-y divide-slate-100">{visibleRows.map((row) => {
            const newQuantity = changes[row.stock_id];
            const changed = newQuantity !== undefined;
            const difference = changed ? newQuantity - row.stock_current : 0;
            return <tr key={row.stock_id} className={changed ? 'bg-blue-50/70' : 'hover:bg-slate-50'}><td className="px-4 py-3"><p className="font-black text-slate-900">{row.sku}</p><p className="max-w-md text-slate-600">{row.description}</p><p className="text-xs text-slate-400">{row.brand_name || 'Sin marca'} · {row.category_name || 'Sin categoría'}</p></td><td className="px-4 py-3"><p className="font-bold">Talla {row.size || 'N/A'}</p><p className="text-xs text-slate-500">{row.color || 'Sin color'} · {row.unit_of_measure}</p></td><td className="px-4 py-3 text-right font-black">{row.stock_current}</td><td className="px-4 py-3 text-right text-amber-700">{row.stock_reserved}</td><td className="px-4 py-3 text-right font-bold text-emerald-700">{row.stock_available}</td><td className="px-4 py-3"><input aria-label={`Nuevo stock de ${row.sku} talla ${row.size || 'N/A'}`} type="number" min={0} step={1} value={changed ? newQuantity : row.stock_current} onChange={(event) => updateQuantity(row, event.target.value)} className={`w-28 rounded-lg border px-3 py-2 font-black outline-none focus:ring-2 ${changed ? 'border-blue-400 text-blue-700 focus:ring-blue-100' : 'border-slate-300 focus:ring-slate-100'}`} /></td><td className={`px-4 py-3 text-right font-black ${difference > 0 ? 'text-emerald-700' : difference < 0 ? 'text-red-700' : 'text-slate-400'}`}>{difference > 0 ? `+${difference}` : difference}</td><td className="px-4 py-3"><button type="button" disabled={!changed} onClick={() => updateQuantity(row, '')} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900 disabled:invisible" title="Descartar este cambio"><RotateCcw size={17} /></button></td></tr>;
          })}</tbody></table></div><div className="divide-y divide-slate-100 lg:hidden">{visibleRows.map((row) => { const newQuantity = changes[row.stock_id]; const changed = newQuantity !== undefined; const difference = changed ? newQuantity - row.stock_current : 0; return <article key={row.stock_id} className={`min-w-0 p-4 ${changed ? 'bg-blue-50/70' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-all font-black text-slate-900">{row.sku}</p><p className="break-words text-sm text-slate-600">{row.description}</p><p className="break-words text-xs text-slate-400">{row.brand_name || 'Sin marca'} · {row.category_name || 'Sin categoría'}</p></div><button type="button" disabled={!changed} onClick={() => updateQuantity(row, '')} className="shrink-0 rounded-lg p-2 text-slate-500 disabled:invisible" aria-label={`Descartar cambio de ${row.sku}`}><RotateCcw size={17} /></button></div><div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/80 p-3 text-center text-xs"><div><span className="block text-slate-400">Actual</span><b>{row.stock_current}</b></div><div><span className="block text-slate-400">Reservado</span><b className="text-amber-700">{row.stock_reserved}</b></div><div><span className="block text-slate-400">Disponible</span><b className="text-emerald-700">{row.stock_available}</b></div></div><div className="mt-3 flex items-end justify-between gap-3"><p className="min-w-0 text-xs text-slate-500"><b className="block text-slate-700">Talla {row.size || 'N/A'}</b>{row.color || 'Sin color'} · {row.unit_of_measure}</p><label className="shrink-0 text-right text-[10px] font-bold uppercase text-slate-500">Nuevo conteo<input aria-label={`Nuevo stock de ${row.sku} talla ${row.size || 'N/A'}`} type="number" min={0} step={1} value={changed ? newQuantity : row.stock_current} onChange={(event) => updateQuantity(row, event.target.value)} className={`mt-1 block w-24 rounded-lg border px-3 py-2 text-center text-base font-black outline-none focus:ring-2 ${changed ? 'border-blue-400 text-blue-700 focus:ring-blue-100' : 'border-slate-300 focus:ring-slate-100'}`} /></label></div>{changed && <p className={`mt-2 text-right text-xs font-black ${difference > 0 ? 'text-emerald-700' : 'text-red-700'}`}>Diferencia: {difference > 0 ? `+${difference}` : difference}</p>}</article>; })}</div></>}
          {snapshot && filtered.length > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}</p><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40">Anterior</button><span className="px-3 py-2 font-bold">{page} / {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40">Siguiente</button></div></div>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 lg:grid-cols-[280px_1fr]"><div><label htmlFor="reason" className="mb-2 block text-sm font-black">Motivo obligatorio</label><select id="reason" value={reason} onChange={(event) => { setReason(event.target.value as AdjustmentReason | ''); resetRequestIdentity(); }} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"><option value="">Selecciona un motivo</option>{reasonEntries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="observation" className="mb-2 block text-sm font-black">Observación {reason === 'OTHER' ? '(obligatoria, mínimo 10 caracteres)' : '(opcional)'}</label><textarea id="observation" maxLength={500} rows={3} value={observation} onChange={(event) => { setObservation(event.target.value); resetRequestIdentity(); }} placeholder="Agrega contexto útil sin incluir datos sensibles" className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" /><p className="text-right text-xs text-slate-400">{observation.length}/500</p></div></div><div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Resumen pendiente</p><p className="text-lg font-black">{modifiedRows.length} filas · <span className="text-emerald-400">+{totalIncrease}</span> · <span className="text-red-400">-{totalDecrease}</span></p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!modifiedRows.length || saving} onClick={() => { setChanges({}); resetRequestIdentity(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 font-bold disabled:opacity-40"><RotateCcw size={18} /> Restablecer todo</button><button type="button" disabled={!modifiedRows.length || saving || !reason} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-black hover:bg-blue-500 disabled:opacity-40">{saving ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />} {saving ? 'Guardando…' : 'Revisar y guardar'}</button></div></div></section>
      </div>
    </main>
  );
}

function ReportButton({ icon: Icon, label, onClick }: { icon: typeof Download; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-black text-emerald-900 hover:bg-emerald-100"><Icon size={17} /> {label}</button>;
}
