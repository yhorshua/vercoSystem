'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

import { useUser } from '../context/UserContext';
import { getSalesReport, SalesReportResponse, SalesReportType } from '../services/reportServices';
import { getSellersByWarehouse, SellerOption } from '../services/userServices';

import styles from './reporteVentas.module.css';
import { buildSalesReportPdfBlob } from '../utils/salesReportPdf';

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function ReporteVentasPage() {
    const { user } = useUser();

    const token = user?.token || '';
    const warehouseId = user?.warehouseId || 0;

    const canUse = useMemo(() => Boolean(token && warehouseId), [token, warehouseId]);

    // form
    const [type, setType] = useState<SalesReportType>('DAY');
    const [date, setDate] = useState(todayISO());
    const [from, setFrom] = useState(todayISO());
    const [to, setTo] = useState(todayISO());

    // vendedores
    const [sellers, setSellers] = useState<SellerOption[]>([]);
    const [sellerId, setSellerId] = useState<string>(''); // '' = todos
    const [loadingSellers, setLoadingSellers] = useState(false);

    // data
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<SalesReportResponse | null>(null);

    const loadSellers = async () => {
        if (!canUse) return;
        setLoadingSellers(true);
        try {
            const r = await getSellersByWarehouse(warehouseId, token);
            setSellers(r || []);
        } catch {
            setSellers([]);
        } finally {
            setLoadingSellers(false);
        }
    };

    async function handleDownloadPdf() {
        if (!report) {
            Swal.fire({ icon: 'warning', title: 'Reporte', text: 'Primero consulta un reporte.' });
            return;
        }

        try {
            const pdfBlob = await buildSalesReportPdfBlob(report, {
                periodLabel:
                    type === 'DAY'
                        ? `Día ${date}`
                        : `Del ${from} al ${to}`,
            });

            // ✅ descargar
            const fileName =
                type === 'DAY'
                    ? `reporte_ventas_${date}.pdf`
                    : `reporte_ventas_${from}_al_${to}.pdf`;

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

        } catch (e: any) {
            Swal.fire({ icon: 'error', title: 'PDF', text: e?.message || 'No se pudo generar el PDF' });
        }
    }

    useEffect(() => {
        void loadSellers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canUse, warehouseId]);

    const handleSearch = async () => {
        if (!canUse) {
            Swal.fire({ icon: 'warning', title: 'Sesión', text: 'Inicia sesión' });
            return;
        }

        // Validaciones
        if (type === 'DAY') {
            if (!date) {
                Swal.fire({ icon: 'warning', title: 'Fecha', text: 'Selecciona una fecha' });
                return;
            }
        } else {
            if (!from || !to) {
                Swal.fire({ icon: 'warning', title: 'Fechas', text: 'Selecciona fecha inicio y fin' });
                return;
            }
            if (from > to) {
                Swal.fire({ icon: 'warning', title: 'Fechas', text: 'Inicio no puede ser mayor que fin' });
                return;
            }
        }

        setLoading(true);
        try {
            const userId = sellerId ? Number(sellerId) : undefined;

            const r = await getSalesReport(
                type === 'DAY'
                    ? { warehouseId, type, date, userId }
                    : { warehouseId, type, from, to, userId },
                token,
            );

            setReport(r);
        } catch (e: any) {
            Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo consultar reporte' });
            setReport(null);
        } finally {
            setLoading(false);
        }
    };

    const primaryBtnClass = `${styles.btnPrimary} ${(!canUse || loading) ? styles.btnPrimaryDisabled : ''}`;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Reporte de Ventas</h1>

            {!canUse && (
                <div className={styles.card}>
                    <b>Falta sesión</b>
                    <p>Necesitas token y warehouseId para consultar reportes.</p>
                </div>
            )}

            <div className={styles.card}>
                <div className={styles.grid4}>
                    <div className={styles.field}>
                        <label>Tipo</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as SalesReportType)}
                            className={styles.control}
                        >
                            <option value="DAY">Día</option>
                            <option value="RANGE">Rango (Semana/Mes)</option>
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label>Vendedor</label>
                        <select
                            value={sellerId}
                            onChange={(e) => setSellerId(e.target.value)}
                            disabled={loadingSellers}
                            className={styles.control}
                        >
                            <option value="">Todos</option>
                            {sellers.map((s) => (
                                <option key={s.id} value={String(s.id)}>
                                    {s.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {type === 'DAY' ? (
                        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                            <label>Fecha</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className={styles.control}
                            />
                        </div>
                    ) : (
                        <>
                            <div className={styles.field}>
                                <label>Desde</label>
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className={styles.control}
                                />
                            </div>

                            <div className={styles.field}>
                                <label>Hasta</label>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className={styles.control}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.actions}>
                    <button onClick={handleSearch} disabled={!canUse || loading} className={primaryBtnClass}>
                        {loading ? 'Consultando...' : 'Consultar'}
                    </button>

                    <button onClick={loadSellers} disabled={!canUse || loadingSellers} className={styles.btnSecondary}>
                        {loadingSellers ? 'Cargando...' : 'Refrescar vendedores'}
                    </button>

                    <button onClick={handleDownloadPdf} disabled={!report} className={primaryBtnClass}>
                        Generar PDF
                    </button>
                </div>
            </div>

            {/* RESULTADOS */}
            {report && (
                <div style={{ marginTop: 12 }}>
                    <div className={styles.card}>
                        <b>Tienda:</b> {report.meta.warehouse_name ?? `#${report.meta.warehouse_id}`} &nbsp;|&nbsp;
                        <b>Ventas:</b> {report.meta.total_sales} &nbsp;|&nbsp;
                        <b>Total:</b> {report.meta.total_amount.toFixed(2)}
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Código</th>
                                    <th className={styles.th}>Fecha</th>
                                    <th className={styles.th}>Vendedor</th>
                                    <th className={styles.th}>Total</th>
                                    <th className={styles.th}>Métodos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.sales.map((s) => (
                                    <tr key={s.sale_id}>
                                        <td className={styles.td}>{s.sale_code}</td>
                                        <td className={styles.td}>{new Date(s.sale_date).toLocaleString()}</td>
                                        <td className={styles.td}>{s.user_name}</td>
                                        <td className={styles.td}>{s.total_amount}</td>
                                        <td className={styles.td}>
                                            {s.payments?.length ? s.payments.map((p) => p.method).join(', ') : s.payment_method ?? '-'}
                                        </td>
                                    </tr>
                                ))}

                                {report.sales.length === 0 && (
                                    <tr>
                                        <td className={styles.td} colSpan={5}>
                                            Sin ventas en el rango seleccionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


        </div>
    );
}
