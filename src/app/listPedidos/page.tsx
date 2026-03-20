'use client';
import { useState } from 'react';
import { Search, Filter, Eye, Phone, MapPin, Calendar } from 'lucide-react';
import { PedidoStatusBadge } from '../components/badge';
import Link from 'next/link';

export default function ListaPedidosPage() {
    const [filter, setFilter] = useState('todos');

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Mis Pedidos</h1>
                        <p className="text-slate-500 text-sm font-medium">Gestiona y rastrea tus ventas realizadas</p>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                        {['todos', 'pendiente', 'despachado', 'entregado'].map((f) => (
                            <button 
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${filter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Buscador */}
                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
                    <Search className="text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente, teléfono o # pedido..." 
                        className="w-full outline-none font-medium text-slate-600"
                    />
                </div>

                {/* Tabla de Pedidos */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedido</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pares</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[1, 2, 3].map((i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6">
                                            <p className="font-black text-slate-800 text-sm">#ORD-240{i}</p>
                                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                                                <Calendar size={12} /> 12 Oct, 2023
                                            </p>
                                        </td>
                                        <td className="p-6">
                                            <p className="font-bold text-slate-700 text-sm">Juan Perez</p>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Phone size={10} /> +51 987 654 321
                                            </p>
                                        </td>
                                        <td className="p-6 text-center font-black text-slate-600">3</td>
                                        <td className="p-6 font-black text-indigo-600">S/ 850.00</td>
                                        <td className="p-6">
                                            <PedidoStatusBadge estado={i === 1 ? 'pendiente' : 'despachado'} />
                                        </td>
                                        <td className="p-6 text-right">
                                            <Link href={`/pedidos/${i}`} className="p-3 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all inline-flex">
                                                <Eye size={18} />
                                            </Link>
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