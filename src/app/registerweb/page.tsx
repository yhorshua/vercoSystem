'use client';
import React, { useState, useMemo } from 'react';
import {
    Search, ShoppingCart, Trash2, X, Plus, Minus,
    CheckCircle2, Package, MapPin, CreditCard, MessageSquare,
    ChevronRight, Info, User, Phone
} from 'lucide-react';
import Swal from 'sweetalert2'; // Integrado para alertas profesionales
import rawUbigeo from '../utils/ubigeo-peru-optimizado.json';
import type { Ubigeo } from '../utils/types/ubigeo';
import { getProductsByCodeOrDescription } from '../services/productsService';
import { useUser } from '../context/UserContext';
import { createWebSale } from '../services/webSaleService';
import { getProductImage } from '../utils/images';

// Tipado para el vendedor
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
    const [selectedProduct, setSelectedProduct] = useState<ProductoVendedor | null>(null);
    const [pedido, setPedido] = useState<any[]>([]);
    const [step, setStep] = useState(1); // 1: Carrito, 2: Datos Cliente y Pago
    const [isAgencyDelivery, setIsAgencyDelivery] =
        useState(false);
    const { user } = useUser();
    const token = user?.token ?? '';
    const ubigeo = rawUbigeo as Ubigeo;

    if (!user?.token) {
        return (
            <div className="h-screen flex items-center justify-center">
                Cargando sesión...
            </div>
        );
    }
    // Datos del Cliente y Venta
    const [customerData, setCustomerData] = useState({
        name: '',
        dni: '',
        phone: '',
        address: '',
        department: '',
        province: '',
        district: '',
        reference: '',
        paymentMethod: 'Yape',
        observations: '',
        agencyName: '',
    });


    const [depId, setDepId] = useState<keyof Ubigeo | ''>('');
    const [provId, setProvId] = useState('');
    const [distId, setDistId] = useState('');
    // Simulación de búsqueda (Aquí conectarías con tu API)
    const handleSearch = async (code: string) => {
        if (!code.trim()) return;

        try {
            const data = await getProductsByCodeOrDescription(code, token);

            if (!data) {
                Swal.fire(
                    'Sin resultados',
                    'No se encontró el producto',
                    'warning'
                );
                return;
            }

            const product = data;

            const mappedProduct: ProductoVendedor = {
                id: product.product_id,

                codigo: product.article_code,

                nombre: product.article_description,

                marca: product.category?.name || 'Sin categoría',

                precio: Number(product.price || 0),

                imagen: getProductImage(product.product_image),

                tallas:
                    product.sizes?.map((s: any) => ({
                        id: s.id,
                        talla: s.size,
                        stock: s.lot_pair || 0,
                        selected: 0
                    })) || []
            };

            setSelectedProduct(mappedProduct);
            setShowModal(true);

        } catch (error: any) {
            Swal.fire(
                'Error',
                error.message || 'No se pudo buscar el producto',
                'error'
            );
        }
    };

    const departamentos = useMemo(
        () => Object.entries(ubigeo).map(([id, dep]: any) => ({
            id,
            nombre: dep.nombre
        })),
        [ubigeo]
    );

    const provincias = useMemo(() => {
        if (!depId) return [];

        return Object.entries(ubigeo[depId].provincias).map(([id, prov]: any) => ({
            id,
            nombre: prov.nombre
        }));
    }, [depId, ubigeo]);

    const distritos = useMemo(() => {
        if (!depId || !provId) return [];

        return Object.entries(
            ubigeo[depId].provincias[provId].distritos
        ).map(([id, nombre]) => ({
            id,
            nombre
        }));
    }, [depId, provId, ubigeo]);

    const updateQty = (index: number, val: number) => {
        if (!selectedProduct) return;

        const newTallas = [...selectedProduct.tallas];

        newTallas[index].selected = Math.max(
            0,
            newTallas[index].selected + val
        );

        setSelectedProduct({
            ...selectedProduct,
            tallas: newTallas
        });
    };

    const agregarAlPedido = () => {
        if (!selectedProduct) return;
        const elegidas = selectedProduct.tallas.filter(t => t.selected > 0);
        if (elegidas.length === 0) {
            Swal.fire('Atención', 'Selecciona al menos una talla con stock', 'warning');
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
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Agregado al carrito',
            showConfirmButton: false,
            timer: 1500
        });
    };

    const finalizarVentaCompleta = async () => {

        if (
            !customerData.name ||
            !customerData.phone ||
            !customerData.address ||
            !customerData.dni ||
            !customerData.department ||
            !customerData.province ||
            !customerData.district
        ) {
            Swal.fire(
                'Error',
                'Completa los datos obligatorios',
                'error'
            );
            return;
        }

        try {

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

                user_id: user.id,
                is_agency_delivery: isAgencyDelivery,
                agency_name:
                    isAgencyDelivery
                        ? customerData.agencyName
                        : null,


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

            const result = await createWebSale(
                payload,
                token
            );

            Swal.fire({
                icon: 'success',
                title: 'Pedido registrado',
                html: `
                <b>Ticket:</b> #${result.sale_id}<br/>
                Venta registrada correctamente
            `
            });

            setPedido([]);

            setStep(1);

        } catch (error: any) {

            Swal.fire(
                'Error',
                error.message || 'No se pudo registrar la venta',
                'error'
            );
        }
    };



    const totalVenta = pedido.reduce((a, b) => a + b.subtotal, 0);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 font-sans">
            <div className="max-w-6xl mx-auto">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">VENTA WEB</h1>
                        <p className="text-slate-500 font-medium">Panel de Asesor de Ventas</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                        <ShoppingCart className="text-indigo-600" />
                        <span className="font-black text-xl">{pedido.length}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* BUSCADOR */}
                        <div className="bg-white p-2 rounded-2xl shadow-md flex items-center border-2 border-transparent focus-within:border-indigo-500 transition-all">
                            <Search className="ml-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Escribe el código del modelo y presiona Enter..."
                                className="w-full p-4 outline-none font-bold text-slate-700 text-transform: uppercase"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e.currentTarget.value)}
                            />
                        </div>

                        {/* LISTADO DE PRODUCTOS EN CARRITO */}
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b bg-slate-50/50 flex items-center gap-2">
                                <Package size={18} className="text-slate-400" />
                                <h2 className="font-black text-slate-700 uppercase text-xs tracking-widest">Resumen del Pedido</h2>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {pedido.length === 0 ? (
                                    <div className="p-20 text-center text-slate-300">
                                        <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-bold italic">No hay productos seleccionados</p>
                                    </div>
                                ) : (
                                    pedido.map((item, idx) => (
                                        <div key={idx} className="p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                            <img src={item.imagen} className="w-20 h-20 rounded-2xl object-cover shadow-sm" />
                                            <div className="flex-1">
                                                <h3 className="font-black text-slate-800 leading-tight">{item.nombre}</h3>
                                                <div className="flex gap-2 mt-1">
                                                    {item.tallasElegidas.map((t: any) => (
                                                        <span key={t.talla} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold border border-indigo-100">
                                                            T{t.talla} ({t.selected})
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-900">S/ {item.subtotal.toFixed(2)}</p>
                                                <button
                                                    onClick={() => setPedido(pedido.filter((_, i) => i !== idx))}
                                                    className="text-red-400 hover:text-red-600 mt-2"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: FORMULARIO Y PAGO */}
                    <div className="lg:col-span-5">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 sticky top-8">

                            {step === 1 ? (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">TOTAL: S/ {totalVenta.toFixed(2)}</h2>
                                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                                        <Info className="text-amber-500 shrink-0" />
                                        <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                            Verifica las tallas antes de continuar. El stock se reserva al confirmar la venta.
                                        </p>
                                    </div>
                                    <button
                                        disabled={pedido.length === 0}
                                        onClick={() => setStep(2)}
                                        className="w-full bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-200 text-white py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-lg"
                                    >
                                        CONTINUAR CON DATOS <ChevronRight />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <button onClick={() => setStep(1)} className="text-xs font-bold text-indigo-600 flex items-center gap-1 mb-2">
                                        ← VOLVER AL CARRITO
                                    </button>
                                    <h2 className="text-xl font-black text-slate-800 uppercase">Datos de Envío</h2>

                                    <div className="space-y-3">
                                        <div className="relative">
                                            <User className="absolute left-4 top-4 text-slate-400" size={18} />
                                            <input
                                                className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 ring-indigo-500/20 outline-none font-bold"
                                                placeholder="Nombre del cliente"
                                                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="relative">
                                            <CreditCard
                                                className="absolute left-4 top-4 text-slate-400"
                                                size={18}
                                            />

                                            <input
                                                className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 ring-indigo-500/20 outline-none font-bold"
                                                placeholder="DNI"
                                                maxLength={8}
                                                value={customerData.dni}
                                                onChange={(e) =>
                                                    setCustomerData({
                                                        ...customerData,
                                                        dni: e.target.value.replace(/\D/g, '')
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-4 text-slate-400" size={18} />
                                            <input
                                                className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 ring-indigo-500/20 outline-none font-bold"
                                                placeholder="Celular"
                                                onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">

                                            {/* Departamento */}
                                            <select
                                                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold"
                                                value={depId}
                                                onChange={(e) => {
                                                    const val = e.target.value as keyof Ubigeo;

                                                    setDepId(val);
                                                    setProvId('');
                                                    setDistId('');

                                                    setCustomerData({
                                                        ...customerData,
                                                        department: ubigeo[val].nombre,
                                                        province: '',
                                                        district: ''
                                                    });
                                                }}
                                            >
                                                <option value="">Departamento</option>

                                                {departamentos.map((d) => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.nombre}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Provincia */}
                                            <select
                                                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold"
                                                value={provId}
                                                disabled={!depId}
                                                onChange={(e) => {
                                                    const val = e.target.value;

                                                    setProvId(val);
                                                    setDistId('');

                                                    setCustomerData({
                                                        ...customerData,
                                                        province:
                                                            ubigeo[depId as keyof Ubigeo]
                                                                .provincias[val].nombre,
                                                        district: '',
                                                    });
                                                }}
                                            >
                                                <option value="">Provincia</option>

                                                {provincias.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.nombre}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Distrito */}
                                            <select
                                                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold"
                                                value={distId}
                                                disabled={!provId}
                                                onChange={(e) => {
                                                    const val = e.target.value;

                                                    setDistId(val);

                                                    setCustomerData({
                                                        ...customerData,
                                                        district:
                                                            ubigeo[depId as keyof Ubigeo]
                                                                .provincias[provId]
                                                                .distritos[val],
                                                    });
                                                }}
                                            >
                                                <option value="">Distrito</option>

                                                {distritos.map((d) => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>


                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                                            <textarea
                                                className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 ring-indigo-500/20 outline-none font-bold min-h-[80px]"
                                                placeholder="Dirección y Referencias"
                                                onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isAgencyDelivery}
                                                onChange={(e) =>
                                                    setIsAgencyDelivery(e.target.checked)
                                                }
                                            />

                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                                Envío por Agencia
                                            </label>
                                        </div>
                                        {
                                            isAgencyDelivery && (
                                                <input
                                                    type="text"
                                                    placeholder="Nombre de la agencia"
                                                    className="w-full p-4 rounded-2xl bg-slate-50 border"
                                                    onChange={(e) =>
                                                        setCustomerData({
                                                            ...customerData,
                                                            agencyName: e.target.value
                                                        })
                                                    }
                                                />
                                            )
                                        }



                                        <div className="pt-4 border-t border-slate-100">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Método de Pago</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map((m) => (
                                                    <button
                                                        key={m}
                                                        onClick={() => setCustomerData({ ...customerData, paymentMethod: m })}
                                                        className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${customerData.paymentMethod === m ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="relative pt-4">
                                            <MessageSquare className="absolute left-4 top-8 text-slate-400" size={18} />
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Observaciones</label>
                                            <textarea
                                                className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 ring-indigo-500/20 outline-none font-bold italic"
                                                placeholder="Ej. Entregar después de las 3pm, llamar antes de llegar..."
                                                onChange={(e) => setCustomerData({ ...customerData, observations: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={finalizarVentaCompleta}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 mt-4"
                                    >
                                        FINALIZAR Y REGISTRAR VENTA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE SELECCIÓN DE TALLAS */}
            {showModal && selectedProduct && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row">
                        <div className="md:w-1/2 bg-slate-100">
                            <img src={selectedProduct.imagen} className="w-full h-full object-cover" />
                        </div>
                        <div className="md:w-1/2 p-8 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedProduct.marca}</p>
                                    <h3 className="text-xl font-black text-slate-800 uppercase leading-tight">{selectedProduct.nombre}</h3>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="mb-6">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                    Precio de Venta
                                </label>

                                <div className="flex items-center gap-2">
                                    <span className="font-black text-xl text-slate-700">S/</span>

                                    <input
                                        type="number"
                                        step="0.01"
                                        value={selectedProduct.precio}
                                        onChange={(e) =>
                                            setSelectedProduct({
                                                ...selectedProduct,
                                                precio: Number(e.target.value)
                                            })
                                        }
                                        className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 outline-none font-black text-slate-800 focus:ring-2 ring-indigo-500/20"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2">
                                {selectedProduct.tallas.map((t, i) => (
                                    <div
                                        key={t.talla}
                                        className="flex items-center justify-between p-3 rounded-2xl border-2 transition-all border-slate-100 hover:border-indigo-100"
                                    >
                                        <span className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm font-black text-slate-700 italic border border-slate-100">
                                            {t.talla}
                                        </span>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center bg-slate-100 rounded-xl p-1">
                                                <button
                                                    onClick={() => updateQty(i, -1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-colors"
                                                >
                                                    <Minus size={14} />
                                                </button>

                                                <span className="w-8 text-center font-black text-indigo-600">
                                                    {t.selected}
                                                </span>

                                                <button
                                                    onClick={() => updateQty(i, 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={agregarAlPedido}
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black mt-6 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={18} /> AGREGAR AL CARRITO
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}