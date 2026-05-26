'use client';
import { useState, useMemo, useEffect } from 'react';
import {
    Search, ShoppingCart, Trophy, Trash2, X, Plus, Minus,
    CheckCircle2, Star, Sparkles, TrendingUp, ChevronRight,
    Package, MapPin, Store, Info
} from 'lucide-react';
import { getProductStockByWarehouseAndCode } from '../services/stockServices';
import { getWarehouses } from '../services/warehouseServices';
import { useUser } from '../context/UserContext';
import { createGuiaFromOrder } from '../services/guiaService';
import { createOrder, CreateOrderPayload } from '../services/ordersService';


interface SizeStock {
    talla: string;
    stock: number;      // lo que viene del backend
    selected: number;   // lo que el usuario elige
}

interface Producto {
    id: string;
    codigo: string;
    nombre: string;
    marca: string;
    precio: number;        // venta
    precio_compra: number; // 👈 nuevo
    imagen: string;
    tallas: SizeStock[];
}

export default function SistemaPedidosPremium() {
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const DEFAULT_WAREHOUSE_ID = 6;
    const [selectedTiendaId, setSelectedTiendaId] = useState<string>(
        String(DEFAULT_WAREHOUSE_ID)
    );
    const [pedido, setPedido] = useState<any[]>([]);
    const [step, setStep] = useState(1); // 1: Seleccion, 2: Datos Envío

    const [tiendasDisponibles, setTiendasDisponibles] = useState<any[]>([]);
    const { user } = useUser();
    const [sinStock, setSinStock] = useState(false);
    const [customerData, setCustomerData] = useState({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        customer_reference: '',
        payment_reference: '',
    });

    // Datos de ejemplo con 5 tiendas
    useEffect(() => {
        if (!selectedProduct || !user?.token) return;

        const fetchStock = async () => {
            try {
                // Siempre consulta el warehouse principal (6)
                const data = await getProductStockByWarehouseAndCode(
                    DEFAULT_WAREHOUSE_ID,
                    selectedProduct.codigo,
                    user.token
                );

                const mapped = mapApiToProducto(data);
                setSelectedProduct(mapped);
                setSinStock(false); // ✅ hay stock
            } catch (err: any) {
                console.error(err);
                if (err?.response?.status === 404) {
                    setSinStock(true);
                    setSelectedProduct(null);
                    setTimeout(() => {
                        setSelectedProduct(prev => ({ ...prev!, tallas: [] }));
                    }, 0);
                    return;
                }
            }
        };

        fetchStock();
    }, [selectedProduct?.codigo, user?.token]);


    useEffect(() => {
        const loadWarehouses = async () => {
            if (!user?.token) return;

            const data = await getWarehouses(user.token);

            const tiendas = data
                .filter(w => w.type === 'tienda' && w.status)
                .map(w => ({
                    id: String(w.id),
                    nombre: w.warehouse_name
                }));

            setTiendasDisponibles(tiendas);
        };

        loadWarehouses();
    }, [user]);

    const handleOpenModal = (prod: Producto) => {
        setSelectedProduct(JSON.parse(JSON.stringify(prod)));
        setShowModal(true);
    };

    const mapApiToProducto = (data: any): Producto => {
        const tallasMap: Record<string, SizeStock> = {};

        data.stock.forEach((s: any) => {
            const talla = s.size || 'UNICO';

            if (!tallasMap[talla]) {
                tallasMap[talla] = {
                    talla,
                    stock: 0,
                    selected: 0
                };
            }

            tallasMap[talla].stock += s.quantity;
        });

        return {
            id: String(data.product_id),
            codigo: data.article_code,
            nombre: data.article_description,
            marca: data.brand_name,
            precio: Number(data.unit_price), // venta
            precio_compra: Number(data.manufacturing_cost || 0), // 👈 asegúrate que exista en tu API
            imagen: data.product_image || 'https://via.placeholder.com/400',
            tallas: Object.values(tallasMap)
        };
    };

    const handleSearch = async (code: string) => {
        try {

            if (!user?.token) throw new Error('No token');

            const data = await getProductStockByWarehouseAndCode(
                DEFAULT_WAREHOUSE_ID,
                code,
                user.token
            );

            const mappedProduct = mapApiToProducto(data);

            handleOpenModal(mappedProduct);
        } catch (error: any) {
            console.error(error);
            alert(error.message);
        }
    };

    const updateQty = (index: number, val: number) => {
        if (!selectedProduct) return;

        const newTallas = [...selectedProduct.tallas];
        const item = newTallas[index];

        item.selected = Math.max(
            0,
            Math.min(item.stock, item.selected + val)
        );

        setSelectedProduct({ ...selectedProduct, tallas: newTallas });
    };

    const agregarAlPedido = () => {
        if (!selectedProduct) return;
        const elegidas = selectedProduct.tallas.filter(t => t.selected > 0);
        if (elegidas.length === 0) return;

        const totalPares = elegidas.reduce((a, b) => a + b.selected, 0);
        const tiendaNombre = tiendasDisponibles.find(t => t.id === selectedTiendaId)?.nombre;

        setPedido([...pedido, {
            ...selectedProduct,
            tiendaOrigen: tiendaNombre,
            tallasElegidas: elegidas,
            totalPares,
            subtotal: totalPares * selectedProduct.precio,
            ganancia: totalPares * (selectedProduct.precio_compra - selectedProduct.precio)
        }]);
        setShowModal(false);
    };

    const generarOrdenDropshipping = async () => {
        if (!user) return;

        if (pedido.length === 0) {
            alert('No hay productos seleccionados');
            return;
        }

        if (!customerData.customer_name.trim()) {
            alert('Debe ingresar el nombre del cliente');
            return;
        }

        if (!customerData.customer_phone.trim()) {
            alert('Debe ingresar el teléfono');
            return;
        }
        if (!customerData.customer_address.trim()) {
            alert('Debe ingresar la dirección');
            return;
        }

        try {
            const payload: CreateOrderPayload = {
                client_id: 0,
                user_id: user.id,
                warehouse_id: Number(selectedTiendaId),

                order_type: 'DROPSHIPPING',
                payment_reference: customerData.payment_reference || null,

                customer_name: customerData.customer_name,
                customer_phone: customerData.customer_phone,
                customer_address: customerData.customer_address,
                customer_reference: customerData.customer_reference,

                items: pedido.flatMap(item =>
                    item.tallasElegidas.map((t: any) => ({
                        product_id: Number(item.id),
                        size: t.talla,
                        quantity: t.selected,
                        unit_price: item.precio,
                    }))
                ),
            };

            const result = await createOrder(payload, user.token);

            alert(`Orden DROPSHIPPING creada con ID: ${result.order.id}`);

            setPedido([]);

            setCustomerData({
                customer_name: '',
                customer_phone: '',
                customer_address: '',
                customer_reference: '',
                payment_reference: '',
            });
            setStep(1);
        } catch (err: any) {
            console.error(err);
            alert(err.message);
        }
    };

    const eliminarProducto = (index: number) => {
        const nuevaLista = pedido.filter((_, i) => i !== index);
        setPedido(nuevaLista);
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
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch((e.target as HTMLInputElement).value);
                                        }
                                    }}
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
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Producto</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">Tallas</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">P. Venta</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">P. Compra</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">M. Utilidad</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Total</th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pedido.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-26 text-center">
                                                    <div className="flex flex-col items-center text-slate-300">
                                                        <ShoppingCart size={48} className="mb64 stroke-[1.5]" />
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
                                                    <div className="flex flex-wrap justify-center gap-1">
                                                        {item.tallasElegidas.map((t: any) => (
                                                            <span key={t.talla} className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                                                                T{t.talla}: {t.selected}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                {/* PRECIO VENTA */}
                                                <td className="p-4 text-center font-bold text-green-600">
                                                    S/ {item.precio_compra.toFixed(2)}
                                                </td>

                                                {/* PRECIO COMPRA */}
                                                <td className="p-4 text-center font-bold text-orange-600">
                                                    S/ {item.precio.toFixed(2)}
                                                </td>

                                                {/* Margen de utilidad */}
                                                <td className="p-4 text-center font-bold text-red-600">
                                                    S/ {item.ganancia.toFixed(2)}
                                                </td>


                                                {/* TOTAL */}
                                                <td className="p-4 text-right">
                                                    <p className="font-black text-slate-800">
                                                        S/ {item.subtotal.toFixed(2)}
                                                    </p>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => eliminarProducto(idx)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
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

                    {step === 2 && (
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200">
                            <h2 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tight">Datos para la Entrega</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Nombre completo"
                                        value={customerData.customer_name}
                                        onChange={(e) =>
                                            setCustomerData({
                                                ...customerData,
                                                customer_name: e.target.value,
                                            })
                                        }
                                        className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 ring-indigo-500/20 font-bold"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Teléfono de contacto"
                                        value={customerData.customer_phone}
                                        onChange={(e) =>
                                            setCustomerData({
                                                ...customerData,
                                                customer_phone: e.target.value,
                                            })
                                        }
                                        className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 ring-indigo-500/20 font-bold"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Dirección exacta"
                                        value={customerData.customer_address}
                                        onChange={(e) =>
                                            setCustomerData({
                                                ...customerData,
                                                customer_address: e.target.value,
                                            })
                                        }
                                        className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 ring-indigo-500/20 font-bold"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Referencia"
                                        value={customerData.customer_reference}
                                        onChange={(e) =>
                                            setCustomerData({
                                                ...customerData,
                                                customer_reference: e.target.value,
                                            })
                                        }
                                        className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 ring-indigo-500/20 font-bold"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Referencia de pago / Yape / Operación"
                                        value={customerData.payment_reference}
                                        onChange={(e) =>
                                            setCustomerData({
                                                ...customerData,
                                                payment_reference: e.target.value,
                                            })
                                        }
                                        className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 ring-indigo-500/20 font-bold"
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 py-4 font-black text-slate-400">VOLVER</button>
                                <button className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 uppercase tracking-widest text-xs">FINALIZAR PEDIDO</button>
                                <button
                                    onClick={() => {
                                        if (pedido.length === 0) {
                                            alert('Debe agregar productos');
                                            return;
                                        }

                                        setStep(2);
                                    }}
                                    className="w-full group bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-2xl font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                                >
                                    FINALIZAR VENTA
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* COLUMNA DERECHA: RESUMEN */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-200">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Resumen de Liquidación</h3>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">Total Pares</span>
                                    <span className="font-black text-slate-800">{pedido.reduce((a, b) => a + b.totalPares, 0)}</span>
                                </div>

                                <div className="pt-6 border-t-2 border-dashed border-slate-100 flex flex-col">
                                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                        S/ {pedido.reduce((a, b) => a + b.subtotal, 0).toFixed(2)}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total a cobrar al cliente</p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (pedido.length === 0) {
                                        alert('Debe agregar productos');
                                        return;
                                    }

                                    setStep(2);
                                }}
                                className="w-full group bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-2xl font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                            >
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
                <div className="fixed top-[70px] left-0 right-0 bottom-0 z-[999]  flex justify-center bg-slate-900/80 backdrop-blur">
                    <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col">
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


                                {/* LISTA DE TALLAS ADAPTADA AL STOCK DE LA TIENDA SELECCIONADA */}
                                <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                    {sinStock ? (
                                        <div className="text-center py-10 text-slate-400 font-bold">
                                            Sin stock en esta tienda
                                        </div>
                                    ) : selectedProduct.tallas.length === 0 ? (
                                        <div className="text-center py-10 text-slate-300">
                                            No hay tallas disponibles
                                        </div>
                                    ) : (selectedProduct.tallas.map((t, i) => {
                                        const stockEnTienda = t.stock;
                                        const selectedQty = t.selected;
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
                                                    <input type="number" readOnly className="w-8 text-center font-black text-indigo-600 bg-transparent text-sm" value={selectedQty} />
                                                    <button onClick={() => updateQty(i, 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white rounded-lg transition-colors"><Plus size={14} /></button>
                                                </div>
                                            </div>
                                        )
                                    })
                                    )}
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Pares totales</p>
                                        <p className="text-3xl font-black text-slate-800 tracking-tighter">
                                            {selectedProduct.tallas.reduce((a, b) => a + b.selected, 0)}
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