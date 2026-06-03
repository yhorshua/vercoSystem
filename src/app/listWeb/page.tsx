'use client';

import { useEffect, useMemo, useState } from 'react';

import {
    Search,
    Eye,
    Phone,
    Calendar,
    Hash,
    X,
    User,
    Map,
    MapPin,
    CreditCard,
    Package,
    Printer,
    Route,
    RefreshCw
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { PedidoStatusBadge } from '../components/badge';

import {
    getWebSales,
    updateWebSaleStatus,
    WebSaleResponse
} from '../services/webSaleService';
import Swal from 'sweetalert2';

export default function ListaPedidosPage() {

    const [filter, setFilter] = useState('todos');

    const [sales, setSales] = useState<WebSaleResponse[]>([]);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const { user } = useUser();

    const token = user?.token;

    const [selectedSale, setSelectedSale] =
        useState<WebSaleResponse | null>(null);

    const [shippingCodeInput, setShippingCodeInput] =
        useState('');

    const role =
        user?.role?.name_role;
    const isSalesManager =
        user?.role?.name_role === 'Jefe Ventas';


    const isDelivery = role === 'Delivery';

    const canViewAgencyInfo =
        role === 'Jefe Ventas' ||
        role === 'Vendedor Web' ||
        role === 'Delivery';

    const [showModal, setShowModal] =
        useState(false);

    const changeStatus = async (status: string) => {

        if (!selectedSale || !token) return;

        const result = await Swal.fire({
            title: '¿Confirmar?',
            text: `¿Deseas cambiar el estado a ${status}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        try {

            await updateWebSaleStatus(
                selectedSale.id,
                status,
                token,
                selectedSale.shipping_code ?? ''
            );

            setSelectedSale({
                ...selectedSale,
                status
            });

            setSales(prev =>
                prev.map(s =>
                    s.id === selectedSale.id
                        ? {
                            ...s,
                            status
                        }
                        : s
                )
            );

            await Swal.fire({
                icon: 'success',
                title: 'Operación exitosa',
                text: `Estado cambiado a ${status}`,
                confirmButtonText: 'Aceptar'
            });

        } catch (error) {

            console.error(error);

            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al actualizar estado'
            });
        }
    };

    if (!token) return;

    useEffect(() => {

        if (!token) return;

        const interval = setInterval(() => {
            loadSales();
        }, 100000);

        return () => clearInterval(interval);

    }, [token, filter]);

    useEffect(() => {

        if (token) {
            loadSales();
        }

    }, [filter, token]);

    const loadSales = async () => {

        try {

            setLoading(true);

            if (!token) return;

            const data = await getWebSales(
                token,
                {
                    status: filter !== 'todos'
                        ? filter
                        : undefined
                }
            );

            setSales(data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);
        }
    };


    const handleDelivered = async (
        sale: WebSaleResponse
    ) => {

        if (
            sale.is_agency_delivery &&
            !shippingCodeInput.trim()
        ) {

            Swal.fire(
                'Error',
                'Debe ingresar el código de envío',
                'error'
            );

            return;
        }

        await updateWebSaleStatus(
            sale.id,
            'ENTREGADO',
            token,
            shippingCodeInput
        );

        Swal.fire(
            'Correcto',
            'Pedido entregado',
            'success'
        );

        loadSales();

        handleCloseModal();
    };

    const filteredSales = useMemo(() => {

        return sales.filter((sale) => {

            const text = `
                ${sale.customer_name}
                ${sale.customer_phone}
                ${sale.ticket}
            `.toLowerCase();

            return text.includes(
                search.toLowerCase()
            );
        });

    }, [sales, search]);

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedSale(null);
    };

    const handlePrintAction = () => {
        window.print();
    };


    const openWaze = () => {

        if (!selectedSale) return;

        const address = `${selectedSale.customer_address}, ${selectedSale.district}`;

        window.open(
            `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
            '_blank'
        );
    };

    const openGoogleMaps = () => {

        const address = encodeURIComponent(
            `${selectedSale?.customer_address},
     ${selectedSale?.district}`
        );

        window.open(
            `https://www.google.com/maps/search/?api=1&query=${address}`,
            '_blank'
        );
    };

    const generateRoute = () => {

        const deliveries = sales.filter(
            sale =>
                sale.status === 'DESPACHADO' &&
                !sale.is_agency_delivery
        );

        const addresses = deliveries.map(
            sale =>
                `${sale.customer_address}, ${sale.district}`
        );

        const origin =
            'Calle Los Pacaes 965, San Juan de Lurigancho';

        const routeUrl =
            `https://www.google.com/maps/dir/${[
                origin,
                ...addresses
            ]
                .map(a => encodeURIComponent(a))
                .join('/')}`;

        window.open(routeUrl, '_blank');
    };


    const pendingDeliveries = sales.filter(
        sale =>
            sale.status === 'DESPACHADO' &&
            !sale.is_agency_delivery
    ).length;



    
    return (

        <div className="min-h-screen bg-slate-50 p-4 lg:p-8">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">

                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                            Mis Pedidos
                        </h1>

                        <p className="text-slate-500 text-sm font-medium">
                            Gestiona y rastrea tus ventas realizadas
                        </p>
                    </div>

                    {/* FILTROS */}

                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">

                        {[
                            'TODOS',
                            'PENDIENTE',
                            'APROBADO',
                            'DESPACHADO',
                            'ENTREGADO',
                            'CANCELADO'
                        ].map((f) => (

                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${filter === f
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'bg-white text-slate-500 hover:bg-green-200'
                                    }`}
                            >
                                {f.toLowerCase()}
                            </button>
                        ))}

                        <button
                            onClick={loadSales}
                            className="
            flex items-center gap-2
            px-4 py-2
            bg-blue-600
            hover:bg-blue-700
            text-white
            rounded-xl
            text-xs
            font-bold
        "
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 mb-6 items-stretch">

                    {/* Buscador */}
                    <div className="flex-1 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex items-center gap-3">

                        <Search
                            className="text-slate-400"
                            size={20}
                        />

                        <input
                            type="text"
                            placeholder="Buscar por cliente, teléfono o ticket..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full outline-none font-medium text-slate-600"
                        />
                    </div>


                    {/* Botón Ruta */}
                    {isDelivery && (
                        <>
                            <span
                                className="
                                    px-2 py-2
                                    bg-orange-100
                                    text-orange-700
                                    rounded-xl
                                    font-bold
                                "
                            >
                                {pendingDeliveries} entregas
                            </span>
                            <button
                                onClick={generateRoute}
                                className="
                                    flex items-center justify-center gap-2
                                    px-6 py-4
                                    bg-orange-600
                                    hover:bg-orange-700
                                    text-white
                                    rounded-[2rem]
                                    font-bold
                                    shadow-sm
                                    whitespace-nowrap
                                    transition-all
                                "
                            >
                                <Route size={18} />
                                Generar Ruta
                            </button>
                        </>
                    )}

                </div>

                {/* TABLA */}

                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">

                    <div className="overflow-x-auto">

                        <table className="w-full text-left">

                            <thead className="bg-slate-50 border-b border-slate-100">

                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Pedido
                                    </th>

                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Cliente
                                    </th>

                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                        Pares
                                    </th>

                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Total
                                    </th>

                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Estado
                                    </th>

                                    <th className="p-6"></th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">

                                {loading ? (

                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="p-10 text-center text-slate-500"
                                        >
                                            Cargando pedidos...
                                        </td>
                                    </tr>

                                ) : filteredSales.length === 0 ? (

                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="p-10 text-center text-slate-500"
                                        >
                                            No existen pedidos
                                        </td>
                                    </tr>

                                ) : (

                                    filteredSales.map((sale) => (

                                        <tr
                                            key={sale.id}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >

                                            {/* PEDIDO */}

                                            <td className="p-6">

                                                <p className="font-black text-slate-800 text-sm">
                                                    {sale.ticket}
                                                </p>

                                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">

                                                    <Calendar size={12} />

                                                    {new Date(
                                                        sale.created_at
                                                    ).toLocaleDateString()}
                                                </p>
                                            </td>

                                            {/* CLIENTE */}

                                            <td className="p-6">

                                                <p className="font-bold text-slate-700 text-sm">
                                                    {sale.customer_name}
                                                </p>

                                                <p className="text-[10px] text-slate-400 flex items-center gap-1">

                                                    <Phone size={10} />

                                                    {sale.customer_phone}
                                                </p>
                                            </td>

                                            {/* PARES */}

                                            <td className="p-6 text-center font-black text-slate-600">

                                                {sale.total_products}
                                            </td>

                                            {/* TOTAL */}

                                            <td className="p-6 font-black text-indigo-600">

                                                S/ {Number(
                                                    sale.total_amount
                                                ).toFixed(2)}
                                            </td>

                                            {/* ESTADO */}

                                            <td className="p-6">

                                                <PedidoStatusBadge
                                                    estado={sale.status}
                                                />
                                            </td>

                                            {/* ACCIONES */}

                                            <td className="p-6 text-right">

                                                <button
                                                    onClick={() => {
                                                        setSelectedSale(sale);
                                                        setShowModal(true);
                                                        setShippingCodeInput(sale.shipping_code || '');
                                                    }}
                                                    className="p-3 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all inline-flex"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* MODAL MEJORADO */}
            {showModal && selectedSale && (
                <div className="fixed top-[70px] left-0 right-0 bottom-0 z-[999]  flex justify-center bg-slate-900/80 backdrop-blur">
                    {/* Backdrop con desenfoque */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={handleCloseModal}
                    />

                    <div className="relative bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">

                        {/* Header del Modal */}
                        <div className="flex justify-between items-center p-8 border-b bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                    <Hash size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                        {selectedSale.ticket}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <PedidoStatusBadge estado={selectedSale.status} />
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Detalle de Venta</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"
                            >
                                <X size={32} />
                            </button>
                        </div>

                        {/* Contenido Scrollable */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                            {/* Sección Cliente */}
                            <div className="grid md:grid-cols-2 gap-6 mb-10">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2">
                                        <User size={14} /> Información del Cliente
                                    </h3>
                                    <div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-100 space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Nombre</label>
                                            <p className="text-slate-700 font-bold">{selectedSale.customer_name}</p>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Teléfono</label>
                                            <p className="text-slate-700 font-bold flex items-center gap-2">
                                                <Phone size={14} className="text-indigo-400" /> {selectedSale.customer_phone}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Vendedor</label>
                                            <p className="text-slate-700 font-bold flex items-center gap-2">
                                                <User size={14} className="text-indigo-400" /> {selectedSale.seller.full_name}
                                            </p>
                                        </div>

                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2">
                                        <MapPin size={14} /> Ubicación y Entrega
                                    </h3>
                                    <div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-100 space-y-3">
                                        <div className="flex items-start gap-2">
                                            <Map size={16} className="text-indigo-400 mt-1 shrink-0" />
                                            <div>
                                                <p className="text-slate-700 font-bold leading-tight">{selectedSale.customer_address}</p>
                                                <p className="text-slate-500 text-xs font-medium">{selectedSale.department}, {selectedSale.province}, {selectedSale.district}</p>
                                            </div>
                                            {isDelivery && selectedSale.status === 'DESPACHADO' && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={openWaze}
                                                        className="
    px-3 py-2
    bg-cyan-600
    hover:bg-cyan-700
    text-white
    rounded-xl
    text-sm
    font-black
  "
                                                    >
                                                        Abrir en Waze
                                                    </button>
                                                    <button
                                                        onClick={openGoogleMaps}
                                                        className="
    px-3 py-2
    bg-cyan-600
    hover:bg-cyan-700
    text-white
    rounded-xl
    text-sm
    font-black
  "
                                                    >
                                                        Abrir en Maps
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Método de pago</span>
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                                <CreditCard size={12} /> {selectedSale.payment_method}
                                            </span>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                                Observaciones
                                            </label>

                                            <p className="text-slate-700">
                                                {selectedSale.observations || '-'}
                                            </p>
                                        </div>

                                        {canViewAgencyInfo &&
                                            selectedSale.is_agency_delivery && (
                                                <div className="border-t border-slate-200 pt-3 space-y-3">

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                                            Tipo de Entrega
                                                        </label>

                                                        <span className="inline-flex px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-black">
                                                            ENVÍO POR AGENCIA
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                                            Agencia
                                                        </label>

                                                        <p className="font-bold text-slate-700">
                                                            {selectedSale.agency_name || '-'}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                                            Código de Envío
                                                        </label>

                                                        <p
                                                            className={`font-bold ${selectedSale.shipping_code
                                                                ? 'text-green-600'
                                                                : 'text-orange-500'
                                                                }`}
                                                        >
                                                            {selectedSale.shipping_code ||
                                                                'Pendiente de registrar'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                        {isDelivery &&
                                            selectedSale.status === 'DESPACHADO' &&
                                            selectedSale.is_agency_delivery && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                                        Código de Envío
                                                    </label>

                                                    <input
                                                        type="text"
                                                        value={shippingCodeInput}
                                                        onChange={(e) =>
                                                            setShippingCodeInput(e.target.value)
                                                        }
                                                        placeholder="Ingrese código de envío"
                                                        className="
                    w-full
                    mt-2
                    px-4
                    py-2
                    border
                    border-slate-300
                    rounded-xl
                    focus:outline-none
                    focus:ring-2
                    focus:ring-indigo-500
                "
                                                    />
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>



                            {/* Tabla de Productos */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2">
                                    <Package size={14} /> Resumen de Productos
                                </h3>
                                <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                                    <table className="w-full">
                                        <thead className="bg-slate-50/80">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Código</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Producto</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase">Talla</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase">Cant.</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase">Precio</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedSale.details.map((item) => (
                                                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-700 text-sm">{item.article_code}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-700 text-sm">{item.product_name}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="bg-white border border-slate-200 px-2 py-1 rounded-md text-xs font-black text-slate-600">
                                                            {item.size}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-600">{item.quantity}</td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-800">S/ {Number(item.sale_price).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer del Modal */}
                        <div className="p-8 bg-slate-50 border-t flex flex-col md:flex-row justify-between items-center gap-6">
                            {
                                isSalesManager &&
                                selectedSale.status === 'APROBADO' && (

                                    <button
                                        onClick={handlePrintAction}
                                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-sm active:scale-95"
                                    >
                                        <Printer size={18} /> Imprimir Ticket
                                    </button>

                                )
                            }

                            {
                                isSalesManager &&
                                selectedSale.status === 'PENDIENTE' && (
                                    <>
                                        <button
                                            className=" px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black shadow-lg transition-all"
                                            onClick={() => changeStatus('APROBADO')}
                                        >
                                            Aprobar Pedido
                                        </button>

                                        <button
                                            onClick={() => changeStatus('CANCELADO')}
                                            className="
                px-6 py-3
                bg-gray-700
                hover:bg-gray-800
                text-white
                rounded-2xl
                font-black
                shadow-lg
                transition-all
            "
                                        >
                                            Cancelar Pedido
                                        </button>
                                    </>
                                )
                            }

                            {
                                isSalesManager &&
                                selectedSale.status === 'APROBADO' && (
                                    <button
                                        onClick={() => changeStatus('DESPACHADO')}
                                        className="px-6 py-3 bg-red-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg transition-all"
                                    >
                                        Despachar Pedido
                                    </button>
                                )
                            }

                            {
                                role === 'Delivery' &&
                                selectedSale.status === 'DESPACHADO' && (
                                    <>
                                        <button
                                            onClick={() =>
                                                handleDelivered(selectedSale)
                                            }
                                            disabled={
                                                selectedSale.is_agency_delivery &&
                                                !shippingCodeInput.trim()
                                            }
                                            className={`
                px-6
                py-3
                rounded-2xl
                font-black
                shadow-lg
                text-white
                ${selectedSale.is_agency_delivery &&
                                                    !shippingCodeInput.trim()
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-green-600 hover:bg-green-700'
                                                }
            `}
                                        >
                                            Entregado
                                        </button>
                                        <button
                                            onClick={() => changeStatus('CANCELADO')}
                                            className="
                px-6 py-3
                bg-gray-700
                hover:bg-gray-800
                text-white
                rounded-2xl
                font-black
                shadow-lg
                transition-all
            "
                                        >
                                            Cancelar Pedido
                                        </button>

                                    </>
                                )
                            }


                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total del Pedido</p>
                                    <p className="text-3xl font-black text-indigo-600">
                                        S/ {Number(selectedSale.total_amount).toFixed(2)}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    LISTO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>


    );
}