'use client';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';

import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
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
    Store,
    TrendingUp,
    Users,
    ArrowUpRight,
    Briefcase,
    Layers,
    PackageCheck
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

import { buildSalesReportPdfBlob } from '../utils/salesReportPdf';
import { buildWeeklyProfitReportPdfBlob } from '../utils/weeklyReportPdf';
import { buildWeeklyProfitExcel } from '../utils/weeklyReportExcel';
import * as XLSX from 'xlsx';
import { buildWeeklyProfitAdvancedPdf } from '../utils/weeklyProfitAdvancedPdf';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

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
        } catch { setSellers([]); } finally { setLoadingSellers(false); }
    };

    async function getChartImageBase64(elementId: string): Promise<string | undefined> {
        const el = document.getElementById(elementId);
        if (!el) return;
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(el);
        return canvas.toDataURL('image/png');
    }

    const stats = useMemo(() => {
        if (!report) return null;
        const totalAmount = Number(report.meta?.total_amount || 0);
        const totalSales = report.meta?.total_sales || 0;
        const avgTicket = totalSales > 0 ? totalAmount / totalSales : 0;
        
        let totalProfit = 0;
        report.sales?.forEach((s: any) => {
            s.details?.forEach((d: any) => { totalProfit += Number(d.profit || 0); });
        });
        const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

        return { totalAmount, totalSales, avgTicket, totalProfit, profitMargin };
    }, [report]);

    // --- 1. CATEGORÍAS (GRÁFICO SÓLO MONTOS S/) ---
    const categoriesAmountChart = useMemo(() => {
        if (!report?.sales) return null;
        const map: Record<string, number> = {};
        report.sales.forEach((s: any) => {
            s.details?.forEach((d: any) => {
                const cat = d.category_name || 'Otros';
                map[cat] = (map[cat] || 0) + (Number(d.unit_price) * Number(d.quantity));
            });
        });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
        return {
            labels: sorted.map(i => i[0]),
            datasets: [{ label: 'Ventas (S/)', data: sorted.map(i => i[1]), backgroundColor: '#6366f1', borderRadius: 8 }]
        };
    }, [report]);

    // --- 2. CATEGORÍAS (GRÁFICO SÓLO UNIDADES) ---
    const categoriesUnitsChart = useMemo(() => {
        if (!report?.sales) return null;
        const map: Record<string, number> = {};
        report.sales.forEach((s: any) => {
            s.details?.forEach((d: any) => {
                const cat = d.category_name || 'Otros';
                map[cat] = (map[cat] || 0) + Number(d.quantity);
            });
        });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
        return {
            labels: sorted.map(i => i[0]),
            datasets: [{ label: 'Unidades Vendidas', data: sorted.map(i => Math.round(i[1])), backgroundColor: '#10b981', borderRadius: 8 }]
        };
    }, [report]);

    // --- 3. TOP PRODUCTOS (SÓLO UNIDADES) ---
    const topProductsUnitsChart = useMemo(() => {
        if (!report?.sales) return null;
        const map: Record<string, number> = {};
        report.sales.forEach((s: any) => {
            s.details?.forEach((d: any) => {
                const name = d.article_description || 'Desconocido';
                map[name] = (map[name] || 0) + Number(d.quantity);
            });
        });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return {
            labels: sorted.map(i => i[0].substring(0, 20)),
            datasets: [{ label: 'Unidades', data: sorted.map(i => Math.round(i[1])), backgroundColor: '#f43f5e', borderRadius: 8 }]
        };
    }, [report]);

    const paymentChartData = useMemo(() => {
        if (!report?.sales) return null;
        const map: Record<string, number> = {};
        report.sales.forEach((s: any) => {
            const method = (s.payment_method || 'OTROS').toUpperCase();
            map[method] = (map[method] || 0) + Number(s.total_amount);
        });
        return { labels: Object.keys(map), datasets: [{ data: Object.values(map), backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'] }] };
    }, [report]);

    const trendChartData = useMemo(() => {
        if (!report?.sales) return null;
        const map: Record<string, number> = {};
        report.sales.forEach((s: any) => {
            const day = new Date(s.sale_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
            map[day] = (map[day] || 0) + Number(s.total_amount);
        });
        return { labels: Object.keys(map), datasets: [{ fill: true, label: 'Ventas S/', data: Object.values(map), borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', tension: 0.4 }] };
    }, [report]);

    async function handleDownloadPdf() {
        if (!report) return;
        try {
            const charts = {
                salesChart: await getChartImageBase64('chart-sales'),
                paymentChart: await getChartImageBase64('chart-payments'),
                catAmountChart: await getChartImageBase64('chart-cat-amount'),
                catUnitsChart: await getChartImageBase64('chart-cat-units'),
                unitsChart: await getChartImageBase64('chart-units')
            };
            let pdfBlob;
            if (reportType === 'WEEKLY_PROFIT') {
                pdfBlob = await buildWeeklyProfitAdvancedPdf(report, charts);
            } else {
                pdfBlob = await buildSalesReportPdfBlob(report, { periodLabel: reportType === 'DAY' ? `Día ${date}` : `Del ${from} al ${to}`, ...charts });
            }
            const fileName = `reporte_${warehouseName}_${date}.pdf`;
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a'); a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch (e) { Swal.fire({ icon: 'error', title: 'PDF', text: 'Error al generar.' }); }
    }
    

    function handleDownloadExcel() {
        if (!report) return;
        try {
            if (reportType === 'WEEKLY_PROFIT' || reportType === 'SELLER_COMMISSION') {
                const workbook = buildWeeklyProfitExcel(report);
                XLSX.writeFile(workbook, `reporte_${warehouseName}.xlsx`);
            } else { Swal.fire({ icon: 'info', title: 'Excel', text: 'Solo disponible para Utilidad y Comisiones.' }); }
        } catch (e) { Swal.fire({ icon: 'error', title: 'Excel', text: 'Error al generar.' }); }
    }

    const handleSearch = async () => {
        if (!canUse) return;
        setLoading(true);
        try {
            const userId = sellerId ? Number(sellerId) : undefined;
            let r;
            const params = { warehouseId, from, to, date, userId };
            if (reportType === 'DAY') r = await getSalesReport({ ...params, type: 'DAY' }, token);
            else if (reportType === 'RANGE') r = await getSalesReport({ ...params, type: 'RANGE' }, token);
            else if (reportType === 'CASH_CLOSURE') r = await getCashClosureReport({ ...params, type: 'RANGE' }, token);
            else if (reportType === 'INVENTORY') r = await getInventoryIngressReport({ ...params, type: 'RANGE' }, token);
            else if (reportType === 'WEEKLY_PROFIT') r = await getWeeklyProfitReport({ ...params, type: 'RANGE' }, token);
            else if (reportType === 'SELLER_COMMISSION') r = await getSellerSalesDetailReport({ ...params, type: 'RANGE' }, token);
            setReport(r);
        } catch (e) { Swal.fire({ icon: 'error', title: 'Error', text: 'Error al consultar.' }); } finally { setLoading(false); }
    };

    useEffect(() => { loadSellers(); }, [canUse, warehouseId]);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                    <BarChart3 className="text-indigo-600" size={36} />
                    Reporte de Ventas e Inteligencia
                </h1>
                <p className="text-slate-500 mt-1">Análisis operativo para {warehouseName}</p>
            </div>

            {/* FORMULARIO DE FILTROS ORIGINAL */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Análisis</label>
                        <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                            <option value="DAY">📅 Ventas por Día</option>
                            <option value="RANGE">🗓️ Ventas por Rango</option>
                            <option value="CASH_CLOSURE">🔒 Cierre de Caja</option>
                            <option value="INVENTORY">📥 Ingreso Mercadería</option>
                            <option value="SELLER_COMMISSION">💰 Comisiones</option>
                            <option value="WEEKLY_PROFIT">📈 Utilidad Semanal</option>
                        </select>
                    </div>
                    {reportType !== 'SELLER_COMMISSION' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Vendedor</label>
                            <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">
                                <option value="">Todos</option>
                                {sellers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        {reportType === 'DAY' ? (
                            <div className="col-span-2 flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5" />
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Desde</label>
                                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Hasta</label>
                                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={handleSearch} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                        Generar Reporte
                    </button>
                    <button onClick={handleDownloadPdf} disabled={!report} className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                        <Download size={18} className="text-red-500" /> PDF
                    </button>
                    <button onClick={handleDownloadExcel} disabled={!report} className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                        <Download size={18} className="text-emerald-500" /> Excel
                    </button>
                </div>
            </div>

            {report && (
                <div className="space-y-8 pb-10">
                    {/* KPIS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard title="Ventas Totales" value={`S/ ${stats?.totalAmount.toFixed(2)}`} icon={<DollarSign size={24}/>} color="blue" trend="Ingreso bruto" />
                        <KPICard title="Utilidad Bruta" value={`S/ ${stats?.totalProfit.toFixed(2)}`} icon={<TrendingUp size={24}/>} color="emerald" trend={`${stats?.profitMargin.toFixed(1)}% margen`} />
                        <KPICard title="Nro. Ventas" value={stats?.totalSales} icon={<ShoppingBag size={24}/>} color="purple" trend="Operaciones" />
                        <KPICard title="Ticket Promedio" value={`S/ ${stats?.avgTicket.toFixed(2)}`} icon={<Users size={24}/>} color="amber" trend="Por cliente" />
                    </div>

                    {/* GRÁFICOS SEPARADOS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Layers size={20} className="text-indigo-500" /> Ventas por Categoría (Soles)</h3>
                            <div className="h-[300px]" id="chart-cat-amount">
                                {categoriesAmountChart && <Bar data={categoriesAmountChart} options={{ maintainAspectRatio: false, indexAxis: 'y' as const }} />}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Layers size={20} className="text-emerald-500" /> Unidades por Categoría</h3>
                            <div className="h-[300px]" id="chart-cat-units">
                                {categoriesUnitsChart && <Bar data={categoriesUnitsChart} options={{ maintainAspectRatio: false }} />}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><PackageCheck size={20} className="text-rose-500" /> Top Productos (Unidades)</h3>
                            <div className="h-[300px]" id="chart-units">
                                {topProductsUnitsChart && <Bar data={topProductsUnitsChart} options={{ maintainAspectRatio: false, scales: { y: { ticks: { stepSize: 1 } } } }} />}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><DollarSign size={20} className="text-emerald-500" /> Distribución de Recaudación</h3>
                            <div className="h-[300px] flex items-center justify-center" id="chart-payments">
                                {paymentChartData && <Doughnut data={paymentChartData} options={{ maintainAspectRatio: false, cutout: '70%' }} />}
                            </div>
                        </div>
                    </div>

                    {/* TABLA ORIGINAL MANTENIDA */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                        <div className="p-6 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-700">Listado Detallado</h3></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider">
                                    <tr><th className="px-6 py-4">Código</th><th className="px-6 py-4">Vendedor</th><th className="px-6 py-4">Total (S/)</th><th className="px-6 py-4">Método</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {report.sales?.map((s: SalesReportRowDTO) => (
                                        <tr key={s.sale_id} className="hover:bg-indigo-50/40 transition-colors">
                                            <td className="px-6 py-4 font-bold text-indigo-600">#{s.sale_code}</td>
                                            <td className="px-6 py-4">{s.user_name}</td>
                                            <td className="px-6 py-4 font-bold">S/ {Number(s.total_amount).toFixed(2)}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-semibold uppercase">{s.payment_method || 'Varios'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function KPICard({ title, value, icon, color, trend }: { title: string, value: any, icon: any, color: string, trend: string }) {
    const colors: any = { blue: "bg-blue-50 text-blue-600", emerald: "bg-emerald-50 text-emerald-600", purple: "bg-purple-50 text-purple-600", amber: "bg-amber-50 text-amber-600" };
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4"><div className={`p-3 rounded-xl ${colors[color]}`}>{icon}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{trend}</div></div>
            <p className="text-slate-500 text-sm font-semibold">{title}</p><h4 className="text-2xl font-black text-slate-800 mt-1">{value}</h4>
        </div>
    );
}