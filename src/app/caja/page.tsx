'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import styles from './caja.module.css';

import { useUser } from '../context/UserContext';
import {
  openCash,
  getCashStatus,
  getCashMovements,
  registerExpense,
  closeCash,
  CashMovement,
  CashSession,
  CashSummary,
} from '../services/cashService';

function money(n: number) {
  return Number(n || 0).toFixed(2);
}

export default function CajaPage() {
  const { user } = useUser();

  const token = user?.token || '';
  const warehouseId = user?.warehouse_id || 0;
  const userId = user?.id || 0;

  const warehouseName = user?.warehouse?.warehouse_name;
  const userName = user?.full_name;

  // sesión actual
  const [session, setSession] = useState<CashSession | null>(null);

  // movimientos / resumen
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [summary, setSummary] = useState<CashSummary | null>(null);

  // loading
  const [loading, setLoading] = useState(false);

  // abrir caja
  const [openingAmount, setOpeningAmount] = useState<string>('');
  const [openingNotes, setOpeningNotes] = useState<string>('');

  // egreso
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDesc, setExpenseDesc] = useState<string>('');

  // cierre
  const [closingCashCounted, setClosingCashCounted] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');

  // polling “en tiempo real”
  const [autoRefresh, setAutoRefresh] = useState(true);

  const canUse = useMemo(() => {
    return Boolean(token && warehouseId && userId);
  }, [token, warehouseId, userId]);

  const loadStatus = async () => {
    if (!canUse) return;
    setLoading(true);
    try {
      const r = await getCashStatus(warehouseId, token);
      setSession(r.session);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo cargar estado de caja' });
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async (sessionId: number) => {
    if (!canUse) return;
    try {
      const r = await getCashMovements(sessionId, token);
      setMovements(r.movements || []);
      setSummary(r.summary || null);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo cargar movimientos' });
    }
  };

  // 1) Cargar estado al entrar
  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse]);

  // 2) Cuando hay sesión abierta, cargar movimientos
  useEffect(() => {
    if (!session?.id) {
      setMovements([]);
      setSummary(null);
      return;
    }
    void loadMovements(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  // 3) Auto-refresh cada 10s si está abierta
  useEffect(() => {
    if (!autoRefresh) return;
    if (!session?.id) return;

    const t = setInterval(() => {
      void loadMovements(session.id);
    }, 10_000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, session?.id]);

  // =============================
  // Handlers
  // =============================
  const handleOpenCash = async () => {
    if (!canUse) {
      Swal.fire({ icon: 'warning', title: 'Sesión', text: 'Inicia sesión' });
      return;
    }

    const n = Number(openingAmount);
    if (!Number.isFinite(n) || n < 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'opening_amount debe ser >= 0' });
      return;
    }

    setLoading(true);
    try {
      await openCash(
        {
          warehouse_id: warehouseId,
          user_id: userId,
          opening_amount: Number(n.toFixed(2)),
          notes: openingNotes.trim() || undefined,
        },
        token,
      );

      Swal.fire({ icon: 'success', title: 'Caja abierta', text: 'Se abrió la caja correctamente.' });
      setOpeningAmount('');
      setOpeningNotes('');
      await loadStatus();
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'No se pudo abrir', text: e?.message || 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExpense = async () => {
    if (!session?.id) {
      Swal.fire({ icon: 'warning', title: 'Caja', text: 'No hay caja abierta' });
      return;
    }

    const amt = Number(expenseAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'El egreso debe ser > 0' });
      return;
    }

    const desc = expenseDesc.trim();
    if (desc.length < 3) {
      Swal.fire({ icon: 'warning', title: 'Descripción', text: 'Describe el motivo del egreso (mín 3 caracteres)' });
      return;
    }

    try {
      await registerExpense(
        {
          warehouse_id: warehouseId,
          user_id: userId,
          session_id: session.id,
          amount: Number(amt.toFixed(2)),
          description: desc,
        },
        token,
      );

      Swal.fire({ icon: 'success', title: 'Egreso registrado', text: 'Se registró el egreso.' });
      setExpenseAmount('');
      setExpenseDesc('');
      await loadMovements(session.id);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo registrar egreso' });
    }
  };

  const handleCloseCash = async () => {
    if (!session?.id) return;

    const counted = Number(closingCashCounted);
    if (!Number.isFinite(counted) || counted < 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'El conteo debe ser >= 0' });
      return;
    }

    const ok = await Swal.fire({
      icon: 'question',
      title: 'Cerrar caja',
      text: '¿Confirmas el cierre de caja? Esto debería ser al final del día.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
    });

    if (!ok.isConfirmed) return;

    setLoading(true);
    try {
      await closeCash(
        {
          warehouse_id: warehouseId,
          user_id: userId,
          session_id: session.id,
          closing_cash_counted: Number(counted.toFixed(2)),
          notes: closingNotes.trim() || undefined,
        },
        token,
      );

      Swal.fire({ icon: 'success', title: 'Caja cerrada', text: 'Se cerró la caja.' });
      setClosingCashCounted('');
      setClosingNotes('');

      await loadStatus(); // session debería pasar a null o CLOSED según tu API
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo cerrar caja' });
    } finally {
      setLoading(false);
    }
  };

  const hasOpen = session?.status === 'OPEN';

  // Totales rápidos para UI (si tu summary ya lo da, esto es extra)
  const totals = useMemo(() => {
    const income = movements
      .filter((m) => Number(m.amount) > 0)
      .reduce((acc, m) => acc + Number(m.amount || 0), 0);

    const expense = movements
      .filter((m) => Number(m.amount) < 0)
      .reduce((acc, m) => acc + Math.abs(Number(m.amount || 0)), 0);

    return { income, expense, net: income - expense };
  }, [movements]);

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Caja</h1>

        <div className={styles.headerRight}>
          <button className={styles.button} onClick={loadStatus} disabled={!canUse || loading}>
            Refrescar estado
          </button>

          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto (10s)
          </label>
        </div>
      </div>

      {!canUse && (
        <div className={styles.card}>
          <b>Falta sesión</b>
          <p>Necesitas token, warehouseId y userId para usar Caja.</p>
        </div>
      )}

      {/* =======================
          ESTADO
      ======================= */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Estado</h2>
          <span className={`${styles.badge} ${hasOpen ? styles.badgeOpen : styles.badgeClosed}`}>
            {hasOpen ? 'ABIERTA' : 'CERRADA'}
          </span>
        </div>

        <div className={styles.grid2}>
          <div>
            <div className={styles.kv}><span>Tienda</span><b>{warehouseName || '-'}</b></div>
            <div className={styles.kv}><span>Usuario</span><b>{userName || '-'}</b></div>
          </div>

          <div>
            <div className={styles.kv}><span>Sesión</span><b>{session?.id ?? '-'}</b></div>
            <div className={styles.kv}><span>Apertura</span><b>{session?.opened_at ? new Date(session.opened_at).toLocaleString() : '-'}</b></div>
          </div>
        </div>

        {hasOpen && (
          <div className={styles.kv} style={{ marginTop: 8 }}>
            <span>Monto apertura (S/)</span>
            <b>{money(Number(session?.opening_cash || 0))}</b>
          </div>
        )}
      </div>

      {/* =======================
          ABRIR CAJA
      ======================= */}
      {!hasOpen && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Abrir caja</h2>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Monto de apertura (S/)</label>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="Ej: 100.00"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Notas (opcional)</label>
              <input
                className={styles.input}
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Ej: Cambio inicial"
              />
            </div>

            <button className={styles.primary} onClick={handleOpenCash} disabled={!canUse || loading}>
              Abrir caja
            </button>
          </div>
        </div>
      )}

      {/* =======================
          RESUMEN / ARQUEO EN VIVO
      ======================= */}
      {hasOpen && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Arqueo / Resumen del día</h2>
            <button className={styles.button} onClick={() => session?.id && loadMovements(session.id)} disabled={loading}>
              Refrescar movimientos
            </button>
          </div>

          <div className={styles.grid3}>
            <div className={styles.metric}>
              <span>Ingresos (S/)</span>
              <b>{money(summary?.totalIncome ?? totals.income)}</b>
            </div>
            <div className={styles.metric}>
              <span>Egresos (S/)</span>
              <b>{money(summary?.totalExpense ?? totals.expense)}</b>
            </div>
            <div className={styles.metric}>
              <span>Neto (S/)</span>
              <b>{money(summary?.net ?? totals.net)}</b>
            </div>
          </div>

          {/* Totales por método */}
          {summary?.totalsByMethod && (
            <div className={styles.methodBox}>
              <h3 className={styles.subTitle}>Totales por método</h3>
              <div className={styles.methodGrid}>
                {Object.entries(summary.totalsByMethod).map(([k, v]) => (
                  <div key={k} className={styles.methodItem}>
                    <span>{k}</span>
                    <b>S/ {money(v)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =======================
          EGRESOS
      ======================= */}
      {hasOpen && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Registrar egreso</h2>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Monto egreso (S/)</label>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="Ej: 20.00"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Descripción</label>
              <input
                className={styles.input}
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder="Ej: Movilidad / compra de bolsas"
              />
            </div>

            <button className={styles.buttonDanger} onClick={handleExpense} disabled={loading}>
              Registrar egreso
            </button>
          </div>
        </div>
      )}

      {/* =======================
          MOVIMIENTOS DEL DÍA
      ======================= */}
      {hasOpen && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Movimientos de caja (día)</h2>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Método</th>
                  <th>Monto</th>
                  <th>Operación</th>
                  <th>Descripción</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.created_at).toLocaleString()}</td>
                    <td>{m.type}</td>
                    <td>{m.payment_method ?? '-'}</td>
                    <td className={Number(m.amount) < 0 ? styles.neg : styles.pos}>
                      {Number(m.amount) < 0 ? `- S/ ${money(Math.abs(Number(m.amount)))}` : `S/ ${money(Number(m.amount))}`}
                    </td>
                    <td>{m.operation_number ?? '-'}</td>
                    <td>{m.description ?? '-'}</td>
                  </tr>
                ))}

                {!movements.length && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', opacity: 0.7 }}>
                      Sin movimientos aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================
          CIERRE DE CAJA
      ======================= */}
      {hasOpen && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Cerrar caja</h2>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Conteo final en efectivo (S/)</label>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={closingCashCounted}
                onChange={(e) => setClosingCashCounted(e.target.value)}
                placeholder="Ej: 350.00"
              />
              {summary?.expectedCash != null && (
                <small className={styles.helper}>
                  Esperado efectivo: <b>S/ {money(summary.expectedCash)}</b>
                </small>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Notas (opcional)</label>
              <input
                className={styles.input}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ej: Se retiró cambio, etc."
              />
            </div>

            <button className={styles.primary} onClick={handleCloseCash} disabled={loading}>
              Cerrar caja
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
