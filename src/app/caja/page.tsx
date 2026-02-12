'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { 
  Wallet, 
  RefreshCw, 
  DollarSign, 
  ArrowRight, 
  Lock, 
  History, 
  TrendingDown, 
  TrendingUp,
  AlertCircle 
} from 'lucide-react';
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

  // Validación para habilitar botón de apertura
  const isOpeningValid = useMemo(() => {
    return openingAmount.trim() !== '' && !isNaN(Number(openingAmount));
  }, [openingAmount]);

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
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'Ingresa un monto válido mayor o igual a 0' });
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

      Swal.fire({ 
        icon: 'success', 
        title: '¡Caja Abierta!', 
        text: 'Se ha iniciado la sesión de caja correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
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
      confirmButtonColor: '#0f172a'
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

      await loadStatus(); 
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo cerrar caja' });
    } finally {
      setLoading(false);
    }
  };

  const hasOpen = session?.status === 'OPEN';

  // Totales rápidos para UI
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
      
      {/* HEADER */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>
            <Wallet size={24} color="#0f172a"/>
          </div>
          <div>
            <h1 className={styles.title}>Gestión de Caja</h1>
            <p className={styles.subtitle}>{warehouseName || 'Almacén'} • {userName}</p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span className={styles.checkboxText}>Auto (10s)</span>
          </label>
          <button className={styles.refreshButton} onClick={loadStatus} disabled={!canUse || loading}>
            <RefreshCw size={16} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      {!canUse && (
        <div className={`${styles.card} ${styles.warningCard}`}>
          <AlertCircle size={20} />
          <div>
            <b>Falta sesión</b>
            <p>Necesitas iniciar sesión correctamente para gestionar la caja.</p>
          </div>
        </div>
      )}

      {/* =======================
          ESTADO (Solo se muestra información básica si está abierta)
      ======================= */}
      {hasOpen && (
        <div className={styles.statusBanner}>
          <div className={styles.statusItem}>
             <span className={styles.statusLabel}>Estado</span>
             <span className={styles.badgeOpen}>ABIERTA</span>
          </div>
          <div className={styles.statusItem}>
             <span className={styles.statusLabel}>Apertura</span>
             <span className={styles.statusValue}>S/ {money(Number(session?.opening_cash || 0))}</span>
          </div>
          <div className={styles.statusItem}>
             <span className={styles.statusLabel}>Hora Inicio</span>
             <span className={styles.statusValue}>{session?.opened_at ? new Date(session.opened_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span>
          </div>
        </div>
      )}

      {/* =======================
          ABRIR CAJA (Diseño Mejorado)
      ======================= */}
      {!hasOpen && (
        <div className={`${styles.card} ${styles.openCashCard}`}>
          <div className={styles.openCashContent}>
            <div className={styles.openCashLeft}>
               <div className={styles.bigIcon}>
                 <Wallet size={48} />
               </div>
               <div>
                 <h2 className={styles.cardTitle}>Apertura de Caja</h2>
                 <p className={styles.cardDesc}>Ingresa el monto inicial para comenzar las operaciones del día.</p>
               </div>
            </div>

            <div className={styles.formStack}>
              <div className={styles.field}>
                <label className={styles.label}>Monto de apertura (S/)</label>
                <div className={styles.inputGroup}>
                  <DollarSign size={18} className={styles.inputIcon}/>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Notas adicionales</label>
                <input
                  className={styles.input}
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  placeholder="Ej: Billetes de 10, Monedas..."
                />
              </div>

              <button 
                className={styles.primaryButton} 
                onClick={handleOpenCash} 
                disabled={!canUse || loading || !isOpeningValid} // VALIDACIÓN AQUÍ
              >
                {loading ? 'Abriendo...' : 'Abrir Caja'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================
          RESUMEN / ARQUEO EN VIVO
      ======================= */}
      {hasOpen && (
        <div className={styles.dashboardGrid}>
          {/* Card Resumen */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Resumen del día</h2>
              <button className={styles.textButton} onClick={() => session?.id && loadMovements(session.id)} disabled={loading}>
                Actualizar
              </button>
            </div>

            <div className={styles.metricsGrid}>
              <div className={`${styles.metricCard} ${styles.incomeMetric}`}>
                <div className={styles.metricIcon}><TrendingUp size={20}/></div>
                <div>
                   <span>Ingresos</span>
                   <b>S/ {money(summary?.totalIncome ?? totals.income)}</b>
                </div>
              </div>
              <div className={`${styles.metricCard} ${styles.expenseMetric}`}>
                <div className={styles.metricIcon}><TrendingDown size={20}/></div>
                <div>
                   <span>Egresos</span>
                   <b>S/ {money(summary?.totalExpense ?? totals.expense)}</b>
                </div>
              </div>
              <div className={`${styles.metricCard} ${styles.netMetric}`}>
                <div className={styles.metricIcon}><DollarSign size={20}/></div>
                <div>
                   <span>Total Neto</span>
                   <b>S/ {money(summary?.net ?? totals.net)}</b>
                </div>
              </div>
            </div>

            {/* Totales por método */}
            {summary?.totalsByMethod && (
              <div className={styles.methodsContainer}>
                <h3 className={styles.subTitle}>Desglose por método</h3>
                <div className={styles.methodTags}>
                  {Object.entries(summary.totalsByMethod).map(([k, v]) => (
                    <div key={k} className={styles.methodTag}>
                      <span className={styles.methodName}>{k}</span>
                      <span className={styles.methodValue}>S/ {money(Number(v))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card Egresos */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
               <h2 className={styles.cardTitle}>Registrar Salida</h2>
            </div>
            <div className={styles.formStack}>
              <div className={styles.field}>
                <label className={styles.label}>Monto (S/)</label>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Motivo</label>
                <input
                  className={styles.input}
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Descripción del gasto"
                />
              </div>
              <button className={styles.dangerButton} onClick={handleExpense} disabled={loading}>
                Registrar Egreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================
          MOVIMIENTOS DEL DÍA
      ======================= */}
      {hasOpen && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
             <div className={styles.headerWithIcon}>
                <History size={20} className={styles.textGray} />
                <h2 className={styles.cardTitle}>Historial de Movimientos</h2>
             </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Tipo</th>
                  <th>Método</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                    <td>
                      {/* AQUI SE MUESTRA EL VALOR REAL DE LA BD (APERTURA, VENTA, GASTO, etc) */}
                      <span className={Number(m.amount) >= 0 ? styles.badgeIngreso : styles.badgeEgreso}>
                        {m.type}
                      </span>
                    </td>
                    <td>{m.payment_method ?? '-'}</td>
                    <td className={Number(m.amount) < 0 ? styles.neg : styles.pos}>
                      {Number(m.amount) < 0 ? `- S/ ${money(Math.abs(Number(m.amount)))}` : `+ S/ ${money(Number(m.amount))}`}
                    </td>
                    <td className={styles.descCell}>{m.description || m.operation_number || '-'}</td>
                  </tr>
                ))}

                {!movements.length && (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      No hay movimientos registrados en esta sesión.
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
        <div className={`${styles.card} ${styles.closeCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.headerWithIcon}>
               <Lock size={20} />
               <h2 className={styles.cardTitle}>Cierre de Caja</h2>
            </div>
          </div>

          <div className={styles.closeGrid}>
             <div className={styles.field}>
              <label className={styles.label}>Efectivo contado en caja (S/)</label>
              <input
                className={`${styles.input} ${styles.inputLarge}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={closingCashCounted}
                onChange={(e) => setClosingCashCounted(e.target.value)}
                placeholder="0.00"
              />
              {summary?.expectedCash != null && (
                <div className={styles.expectedInfo}>
                  Esperado en sistema: <b>S/ {money(summary.expectedCash)}</b>
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Observaciones de cierre</label>
              <input
                className={styles.input}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ej: Sobrante/Faltante..."
              />
            </div>
            
            <div className={styles.closeActions}>
               <button className={styles.blackButton} onClick={handleCloseCash} disabled={loading}>
                Cerrar Turno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}