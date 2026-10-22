import { useMemo } from 'react';

import type { QuotationDetail } from '../services/quotationService';
import { groupQuotationDetails } from './quotationDetailGroups';
import type { QuotationSizeSummary } from './quotationDetailGroups';

type Props = {
  details: QuotationDetail[];
};

const formatQuantity = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toLocaleString('es-PE');

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatUnitPrices = (prices: number[]) => {
  if (prices.length === 0) return 'S/ 0.00';
  if (prices.length === 1) return `S/ ${formatMoney(prices[0])}`;
  return `S/ ${formatMoney(prices[0])} – ${formatMoney(prices[prices.length - 1])}`;
};

function SizeQuantity({ item }: { item: QuotationSizeSummary }) {
  return (
    <div className="min-w-[92px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-3 py-2 text-center">
        <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Talla
        </span>
        <strong className="mt-0.5 block text-lg leading-none text-slate-900">{item.size}</strong>
      </div>
      <div className="border-t border-indigo-100 bg-indigo-50 px-3 py-1.5 text-center">
        <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-500">
          Cantidad
        </span>
        <strong className="ml-1.5 text-sm text-indigo-800">{formatQuantity(item.quantity)}</strong>
      </div>
    </div>
  );
}

export default function QuotationProductDetails({ details }: Props) {
  const groups = useMemo(() => groupQuotationDetails(details), [details]);

  if (groups.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        La cotización no tiene productos.
      </div>
    );
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
            Detalle de productos
          </p>
          <h3 className="mt-0.5 text-base font-black text-slate-900">Tallas y cantidades</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600">
          {groups.length} {groups.length === 1 ? 'producto' : 'productos'}
        </span>
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <article
            key={group.key}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
          >
            <div className="grid md:grid-cols-[minmax(220px,0.8fr)_minmax(0,2fr)]">
              <div className="border-b border-slate-100 bg-slate-50/80 p-4 md:border-b-0 md:border-r">
                <span className="inline-flex rounded-md bg-slate-900 px-2 py-1 text-[10px] font-black tracking-wide text-white">
                  {group.sku}
                </span>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-700">
                  {group.description}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Precio unitario
                    </span>
                    <strong className="mt-1 block text-xs text-slate-700">
                      {formatUnitPrices(group.unitPrices)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Monto
                    </span>
                    <strong className="mt-1 block text-sm text-indigo-700">
                      S/ {formatMoney(group.subtotal)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {group.sizes.map((size) => (
                    <SizeQuantity key={size.size} item={size} />
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
