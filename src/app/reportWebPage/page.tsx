'use client';

import { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
    Search,
    RefreshCw,
    FileText,
    Download,
    Store,
    Calendar,
    Users,
    ShoppingBag,
    DollarSign,
    BarChart3,
    ArrowUpRight
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import { getSellersByWarehouse, SellerOption } from '../services/userServices';
import { getWebSalesReport } from '../services/webSaleService';
import { exportWebSalesReportExcel } from '../utils/exportexcelweb';
import { exportWebSalesReportPDF } from '../utils/exportpdfweb';

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function ReporteVentasWebPage() {
    const { user } = useUser();

    const token = user?.token || '';
    const warehouseId = user?.warehouse_id || 0;
    const warehouseName = user?.warehouse?.warehouse_name || 'Almacén Central';

    const [from, setFrom] = useState(todayISO());
    const [to, setTo] = useState(todayISO());
    const [sellerId, setSellerId] = useState('');

    const [sellers, setSellers] = useState<SellerOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);

    const loadSellers = async () => {
        try {
            const data = await getSellersByWarehouse(warehouseId, token);
            setSellers(data || []);
        } catch {
            setSellers([]);
        }
    };

    const handleSearch = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = {
                startDate: from,
                endDate: to,
                userId: sellerId ? Number(sellerId) : undefined,
            };
            const data = await getWebSalesReport(params, token);
            setReport(data);
            if ((data?.detalle_ventas || []).length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin resultados',
                    text: 'No se encontraron ventas en el rango seleccionado',
                    confirmButtonColor: '#4f46e5'
                });
            }
        } catch (error: any) {
            Swal.fire('Error', 'No se pudo cargar el reporte', 'error');
        } finally {
            setLoading(false);
        }
    };

    const stats = report?.resumen_general ?? {
        total_pedidos: 0,
        total_importe_vendido: 0,
        total_utilidad: 0,
        margen_utilidad_porcentaje: 0,
    };

    useEffect(() => {
        loadSellers();
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 text-slate-800">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* --- HEADER --- */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <BarChart3 size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reporte Ventas Web</h1>
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Store size={14} className="text-indigo-500" />
                                <span className="font-medium">{warehouseName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => exportWebSalesReportExcel(report)}
                            disabled={!report}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50"
                        >
                            <Download size={18} />
                            Excel
                        </button>
                        <button
                            onClick={() => exportWebSalesReportPDF(report)}
                            disabled={!report}
                            className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all disabled:opacity-50"
                        >
                            <FileText size={18} />
                            PDF
                        </button>
                    </div>
                </header>

                {/* --- FILTROS --- */}
                <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Desde</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Hasta</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Vendedor</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-3 text-slate-400" size={18} />
                                <select
                                    value={sellerId}
                                    onChange={(e) => setSellerId(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                >
                                    <option value="">Todos los vendedores</option>
                                    {sellers.map((s) => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
                                {loading ? 'Buscando...' : 'Actualizar Reporte'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* --- KPIS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        label="Total Ventas"
                        value={stats.total_pedidos}
                        icon={<ShoppingBag size={24} />}
                        color="indigo"
                    />
                    <StatCard
                        label="Monto Acumulado"
                        value={`S/ ${Number(stats.total_importe_vendido).toLocaleString(
                            'en-US',
                            { minimumFractionDigits: 2 }
                        )}`}
                        icon={<DollarSign size={24} />}
                        color="emerald"
                    />
                    <StatCard
                        label="Ticket Promedio"
                        value={`S/ ${stats.total_utilidad.toFixed(2)}`}
                        icon={<ArrowUpRight size={24} />}
                        color="amber"
                    />
                </div>

                {/* --- TABLA --- */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 bg-white flex items-center justify-between">
                        <h3 className="font-black text-slate-800 tracking-tight">Detalle de Ventas Web</h3>
                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                            {(report?.detalle_ventas || []).length} Registros
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-400">
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">Ticket</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">Vendedor</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">Monto Total</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">Fecha de Venta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {(report?.detalle_ventas || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-20">
                                                <ShoppingBag size={64} />
                                                <p className="text-xl font-bold">No hay datos disponibles</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    report.detalle_ventas.map((r: any, i: number) => (
                                        <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-700 px-3 py-1 rounded-lg font-black text-xs transition-colors">
                                                    #{r.ticket}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-700">{r.cliente.nombre}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                                        {r.name}
                                                    </div>
                                                    <span className="text-sm text-slate-600 font-medium">{r.vendedor.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-900">S/ {Number(r.pago.total_pedido_actual).toFixed(2)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                {r.fecha_registro}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE AUXILIAR PARA KPIS ---
function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: any, color: 'indigo' | 'emerald' | 'amber' }) {
    const colors = {
        indigo: 'bg-indigo-500 shadow-indigo-100 text-indigo-500',
        emerald: 'bg-emerald-500 shadow-emerald-100 text-emerald-500',
        amber: 'bg-amber-500 shadow-amber-100 text-amber-500',
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.02]">
            <div className={`${colors[color]} bg-opacity-10 p-4 rounded-2xl`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h2>
            </div>
        </div>
    );
}