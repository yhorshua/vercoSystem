'use client';
import React, { useState, useMemo } from 'react';
import {
    Search, ShoppingCart, Trash2, X, Plus, Minus,
    CheckCircle2, Package, MapPin, CreditCard, MessageSquare,
    ChevronRight, Info, User, Phone, ArrowLeft, Loader2, Tag, Truck
} from 'lucide-react';
import Swal from 'sweetalert2';
import rawUbigeo from '../utils/ubigeo-peru-optimizado.json';
import type { Ubigeo } from '../utils/types/ubigeo';
import { getProductsByCodeOrDescription } from '../services/productsService';
import { useUser } from '../context/UserContext';
import { createWebSale } from '../services/webSaleService';
import { getProductImage } from '../utils/images';

// --- Interfaces ---
interface SizeStock {
    id: number;
    talla: string;
    stock: number;
    selected: number;
}

interface ProductoVendedor {
    id: number | string;
    codigo: string;
    nombre: string;
    marca: string;
    precio: number;
    imagen: string;
    tallas: SizeStock[];
}

export default function PantallaVentaWeb() {
    const [showModal, setShowModal] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductoVendedor | null>(null);
    const [pedido, setPedido] = useState<any[]>([]);
    const [step, setStep] = useState(1); // 1: Carrito, 2: Datos
    const [isAgencyDelivery, setIsAgencyDelivery] = useState(false);

    const { user } = useUser();
    const token = user?.token ?? '';
    const ubigeo = rawUbigeo as Ubigeo;

    const [customerData, setCustomerData] = useState({
        name: '', dni: '', phone: '', address: '',
        department: '', province: '', district: '',
        reference: '', paymentMethod: 'Yape',
        observations: '', agencyName: '',
    });

    const [depId, setDepId] = useState<keyof Ubigeo | ''>('');
    const [provId, setProvId] = useState('');
    const [distId, setDistId] = useState('');

    // --- Lógica de Servicios Originales ---
    const handleSearch = async (code: string) => {
        if (!code.trim()) return;
        setIsSearching(true);
        try {
            const data = await getProductsByCodeOrDescription(code, token);
            if (!data) {
                Swal.fire('Sin resultados', 'No se encontró el producto', 'warning');
                return;
            }

            const mappedProduct: ProductoVendedor = {
                id: data.product_id,
                codigo: data.article_code,
                nombre: data.article_description,
                marca: data.category?.name || 'Sin categoría',
                precio: Number(data.price || 0),
                imagen: getProductImage(data.product_image),
                tallas: data.sizes?.map((s: any) => ({
                    id: s.id,
                    talla: s.size,
                    stock: s.lot_pair || 0,
                    selected: 0
                })) || []
            };

            setSelectedProduct(mappedProduct);
            setShowModal(true);
        } catch (error: any) {
            Swal.fire('Error', error.message || 'No se pudo buscar el producto', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const finalizarVentaCompleta = async () => {
        if (!customerData.name || !customerData.phone || !customerData.address || !customerData.dni || !customerData.department || !customerData.province || !customerData.district) {
            Swal.fire('Atención', 'Por favor, completa todos los campos obligatorios del cliente', 'warning');
            return;
        }

        try {
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

            const userId = user?.id;
            if (!userId) {
                Swal.fire('Error', 'No se ha encontrado el usuario.', 'error');
                return;
            }

            const payload = {
                customer_name: customerData.name,
                customer_dni: customerData.dni,
                customer_phone: customerData.phone,
                customer_address: customerData.address,
                department: customerData.department,
                province: customerData.province,
                district: customerData.district,
                reference: customerData.reference,
                payment_method: customerData.paymentMethod,
                observations: customerData.observations,
                total_amount: totalVenta,
                user_id: userId,
                is_agency_delivery: isAgencyDelivery,
                agency_name: isAgencyDelivery ? customerData.agencyName : null,
                details: pedido.flatMap((item) =>
                    item.tallasElegidas.map((t: any) => ({
                        product_id: item.id,
                        product_size_id: t.id,
                        size: t.talla,
                        quantity: t.selected,
                        sale_price: item.precio,
                        subtotal: t.selected * item.precio
                    }))
                ),
            };

            const result = await createWebSale(payload, token);

            Swal.fire({
                icon: 'success',
                title: '¡Venta Exitosa!',
                html: `<p>El pedido <b>#${result.sale_id}</b> ha sido registrado correctamente.</p>`,
                confirmButtonColor: '#4f46e5'
            });

            // Resetear estados
            setPedido([]);
            setStep(1);
            setCustomerData({ name: '', dni: '', phone: '', address: '', department: '', province: '', district: '', reference: '', paymentMethod: 'Yape', observations: '', agencyName: '' });
        } catch (error: any) {
            Swal.fire('Error', error.message || 'No se pudo registrar la venta', 'error');
        }
    };

    // --- Lógica de Ubigeo ---
    const departamentos = useMemo(() => Object.entries(ubigeo).map(([id, dep]: any) => ({ id, nombre: dep.nombre })), [ubigeo]);
    const provincias = useMemo(() => {
        if (!depId) return [];
        return Object.entries(ubigeo[depId].provincias).map(([id, prov]: any) => ({ id, nombre: prov.nombre }));
    }, [depId, ubigeo]);
    const distritos = useMemo(() => {
        if (!depId || !provId) return [];
        return Object.entries(ubigeo[depId].provincias[provId].distritos).map(([id, nombre]) => ({ id, nombre }));
    }, [depId, provId, ubigeo]);

    // --- Auxiliares ---
    const updateQty = (index: number, val: number) => {
        if (!selectedProduct) return;
        const newTallas = [...selectedProduct.tallas];
        newTallas[index].selected = Math.max(0, newTallas[index].selected + val);
        setSelectedProduct({ ...selectedProduct, tallas: newTallas });
    };

    const agregarAlPedido = () => {
        if (!selectedProduct) return;
        const elegidas = selectedProduct.tallas.filter(t => t.selected > 0);
        if (elegidas.length === 0) {
            Swal.fire('Atención', 'Selecciona al menos una talla', 'warning');
            return;
        }

        const totalPares = elegidas.reduce((a, b) => a + b.selected, 0);
        setPedido([...pedido, {
            ...selectedProduct,
            tallasElegidas: elegidas,
            totalPares,
            subtotal: totalPares * selectedProduct.precio
        }]);
        setShowModal(false);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Agregado', showConfirmButton: false, timer: 1000 });
    };

    const totalVenta = pedido.reduce((a, b) => a + b.subtotal, 0);

    if (!user?.token) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">Cargando sesión...</div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-10 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto p-4 lg:p-8">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900">VENTA POR <span className="text-indigo-600">REDES</span></h1>
                        <p className="text-slate-500 font-medium">Asesor: {user.full_name || 'Usuario'}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-2 rounded-3xl shadow-sm border border-slate-200">
                        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
                            <ShoppingCart size={24} />
                        </div>
                        <div className="pr-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Mi Carrito</p>
                            <p className="text-xl font-black text-slate-800">{pedido.length} <span className="text-sm font-bold text-slate-400">Items</span></p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* COLUMNA IZQUIERDA */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* BUSCADOR */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                {isSearching ? <Loader2 className="animate-spin text-indigo-500" /> : <Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />}
                            </div>
                            <input
                                type="text"
                                placeholder="CÓDIGO DEL MODELO + ENTER..."
                                className="w-full pl-14 pr-6 py-6 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-slate-700 uppercase transition-all placeholder:text-slate-300"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e.currentTarget.value)}
                            />
                        </div>

                        {/* LISTADO DE ITEMS */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package size={18} className="text-indigo-500" />
                                    <h2 className="font-black text-slate-700 uppercase text-xs tracking-widest">Resumen del Pedido</h2>
                                </div>
                                <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-tighter">Total Pares: {pedido.reduce((a, b) => a + b.totalPares, 0)}</span>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {pedido.length === 0 ? (
                                    <div className="p-20 text-center text-slate-300 flex flex-col items-center">
                                        <ShoppingCart size={64} className="mb-4 opacity-10" />
                                        <p className="font-bold italic text-slate-400 uppercase text-sm tracking-widest">El carrito está vacío</p>
                                    </div>
                                ) : (
                                    pedido.map((item, idx) => (
                                        <div key={idx} className="p-6 flex flex-col sm:flex-row items-center gap-6 hover:bg-slate-50 transition-colors group">
                                            <div className="relative">
                                                <img src={item.imagen} className="w-24 h-24 rounded-3xl object-cover shadow-md group-hover:scale-105 transition-transform" />
                                                <button onClick={() => setPedido(pedido.filter((_, i) => i !== idx))} className="absolute -top-2 -left-2 bg-white text-red-500 p-2 rounded-xl shadow-lg border border-red-50 hover:bg-red-500 hover:text-white transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="flex-1 text-center sm:text-left">
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">{item.marca}</p>
                                                <h3 className="font-black text-slate-800 text-lg leading-tight uppercase">{item.nombre}</h3>
                                                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                                                    {item.tallasElegidas.map((t: any) => (
                                                        <span key={t.talla} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-black border border-slate-200 uppercase italic">
                                                            T{t.talla} (x{t.selected})
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right w-full sm:w-auto">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</p>
                                                <p className="font-black text-2xl text-slate-900 leading-none">S/ {item.subtotal.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="lg:col-span-5">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-200 sticky top-8">

                            {step === 1 ? (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Resumen Total</p>
                                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter">S/ {totalVenta.toFixed(2)}</h2>
                                    </div>

                                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex gap-4">
                                        <div className="bg-indigo-500 h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-lg shadow-indigo-200">
                                            <Info size={20} />
                                        </div>
                                        <p className="text-xs text-indigo-700 font-bold leading-relaxed uppercase italic">
                                            Recuerda verificar los datos de envío y el método de pago antes de procesar el pedido final.
                                        </p>
                                    </div>

                                    <button
                                        disabled={pedido.length === 0}
                                        onClick={() => setStep(2)}
                                        className="w-full bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-100 disabled:text-slate-300 text-white py-6 rounded-[1.5rem] font-black transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-indigo-200 active:scale-95"
                                    >
                                        CONTINUAR DATOS <ChevronRight size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5 animate-in slide-in-from-right-4 duration-500">
                                    <button onClick={() => setStep(1)} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 mb-2 hover:bg-indigo-50 p-2 rounded-xl transition-all">
                                        <ArrowLeft size={14} /> VOLVER AL CARRITO
                                    </button>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">DATOS DE ENVÍO</h2>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <CustomInput icon={<User size={18} />} placeholder="Nombre Cliente" value={customerData.name} onChange={(v) => setCustomerData({ ...customerData, name: v })} />
                                            <CustomInput icon={<CreditCard size={18} />} placeholder="DNI" value={customerData.dni} maxLength={8} onChange={(v) => setCustomerData({ ...customerData, dni: v.replace(/\D/g, '') })} />
                                        </div>

                                        <CustomInput icon={<Phone size={18} />} placeholder="Celular" value={customerData.phone} onChange={(v) => setCustomerData({ ...customerData, phone: v })} />

                                        <div className="grid grid-cols-3 gap-3">
                                            <select className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs outline-none focus:ring-2 ring-indigo-500/20" value={depId} onChange={(e) => { const v = e.target.value as keyof Ubigeo; setDepId(v); setProvId(''); setDistId(''); setCustomerData({ ...customerData, department: ubigeo[v].nombre, province: '', district: '' }); }}>
                                                <option value="">DEPARTAMENTO</option>
                                                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                            </select>
                                            <select disabled={!depId} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs outline-none disabled:opacity-50" value={provId} onChange={(e) => { const v = e.target.value; setProvId(v); setDistId(''); setCustomerData({ ...customerData, province: ubigeo[depId as keyof Ubigeo].provincias[v].nombre, district: '' }); }}>
                                                <option value="">PROVINCIA</option>
                                                {provincias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                            <select disabled={!provId} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs outline-none disabled:opacity-50" value={distId} onChange={(e) => { const v = e.target.value; setDistId(v); setCustomerData({ ...customerData, district: ubigeo[depId as keyof Ubigeo].provincias[provId].distritos[v] }); }}>
                                                <option value="">DISTRITO</option>
                                                {distritos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                            </select>
                                        </div>

                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                                            <textarea className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-sm min-h-[80px] focus:ring-2 ring-indigo-500/20 transition-all" placeholder="Dirección exacta y Referencias..." onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })} />
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-3 mb-3">
                                                <input type="checkbox" id="agencia" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all" checked={isAgencyDelivery} onChange={(e) => setIsAgencyDelivery(e.target.checked)} />
                                                <label htmlFor="agencia" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer">Envío por Agencia</label>
                                            </div>
                                            {isAgencyDelivery && <input type="text" placeholder="¿Qué agencia prefiere?" className="w-full p-4 rounded-xl bg-white border border-slate-200 outline-none font-bold text-xs animate-in zoom-in-95 duration-200" onChange={(e) => setCustomerData({ ...customerData, agencyName: e.target.value })} />}
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard size={12} /> Método de Pago</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map((m) => (
                                                    <button key={m} onClick={() => setCustomerData({ ...customerData, paymentMethod: m })} className={`p-2 rounded-xl border-2 font-black text-[10px] transition-all uppercase ${customerData.paymentMethod === m ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-300 bg-white'}`}>
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <MessageSquare className="absolute left-4 top-4 text-slate-400" size={18} />
                                            <textarea className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-sm min-h-[60px] italic" placeholder="Observaciones extras del pedido..." onChange={(e) => setCustomerData({ ...customerData, observations: e.target.value })} />
                                        </div>
                                    </div>

                                    <button onClick={finalizarVentaCompleta} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-[1.5rem] font-black transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 mt-4 active:scale-95 uppercase tracking-widest">
                                        REGISTRAR VENTA WEB <CheckCircle2 size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE TALLAS - DISEÑO APPLE STYLE */}
            {showModal && selectedProduct && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden flex flex-col md:flex-row max-h-[95vh] animate-in zoom-in-95 duration-300">

                        <div
                            className="
    h-50
    md:h-auto
    md:w-1/2
    bg-slate-100
    relative
    group
    shrink-0
  "
                        >
                            <img src={selectedProduct.imagen} className="w-full h-full object-cover" alt={selectedProduct.nombre} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                            <div className="absolute bottom-8 left-8 text-white">
                                <span className="bg-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase mb-2 inline-block shadow-lg">En Stock</span>
                                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedProduct.nombre}</h3>
                                <p className="text-indigo-200 font-black italic mt-1">{selectedProduct.codigo}</p>
                            </div>
                        </div>

                        <div className="md:w-1/2 p-8 flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Tag size={14} /> Configuración de Item</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
                            </div>

                            <div className="mb-8">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Precio de Venta Sugerido</label>
                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-100 focus-within:border-indigo-500 transition-all">
                                    <span className="font-black text-slate-400 text-2xl italic">S/</span>
                                    <input type="number" step="0.01" value={selectedProduct.precio} onChange={(e) => setSelectedProduct({ ...selectedProduct, precio: Number(e.target.value) })} className="w-full bg-transparent outline-none font-black text-3xl text-slate-800" />
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedProduct.tallas.map((t, i) => (
                                        <div
                                            key={t.talla}
                                            className={`
        p-4 rounded-2xl border-2
        ${t.selected > 0
                                                    ? 'border-indigo-600 bg-indigo-50'
                                                    : 'border-slate-200'
                                                }
      `}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-lg">
                                                    {t.talla}
                                                </span>

                                                <span className="text-xs text-slate-400">
                                                    Stock: {t.stock}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-center gap-3 mt-3">
                                                <button
                                                    onClick={() => updateQty(i, -1)}
                                                    className="w-8 h-8 rounded-lg bg-slate-100"
                                                >
                                                    -
                                                </button>

                                                <span className="font-black text-xl">
                                                    {t.selected}
                                                </span>

                                                <button
                                                    onClick={() => updateQty(i, 1)}
                                                    className="w-8 h-8 rounded-lg bg-indigo-600 text-white"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button onClick={agregarAlPedido} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black mt-8 shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest">
                                <CheckCircle2 size={20} /> Confirmar Selección
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Componente Auxiliar para Inputs
function CustomInput({ icon, placeholder, value, onChange, maxLength }: { icon: any, placeholder: string, value: string, onChange: (v: string) => void, maxLength?: number }) {
    return (
        <div className="relative group flex-1">
            <div className="absolute left-5 inset-y-0 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                {icon}
            </div>
            <input
                maxLength={maxLength}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold text-sm text-slate-700 transition-all placeholder:text-slate-300 shadow-sm"
            />
        </div>
    );
}