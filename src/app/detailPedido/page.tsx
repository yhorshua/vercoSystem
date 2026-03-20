'use client';
import { ChevronLeft, MapPin, Package, Truck, User, CheckCircle, XCircle, Send } from 'lucide-react';
import { PedidoStatusBadge } from '../components/badge';
import Link from 'next/link';

export default function DetallePedidoPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <Link href="/pedidos" className="inline-flex items-center gap-2 text-slate-500 font-bold text-sm mb-6 hover:text-indigo-600 transition-colors">
                    <ChevronLeft size={20} /> Volver a la lista
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Lado Izquierdo: Información */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Card Cliente */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={16} /> Información del Cliente
                                </h3>
                                <PedidoStatusBadge estado="pendiente" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Nombre Completo</p>
                                    <p className="font-bold text-slate-800">Juan Carlos Perez</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Teléfono</p>
                                    <p className="font-bold text-slate-800">+51 999 888 777</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                                        <MapPin size={10} /> Dirección de Entrega
                                    </p>
                                    <p className="font-bold text-slate-800">Av. Las Camelias 452, Int 402</p>
                                    <p className="text-xs text-slate-500">Lima, Lima, San Isidro - Ref: Frente al parque</p>
                                </div>
                            </div>
                        </div>

                        {/* Card Productos */}
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-200">
                            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Package size={16} /> Productos en este pedido
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {[1, 2].map((item) => (
                                    <div key={item} className="p-6 flex items-center gap-4">
                                        <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff" className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                                        <div className="flex-1">
                                            <p className="font-black text-slate-800 text-sm uppercase">Nike Court Vision</p>
                                            <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">Talla 38 (1 unidad)</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-800 uppercase">S/ 289.00</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tienda: Sede Central</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Lado Derecho: Resumen y Acciones */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200">
                            <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-6">Resumen Económico</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Subtotal Productos</span>
                                    <span className="font-bold uppercase">S/ 578.00</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Costo de Envío</span>
                                    <span className="font-bold uppercase">S/ 15.00</span>
                                </div>
                                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                    <span className="text-xs font-black uppercase text-indigo-400 tracking-tighter">Total Final</span>
                                    <span className="text-3xl font-black tracking-tighter uppercase">S/ 593.00</span>
                                </div>
                            </div>
                        </div>

                        {/* Controles de Estado */}
                        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Actualizar Estado</p>
                            <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-lg shadow-blue-100">
                                <CheckCircle size={18} /> CONFIRMAR PAGO
                            </button>
                            <button className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-lg shadow-purple-100">
                                <Truck size={18} /> MARCAR DESPACHADO
                            </button>
                            <button className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 py-4 rounded-2xl font-black text-xs transition-all">
                                <XCircle size={18} /> CANCELAR PEDIDO
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}