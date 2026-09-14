'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  History,
  ReceiptText,
  RefreshCw,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import {
  CreditPaymentMethod,
  getPendingPaymentDetail,
  PendingPaymentDetail,
  registerCreditPayment,
} from '../../services/pendingPaymentService';
import { addCalendarDays, getPeruBusinessDate } from '../../utils/dateUtils';

function money(value: string) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency', currency: 'PEN', minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateLabel(value: string | null) {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function cents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, decimal = ''] = value.trim().split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
}

const methodLabels: Record<CreditPaymentMethod, string> = {
  efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin',
  tarjetaDebito: 'Tarjeta de débito', tarjetaCredito: 'Tarjeta de crédito',
};

export default function PendingPaymentDetailPage() {
  const params = useParams<{ saleId: string }>();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const saleId = Number(params.saleId);
  const [data, setData] = useState<PendingPaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getPeruBusinessDate());
  const [method, setMethod] = useState<CreditPaymentMethod>('efectivo');
  const [operationNumber, setOperationNumber] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.token || !Number.isInteger(saleId)) return;
    setLoading(true);
    setError('');
    try {
      const response = await getPendingPaymentDetail(saleId, user.token);
      setData(response);
      setAmount((current) => current || response.sale.monto_restante);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la venta');
    } finally {
      setLoading(false);
    }
  }, [saleId, user]);

  useEffect(() => {
    if (!userLoading) void load();
  }, [load, userLoading]);

  const resetIdempotency = () => { idempotencyKeyRef.current = null; };
  const balanceCents = data ? cents(data.sale.monto_restante) : null;
  const amountCents = cents(amount);
  const isPartial = amountCents !== null && balanceCents !== null && amountCents < balanceCents;
  const isPaid = data?.sale.payment_status === 'PAID' || balanceCents === 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || !user?.token || submittingRef.current) return;
    if (amountCents === null || amountCents <= 0) {
      await Swal.fire('Importe inválido', 'Ingresa un importe mayor que cero y con máximo dos decimales.', 'warning');
      return;
    }
    if (balanceCents !== null && amountCents > balanceCents) {
      await Swal.fire('Importe inválido', 'El pago no puede superar el saldo pendiente.', 'warning');
      return;
    }
    if (method !== 'efectivo' && operationNumber.trim().length < 6) {
      await Swal.fire('Operación requerida', 'Ingresa un número de operación de al menos 6 caracteres.', 'warning');
      return;
    }
    if (isPartial && !nextPaymentDate) {
      await Swal.fire('Próximo pago requerido', 'Selecciona la próxima fecha de pago porque todavía quedará saldo.', 'warning');
      return;
    }

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Confirmar registro de pago',
      text: `${data.sale.sale_code} · Saldo actual ${money(data.sale.monto_restante)} · Pago ${money(amount)} · Fecha ${dateLabel(paymentDate)} · ${methodLabels[method]}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar pago',
      cancelButtonText: 'Revisar datos',
      confirmButtonColor: '#2563eb',
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    submittingRef.current = true;
    setSubmitting(true);
    idempotencyKeyRef.current ||= crypto.randomUUID();
    try {
      const response = await registerCreditPayment(
        saleId,
        {
          amount: amount.trim(),
          payment_date: paymentDate,
          method,
          operation_number: method === 'efectivo' ? undefined : operationNumber.trim(),
          next_payment_date: isPartial ? nextPaymentDate : undefined,
          idempotency_key: idempotencyKeyRef.current,
          notes: notes.trim() || undefined,
        },
        user.token,
      );
      window.dispatchEvent(new Event('pending-credits:refresh'));
      idempotencyKeyRef.current = null;
      await Swal.fire({ icon: 'success', title: 'Pago registrado', text: response.message });
      if (response.sale.payment_status === 'PAID') router.push('/pendientes-pago');
      else {
        setAmount('');
        setNextPaymentDate('');
        setOperationNumber('');
        setNotes('');
        await load();
      }
    } catch (caught) {
      await Swal.fire('No se pudo registrar', caught instanceof Error ? caught.message : 'Ocurrió un error inesperado', 'error');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex min-h-[65vh] items-center justify-center gap-3 text-slate-500"><RefreshCw className="animate-spin" /> Cargando detalle...</div>;
  if (error || !data) return (
    <main className="mx-auto max-w-3xl p-6"><div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-800"><AlertCircle className="mx-auto mb-3" /><p className="font-bold">{error || 'Venta no encontrada'}</p><Link href="/pendientes-pago" className="mt-5 inline-flex font-black underline">Volver al listado</Link></div></main>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <Link href="/pendientes-pago" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"><ArrowLeft size={18} /> Volver a pendientes</Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Detalle de operación</p><h1 className="mt-2 break-all text-3xl font-black sm:text-4xl">{data.sale.sale_code}</h1><p className="mt-2 flex min-w-0 items-start gap-2 break-words text-slate-300"><UserRound className="mt-0.5 shrink-0" size={17} /> {data.sale.customer_name}</p></div>
            <span className={`w-fit rounded-full px-4 py-2 text-sm font-black ${isPaid ? 'bg-emerald-500 text-white' : data.sale.payment_state === 'vencido' ? 'bg-red-500 text-white' : 'bg-amber-400 text-slate-950'}`}>{isPaid ? 'Cancelado' : data.sale.payment_state === 'vencido' ? 'Vencido' : data.sale.payment_state === 'vence_hoy' ? 'Vence hoy' : 'Pendiente'}</span>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Importe total', money(data.sale.total_amount), ReceiptText],
            ['Adelanto inicial', money(data.sale.monto_adelanto), WalletCards],
            ['Pagado acumulado', money(data.sale.amount_paid), CheckCircle2],
            ['Saldo pendiente', money(data.sale.monto_restante), CreditCard],
          ].map(([label, value, Icon]) => (
            <div key={String(label)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={20} /></div><p className="text-xs font-black uppercase tracking-wider text-slate-400">{String(label)}</p><p className="mt-2 text-2xl font-black text-slate-900">{String(value)}</p></div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5"><h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><ReceiptText size={20} /> Productos de la venta</h2></div>
              <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs font-black uppercase text-slate-500"><tr><th className="px-5 py-3">Producto</th><th className="px-5 py-3">Talla</th><th className="px-5 py-3 text-right">Cantidad</th><th className="px-5 py-3 text-right">Precio</th><th className="px-5 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{data.items.map((item) => <tr key={item.id}><td className="px-5 py-4"><p className="font-black text-slate-800">{item.article_code}</p><p className="text-slate-500">{item.article_description}</p></td><td className="px-5 py-4">{item.size || '—'}</td><td className="px-5 py-4 text-right">{item.quantity}</td><td className="px-5 py-4 text-right">{money(item.unit_price)}</td><td className="px-5 py-4 text-right font-black">{money(item.line_total)}</td></tr>)}</tbody></table></div><div className="divide-y divide-slate-100 sm:hidden">{data.items.map((item) => <article key={item.id} className="min-w-0 p-4"><p className="break-all font-black text-slate-800">{item.article_code}</p><p className="break-words text-sm text-slate-500">{item.article_description}</p><div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs"><div><span className="block text-slate-400">Talla</span><b>{item.size || '—'}</b></div><div><span className="block text-slate-400">Cantidad</span><b>{item.quantity}</b></div><div><span className="block text-slate-400">Total</span><b>{money(item.line_total)}</b></div></div><p className="mt-2 text-right text-xs text-slate-500">Precio unitario: {money(item.unit_price)}</p></article>)}</div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5"><h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><History size={20} /> Historial de pagos</h2></div>
              {data.payments.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Aún no se registraron pagos.</p> : <div className="divide-y divide-slate-100">{data.payments.map((payment) => <article key={payment.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-slate-800">{methodLabels[payment.method] ?? payment.method}</p><p className="text-xs text-slate-500">{dateLabel(payment.payment_date)} · Registrado por {payment.registered_by || (payment.registered_by_user_id ? `usuario ${payment.registered_by_user_id}` : 'sistema anterior')}</p>{payment.operation_number && <p className="mt-1 text-xs font-semibold text-slate-600">Operación: {payment.operation_number}</p>}</div><p className="text-lg font-black text-emerald-700">{money(payment.amount)}</p></article>)}</div>}
            </section>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-24">
            <h2 className="text-xl font-black text-slate-900">Registrar pago</h2>
            <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo actual</p><p className="mt-1 text-3xl font-black">{money(data.sale.monto_restante)}</p><p className="mt-2 flex items-center gap-2 text-xs text-slate-300"><CalendarDays size={15} /> Próximo pago: {dateLabel(data.sale.fecha_proximo_pago)}</p></div>

            {isPaid ? <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800"><CheckCircle2 className="mx-auto mb-2" /><p className="font-black">La deuda fue cancelada</p><p className="mt-1 text-sm">El historial permanece disponible.</p></div> : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Importe del pago</span><input required inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); resetIdempotency(); }} placeholder="0.00" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-lg font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Fecha de pago</span><input required type="date" max={getPeruBusinessDate()} value={paymentDate} onChange={(event) => { setPaymentDate(event.target.value); resetIdempotency(); }} className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Medio de pago</span><select value={method} onChange={(event) => { setMethod(event.target.value as CreditPaymentMethod); setOperationNumber(''); resetIdempotency(); }} className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-blue-500">{Object.entries(methodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                {method !== 'efectivo' && <label className="block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Número de operación</span><input required minLength={6} maxLength={50} value={operationNumber} onChange={(event) => { setOperationNumber(event.target.value); resetIdempotency(); }} className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" /></label>}
                {isPartial && <label className="block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Próxima fecha de pago</span><input required type="date" min={addCalendarDays(paymentDate, 1)} value={nextPaymentDate} onChange={(event) => { setNextPaymentDate(event.target.value); resetIdempotency(); }} className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" /><span className="mt-1 block text-xs text-slate-500">Obligatoria porque quedará saldo pendiente.</span></label>}
                <label className="block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Observación (opcional)</span><textarea maxLength={255} rows={3} value={notes} onChange={(event) => { setNotes(event.target.value); resetIdempotency(); }} className="w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none focus:border-blue-500" /></label>
                <button disabled={submitting} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <><RefreshCw className="animate-spin" size={19} /> Registrando...</> : <><CreditCard size={19} /> Revisar y confirmar</>}</button>
              </form>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
