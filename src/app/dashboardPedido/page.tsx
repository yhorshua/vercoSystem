'use client';
import { Package, TrendingUp, AlertCircle, CheckCircle2, MoreVertical, ExternalLink } from 'lucide-react';
import { PedidoStatusBadge } from '../components/badge';

export default function AdminPedidosDashboard() {
    const kpis = [
        { label: 'Pedidos Hoy', value: '24', icon: Package, color: 'indigo' },
        { label: 'Ventas del Día', value: 'S/ 4,250', icon: TrendingUp, color: 'emerald' },
        { label: 'Pendientes', value: '8', icon: AlertCircle, color: 'yellow' },
        { label: 'Completados', value: '156', icon: CheckCircle2, color: 'blue' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter">CENTRAL DE PEDIDOS</h1>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {kpis.map((kpi, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className={`p-4 rounded-2xl bg-${kpi.color}-50 text-${kpi.color}-600`}>
                                <kpi.icon size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                                <p className="text-xl font-black text-slate-800">{kpi.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabla Global */}
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 uppercase tracking-tighter">Últimos Pedidos del Sistema</h3>
                        <button className="text-xs font-bold text-indigo-600 flex items-center gap-2">Ver todo el historial <ExternalLink size={14}/></button>
                    </div>
                    <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="p-6">Vendedor</th>
                                    <th className="p-6">Cliente</th>
                                    <th className="p-6">Total</th>
                                    <th className="p-6">Estado</th>
                                    <th className="p-6">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6">
                                            <p className="font-bold text-slate-800 text-sm italic">@emprendedor_{i}</p>
                                        </td>
                                        <td className="p-6 font-medium text-slate-600">Maria Fernanda S.</td>
                                        <td className="p-6 font-black text-slate-800 tracking-tighter">S/ 249.00</td>
                                        <td className="p-6"><PedidoStatusBadge estado="despachado" /></td>
                                        <td className="p-6">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600"><MoreVertical size={20}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>
                </div>
            </div>
        </div>
    );
}