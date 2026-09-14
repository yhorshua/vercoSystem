'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import Swal from 'sweetalert2';

import {
  getAvailableQuotations,
  getQuotation,
  QuotationDetail,
  QuotationHeader,
  QuotationResponse,
} from '../services/quotationService';

export type SelectedQuotationLine = QuotationDetail & {
  selectedQuantity: number;
};

type Props = {
  open: boolean;
  clientId: number;
  sellerId: number;
  token: string;
  onClose: () => void;
  onApply: (
    quotation: QuotationHeader,
    lines: SelectedQuotationLine[],
  ) => void;
};

type ProductGroup = {
  productId: number;
  sku: string;
  description: string;
  lines: QuotationDetail[];
};

const getLineId = (line: QuotationDetail): number => {
  return Number(line.id);
};

const groupDetailsByProduct = (
  details: QuotationDetail[],
): ProductGroup[] => {
  const groups = new Map<number, QuotationDetail[]>();

  for (const line of details) {
    const productId = Number(line.product_id);

    if (!groups.has(productId)) {
      groups.set(productId, []);
    }

    groups.get(productId)!.push(line);
  }

  return Array.from(groups.entries()).map(([productId, lines]) => ({
    productId,
    sku: String(lines[0]?.sku_snapshot ?? ''),
    description: String(lines[0]?.description_snapshot ?? ''),
    lines: [...lines].sort(
      (a, b) =>
        Number(a.size_snapshot) - Number(b.size_snapshot),
    ),
  }));
};

