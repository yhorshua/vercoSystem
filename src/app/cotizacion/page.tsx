'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
    User, Search, Plus, Trash2, ShoppingBag, Printer, Info, Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getProductsByCodeOrDescription } from '../services/productsService';
import { useUser } from '../context/UserContext';
import { base64Img } from '../utils/logobase64';
import type { Ubigeo } from '../utils/types/ubigeo';
import rawUbigeo from '../utils/ubigeo-peru-optimizado.json';
import SelectTailwind from '../components/ui/SelectTailwind';


// --- TIPOS ---
interface Cliente {
    nombre: string;
    tipoDoc: string;
    numDoc: string;
    direccion: string;
    departamento: string;
    provincia: string;
    distrito: string;
    telefono: string;
    metodoPago?: string;
    agencia?: string;
}

interface Producto {
    id: string;
    codigo: string;
    nombre: string;
    precioBase: number;
}

interface ItemCotizacion {
    id: string;
    codigo: string;
    nombre: string;
    precio: number;
    tallas: { talla: string; cantidad: number }[];
    totalPares: number;
    descuento: number;
    totalSinDescuento: number;
    subtotal: number;
}



export default function CotizadorPage() {


    const [generatingPdf, setGeneratingPdf] = useState(false);

    const gradientCacheRef = useRef<string | null>(null);

    const logoCacheRef = useRef<{
        data: string;
        format: 'JPEG' | 'PNG';
    } | null>(null);

    // Estados de Cliente
    const [cliente, setCliente] = useState<Cliente>({
        nombre: '', tipoDoc: 'DNI', numDoc: '', direccion: '',
        departamento: '', provincia: '', distrito: '', telefono: '',
        metodoPago: 'Efectivo',
        agencia: ''
    });
    const { user } = useUser();
    // Estados de Selección
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [tempPrice, setTempPrice] = useState<number>(0);
    const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});
    // Lista Final
    const [items, setItems] = useState<ItemCotizacion[]>([]);
    const [loading, setLoading] = useState(false);

    const descuento = 0; // luego lo haces dinámico
    const [tempDiscount, setTempDiscount] = useState<number>(0);
    const ubigeo = rawUbigeo as Ubigeo;
    const [depId, setDepId] = useState<keyof Ubigeo | ''>('');
    const [provId, setProvId] = useState<string>('');
    const [distId, setDistId] = useState<string>('');;

    const departamentos = useMemo(() => {
        return Object.entries(ubigeo).map(([id, dep]: any) => ({
            id,
            nombre: dep.nombre
        }));
    }, []);

    const provincias = useMemo(() => {
        if (!depId) return [];

        return Object.entries(ubigeo[depId].provincias).map(([id, prov]: any) => ({
            id,
            nombre: prov.nombre
        }));
    }, [depId]);

    const distritos = useMemo(() => {
        if (!depId || !provId) return [];

        return Object.entries(
            ubigeo[depId].provincias[provId].distritos
        ).map(([id, nombre]) => ({
            id,
            nombre
        }));
    }, [depId, provId]);

    // Búsqueda filtrada
    const buscarProducto = async () => {
        if (!search) return;

        try {
            setLoading(true);

            const token = user?.token || '';
            const producto = await getProductsByCodeOrDescription(search, token);

            if (!producto) {
                alert("Producto no encontrado");
                return;
            }

            // Mapear producto
            setSelectedProduct({
                id: producto.product_id,
                codigo: producto.article_code,
                nombre: producto.article_description,
                precioBase: Number(producto.price)
            });

            // 🔥 TALLAS DINÁMICAS DESDE API
            const tallasIniciales: Record<string, number> = {};
            producto.sizes.forEach((s: any) => {
                tallasIniciales[s.size] = 0;
            });

            setSelectedSizes(tallasIniciales);
            setTempPrice(Number(producto.price));
            setSearch('');

        } catch (error: any) {
            alert(error.message || "Error al buscar producto");
        } finally {
            setLoading(false);
        }
    };


    const handleSizeChange = (talla: string, qty: number) => {
        setSelectedSizes(prev => ({
            ...prev,
            [talla]: Math.max(0, qty)
        }));
    };



    const agregarItem = () => {
        if (!selectedProduct) return;

        const tallasFiltradas = Object.entries(selectedSizes)
            .filter(([_, qty]) => qty > 0)
            .map(([talla, cantidad]) => ({ talla, cantidad }));

        if (tallasFiltradas.length === 0) return;

        const totalPares = tallasFiltradas.reduce((acc, curr) => acc + curr.cantidad, 0);

        const subtotalSinDescuento = totalPares * tempPrice;
        const precioFinalPorPar = Math.max(0, tempPrice - tempDiscount);

        const subtotal = totalPares * precioFinalPorPar;

        const newItem: ItemCotizacion = {
            id: `${selectedProduct.id}-${Date.now()}`,
            codigo: selectedProduct.codigo,
            nombre: selectedProduct.nombre,
            precio: tempPrice,
            tallas: tallasFiltradas,
            totalPares,
            descuento: tempDiscount,
            totalSinDescuento: subtotalSinDescuento,
            subtotal: subtotal
        };

        setItems([...items, newItem]);
        setSelectedProduct(null);
        setSelectedSizes({});
        setTempDiscount(0);
    };

    const eliminarItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const totalGeneralPares = items.reduce((acc, curr) => acc + curr.totalPares, 0);
    const totalGeneralMonto = items.reduce((acc, curr) => acc + curr.subtotal, 0);

    const totalDescuento = items.reduce(
        (acc, curr) => acc + (curr.descuento * curr.totalPares),
        0
    );

    const totalSinDescuento = items.reduce(
        (acc, curr) => acc + (curr.precio * curr.totalPares),
        0
    );
    // Función para generar el fondo degradado
    const getGradientHeader = (width: number, height: number) => {
        if (gradientCacheRef.current) {
            return gradientCacheRef.current;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        const gradient = ctx.createLinearGradient(0, 0, width, 0);

        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.5, '#000000');
        gradient.addColorStop(1, '#000000');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.45);

        gradientCacheRef.current = compressed;

        return compressed;
    };

    const getCompressedLogo = async (): Promise<{
        data: string;
        format: 'JPEG' | 'PNG';
    }> => {
        if (logoCacheRef.current) {
            return logoCacheRef.current;
        }

        return new Promise((resolve) => {
            const image = new Image();

            image.onload = () => {
                const canvas = document.createElement('canvas');

                canvas.width = 360;
                canvas.height = 140;

                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    const fallback = {
                        data: base64Img,
                        format: 'PNG' as const,
                    };

                    logoCacheRef.current = fallback;
                    resolve(fallback);
                    return;
                }

                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                const compressedLogo = {
                    data: canvas.toDataURL('image/jpeg', 0.68),
                    format: 'JPEG' as const,
                };

                logoCacheRef.current = compressedLogo;

                resolve(compressedLogo);
            };

            image.onerror = () => {
                const fallback = {
                    data: base64Img,
                    format: 'PNG' as const,
                };

                logoCacheRef.current = fallback;
                resolve(fallback);
            };

            image.src = base64Img;
        });
    };

    const waitNextPaint = () => {
        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 80);
            });
        });
    };

    const generarPDF = async () => {
        if (items.length === 0 || generatingPdf) return;

        setGeneratingPdf(true);

        try {
            await waitNextPaint();

            const logoImg = await getCompressedLogo();

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true,
                precision: 2,
                putOnlyUsedFonts: true,
            });

            const date = new Date().toLocaleDateString();
            const pageWidth = doc.internal.pageSize.getWidth();
            const headerHeight = 40;

            const gradientImg = getGradientHeader(320, 70);

            doc.addImage(
                gradientImg,
                'JPEG',
                0,
                0,
                pageWidth,
                headerHeight,
                undefined,
                'FAST'
            );

            const logoWidth = 50;
            const logoHeight = 20;
            const logoY = (headerHeight - logoHeight) / 2;

            doc.addImage(
                logoImg.data,
                logoImg.format,
                7,
                logoY,
                logoWidth,
                logoHeight,
                undefined,
                'FAST'
            );

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);

            const title = 'NOTA DE PEDIDO';
            const titleWidth = doc.getTextWidth(title);

            doc.text(title, pageWidth - titleWidth - 14, 22);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            const dateText = `Fecha: ${date}`;
            const dateWidth = doc.getTextWidth(dateText);

            doc.text(dateText, pageWidth - dateWidth - 14, 30);

            doc.setTextColor(50, 50, 50);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMACIÓN DEL CLIENTE', 14, 55);

            doc.setDrawColor(220, 220, 220);
            doc.line(14, 57, 196, 57);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            doc.text(`Cliente: ${cliente.nombre || '---'}`, 14, 66);
            doc.text(`${cliente.tipoDoc}: ${cliente.numDoc || '---'}`, 14, 72);
            doc.text(`Teléfono: ${cliente.telefono || '---'}`, 14, 78);

            doc.text(`Departamento: ${cliente.departamento || '-'}`, 110, 66);
            doc.text(`Provincia: ${cliente.provincia || '-'}`, 110, 72);
            doc.text(`Distrito: ${cliente.distrito || '-'}`, 110, 78);
            doc.text(`Dirección: ${cliente.direccion || '---'}`, 110, 84);

            doc.text(`Método de Pago: ${cliente.metodoPago || '---'}`, 14, 88);
            doc.text(`Agencia: ${cliente.agencia || '---'}`, 110, 88);

            const tableBody = items.map(item => [
                item.codigo,
                item.nombre,
                `S/ ${Number(item.precio).toFixed(2)}`,
                item.tallas.map(t => `${t.talla}(${t.cantidad})`).join(', '),
                String(item.totalPares),
                `S/ ${item.subtotal.toFixed(2)}`
            ]);

            autoTable(doc, {
                startY: 96,
                head: [[
                    'ARTÍCULO',
                    'DESCRIPCIÓN',
                    'P. UNITARIO',
                    'TALLAS',
                    'PARES',
                    'SUBTOTAL'
                ]],
                body: tableBody,
                theme: 'striped',
                margin: {
                    left: 14,
                    right: 14,
                },
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center',
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    valign: 'middle',
                    overflow: 'linebreak',
                },
                columnStyles: {
                    0: {
                        halign: 'left',
                        fontStyle: 'bold',
                        cellWidth: 24,
                    },
                    1: {
                        cellWidth: 48,
                    },
                    2: {
                        halign: 'right',
                        cellWidth: 24,
                    },
                    3: {
                        halign: 'left',
                        cellWidth: 45,
                    },
                    4: {
                        halign: 'center',
                        cellWidth: 17,
                    },
                    5: {
                        halign: 'right',
                        fontStyle: 'bold',
                        cellWidth: 24,
                    },
                },
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;

            doc.setDrawColor(220, 220, 220);
            doc.line(14, finalY, 196, finalY);

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(130, finalY, 66, 35, 2, 2, 'F');

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'normal');

            doc.text('Total Pares:', 135, finalY + 10);
            doc.text(`${totalGeneralPares}`, 190, finalY + 10, {
                align: 'right',
            });

            doc.setTextColor(220, 38, 38);
            doc.text('Descuento:', 135, finalY + 18);
            doc.text(`- S/ ${totalDescuento.toFixed(2)}`, 190, finalY + 18, {
                align: 'right',
            });

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL FINAL:', 135, finalY + 28);
            doc.text(`S/ ${totalGeneralMonto.toFixed(2)}`, 190, finalY + 28, {
                align: 'right',
            });

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'normal');

            doc.text('Método de Pago:', 14, finalY + 10);
            doc.text(`${cliente.metodoPago || '-'}`, 60, finalY + 10);

            doc.text('Agencia:', 14, finalY + 18);
            doc.text(`${cliente.agencia || '-'}`, 60, finalY + 18);

            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                'Esta cotización tiene una validez de 7 días hábiles.',
                14,
                finalY + 40
            );

            const safeName = cliente.nombre.trim()
                ? cliente.nombre.trim().replace(/\s+/g, '_')
                : 'Nuevo';

            doc.save(`Pedido_${safeName}.pdf`);
        } catch (error) {
            console.error(error);
            alert('No se pudo generar el PDF');
        } finally {
            setGeneratingPdf(false);
        }
    };



    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* ENCABEZADO */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">GENERAR COTIZACIÓN</h1>
                        <p className="text-slate-500 font-medium">Crea presupuestos para tus clientes</p>
                    </div>
                    <button
                        onClick={generarPDF}
                        disabled={items.length === 0 || generatingPdf}
                        className="bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg active:scale-95"
                    >
                        {generatingPdf ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                GENERANDO PDF...
                            </>
                        ) : (
                            <>
                                <Printer size={20} />
                                GENERAR PDF
                            </>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* COLUMNA IZQUIERDA: FORMULARIOS */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* 1. DATOS DEL CLIENTE */}
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <User size={20} />
                                </div>
                                <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Datos del Cliente</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                {/* NOMBRE */}
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                        Nombre / Razón Social
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 rounded-2xl p-4 font-bold"
                                        value={cliente.nombre}
                                        onChange={e => setCliente({ ...cliente, nombre: e.target.value })}
                                    />
                                </div>

                                {/* TIPO DOC */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                        Tipo Doc.
                                    </label>
                                    <select
                                        className="w-full bg-slate-50 rounded-2xl p-4 font-bold"
                                        value={cliente.tipoDoc}
                                        onChange={e => setCliente({ ...cliente, tipoDoc: e.target.value })}
                                    >
                                        <option>DNI</option>
                                        <option>RUC</option>
                                    </select>
                                </div>

                                {/* NUM DOC */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                        Número Doc.
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 rounded-2xl p-4 font-bold"
                                        value={cliente.numDoc}
                                        onChange={e => setCliente({ ...cliente, numDoc: e.target.value })}
                                    />
                                </div>

                                {/* TELÉFONO */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 rounded-2xl p-4 font-bold"
                                        value={cliente.telefono}
                                        onChange={e => setCliente({ ...cliente, telefono: e.target.value })}
                                    />
                                </div>

                                {/* ESPACIO VACÍO PARA ALINEAR */}
                                <div></div>

                                {/* DEPARTAMENTO */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                        Departamento
                                    </label>
                                    <SelectTailwind
                                        value={depId as string}
                                        options={departamentos.map(dep => ({
                                            value: dep.id,
                                            label: dep.nombre
                                        }))}
                                        onChange={(value) => {
                                            setDepId(value as keyof Ubigeo);
                                            setProvId('');
                                            setDistId('');

                                            setCliente({
                                                ...cliente,
                                                departamento: ubigeo[value].nombre,
                                                provincia: '',
                                                distrito: ''
                                            });
                                        }}
                                    />
                                </div>

                                {/* PROVINCIA */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                        Provincia
                                    </label>
                                    <SelectTailwind
                                        value={provId}
                                        disabled={!depId}
                                        options={provincias.map(prov => ({
                                            value: prov.id,
                                            label: prov.nombre
                                        }))}
                                        onChange={(value) => {
                                            setProvId(value);
                                            setDistId('');

                                            setCliente({
                                                ...cliente,
                                                provincia: ubigeo[depId].provincias[value].nombre,
                                                distrito: ''
                                            });
                                        }}
                                    />
                                </div>

                                {/* DISTRITO */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                        Distrito
                                    </label>
                                    <SelectTailwind
                                        value={distId}
                                        disabled={!provId}
                                        options={distritos.map(dist => ({
                                            value: dist.id,
                                            label: dist.nombre
                                        }))}
                                        onChange={(value) => {
                                            setDistId(value);

                                            setCliente({
                                                ...cliente,
                                                distrito: ubigeo[depId].provincias[provId].distritos[value]
                                            });
                                        }}
                                    />
                                </div>

                                {/* DIRECCIÓN */}
                                <div className="md:col-span-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                        Dirección Completa
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 rounded-2xl p-4 font-bold"
                                        value={cliente.direccion}
                                        onChange={e => setCliente({ ...cliente, direccion: e.target.value })}
                                    />
                                </div>

                                {/* MÉTODO DE PAGO */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                        Método de Pago
                                    </label>
                                    <select
                                        className="w-full bg-slate-50 rounded-2xl p-4 font-bold"
                                        value={cliente.metodoPago}
                                        onChange={e => setCliente({ ...cliente, metodoPago: e.target.value })}
                                    >
                                        <option>Efectivo</option>
                                        <option>Transferencia</option>
                                        <option>Crédito</option>
                                        <option>Yape</option>
                                    </select>
                                </div>

                                {/* AGENCIA */}
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                        Agencia
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 rounded-2xl p-4 font-bold"
                                        value={cliente.agencia}
                                        onChange={e => setCliente({ ...cliente, agencia: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. BÚSQUEDA Y SELECCIÓN */}
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <ShoppingBag size={20} />
                                </div>
                                <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Buscar Producto</h2>
                            </div>

                            <div className="relative mb-8">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                                    <Search size={20} />
                                </div>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl py-5 pl-12 pr-4 font-bold text-slate-700 outline-none transition-all"
                                    placeholder="Buscar por nombre o código de calzado..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            buscarProducto();
                                        }
                                    }}
                                />

                                {/* Resultados Búsqueda */}

                            </div>

                            {/* Área de Configuración si hay producto seleccionado */}
                            {selectedProduct && (
                                <div className="bg-slate-50 rounded-[2rem] p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                        <div>
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Producto Seleccionado</span>
                                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{selectedProduct.nombre}</h3>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-6">

                                            {/* PRECIO */}
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">
                                                    Precio (S/)
                                                </span>
                                                <input
                                                    type="number"
                                                    className="w-24 bg-slate-100 rounded-xl p-2 font-black text-indigo-600 text-center outline-none"
                                                    value={tempPrice}
                                                    onChange={e => setTempPrice(Number(e.target.value))}
                                                />
                                            </div>

                                            {/* DESCUENTO */}
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">
                                                    Dscto (S/)
                                                </span>
                                                <input
                                                    type="number"
                                                    className="w-24 bg-red-50 rounded-xl p-2 font-black text-red-500 text-center outline-none"
                                                    value={tempDiscount}
                                                    onChange={e => setTempDiscount(Number(e.target.value))}
                                                />
                                            </div>

                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Info size={12} /> Ingresa cantidades por talla
                                        </p>
                                        <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
                                            {Object.keys(selectedSizes).map(talla => (
                                                <div key={talla} className="flex flex-col gap-1">
                                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                                        <div className="bg-slate-100 text-center py-1 text-[10px] font-black text-slate-500 border-b border-slate-200">{talla}</div>
                                                        <input
                                                            type="number"
                                                            className="w-full p-2 text-center font-bold text-slate-700 outline-none focus:bg-indigo-50"
                                                            placeholder="0"
                                                            value={selectedSizes[talla] || ''}
                                                            onChange={e => handleSizeChange(talla, Number(e.target.value))}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={agregarItem}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                                    >
                                        <Plus size={20} /> AGREGAR A LA LISTA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: RESUMEN Y TABLA */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* RESUMEN TOTALES */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                            <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-8">Resumen de Cotización</h3>

                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-medium">Total de Pares</span>
                                    <span className="text-2xl font-black">{totalGeneralPares}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-medium">Descuento Total</span>
                                    <span className="text-xl font-black text-red-400">
                                        - S/ {totalDescuento.toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-medium"> Total</span>
                                    <span className="text-xl font-black -400">
                                        S/ {totalSinDescuento.toFixed(2)}
                                    </span>
                                </div>
                                <div className="pt-6 border-t border-white/10 flex flex-col">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total General (S/)</span>
                                    <p className="text-5xl font-black tracking-tighter">S/ {totalGeneralMonto.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* LISTA DE ITEMS */}
                        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200 min-h-[400px]">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Detalle de Productos</h3>

                            <div className="space-y-4">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-300 italic text-sm">
                                        <ShoppingBag size={48} className="mb-4 opacity-20" />
                                        <p>No hay productos agregados</p>
                                    </div>
                                ) : (
                                    items.map(item => (
                                        <div key={item.id} className="group bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                                            <button
                                                onClick={() => eliminarItem(item.id)}
                                                className="absolute -top-2 -right-2 bg-white text-slate-300 hover:text-red-500 p-2 rounded-xl shadow-sm border border-slate-100 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-black text-slate-800 text-xs uppercase">{item.nombre}</p>
                                                    <p className="text-[10px] font-bold text-indigo-500">{item.codigo}</p>
                                                </div>
                                                <p className="font-black text-slate-800 text-sm italic">S/ {item.subtotal.toFixed(2)}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {item.tallas.map(t => (
                                                    <span key={t.talla} className="text-[9px] font-black bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                                                        T{t.talla}: {t.cantidad}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style jsx global>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>
        </div>
    );
}