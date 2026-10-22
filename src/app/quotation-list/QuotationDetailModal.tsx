import { CalendarDays, CircleDollarSign, FileText, X } from 'lucide-react';

import type { QuotationResponse } from '../services/quotationService';
import { formatStableDate } from '../utils/dateUtils';
import QuotationProductDetails from './QuotationProductDetails';

type Props = {
  detail: QuotationResponse;
  statusLabel: string;
  statusClassName: string;
  onClose: () => void;
};

export default function QuotationDetailModal({
  detail,
  statusLabel,
  statusClassName,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5">
      <button
        type="button"
        aria-label="Cerrar detalle"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quotation-detail-title"
        className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.3)] sm:max-h-[92vh]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="hidden rounded-xl bg-indigo-50 p-2.5 text-indigo-700 sm:block">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                Detalle de cotización
              </p>
              <h2 id="quotation-detail-title" className="mt-0.5 break-all text-xl font-black text-slate-950">
                {detail.quotation.quote_number}
              </h2>
              <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
                {detail.quotation.client_name}
                <span className="mx-1.5 text-slate-300">•</span>
                {detail.quotation.seller_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-200 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-400">
                <CircleDollarSign size={15} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Total</span>
              </div>
              <strong className="mt-2 block text-xl">S/ {Number(detail.quotation.total).toFixed(2)}</strong>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</span>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${statusClassName}`}>
                {statusLabel}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <CalendarDays size={15} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Fecha</span>
              </div>
              <strong className="mt-2 block text-sm text-slate-900">
                {formatStableDate(detail.quotation.business_date)}
              </strong>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <CalendarDays size={15} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Vence</span>
              </div>
              <strong className="mt-2 block text-sm text-slate-900">
                {formatStableDate(detail.quotation.expires_on)}
              </strong>
            </div>
          </div>

          <QuotationProductDetails details={detail.details} />
        </div>
      </section>
    </div>
  );
}
