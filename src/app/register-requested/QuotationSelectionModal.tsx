'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  getAvailableQuotations,
  getQuotation,
  QuotationDetail,
  QuotationHeader,
  QuotationResponse,
} from '../services/quotationService';

export type SelectedQuotationLine = QuotationDetail & { selectedQuantity: number };

type Props = {
  open: boolean;
  clientId: number;
  sellerId: number;
  token: string;
  onClose: () => void;
  onApply: (quotation: QuotationHeader, lines: SelectedQuotationLine[]) => void;
};

export default function QuotationSelectionModal({ open, clientId, sellerId, token, onClose, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<QuotationHeader[]>([]);
  const [selected, setSelected] = useState<QuotationResponse | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(null);
    setQuantities({});
    getAvailableQuotations({ clientId, sellerId }, token)
      .then((response) => setQuotes(response.data))
      .catch((error) => Swal.fire({ icon: 'error', text: error instanceof Error ? error.message : 'No se pudieron consultar las cotizaciones' }))
      .finally(() => setLoading(false));
  }, [clientId, open, sellerId, token]);

  const openQuote = async (quote: QuotationHeader) => {
    setLoading(true);
    try {
      const response = await getQuotation(quote.id, token);
      setSelected(response);
      setQuantities(Object.fromEntries(response.details.map((line) => [line.id, 0])));
    } catch (error) {
      await Swal.fire({ icon: 'error', text: error instanceof Error ? error.message : 'No se pudo cargar la cotización' });
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!selected) return;
    const lines = selected.details
      .map((line) => ({ ...line, selectedQuantity: Number(quantities[line.id] || 0) }))
      .filter((line) => line.selectedQuantity > 0);
    if (!lines.length) {
      void Swal.fire({ icon: 'warning', text: 'Selecciona al menos una cantidad de la cotización' });
      return;
    }
    if (lines.some((line) => line.selectedQuantity > Number(line.remaining_quantity))) {
      void Swal.fire({ icon: 'error', text: 'Una cantidad supera el saldo disponible de la cotización' });
      return;
    }
    onApply(selected.quotation, lines);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <button aria-label="Cerrar" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[calc(100dvh-1rem)] min-w-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="font-black text-slate-900">Cotizaciones disponibles</h2>
            <p className="text-xs text-slate-500">Filtradas por el cliente y vendedor seleccionados</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="max-h-[34dvh] shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50 p-3 md:max-h-none md:border-b-0 md:border-r">
            {loading && !selected ? <Loader2 className="mx-auto mt-12 animate-spin text-indigo-600" /> : quotes.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">No hay cotizaciones vigentes con cantidades pendientes.</p>
            ) : quotes.map((quote) => (
              <button key={quote.id} onClick={() => openQuote(quote)} className="mb-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-400">
                <span className="block text-xs font-black text-indigo-700">{quote.quote_number}</span>
                <span className="block text-xs font-semibold text-slate-700">{quote.business_date} · S/ {Number(quote.total).toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500">{quote.status} · Pendiente: {quote.remaining_quantity ?? 0}</span>
              </button>
            ))}
          </aside>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {loading && selected ? <Loader2 className="mx-auto mt-12 animate-spin text-indigo-600" /> : !selected ? (
              <div className="flex h-full min-h-52 flex-col items-center justify-center text-slate-400"><FileText size={36} /><p className="mt-2 text-sm">Selecciona una cotización</p></div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-900 p-4 text-white">
                  <p className="font-black">{selected.quotation.quote_number}</p>
                  <p className="text-xs text-slate-300">Vence: {selected.quotation.expires_on || 'Sin vencimiento'} · Total: S/ {Number(selected.quotation.total).toFixed(2)}</p>
                </div>
                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                  <table className="w-full min-w-[650px] text-xs">
                    <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500"><tr><th className="p-3">Producto</th><th className="p-3">Talla</th><th className="p-3">Cotizada</th><th className="p-3">Usada</th><th className="p-3">Pendiente</th><th className="p-3">Precio</th><th className="p-3">Al pedido</th></tr></thead>
                    <tbody>{selected.details.map((line) => <tr key={line.id} className="border-t border-slate-100"><td className="p-3"><b>{line.sku_snapshot}</b><br/><span className="text-slate-500">{line.description_snapshot}</span></td><td className="p-3">{line.size_snapshot}</td><td className="p-3">{line.quantity}</td><td className="p-3">{line.used_quantity}</td><td className="p-3 font-black">{line.remaining_quantity}</td><td className="p-3">S/ {Number(line.unit_price).toFixed(2)}</td><td className="p-3"><input type="number" min={0} max={line.remaining_quantity} value={quantities[line.id] || ''} onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: Math.max(0, Math.min(Number(line.remaining_quantity), Number(event.target.value) || 0)) }))} className="w-20 rounded-lg border border-slate-200 p-2 text-center font-bold" /></td></tr>)}</tbody>
                  </table>
                </div>
                <div className="space-y-3 md:hidden">
                  {selected.details.map((line) => (
                    <article key={line.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="min-w-0">
                        <b className="block break-all text-xs text-slate-900">{line.sku_snapshot}</b>
                        <p className="break-words text-xs text-slate-500">{line.description_snapshot}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div><span className="block text-slate-400">Cotizada</span><b>{line.quantity}</b></div>
                        <div><span className="block text-slate-400">Usada</span><b>{line.used_quantity}</b></div>
                        <div><span className="block text-slate-400">Pendiente</span><b>{line.remaining_quantity}</b></div>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <p className="text-xs text-slate-600">Talla {line.size_snapshot}<br/><b>S/ {Number(line.unit_price).toFixed(2)}</b></p>
                        <label className="text-right text-[10px] font-bold text-slate-500">Al pedido
                          <input aria-label={`Cantidad de ${line.sku_snapshot} talla ${line.size_snapshot}`} type="number" min={0} max={line.remaining_quantity} value={quantities[line.id] || ''} onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: Math.max(0, Math.min(Number(line.remaining_quantity), Number(event.target.value) || 0)) }))} className="mt-1 block w-24 rounded-lg border border-slate-200 p-2 text-center text-base font-bold" />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
        <footer className="grid grid-cols-2 gap-2 border-t border-slate-200 p-3 sm:flex sm:justify-end sm:p-4"><button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold sm:px-4">Cancelar</button><button disabled={!selected} onClick={apply} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50 sm:px-4">USAR SELECCIÓN</button></footer>
      </div>
    </div>
  );
}