export default function QuotationSelectionModal({
  open,
  clientId,
  sellerId,
  token,
  onClose,
  onApply,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<QuotationHeader[]>([]);
  const [selected, setSelected] =
    useState<QuotationResponse | null>(null);

  /*
   * Guarda la cantidad que se enviará por cada quotation_detail_id.
   */
  const [quantities, setQuantities] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setSelected(null);
    setQuantities({});

    getAvailableQuotations(
      {
        clientId: Number(clientId),
        sellerId: Number(sellerId),
      },
      token,
    )
      .then((response) => {
        setQuotes(response.data);
      })
      .catch((error) => {
        void Swal.fire({
          icon: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'No se pudieron consultar las cotizaciones',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clientId, open, sellerId, token]);

  const openQuote = async (quote: QuotationHeader) => {
    setLoading(true);

    try {
      const response = await getQuotation(
        Number(quote.id),
        token,
      );

      setSelected(response);

      /*
       * Carga automáticamente toda la cantidad pendiente.
       * El usuario solo tendrá que reducirla si el cliente
       * no desea comprar todos los pares.
       */
      const initialQuantities: Record<number, number> = {};

      response.details.forEach((line) => {
        const lineId = getLineId(line);
        const remainingQuantity = Number(
          line.remaining_quantity ?? 0,
        );

        initialQuantities[lineId] = Math.max(
          0,
          remainingQuantity,
        );
      });

      setQuantities(initialQuantities);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la cotización',
      });
    } finally {
      setLoading(false);
    }
  };

  const productGroups = useMemo(() => {
    if (!selected) return [];

    return groupDetailsByProduct(selected.details);
  }, [selected]);

  const updateQuantity = (
    line: QuotationDetail,
    value: string,
  ) => {
    const lineId = getLineId(line);
    const remainingQuantity = Number(
      line.remaining_quantity ?? 0,
    );

    /*
     * Cuando el usuario borra el campo, la cantidad queda en cero.
     */
    const requestedQuantity =
      value.trim() === '' ? 0 : Number(value);

    const safeQuantity = Number.isFinite(requestedQuantity)
      ? Math.max(
          0,
          Math.min(remainingQuantity, requestedQuantity),
        )
      : 0;

    setQuantities((current) => ({
      ...current,
      [lineId]: safeQuantity,
    }));
  };

  const apply = () => {
    if (!selected) return;

    /*
     * Conserva toda la información original de cada línea
     * y únicamente agrega selectedQuantity.
     */
    const lines: SelectedQuotationLine[] = selected.details
      .map((line) => {
        const lineId = getLineId(line);

        return {
          ...line,
          id: lineId,
          product_id: Number(line.product_id),
          product_size_id: Number(line.product_size_id),
          selectedQuantity: Number(
            quantities[lineId] ?? 0,
          ),
        };
      })
      .filter((line) => line.selectedQuantity > 0);

    if (!lines.length) {
      void Swal.fire({
        icon: 'warning',
        text: 'Debes dejar al menos una cantidad mayor que cero',
      });
      return;
    }

    const invalidQuantity = lines.some((line) => {
      const remainingQuantity = Number(
        line.remaining_quantity ?? 0,
      );

      return (
        line.selectedQuantity < 0 ||
        line.selectedQuantity > remainingQuantity
      );
    });

    if (invalidQuantity) {
      void Swal.fire({
        icon: 'error',
        text: 'Una cantidad supera el saldo pendiente de la cotización',
      });
      return;
    }

    const normalizedQuotation: QuotationHeader = {
      ...selected.quotation,
      id: Number(selected.quotation.id),
    };

    onApply(normalizedQuotation, lines);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-950/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[calc(100dvh-1rem)] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[92vh]">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="font-black text-slate-900">
              Cotizaciones disponibles
            </h2>

            <p className="text-xs text-slate-500">
              Las cantidades pendientes se cargan automáticamente.
              Modifica solamente las cantidades que el cliente no
              desea.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="max-h-[34dvh] shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50 p-3 md:max-h-none md:border-b-0 md:border-r">
            {loading && !selected ? (
              <Loader2 className="mx-auto mt-12 animate-spin text-indigo-600" />
            ) : quotes.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">
                No hay cotizaciones vigentes con cantidades
                pendientes.
              </p>
            ) : (
              quotes.map((quote) => (
                <button
                  type="button"
                  key={quote.id}
                  onClick={() => openQuote(quote)}
                  className="mb-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-400"
                >
                  <span className="block text-xs font-black text-indigo-700">
                    {quote.quote_number}
                  </span>

                  <span className="block text-xs font-semibold text-slate-700">
                    {quote.business_date} · S/{' '}
                    {Number(quote.total).toFixed(2)}
                  </span>

                  <span className="block text-[10px] text-slate-500">
                    {quote.status} · Pendiente:{' '}
                    {quote.remaining_quantity ?? 0}
                  </span>
                </button>
              ))
            )}
          </aside>

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {loading && selected ? (
              <Loader2 className="mx-auto mt-12 animate-spin text-indigo-600" />
            ) : !selected ? (
              <div className="flex h-full min-h-52 flex-col items-center justify-center text-slate-400">
                <FileText size={36} />

                <p className="mt-2 text-sm">
                  Selecciona una cotización
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-900 p-4 text-white">
                  <p className="font-black">
                    {selected.quotation.quote_number}
                  </p>

                  <p className="text-xs text-slate-300">
                    Vence:{' '}
                    {selected.quotation.expires_on ||
                      'Sin vencimiento'}{' '}
                    · Total: S/{' '}
                    {Number(selected.quotation.total).toFixed(2)}
                  </p>
                </div>

                {productGroups.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
                    La cotización no tiene detalles disponibles.
                  </div>
                ) : (
                  productGroups.map((group) => (
                    <section
                      key={group.productId}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-4 border-b border-slate-100 pb-3">
                        <p className="text-sm font-black text-slate-900">
                          {group.sku}
                        </p>

                        <p className="text-xs text-slate-500">
                          {group.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {group.lines.map((line) => {
                          const lineId = getLineId(line);
                          const remainingQuantity = Number(
                            line.remaining_quantity ?? 0,
                          );
                          const selectedQuantity =
                            quantities[lineId] ?? 0;

                          return (
                            <label
                              key={lineId}
                              className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3"
                            >
                              <span className="block text-[10px] font-black uppercase text-slate-600">
                                Talla {line.size_snapshot}
                              </span>

                              <span className="mt-1 block text-[10px] text-slate-500">
                                Cotizada: {line.quantity}
                              </span>

                              <span className="block text-[10px] text-slate-500">
                                Usada: {line.used_quantity}
                              </span>

                              <span className="block text-[10px] font-black text-emerald-700">
                                Pendiente: {remainingQuantity}
                              </span>

                              <input
                                type="number"
                                min={0}
                                max={remainingQuantity}
                                value={
                                  selectedQuantity === 0
                                    ? ''
                                    : selectedQuantity
                                }
                                onChange={(event) =>
                                  updateQuantity(
                                    line,
                                    event.target.value,
                                  )
                                }
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 text-center text-base font-black text-indigo-700 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                              />

                              <span className="mt-1 block text-center text-[10px] text-slate-500">
                                Precio: S/{' '}
                                {Number(line.unit_price).toFixed(2)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}
          </main>
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-slate-200 p-3 sm:flex sm:justify-end sm:p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold sm:px-4"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!selected || loading}
            onClick={apply}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50 sm:px-4"
          >
            USAR SELECCIÓN
          </button>
        </footer>
      </div>
    </div>
  );
}