'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, FileText, Loader2, Search, X } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { useUser } from '../context/UserContext';
import { getPeruBusinessDate } from '../utils/dateUtils';
import { getQuotation, getQuotations, QuotationHeader, QuotationResponse } from '../services/quotationService';

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  ISSUED: 'Vigente',
  PARTIALLY_USED: 'Parcialmente utilizada',
  USED: 'Utilizada',
  EXPIRED: 'Vencida',
  CANCELLED: 'Anulada',
};

const statusStyle: Record<string, string> = {
  ISSUED: 'bg-blue-50 text-blue-700',
  PARTIALLY_USED: 'bg-amber-50 text-amber-700',
  USED: 'bg-emerald-50 text-emerald-700',
  EXPIRED: 'bg-rose-50 text-rose-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

function effectiveStatus(quote: QuotationHeader) {
  if (quote.effective_status) return quote.effective_status;
  if (['ISSUED', 'PARTIALLY_USED'].includes(quote.status) && quote.expires_on && quote.expires_on < getPeruBusinessDate()) return 'EXPIRED';
  return quote.status;
}

export default function QuotationListPage() {
  const { user } = useUser();
  const [rows, setRows] = useState<QuotationHeader[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<QuotationResponse | null>(null);

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const response = await getQuotations({ search, status, from, to, page, limit: 20 }, user.token);
      setRows(response.data);
      setTotalPages(Math.max(1, response.pagination.totalPages));
      setTotal(response.pagination.total);
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'No se pudieron cargar las cotizaciones', text: error instanceof Error ? error.message : 'Error inesperado' });
    } finally {
      setLoading(false);
    }
  }, [from, page, search, status, to, user?.token]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: number) => {
    if (!user?.token) return;
    setLoading(true);
    try {
      setDetail(await getQuotation(id, user.token));
    } catch (error) {
      await Swal.fire({ icon: 'error', text: error instanceof Error ? error.message : 'No se pudo abrir el detalle' });
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!user?.token) return;
    try {
      const response = await getQuotations({ search, status, from, to, page: 1, limit: 100, sortBy: 'date' }, user.token);
      const data = response.data.map((quote) => ({
        Numero: quote.quote_number,
        Fecha: quote.business_date,
        Vencimiento: quote.expires_on || '',
        Cliente: quote.client_name,
        Vendedor: quote.seller_name,
        Subtotal: Number(quote.subtotal),
        Descuento: Number(quote.discount_total),
        Impuesto: Number(quote.tax_total),
        Total: Number(quote.total),
        CantidadPendiente: Number(quote.remaining_quantity || 0),
        Estado: statusLabels[effectiveStatus(quote)] || quote.status,
      }));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data), 'Cotizaciones');
      XLSX.writeFile(book, `Cotizaciones_${getPeruBusinessDate()}.xlsx`);
    } catch (error) {
      await Swal.fire({ icon: 'error', text: error instanceof Error ? error.message : 'No se pudo exportar' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><h1 className="text-2xl font-black text-slate-900">Cotizaciones</h1><p className="break-words text-sm text-slate-500">Consulta, trazabilidad y conversión comercial</p></div>
          <button onClick={exportExcel} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white sm:w-auto"><Download size={16} /> EXPORTAR EXCEL</button>
        </header>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5">
          <label className="relative md:col-span-2"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Número, cliente o documento" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm" /></label>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-w-0 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input aria-label="Fecha inicial" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="min-w-0 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input aria-label="Fecha final" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="min-w-0 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3 text-xs font-bold text-slate-500">{total} cotizaciones encontradas</div>
          {loading && rows.length === 0 ? <div className="flex justify-center p-16"><Loader2 className="animate-spin text-indigo-600" /></div> : rows.length === 0 ? <div className="p-16 text-center text-sm text-slate-500"><FileText className="mx-auto mb-2" />No hay resultados para los filtros seleccionados.</div> : (
            <>
              <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500"><tr><th className="p-4">Número</th><th className="p-4">Fecha</th><th className="p-4">Cliente</th><th className="p-4">Vendedor</th><th className="p-4">Vence</th><th className="p-4 text-right">Total</th><th className="p-4 text-right">Cant. pendiente</th><th className="p-4">Estado</th><th className="p-4" /></tr></thead><tbody>{rows.map((quote) => { const displayStatus = effectiveStatus(quote); return <tr key={quote.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4 font-black text-indigo-700"><button onClick={() => openDetail(quote.id)}>{quote.quote_number}</button></td><td className="p-4">{quote.business_date}</td><td className="p-4"><b>{quote.client_name}</b></td><td className="p-4">{quote.seller_name}</td><td className="p-4">{quote.expires_on || '—'}</td><td className="p-4 text-right font-black">S/ {Number(quote.total).toFixed(2)}</td><td className="p-4 text-right">{quote.remaining_quantity ?? 0}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusStyle[displayStatus] || 'bg-slate-100'}`}>{statusLabels[displayStatus] || displayStatus}</span></td><td className="p-4"><button aria-label="Ver detalle" onClick={() => openDetail(quote.id)} className="rounded-lg p-2 hover:bg-indigo-50"><Eye size={16} /></button></td></tr>; })}</tbody></table></div>
              <div className="divide-y divide-slate-100 lg:hidden">{rows.map((quote) => { const displayStatus = effectiveStatus(quote); return <article key={quote.id} className="min-w-0 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><button onClick={() => openDetail(quote.id)} className="break-all text-left font-black text-indigo-700">{quote.quote_number}</button><p className="mt-1 break-words text-sm font-bold text-slate-800">{quote.client_name}</p><p className="break-words text-xs text-slate-500">{quote.seller_name}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusStyle[displayStatus] || 'bg-slate-100'}`}>{statusLabels[displayStatus] || displayStatus}</span></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs"><div><span className="block text-slate-400">Fecha</span><b>{quote.business_date}</b></div><div><span className="block text-slate-400">Vence</span><b>{quote.expires_on || '—'}</b></div><div><span className="block text-slate-400">Total</span><b>S/ {Number(quote.total).toFixed(2)}</b></div><div><span className="block text-slate-400">Cant. pendiente</span><b>{quote.remaining_quantity ?? 0}</b></div></div><button onClick={() => openDetail(quote.id)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-100 px-3 py-2 text-xs font-black text-indigo-700"><Eye size={15} /> Ver detalle</button></article>; })}</div>
            </>
          )}
          <footer className="flex items-center justify-between border-t border-slate-200 p-4 text-xs text-slate-500"><span>Página {page} de {totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></footer>
        </section>
      </div>

      {detail && <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"><button aria-label="Cerrar" onClick={() => setDetail(null)} className="absolute inset-0 bg-slate-950/50" /><div className="relative z-10 max-h-[calc(100dvh-1rem)] min-w-0 w-full max-w-4xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl sm:max-h-[90vh] sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-all text-xl font-black">{detail.quotation.quote_number}</h2><p className="break-words text-sm text-slate-500">{detail.quotation.client_name} · {detail.quotation.seller_name}</p></div><button aria-label="Cerrar detalle" onClick={() => setDetail(null)} className="shrink-0 rounded-lg p-1 hover:bg-slate-100"><X /></button></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-900 p-4 text-white md:grid-cols-4"><div><small>Total</small><b className="block">S/ {Number(detail.quotation.total).toFixed(2)}</b></div><div><small>Estado</small><b className="block break-words">{statusLabels[effectiveStatus(detail.quotation)] || detail.quotation.status}</b></div><div><small>Fecha</small><b className="block">{detail.quotation.business_date}</b></div><div><small>Vence</small><b className="block">{detail.quotation.expires_on || '—'}</b></div></div><div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[650px] text-xs"><thead className="bg-slate-50 text-left"><tr><th className="p-3">SKU / Producto</th><th className="p-3">Talla</th><th className="p-3">Cotizada</th><th className="p-3">Utilizada</th><th className="p-3">Pendiente</th><th className="p-3 text-right">Total</th></tr></thead><tbody>{detail.details.map((line) => <tr key={line.id} className="border-t"><td className="p-3"><b>{line.sku_snapshot}</b><br/>{line.description_snapshot}</td><td className="p-3">{line.size_snapshot}</td><td className="p-3">{line.quantity}</td><td className="p-3">{line.used_quantity}</td><td className="p-3 font-black">{line.remaining_quantity}</td><td className="p-3 text-right">S/ {Number(line.line_total).toFixed(2)}</td></tr>)}</tbody></table></div><div className="mt-4 space-y-3 md:hidden">{detail.details.map((line) => <article key={line.id} className="min-w-0 rounded-xl border border-slate-200 p-3"><b className="block break-all text-xs">{line.sku_snapshot}</b><p className="break-words text-xs text-slate-500">{line.description_snapshot}</p><div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]"><div><span className="block text-slate-400">Cotizada</span><b>{line.quantity}</b></div><div><span className="block text-slate-400">Utilizada</span><b>{line.used_quantity}</b></div><div><span className="block text-slate-400">Pendiente</span><b>{line.remaining_quantity}</b></div></div><div className="mt-3 flex justify-between text-xs"><span>Talla {line.size_snapshot}</span><b>S/ {Number(line.line_total).toFixed(2)}</b></div></article>)}</div></div></div>}
    </div>
  );
}
