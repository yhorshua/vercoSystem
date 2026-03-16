'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
    BarChart3,
    Search,
    Download,
    RefreshCw,
    Calendar,
    User,
    Filter,
    DollarSign,
    ShoppingBag,
    Store
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import {
    getSalesReport,
    getWeeklyProfitReport,
    getSellerCommissionReport,
    getInventoryIngressReport,
    getCashClosureReport,
    SalesReportRowDTO,
    SalesPaymentDTO,
    getSellerSalesDetailReport
} from '../services/reportServices';
import { getSellersByWarehouse, SellerOption } from '../services/userServices';

import styles from './reporteVentas.module.css';
import { buildSalesReportPdfBlob } from '../utils/salesReportPdf';
import { buildWeeklyProfitReportPdfBlob } from '../utils/weeklyReportPdf';
import { buildWeeklyProfitExcel } from '../utils/weeklyReportExcel';
import * as XLSX from 'xlsx';

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
    const warehouseId = user?.warehouse_id || 0;
    const warehouseName = user?.warehouse?.warehouse_name || '';

    const canUse = useMemo(() => Boolean(token && warehouseId), [token, warehouseId]);

    const [reportType, setReportType] = useState<string>('DAY');
    const [date, setDate] = useState(todayISO());
    const [from, setFrom] = useState(todayISO());
    const [to, setTo] = useState(todayISO());

    const [sellers, setSellers] = useState<SellerOption[]>([]);
    const [sellerId, setSellerId] = useState<string>('');
    const [loadingSellers, setLoadingSellers] = useState(false);

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any | null>(null);

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
            let pdfBlob;
            if (reportType === 'WEEKLY_PROFIT') {
                pdfBlob = await buildWeeklyProfitReportPdfBlob(report, {
                    periodLabel: `Del ${from} al ${to}`, // Puedes ajustar esto si prefieres un periodo diferente
                });
            } else {
                // Aquí llamas a tu función de PDF de ventas (o la que esté configurada)
                pdfBlob = await buildSalesReportPdfBlob(report, {
                    periodLabel:
                        reportType === 'DAY'
                            ? `Día ${date}`
                            : `Del ${from} al ${to}`,
                });
            }

            const fileName =
                reportType === 'DAY'
                    ? `reporte_ventas_${warehouseName}_${date}.pdf`
                    : `reporte_ventas_${warehouseName}_${from}_al_${to}.pdf`;

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

        if (reportType === 'DAY' && !date) {
            Swal.fire({ icon: 'warning', title: 'Fecha', text: 'Selecciona una fecha' });
            return;
        }
        if (reportType !== 'DAY' && reportType !== 'SELLER') {
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
            let r;
            if (reportType === 'DAY') {
                r = await getSalesReport({ warehouseId, type: 'DAY', date, userId }, token);
            } else if (reportType === 'RANGE') {
                r = await getSalesReport({ warehouseId, type: 'RANGE', from, to, userId }, token);
            } else if (reportType === 'CASH_CLOSURE') {
                r = await getCashClosureReport({ warehouseId, type: 'RANGE', from, to, userId }, token);
            } else if (reportType === 'INVENTORY') {
                r = await getInventoryIngressReport({ warehouseId, type: 'RANGE', from, to, userId }, token);
            } else if (reportType === 'WEEKLY_PROFIT') {
                r = await getWeeklyProfitReport({ warehouseId, type: 'RANGE', from, to, userId }, token);
            } else if (reportType === 'SELLER_COMMISSION') {
                r = await getSellerSalesDetailReport({ warehouseId, type: 'RANGE', from, to, userId }, token);
            }
            setReport(r);
        } catch (e: any) {
            Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo consultar reporte' });
            setReport(null);
        } finally {
            setLoading(false);
        }
    };

    function handleDownloadExcel() {

        if (!report) {
            Swal.fire({
                icon: 'warning',
                title: 'Reporte',
                text: 'Primero consulta un reporte.'
            });
            return;
        }

        try {

            let workbook;

            if (reportType === 'WEEKLY_PROFIT') {

                workbook = buildWeeklyProfitExcel(report);

            } else if (reportType === 'SELLER_COMMISSION') {

                workbook = buildWeeklyProfitExcel(report);

            } else {

                Swal.fire({
                    icon: 'info',
                    title: 'Excel',
                    text: 'Este reporte aún no tiene Excel.'
                });

                return;
            }

            XLSX.writeFile(
                workbook,
                `reporte_${warehouseName}_${from}_${to}.xlsx`
            );

        } catch (e: any) {

            Swal.fire({
                icon: 'error',
                title: 'Excel',
                text: e?.message || 'No se pudo generar Excel'
            });

        }

    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <BarChart3 size={32} color="#0f172a" />
                <h1 className={styles.title}>Reporte de Ventas</h1>
            </div>

            {!canUse && (
                <div className={styles.card}>
                    <p style={{ color: 'red' }}>Necesitas iniciar sesión para consultar reportes.</p>
                </div>
            )}

            {/* CARD DE FILTROS */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>
                    <Filter size={18} /> Filtros de Búsqueda
                </h2>

                <div className={styles.filterGrid}>
                    {/* Tipo */}
                    <div className={styles.field}>
                        <label className={styles.label}>Tipo de Reporte</label>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className={styles.control}
                            >
                                <option value="DAY">📅 Ventas por Día</option>
                                <option value="RANGE">🗓️ Ventas por Rango</option>
                                <option value="CASH_CLOSURE">🔒 Cierre de Caja</option>
                                <option value="PRODUCT">📦 Ventas por Producto</option>
                                <option value="CLIENT">👥 Ventas por Cliente</option>
                                <option value="INVENTORY">📥 Ingreso Mercadería</option>
                                <option value="SELLER_COMMISSION">💰 Comisiones</option>
                                <option value="WEEKLY_PROFIT">📈 Utilidad Semanal</option>
                            </select>
                        </div>
                    </div>

                    {/* Vendedor */}
                    {reportType !== 'SELLER_COMMISSION' && (
                        <div className={styles.field}>
                            <label className={styles.label}>Vendedor</label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={sellerId}
                                    onChange={(e) => setSellerId(e.target.value)}
                                    disabled={loadingSellers}
                                    className={styles.control}
                                >
                                    <option value="">Todos los vendedores</option>
                                    {sellers.map((s) => (
                                        <option key={s.id} value={String(s.id)}>
                                            {s.full_name}
                                        </option>
                                    ))}
                                </select>
                                <User size={16} style={{ position: 'absolute', right: 10, top: 12, color: '#94a3b8', pointerEvents: 'none' }} />
                            </div>
                        </div>
                    )}

                    {/* Fechas */}
                    {reportType === 'DAY' ? (
                        <div className={styles.field}>
                            <label className={styles.label}>Fecha Consulta</label>
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
                                <label className={styles.label}>Desde</label>
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className={styles.control}
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Hasta</label>
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

                {/* Botones de Acción */}
                <div className={styles.actions}>
                    <button onClick={handleSearch} disabled={!canUse || loading} className={styles.btnPrimary}>
                        <Search size={18} />
                        {loading ? 'Consultando...' : 'Generar Reporte'}
                    </button>

                    <button onClick={loadSellers} disabled={!canUse || loadingSellers} className={styles.btnSecondary}>
                        <RefreshCw size={16} className={loadingSellers ? 'animate-spin' : ''} />
                        Actualizar Vendedores
                    </button>

                    <button onClick={handleDownloadPdf} disabled={!report} className={styles.btnSecondary} title="Descargar PDF">
                        <Download size={18} /> PDF
                    </button>

                    <button
                        onClick={handleDownloadExcel}
                        disabled={!report}
                        className={styles.btnSecondary}
                    >
                        <Download size={18} /> Excel
                    </button>
                </div>
            </div>

            {/* RESULTADOS */}
            {report && (
                <div>
                    {/* Tarjetas de Resumen (Stats) */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIconBox} ${styles.iconBlue}`}>
                                <Store size={24} />
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statLabel}>Tienda/Almacén</span>
                                <span className={styles.statValue}>{report.meta?.warehouse_name ?? `#${report.meta?.warehouse_id ?? '-'}`}</span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={`${styles.statIconBox} ${styles.iconPurple}`}>
                                <ShoppingBag size={24} />
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statLabel}>Total Ventas</span>
                                <span className={styles.statValue}>{report.meta?.total_sales ?? 0}</span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={`${styles.statIconBox} ${styles.iconGreen}`}>
                                <DollarSign size={24} />
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statLabel}>Monto Total</span>
                                <span className={styles.statValue}>S/ {Number(report.meta?.total_amount || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Resultados */}
                    <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th className={styles.th}>Código</th>
                                        <th className={styles.th}>Fecha / Hora</th>
                                        <th className={styles.th}>Vendedor</th>
                                        <th className={styles.th}>Total (S/)</th>
                                        <th className={styles.th}>Método Pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.sales?.map((s: SalesReportRowDTO) => (
                                        <tr key={s.sale_id} className={styles.tr}>
                                            <td className={styles.td}>
                                                <span style={{ fontWeight: 600 }}>{s.sale_code}</span>
                                            </td>
                                            <td className={styles.td}>
                                                {new Date(s.sale_date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className={styles.td}>{s.user_name}</td>
                                            <td className={styles.td} style={{ color: '#166534', fontWeight: 700 }}>
                                                {Number(s.total_amount).toFixed(2)}
                                            </td>
                                            <td className={styles.td}>
                                                {s.payments?.length
                                                    ? s.payments.map((p: SalesPaymentDTO) => p.method).join(', ')
                                                    : <span style={{ textTransform: 'capitalize' }}>{s.payment_method ?? '-'}</span>}
                                            </td>
                                        </tr>
                                    ))}

                                    {(!report.sales || report.sales.length === 0) && (
                                        <tr>
                                            <td className={styles.td} colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                                No se encontraron registros para este rango de fechas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}