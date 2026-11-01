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
    getSellerSalesDetailReport,
    SellerSalesDetailResponse,
    WeeklyCategorySummary as WeeklyCategorySummaryDTO,
} from '../services/reportServices';
import { getSellersByWarehouse, SellerOption } from '../services/userServices';

import { buildSalesReportPdfBlob } from '../utils/salesReportPdf';
import { buildWeeklyProfitReportPdfBlob } from '../utils/weeklyReportPdf';
import {
    buildSellerCommissionExcel,
    buildWeeklyProfitExcel,
    CommissionRates,
} from '../utils/weeklyReportExcel';
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
    const [sneakersCommissionRate, setSneakersCommissionRate] = useState('1');
    const [accessoriesCommissionRate, setAccessoriesCommissionRate] = useState('1');

    const commissionRates = useMemo<CommissionRates>(() => ({
        Zapatillas: Math.max(0, Number(sneakersCommissionRate) || 0),
        Accesorios: Math.max(0, Number(accessoriesCommissionRate) || 0),
    }), [sneakersCommissionRate, accessoriesCommissionRate]);

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
        const totalAmount = Number(report.meta?.total_sales_amount ?? report.meta?.total_amount ?? 0);
        const totalSales = report.meta?.total_sales || 0;
        const avgTicket = totalSales > 0 ? totalAmount / totalSales : 0;
        const detailProfit = report.sales?.reduce((saleSum: number, sale: any) => (
            saleSum + (sale.details || []).reduce((detailSum: number, detail: any) => (
                detailSum + Number(detail.profit || 0)
            ), 0)
        ), 0) || 0;
        const totalProfit = Number(report.meta?.total_profit ?? report.total_profit ?? detailProfit);
        const totalCost = Number(report.meta?.total_purchase_amount ?? report.total_cost ?? 0);
        const totalQuantity = Number(report.meta?.total_quantity ?? report.total_quantity ?? 0);
        const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

        return { totalAmount, totalSales, avgTicket, totalProfit, totalCost, totalQuantity, profitMargin };
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
            if (reportType === 'SELLER_COMMISSION') {
                const workbook = buildSellerCommissionExcel(report, commissionRates);
                XLSX.writeFile(workbook, `comisiones_${warehouseName}.xlsx`);
            } else if (reportType === 'WEEKLY_PROFIT' || reportType === 'DAY' || reportType === 'RANGE') {
                const workbook = buildWeeklyProfitExcel(report);
                XLSX.writeFile(workbook, `reporte_${warehouseName}.xlsx`);
            } else { Swal.fire({ icon: 'info', title: 'Excel', text: 'Disponible para ventas, utilidad y comisiones.' }); }
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
                        <select value={reportType} onChange={(e) => { setReportType(e.target.value); setReport(null); }} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                            <option value="DAY">📅 Ventas por Día</option>
                            <option value="RANGE">🗓️ Ventas por Rango</option>
                            <option value="CASH_CLOSURE">🔒 Cierre de Caja</option>
                            <option value="INVENTORY">📥 Ingreso Mercadería</option>
                            <option value="SELLER_COMMISSION">💰 Comisiones</option>
                            <option value="WEEKLY_PROFIT">📈 Utilidad Semanal</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Vendedor</label>
                        <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">
                            <option value="">Todos</option>
                            {sellers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                    </div>
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

                {reportType === 'SELLER_COMMISSION' && (
                    <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 md:grid-cols-2">
                        <CommissionInput
                            label="Comisión por zapatilla"
                            value={sneakersCommissionRate}
                            onChange={setSneakersCommissionRate}
                        />
                        <CommissionInput
                            label="Comisión por accesorio"
                            value={accessoriesCommissionRate}
                            onChange={setAccessoriesCommissionRate}
                        />
                        <p className="text-xs text-slate-500 md:col-span-2">
                            El monto se multiplica por la cantidad comisionable consultada en cada categoría.
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={handleSearch} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                        Generar Reporte
                    </button>
                    <button onClick={handleDownloadPdf} disabled={!report || reportType === 'SELLER_COMMISSION'} title={reportType === 'SELLER_COMMISSION' ? 'Use Excel para el reporte completo de comisiones' : undefined} className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
                        <Download size={18} className="text-red-500" /> PDF
                    </button>
                    <button onClick={handleDownloadExcel} disabled={!report} className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                        <Download size={18} className="text-emerald-500" /> Excel
                    </button>
                </div>
            </div>

            {report && (reportType === 'SELLER_COMMISSION' ? (
                <SellerCommissionView report={report as SellerSalesDetailResponse} commissionRates={commissionRates} />
            ) : (
                <div className="space-y-8 pb-10">
                    {/* KPIS */}
                    <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${reportType === 'WEEKLY_PROFIT' ? 'xl:grid-cols-6' : 'lg:grid-cols-4'}`}>
                        <KPICard title="Ventas Totales" value={`S/ ${stats?.totalAmount.toFixed(2)}`} icon={<DollarSign size={24}/>} color="blue" trend="Ingreso bruto" />
                        {reportType === 'WEEKLY_PROFIT' && <KPICard title="Monto Compra" value={`S/ ${stats?.totalCost.toFixed(2)}`} icon={<Briefcase size={24}/>} color="amber" trend="Costo histórico" />}
                        <KPICard title="Utilidad Bruta" value={`S/ ${stats?.totalProfit.toFixed(2)}`} icon={<TrendingUp size={24}/>} color="emerald" trend={`${stats?.profitMargin.toFixed(1)}% margen`} />
                        {reportType === 'WEEKLY_PROFIT' && <KPICard title="Cantidad Vendida" value={stats?.totalQuantity} icon={<PackageCheck size={24}/>} color="purple" trend="Unidades" />}
                        <KPICard title="Nro. Ventas" value={stats?.totalSales} icon={<ShoppingBag size={24}/>} color="purple" trend="Operaciones" />
                        <KPICard title="Ticket Promedio" value={`S/ ${stats?.avgTicket.toFixed(2)}`} icon={<Users size={24}/>} color="amber" trend="Por cliente" />
                    </div>

                    {reportType === 'WEEKLY_PROFIT' && (
                        <WeeklyCategorySummary categories={report.categories || []} />
                    )}

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
                                    <tr><th className="px-6 py-4">Código</th><th className="px-6 py-4">Cliente</th><th className="px-6 py-4">Descripción</th><th className="px-6 py-4">Vendedor</th><th className="px-6 py-4">Total (S/)</th><th className="px-6 py-4">Método</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {report.sales?.map((s: SalesReportRowDTO) => (
                                        <tr key={s.sale_id} className="hover:bg-indigo-50/40 transition-colors">
                                            <td className="px-6 py-4 font-bold text-indigo-600">#{s.sale_code}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-700">{s.customer_name || 'Sin identificar'}</td>
                                            <td className="max-w-xs px-6 py-4 text-slate-500"><span className="line-clamp-2" title={s.notes || ''}>{s.notes || '—'}</span></td>
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
            )
            )}
        </div>
    );
}

function formatMoney(value: number) {
    return `S/ ${Number(value || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function categoryCommissionRate(category: string, rates: CommissionRates) {
    const normalized = String(category || '').toUpperCase();
    if (normalized.includes('ZAPATILLA') || normalized.includes('CALZADO')) return rates.Zapatillas;
    if (normalized.includes('ACCESORIO')) return rates.Accesorios;
    return 0;
}

function categoryCommission(category: { category: string; commissionable_quantity: number }, rates: CommissionRates) {
    return category.commissionable_quantity * categoryCommissionRate(category.category, rates);
}

function CommissionInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-indigo-800">{label} (S/)</span>
            <input
                type="number"
                min="0"
                step="0.10"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="rounded-xl border border-indigo-200 bg-white p-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
            />
        </label>
    );
}

function WeeklyCategorySummary({ categories }: { categories: WeeklyCategorySummaryDTO[] }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <h3 className="flex items-center gap-2 font-black text-slate-800">
                    <Layers size={19} className="text-indigo-600" /> Resumen por categoría
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-5 py-3">Categoría</th>
                            <th className="px-5 py-3 text-right">Cantidad</th>
                            <th className="px-5 py-3 text-right">Compra</th>
                            <th className="px-5 py-3 text-right">Venta</th>
                            <th className="px-5 py-3 text-right">Utilidad</th>
                            <th className="px-5 py-3 text-right">Margen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {categories.length === 0 ? (
                            <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No hay ventas en el periodo seleccionado.</td></tr>
                        ) : categories.map((category) => {
                            const margin = category.sales_amount > 0 ? (category.profit / category.sales_amount) * 100 : 0;
                            return (
                                <tr key={category.category} className="hover:bg-indigo-50/30">
                                    <td className="px-5 py-4 font-black text-slate-800">{category.category}</td>
                                    <td className="px-5 py-4 text-right font-bold">{category.quantity}</td>
                                    <td className="px-5 py-4 text-right">{formatMoney(category.purchase_amount)}</td>
                                    <td className="px-5 py-4 text-right font-bold">{formatMoney(category.sales_amount)}</td>
                                    <td className="px-5 py-4 text-right font-bold text-emerald-700">{formatMoney(category.profit)}</td>
                                    <td className="px-5 py-4 text-right">{margin.toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function SellerCommissionView({ report, commissionRates }: { report: SellerSalesDetailResponse; commissionRates: CommissionRates }) {
    const categories = Array.isArray(report?.categories) ? report.categories : [];
    const sellers = Array.isArray(report?.sellers) ? report.sellers : [];
    const totals = report?.totals || {
        quantity: 0,
        commissionable_quantity: 0,
        purchase_amount: 0,
        sales_amount: 0,
        profit: 0,
        commission: 0,
    };
    const totalCommission = categories.reduce(
        (sum, category) => sum + categoryCommission(category, commissionRates),
        0,
    );

    return (
        <div className="space-y-8 pb-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <KPICard
                    title="Cantidad vendida"
                    value={totals.quantity}
                    icon={<ShoppingBag size={24} />}
                    color="purple"
                    trend="Unidades reales"
                />
                <KPICard
                    title="Monto de compra"
                    value={formatMoney(totals.purchase_amount)}
                    icon={<Briefcase size={24} />}
                    color="amber"
                    trend="Costo histórico"
                />
                <KPICard
                    title="Monto de venta"
                    value={formatMoney(totals.sales_amount)}
                    icon={<DollarSign size={24} />}
                    color="blue"
                    trend="Ingreso bruto"
                />
                <KPICard
                    title="Utilidad"
                    value={formatMoney(totals.profit)}
                    icon={<TrendingUp size={24} />}
                    color="emerald"
                    trend="Venta menos compra"
                />
                <KPICard
                    title="Comisión calculada"
                    value={formatMoney(totalCommission)}
                    icon={<Users size={24} />}
                    color="emerald"
                    trend={`Zapatillas S/ ${commissionRates.Zapatillas.toFixed(2)} · Accesorios S/ ${commissionRates.Accesorios.toFixed(2)}`}
                />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <h3 className="flex items-center gap-2 font-black text-slate-800">
                        <Layers size={19} className="text-indigo-600" />
                        Totales por categoría
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                        Zapatillas, accesorios y cualquier otra categoría registrada en productos.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3">Categoría</th>
                                <th className="px-5 py-3 text-right">Cantidad</th>
                                <th className="px-5 py-3 text-right">Comisionable</th>
                                <th className="px-5 py-3 text-right">Compra</th>
                                <th className="px-5 py-3 text-right">Venta</th>
                                <th className="px-5 py-3 text-right">Utilidad</th>
                                <th className="px-5 py-3 text-right">Comisión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {categories.length === 0 ? (
                                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No hay ventas en el periodo seleccionado.</td></tr>
                            ) : categories.map((category) => (
                                <tr key={category.category} className="hover:bg-indigo-50/30">
                                    <td className="px-5 py-4 font-black text-slate-800">{category.category}</td>
                                    <td className="px-5 py-4 text-right font-bold">{category.quantity}</td>
                                    <td className="px-5 py-4 text-right font-bold text-indigo-700">{category.commissionable_quantity}</td>
                                    <td className="px-5 py-4 text-right">{formatMoney(category.purchase_amount)}</td>
                                    <td className="px-5 py-4 text-right font-bold">{formatMoney(category.sales_amount)}</td>
                                    <td className="px-5 py-4 text-right font-bold text-emerald-700">{formatMoney(category.profit)}</td>
                                    <td className="px-5 py-4 text-right font-black text-indigo-700">{formatMoney(categoryCommission(category, commissionRates))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="space-y-5">
                {sellers.map((seller) => (
                    <section key={seller.seller_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Vendedor</p>
                                <h3 className="text-lg font-black text-slate-900">{seller.seller_name}</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                                <SellerMetric label="Cantidad" value={seller.total_quantity} />
                                <SellerMetric label="Comisionable" value={seller.total_commissionable_quantity} />
                                <SellerMetric label="Compra" value={formatMoney(seller.total_purchase_amount)} />
                                <SellerMetric label="Venta" value={formatMoney(seller.total_sales_amount)} />
                                <SellerMetric label="Utilidad" value={formatMoney(seller.total_profit)} />
                                <SellerMetric label="Comisión" value={formatMoney((seller.categories || []).reduce((sum, category) => sum + categoryCommission(category, commissionRates), 0))} highlight />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead className="bg-white text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3">Categoría</th>
                                        <th className="px-5 py-3 text-right">Cantidad</th>
                                        <th className="px-5 py-3 text-right">Comisionable</th>
                                        <th className="px-5 py-3 text-right">Compra</th>
                                        <th className="px-5 py-3 text-right">Venta</th>
                                        <th className="px-5 py-3 text-right">Utilidad</th>
                                        <th className="px-5 py-3 text-right">Comisión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(seller.categories || []).map((category) => (
                                        <tr key={category.category} className="hover:bg-slate-50">
                                            <td className="px-5 py-4 font-bold text-slate-700">{category.category}</td>
                                            <td className="px-5 py-4 text-right">{category.quantity}</td>
                                            <td className="px-5 py-4 text-right font-bold text-indigo-700">{category.commissionable_quantity}</td>
                                            <td className="px-5 py-4 text-right">{formatMoney(category.purchase_amount)}</td>
                                            <td className="px-5 py-4 text-right font-bold">{formatMoney(category.sales_amount)}</td>
                                            <td className="px-5 py-4 text-right font-bold text-emerald-700">{formatMoney(category.profit)}</td>
                                            <td className="px-5 py-4 text-right font-black text-indigo-700">{formatMoney(categoryCommission(category, commissionRates))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

function SellerMetric({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
    return (
        <div>
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
            <strong className={highlight ? 'text-indigo-700' : 'text-slate-800'}>{value}</strong>
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
