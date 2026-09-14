'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import {
  getPendingPayments,
  PaymentFilter,
  PaymentState,
  PendingPaymentRow,
} from '../services/pendingPaymentService';

const statusStyle: Record<PaymentState, string> = {
  pendiente: 'bg-blue-50 text-blue-700 ring-blue-200',
  vence_hoy: 'bg-amber-50 text-amber-800 ring-amber-300',
  vencido: 'bg-red-50 text-red-700 ring-red-300',
  cancelado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const statusLabel: Record<PaymentState, string> = {
  pendiente: 'Pendiente',
  vence_hoy: 'Vence hoy',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

function money(value: string) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount);
}

function dateLabel(value: string | null) {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function dueLabel(row: PendingPaymentRow) {
  if (row.payment_state === 'cancelado') return 'Deuda cancelada';
  if (row.days_remaining === null) return 'Sin vencimiento';
  if (row.days_remaining === 0) return 'Vence hoy';
  if (row.days_remaining < 0) {
    const days = Math.abs(row.days_remaining);
    return `${days} día${days === 1 ? '' : 's'} de atraso`;
  }
  return `${row.days_remaining} día${row.days_remaining === 1 ? '' : 's'} restante${row.days_remaining === 1 ? '' : 's'}`;
}

export default function PendingPaymentsPage() {
  const { user, loading: userLoading } = useUser();
  const [rows, setRows] = useState<PendingPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaymentFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('fecha_proximo_pago:ASC');

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError('');
    try {
      const [sortBy, sortDir] = sort.split(':') as [string, 'ASC' | 'DESC'];
      const response = await getPendingPayments(
        {
          page,
          limit: 20,
          search,
          status,
          from,
          to,
          sortBy,
          sortDir,
          warehouseId: user.role?.name_role === 'Administrador'
            ? undefined
            : user.warehouse_id,
        },
        user.token,
      );
      setRows(response.data);
      setTotal(response.meta.total);
      setTotalPages(response.meta.totalPages);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las deudas');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, page, search, sort, status, to, user]);

  useEffect(() => {
    if (!userLoading) void load();
  }, [load, userLoading]);

  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  const clearFilters = () => {
    setDraftSearch('');
    setSearch('');
    setStatus('all');
    setFrom('');
    setTo('');
    setSort('fecha_proximo_pago:ASC');
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
                <CreditCard size={18} /> Control de cobranza
              </div>
              <h1 className="break-words text-3xl font-black tracking-tight sm:text-4xl">Pendientes de pago</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                Seguimiento de ventas a crédito, vencimientos y pagos registrados.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registros encontrados</p>
              <p className="mt-1 text-3xl font-black">{total}</p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <form onSubmit={applySearch} className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_180px_160px_160px_230px_auto]">
            <label className="relative block">
              <span className="sr-only">Buscar venta o cliente</span>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
              <input
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Venta, cliente o documento"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value as PaymentFilter); setPage(1); }}
              className="h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos pendientes</option>
              <option value="pending">Pendientes</option>
              <option value="due_today">Vencen hoy</option>
              <option value="overdue">Vencidos</option>
              <option value="paid">Historial cancelado</option>
            </select>

            <label className="relative">
              <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-black uppercase text-slate-400">Desde</span>
              <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="relative">
              <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-black uppercase text-slate-400">Hasta</span>
              <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400" />
            </label>

            <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-400" aria-label="Ordenar resultados">
              <option value="fecha_proximo_pago:ASC">Vencimiento más próximo</option>
              <option value="fecha_proximo_pago:DESC">Vencimiento más lejano</option>
              <option value="monto_restante:DESC">Mayor saldo</option>
              <option value="monto_restante:ASC">Menor saldo</option>
              <option value="sale_date:DESC">Venta más reciente</option>
              <option value="sale_date:ASC">Venta más antigua</option>
            </select>

            <div className="flex gap-2">
              <button type="submit" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
                <Filter size={18} /> Aplicar
              </button>
              <button type="button" onClick={clearFilters} title="Limpiar filtros" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100">
                <RefreshCw size={18} />
              </button>
            </div>
          </form>
        </section>

        {error && (
          <div role="alert" className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <div className="flex gap-3"><AlertCircle className="mt-0.5 shrink-0" size={20} /><span className="text-sm font-semibold">{error}</span></div>
            <button onClick={() => void load()} className="text-sm font-black underline">Reintentar</button>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-72 items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="animate-spin" size={22} /> Cargando cobranzas...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 rounded-full bg-emerald-50 p-5 text-emerald-600"><CreditCard size={36} /></div>
              <h2 className="text-xl font-black text-slate-800">No hay resultados</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">No existen ventas que coincidan con los filtros seleccionados.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Venta</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Cliente</th><th className="px-5 py-4 text-right">Total</th><th className="px-5 py-4 text-right">Pagado</th><th className="px-5 py-4 text-right">Saldo</th><th className="px-5 py-4">Próximo pago</th><th className="px-5 py-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id} className={row.payment_state === 'vencido' ? 'bg-red-50/70' : 'transition hover:bg-slate-50'}>
                        <td className="px-5 py-4"><Link href={`/pendientes-pago/${row.id}`} className="font-black text-blue-700 underline-offset-4 hover:underline">{row.sale_code}</Link></td>
                        <td className="px-5 py-4 text-sm text-slate-600">{dateLabel(row.sale_date)}</td>
                        <td className="max-w-[220px] truncate px-5 py-4 text-sm font-semibold text-slate-700">{row.customer_name}</td>
                        <td className="px-5 py-4 text-right text-sm font-bold text-slate-700">{money(row.total_amount)}</td>
                        <td className="px-5 py-4 text-right text-sm font-bold text-emerald-700">{money(row.amount_paid)}</td>
                        <td className="px-5 py-4 text-right font-black text-slate-950">{money(row.monto_restante)}</td>
                        <td className="px-5 py-4"><div className="text-sm font-bold text-slate-700">{dateLabel(row.fecha_proximo_pago)}</div><div className={row.payment_state === 'vencido' ? 'text-xs font-bold text-red-700' : 'text-xs text-slate-500'}>{dueLabel(row)}</div></td>
                        <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyle[row.payment_state]}`}>{statusLabel[row.payment_state]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {rows.map((row) => (
                  <article key={row.id} className={`min-w-0 p-4 sm:p-5 ${row.payment_state === 'vencido' ? 'bg-red-50/70' : ''}`}>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0"><Link href={`/pendientes-pago/${row.id}`} className="break-all text-lg font-black text-blue-700">{row.sale_code}</Link><p className="mt-1 break-words text-sm font-semibold text-slate-600">{row.customer_name}</p></div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyle[row.payment_state]}`}>{statusLabel[row.payment_state]}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/80 p-4 text-sm">
                      <div><p className="text-xs text-slate-500">Saldo</p><p className="font-black text-slate-900">{money(row.monto_restante)}</p></div>
                      <div><p className="text-xs text-slate-500">Pagado</p><p className="font-black text-emerald-700">{money(row.amount_paid)}</p></div>
                      <div className="col-span-2 flex items-center gap-2 text-slate-600"><CalendarDays size={16} /> {dateLabel(row.fecha_proximo_pago)} · {dueLabel(row)}</div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row">
          <p className="text-sm text-slate-500">Página <strong className="text-slate-800">{page}</strong> de <strong className="text-slate-800">{totalPages}</strong></p>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"><ChevronLeft size={17} /> Anterior</button>
            <button disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Siguiente <ChevronRight size={17} /></button>
          </div>
        </footer>
      </div>
    </main>
  );
}
