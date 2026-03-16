'use client';
import { useState, useMemo } from 'react';
import {
    Search, ShoppingCart, Trophy, Trash2, X, Plus, Minus,
    CheckCircle2, Star, Sparkles, TrendingUp, ChevronRight,
    Package, MapPin, Store, Info
} from 'lucide-react';

// --- TIPOS ---
interface StockPorTienda {
    tiendaId: string;
    nombre: string;
    stock: number;
}

interface SizeStock {
    talla: string;
    cantidad: number;
    tiendas: StockPorTienda[];
}

interface Producto {
    id: string;
    codigo: string;
    nombre: string;
    marca: string;
    precio: number;
    imagen: string;
    tallas: SizeStock[];
}

export default function SistemaPedidosPremium() {
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [selectedTiendaId, setSelectedTiendaId] = useState<string>('T1');
    const [pedido, setPedido] = useState<any[]>([]);

    // Datos de ejemplo con 5 tiendas
    const tiendasDisponibles = [
        { id: 'T1', nombre: 'Sede Central' },
        { id: 'T2', nombre: 'Mall del Sur' },
        { id: 'T3', nombre: 'Plaza Norte' },
        { id: 'T4', nombre: 'Miraflores' },
        { id: 'T5', nombre: 'Trujillo' },
    ];

    const mockProduct: Producto = {
        id: '1',
        codigo: 'NK-COURT-W',
        nombre: 'Nike Court Vision White',
        marca: 'Nike',
        precio: 289.00,
        imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400',
        tallas: [
            {
                talla: '37', cantidad: 0,
                tiendas: [
                    { tiendaId: 'T1', nombre: 'Sede Central', stock: 5 },
                    { tiendaId: 'T2', nombre: 'Mall del Sur', stock: 2 },
                    { tiendaId: 'T3', nombre: 'Plaza Norte', stock: 0 },
                    { tiendaId: 'T4', nombre: 'Miraflores', stock: 8 },
                    { tiendaId: 'T5', nombre: 'Trujillo', stock: 3 },
                ]
            },
            {
                talla: '38', cantidad: 0,
                tiendas: [
                    { tiendaId: 'T1', nombre: 'Sede Central', stock: 0 },
                    { tiendaId: 'T2', nombre: 'Mall del Sur', stock: 10 },
                    { tiendaId: 'T3', nombre: 'Plaza Norte', stock: 4 },
                    { tiendaId: 'T4', nombre: 'Miraflores', stock: 1 },
                    { tiendaId: 'T5', nombre: 'Trujillo', stock: 0 },
                ]
            }
        ]
    };

    const handleOpenModal = (prod: Producto) => {
        setSelectedProduct(JSON.parse(JSON.stringify(prod)));
        setShowModal(true);
    };

    const updateQty = (index: number, val: number) => {
        if (!selectedProduct) return;
        const newTallas = [...selectedProduct.tallas];
        // Obtener stock disponible de la tienda seleccionada
        const currentStock = newTallas[index].tiendas.find(t => t.tiendaId === selectedTiendaId)?.stock || 0;

        newTallas[index].cantidad = Math.max(0, Math.min(currentStock, newTallas[index].cantidad + val));
        setSelectedProduct({ ...selectedProduct, tallas: newTallas });
    };

    const agregarAlPedido = () => {
        if (!selectedProduct) return;
        const elegidas = selectedProduct.tallas.filter(t => t.cantidad > 0);
        if (elegidas.length === 0) return;

        const totalPares = elegidas.reduce((a, b) => a + b.cantidad, 0);
        const tiendaNombre = tiendasDisponibles.find(t => t.id === selectedTiendaId)?.nombre;

        setPedido([...pedido, {
            ...selectedProduct,
            tiendaOrigen: tiendaNombre,
            tallasElegidas: elegidas,
            totalPares,
            subtotal: totalPares * selectedProduct.precio
        }]);
        setShowModal(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">

            <div className="max-w-7xl mx-auto px-4 pb-20 lg:px-8">

                {/* 1. SECCIÓN DE META DEL MES (RESPONSIVE) */}
                <div className="mb-10 relative overflow-hidden bg-slate-900 rounded-[2rem] p-6 lg:p-10 shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px]"></div>

                    <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center justify-between">
                        <div className="w-full lg:w-2/3">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-yellow-400 p-2 rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                                    <Trophy className="text-slate-900 w-5 h-5" />
                                </div>
                                <h2 className="text-white text-xl lg:text-2xl font-black tracking-wide">MI PROGRESO MENSUAL</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between text-sm lg:text-base">
                                    <span className="text-indigo-300 font-bold uppercase tracking-widest text-[10px]">Meta: S/ 5,000.00</span>
                                    <span className="text-white font-black">65%</span>
                                </div>
                                <div className="h-4 bg-white/10 rounded-full p-1 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full w-[65%] shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-auto bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-6 flex items-center gap-5">
                            <div className="p-4 bg-indigo-500/20 rounded-2xl">
                                <Sparkles className="text-yellow-400 w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-white/60 text-xs font-bold uppercase mb-1">Bono Próximo</p>
                                <p className="text-white text-xl font-black">S/ 250.00</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. AREA DE TRABAJO (GRID) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* COLUMNA IZQUIERDA: BUSCADOR Y TABLA */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* BUSCADOR CON SELECTOR DE TIENDA */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 px-4 focus-within:ring-2 ring-indigo-500/20 transition-all">
                                <Search className="text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Código de calzado..."
                                    className="w-full py-2 bg-transparent outline-none font-semibold text-slate-700"
                                    onKeyDown={(e) => e.key === 'Enter' && handleOpenModal(mockProduct)}
                                />
                            </div>
                        </div>

                        {/* TABLA DE PRODUCTOS (CARD-BASED ON MOBILE) */}
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Package size={16} /> Lista de Pedido
                                </h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="hidden md:table-header-group bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tienda</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tallas</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pedido.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-20 text-center">
                                                    <div className="flex flex-col items-center text-slate-300">
                                                        <ShoppingCart size={48} className="mb-4 stroke-[1.5]" />
                                                        <p className="text-sm font-bold italic">No hay productos en el pedido</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : pedido.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-4">
                                                        <img src={item.imagen} className="w-14 h-14 rounded-xl object-cover" alt="" />
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm leading-tight uppercase">{item.nombre}</p>
                                                            <p className="text-[10px] font-mono text-slate-400">{item.codigo}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold uppercase tracking-tighter italic">
                                                        {item.tiendaOrigen}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-wrap justify-center gap-1">
                                                        {item.tallasElegidas.map((t: any) => (
                                                            <span key={t.talla} className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                                                                T{t.talla}: {t.cantidad}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <p className="font-black text-slate-800 tracking-tighter">S/ {item.subtotal.toFixed(2)}</p>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: RESUMEN */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-200">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Resumen de Liquidación</h3>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">Total Pares</span>
                                    <span className="font-black text-slate-800">{pedido.reduce((a, b) => a + b.totalPares, 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-emerald-600 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={16} />
                                        <span className="text-sm font-bold italic">Tu comisión (20%)</span>
                                    </div>
                                    <span className="font-black">S/ {(pedido.reduce((a, b) => a + b.subtotal, 0) * 0.2).toFixed(2)}</span>
                                </div>
                                <div className="pt-6 border-t-2 border-dashed border-slate-100 flex flex-col">
                                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                        S/ {pedido.reduce((a, b) => a + b.subtotal, 0).toFixed(2)}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total a cobrar al cliente</p>
                                </div>
                            </div>

                            <button className="w-full group bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-2xl font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                                FINALIZAR VENTA
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* TIP DE STOCK */}
                        <div className="bg-indigo-600 rounded-3xl p-6 text-white flex gap-4 items-start shadow-xl shadow-indigo-200">
                            <Info className="shrink-0" />
                            <p className="text-xs leading-relaxed font-medium">
                                Recuerda que el stock se reserva solo por 2 horas. Asegúrate de confirmar el pago del cliente lo antes posible.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL RESPONSIVE CON MULTI-STOCK */}
            {showModal && selectedProduct && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl h-[90vh] sm:h-auto sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10">

                        <div className="flex flex-col lg:flex-row h-full">
                            {/* Imagen y Info (Lado Izq) */}
                            <div className="lg:w-2/5 bg-slate-50 p-6 lg:p-10 flex flex-col">
                                <div className="flex justify-between items-center mb-6 lg:hidden">
                                    <span className="font-black text-indigo-600 italic">VERCO</span>
                                    <button onClick={() => setShowModal(false)} className="bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
                                </div>

                                <div className="relative mb-6 group">
                                    <img src={selectedProduct.imagen} className="w-full aspect-square object-cover rounded-3xl shadow-xl transition-transform group-hover:scale-105 duration-500" />
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 shadow-sm">NUEVO INGRESO</div>
                                </div>

                                <div className="text-center lg:text-left">
                                    <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase mb-1">{selectedProduct.marca}</p>
                                    <h4 className="text-2xl font-black text-slate-800 leading-tight uppercase mb-2">{selectedProduct.nombre}</h4>
                                    <p className="text-2xl font-black text-indigo-600 tracking-tighter">S/ {selectedProduct.precio.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Tallas y Almacenes (Lado Der) */}
                            <div className="lg:w-3/5 p-6 lg:p-10 bg-white flex flex-col h-full">
                                <div className="hidden lg:flex justify-between items-center mb-8">
                                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configuración de Tallas</h5>
                                    <button onClick={() => setShowModal(false)} className="bg-slate-100 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20} /></button>
                                </div>

                                {/* SELECTOR DE TIENDA DENTRO DEL MODAL */}
                                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <MapPin size={12} /> Tienda para consultar stock
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                        {tiendasDisponibles.map(tienda => (
                                            <button
                                                key={tienda.id}
                                                onClick={() => setSelectedTiendaId(tienda.id)}
                                                className={`text-[10px] font-bold py-2 px-1 rounded-lg border transition-all ${selectedTiendaId === tienda.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}
                                            >
                                                {tienda.nombre}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* LISTA DE TALLAS ADAPTADA AL STOCK DE LA TIENDA SELECCIONADA */}
                                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                    {selectedProduct.tallas.map((t, i) => {
                                        const stockEnTienda = t.tiendas.find(st => st.tiendaId === selectedTiendaId)?.stock || 0;
                                        const isAvailable = stockEnTienda > 0;

                                        return (
                                            <div key={t.talla} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${!isAvailable ? 'bg-slate-50/50 border-slate-50 opacity-60' : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/10'}`}>
                                                <div className="flex items-center gap-4">
                                                    <span className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 font-black text-slate-700 text-lg">{t.talla}</span>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Disponible</p>
                                                        <p className={`text-xs font-black ${stockEnTienda < 3 && stockEnTienda > 0 ? 'text-orange-500' : 'text-slate-600'}`}>
                                                            {stockEnTienda} unidades
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={`flex items-center bg-slate-100 rounded-xl p-1 ${!isAvailable && 'pointer-events-none opacity-20'}`}>
                                                    <button onClick={() => updateQty(i, -1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white rounded-lg transition-colors"><Minus size={14} /></button>
                                                    <input type="number" readOnly className="w-8 text-center font-black text-indigo-600 bg-transparent text-sm" value={t.cantidad} />
                                                    <button onClick={() => updateQty(i, 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white rounded-lg transition-colors"><Plus size={14} /></button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Pares totales</p>
                                        <p className="text-3xl font-black text-slate-800 tracking-tighter">
                                            {selectedProduct.tallas.reduce((a, b) => a + b.cantidad, 0)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={agregarAlPedido}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 text-xs tracking-widest uppercase"
                                    >
                                        <CheckCircle2 size={16} /> Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
        </div>
    );
}