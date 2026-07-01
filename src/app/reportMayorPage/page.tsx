'use client';

import { useEffect, useState } from 'react';
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
    ArrowUpRight,
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import { getSellersByWarehouse, SellerOption } from '../services/userServices';
import { getSalesReport } from '../services/ordersService';
import { exportWholesaleSalesReportExcel } from '../utils/exportPorMayorReportExcel';

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function ReporteVentaMayorPage() {
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
        if (!token || !warehouseId) return;

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
            const data = await getSalesReport(token, {
                fecha_inicio: from,
                fecha_fin: to,
                vendedor_id: sellerId ? Number(sellerId) : null,
            });

            setReport(data);

            if ((data?.detalle_ventas || []).length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin resultados',
                    text: 'No se encontraron ventas por mayor en el rango seleccionado',
                    confirmButtonColor: '#4f46e5',
                });
            }
        } catch (error: any) {
            Swal.fire(
                'Error',
                error?.message || 'No se pudo cargar el reporte',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (!report) {
            Swal.fire('Aviso', 'Primero consulta un reporte', 'info');
            return;
        }

        exportWholesaleSalesReportExcel(report);
    };

    const stats = report?.resumen_general ?? {
        total_pedidos: 0,
        total_pares_vendidos: 0,
        total_importe_vendido: 0,
        total_utilidad: 0,
        margen_utilidad_porcentaje: 0,
    };

    useEffect(() => {
        loadSellers();
    }, [token, warehouseId]);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 text-slate-800">
            <div className="max-w-7xl mx-auto space-y-6">

                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <BarChart3 size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                Reporte Venta por Mayor
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Store size={14} className="text-indigo-500" />
                                <span className="font-medium">{warehouseName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportExcel}
                            disabled={!report}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50"
                        >
                            <Download size={18} />
                            Excel
                        </button>

                        <button
                            disabled
                            className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2.5 rounded-xl font-bold text-sm opacity-40 cursor-not-allowed"
                        >
                            <FileText size={18} />
                            PDF
                        </button>
                    </div>
                </header>

                <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                                Desde
                            </label>
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                                Hasta
                            </label>
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                                Vendedor
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-3 text-slate-400" size={18} />
                                <select
                                    value={sellerId}
                                    onChange={(e) => setSellerId(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                >
                                    <option value="">Todos los vendedores</option>
                                    {sellers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.full_name}
                                        </option>
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
                                {loading ? (
                                    <RefreshCw className="animate-spin" size={20} />
                                ) : (
                                    <Search size={20} />
                                )}
                                {loading ? 'Buscando...' : 'Consultar'}
                            </button>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                        label="Pedidos"
                        value={stats.total_pedidos || 0}
                        icon={<ShoppingBag size={24} />}
                        color="indigo"
                    />

                    <StatCard
                        label="Pares Vendidos"
                        value={stats.total_pares_vendidos || 0}
                        icon={<ShoppingBag size={24} />}
                        color="indigo"
                    />

                    <StatCard
                        label="Importe Vendido"
                        value={`S/ ${Number(stats.total_importe_vendido || 0).toLocaleString(
                            'en-US',
                            { minimumFractionDigits: 2 }
                        )}`}
                        icon={<DollarSign size={24} />}
                        color="emerald"
                    />

                    <StatCard
                        label="Utilidad"
                        value={`S/ ${Number(stats.total_utilidad || 0).toFixed(2)}`}
                        icon={<ArrowUpRight size={24} />}
                        color="amber"
                    />
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 bg-white flex items-center justify-between">
                        <h3 className="font-black text-slate-800 tracking-tight">
                            Detalle de Venta por Mayor
                        </h3>
                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                            {(report?.detalle_ventas || []).length} Registros
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-400">
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">
                                        Ticket
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">
                                        Cliente
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">
                                        Vendedor
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">
                                        Pares
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">
                                        Vendido
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">
                                        Utilidad
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider">
                                        Fecha
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-50">
                                {(report?.detalle_ventas || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-20">
                                                <ShoppingBag size={64} />
                                                <p className="text-xl font-bold">
                                                    No hay datos disponibles
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    report.detalle_ventas.map((r: any, i: number) => (
                                        <tr
                                            key={i}
                                            className="hover:bg-indigo-50/30 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-700 px-3 py-1 rounded-lg font-black text-xs transition-colors">
                                                    {r.ticket}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-700">
                                                    {r.cliente?.nombre || 'Sin cliente'}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {r.cliente?.dni || ''}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600 font-medium">
                                                    {r.vendedor?.nombre || 'Sin vendedor'}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                                                    {r.estado_pedido}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-900">
                                                    {r.resumen_venta?.total_pares_vendidos || 0}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-900">
                                                    S/ {Number(r.resumen_venta?.total_importe_vendido || 0).toFixed(2)}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-emerald-600">
                                                    S/ {Number(r.resumen_venta?.total_utilidad || 0).toFixed(2)}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                {r.fecha_registro
                                                    ? new Date(r.fecha_registro).toLocaleDateString('es-PE')
                                                    : ''}
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

function StatCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: string | number;
    icon: any;
    color: 'indigo' | 'emerald' | 'amber';
}) {
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {label}
                </p>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {value}
                </h2>
            </div>
        </div>
    );
}