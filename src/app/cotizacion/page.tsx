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
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import Swal from 'sweetalert2';
import ClienteModal, { ClienteUI } from '../register-requested/ClienteModal';
import {
    createQuotation,
    QuotationResponse,
} from '../services/quotationService';
import { addCalendarDays, getPeruBusinessDate } from '../utils/dateUtils';
import { resolveUbigeoSelection } from '../utils/ubigeoLookup';


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
    id: number;
    codigo: string;
    nombre: string;
    precioBase: number;
    sizeIdByName: Record<string, number>;
}

interface ItemCotizacion {
    id: string;
    productId: number;
    codigo: string;
    nombre: string;
    precio: number;
    tallas: { talla: string; cantidad: number; productSizeId: number }[];
    totalPares: number;
    descuento: number;
    totalSinDescuento: number;
    subtotal: number;
}

interface PdfRow {
    sku: string;
    description: string;
    unitPrice: number;
    sizesText: string;
    totalQuantity: number;
    subtotal: number;
}

interface PdfData {
    quoteNumber: string;
    date: string;
    cliente: Cliente;
    rows: PdfRow[];
    totalPares: number;
    discountTotal: number;
    total: number;
}

const CLIENTE_INICIAL: Cliente = {
    nombre: '',
    tipoDoc: 'DNI',
    numDoc: '',
    direccion: '',
    departamento: '',
    provincia: '',
    distrito: '',
    telefono: '',
    metodoPago: 'Efectivo',
    agencia: '',
};


export default function CotizadorPage() {


    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [showClienteModal, setShowClienteModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClienteUI | null>(null);
    const [savedQuotation, setSavedQuotation] = useState<QuotationResponse | null>(null);
    const idempotencyKeyRef = useRef<string | null>(null);

    const gradientCacheRef = useRef<string | null>(null);

    const logoCacheRef = useRef<{
        data: string;
        format: 'JPEG' | 'PNG';
    } | null>(null);

    // Estados de Cliente
    const [cliente, setCliente] = useState<Cliente>({
        ...CLIENTE_INICIAL,
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
    const [distId, setDistId] = useState<string>('');

    const applyClientLocation = (selected: ClienteUI) => {
        const location = resolveUbigeoSelection(ubigeo, {
            department: selected.departamento,
            province: selected.provincia,
            district: selected.distrito,
        });

        setDepId(location.departmentId);
        setProvId(location.provinceId);
        setDistId(location.districtId);
        return location;
    };

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
                id: Number(producto.product_id),
                codigo: producto.article_code,
                nombre: producto.article_description,
                precioBase: Number(producto.wholesale_price ?? producto.unit_price ?? producto.price),
                sizeIdByName: Object.fromEntries(
                    (producto.sizes ?? []).map((size: any) => [String(size.size), Number(size.id)]),
                ),
            });

            // 🔥 TALLAS DINÁMICAS DESDE API
            const tallasIniciales: Record<string, number> = {};
            producto.sizes.forEach((s: any) => {
                tallasIniciales[s.size] = 0;
            });

            setSelectedSizes(tallasIniciales);
            setTempPrice(Number(producto.wholesale_price ?? producto.unit_price ?? producto.price));
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

        if (!Number.isFinite(tempPrice) || tempPrice <= 0 || !Number.isFinite(tempDiscount) || tempDiscount < 0 || tempDiscount > tempPrice) {
            void Swal.fire({ icon: 'warning', text: 'Revisa el precio y el descuento por par.' });
            return;
        }

        const tallasFiltradas = Object.entries(selectedSizes)
            .filter(([_, qty]) => qty > 0)
            .map(([talla, cantidad]) => ({
                talla,
                cantidad,
                productSizeId: selectedProduct.sizeIdByName[talla],
            }));

        if (tallasFiltradas.length === 0 || tallasFiltradas.some((size) => !size.productSizeId)) {
            void Swal.fire({ icon: 'error', text: 'No se pudo identificar una de las tallas seleccionadas.' });
            return;
        }
        const duplicate = tallasFiltradas.some((size) =>
            items.some((item) => item.productId === selectedProduct.id && item.tallas.some((current) => current.productSizeId === size.productSizeId)),
        );
        if (duplicate) {
            void Swal.fire({ icon: 'warning', text: 'El mismo producto y talla ya está incluido en la cotización.' });
            return;
        }

        const totalPares = tallasFiltradas.reduce((acc, curr) => acc + curr.cantidad, 0);

        const subtotalSinDescuento = totalPares * tempPrice;
        const precioFinalPorPar = Math.max(0, tempPrice - tempDiscount);

        const subtotal = totalPares * precioFinalPorPar;

        const newItem: ItemCotizacion = {
            id: `${selectedProduct.id}-${Date.now()}`,
            productId: selectedProduct.id,
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
        setSavedQuotation(null);
        idempotencyKeyRef.current = null;
        setSelectedProduct(null);
        setSelectedSizes({});
        setTempDiscount(0);
    };

    const eliminarItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
        setSavedQuotation(null);
        idempotencyKeyRef.current = null;
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

    const guardarPdf = async (
        doc: jsPDF,
        fileName: string
    ): Promise<void> => {
        try {
            if (!Capacitor.isNativePlatform()) {
                doc.save(fileName);
                return;
            }

            const dataUri = doc.output('datauristring');
            const base64Data = dataUri.substring(
                dataUri.indexOf(',') + 1
            );

            if (!base64Data) {
                throw new Error('El contenido del PDF está vacío');
            }

            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
                recursive: true,
            });

            await Share.share({
                title: fileName,
                text: 'Nota de pedido generada desde VERCO',
                files: [result.uri],
                dialogTitle: 'Guardar, abrir o compartir PDF',
            });
        } catch (error) {
            console.error('Error guardando PDF:', error);
            throw new Error('No se pudo guardar o compartir el PDF');
        }
    };

    const waitNextPaint = () => {
        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 80);
            });
        });
    };

    const persistQuotation = async () => {
        if (savedQuotation) return savedQuotation;
        if (!selectedClient) throw new Error('Selecciona un cliente registrado antes de emitir la cotización');
        if (!user?.token || !user.id || !user.warehouse_id) throw new Error('La sesión no es válida');
        if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();

        const response = await createQuotation({
            client_id: selectedClient.id,
            seller_id: user.id,
            warehouse_id: user.warehouse_id,
            idempotency_key: idempotencyKeyRef.current,
            expires_on: addCalendarDays(getPeruBusinessDate(), 7),
            observations: [cliente.metodoPago && `Método de pago propuesto: ${cliente.metodoPago}`, cliente.agencia && `Agencia: ${cliente.agencia}`]
                .filter(Boolean)
                .join(' | ') || undefined,
            items: items.flatMap((item) => item.tallas.map((size) => ({
                product_id: item.productId,
                product_size_id: size.productSizeId,
                quantity: size.cantidad,
                unit_price: item.precio.toFixed(2),
                discount_amount: (item.descuento * size.cantidad).toFixed(2),
                tax_amount: '0.00',
            }))),
        }, user.token);
        setSavedQuotation(response);
        return response;
    };

    const generarPDF = async () => {
        if (items.length === 0 || generatingPdf) return;

        setGeneratingPdf(true);

        try {
            const persisted = await persistQuotation();

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

            const date = String(
                persisted.quotation.business_date,
            );

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
                'FAST',
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
                'FAST',
            );

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);

            const title = 'COTIZACIÓN';
            const titleWidth = doc.getTextWidth(title);

            doc.text(
                title,
                pageWidth - titleWidth - 14,
                22,
            );

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            const dateText = `${persisted.quotation.quote_number} | Fecha: ${date}`;
            const dateWidth = doc.getTextWidth(dateText);

            doc.text(
                dateText,
                pageWidth - dateWidth - 14,
                30,
            );

            doc.setTextColor(50, 50, 50);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');

            doc.text(
                'INFORMACIÓN DEL CLIENTE',
                14,
                55,
            );

            doc.setDrawColor(220, 220, 220);
            doc.line(14, 57, 196, 57);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            doc.text(
                `Cliente: ${cliente.nombre || '---'}`,
                14,
                66,
            );

            doc.text(
                `${cliente.tipoDoc}: ${cliente.numDoc || '---'}`,
                14,
                72,
            );

            doc.text(
                `Teléfono: ${cliente.telefono || '---'}`,
                14,
                78,
            );

            doc.text(
                `Departamento: ${cliente.departamento || '-'}`,
                110,
                66,
            );

            doc.text(
                `Provincia: ${cliente.provincia || '-'}`,
                110,
                72,
            );

            doc.text(
                `Distrito: ${cliente.distrito || '-'}`,
                110,
                78,
            );

            doc.text(
                `Dirección: ${cliente.direccion || '---'}`,
                110,
                84,
            );

            doc.text(
                `Método de Pago: ${cliente.metodoPago || '---'}`,
                14,
                88,
            );

            doc.text(
                `Agencia: ${cliente.agencia || '---'}`,
                110,
                88,
            );

            /*
             * Agrupación únicamente para mostrar el PDF.
             *
             * La información original de persisted.details
             * no se modifica y los servicios tampoco cambian.
             */
            type PdfProductGroup = {
                productKey: string;
                sku: string;
                description: string;
                unitPrice: number;
                sizes: Map<string, number>;
                totalQuantity: number;
                subtotal: number;
            };

            const groupedDetails = new Map<
                string,
                PdfProductGroup
            >();

            persisted.details.forEach((item) => {
                const productKey = String(
                    item.product_id ?? item.sku_snapshot,
                );

                const sizeKey = String(
                    item.size_snapshot ?? '',
                );

                const quantity = Number(
                    item.quantity ?? 0,
                );

                const lineTotal = Number(
                    item.line_total ?? 0,
                );

                const existing = groupedDetails.get(productKey);

                if (!existing) {
                    const sizes = new Map<string, number>();

                    sizes.set(sizeKey, quantity);

                    groupedDetails.set(productKey, {
                        productKey,
                        sku: String(
                            item.sku_snapshot ?? '',
                        ),
                        description: String(
                            item.description_snapshot ?? '',
                        ),
                        unitPrice: Number(
                            item.unit_price ?? 0,
                        ),
                        sizes,
                        totalQuantity: quantity,
                        subtotal: lineTotal,
                    });

                    return;
                }

                const currentSizeQuantity =
                    existing.sizes.get(sizeKey) ?? 0;

                existing.sizes.set(
                    sizeKey,
                    currentSizeQuantity + quantity,
                );

                existing.totalQuantity += quantity;
                existing.subtotal += lineTotal;
            });

            /*
             * Ahora existe una fila por artículo,
             * no una fila por cada talla.
             */
            const tableBody = Array.from(
                groupedDetails.values(),
            ).map((product) => {
                const sizesText = Array.from(
                    product.sizes.entries(),
                )
                    .sort(
                        ([sizeA], [sizeB]) =>
                            Number(sizeA) - Number(sizeB),
                    )
                    .map(
                        ([size, quantity]) =>
                            `T.${size} × ${quantity}`,
                    )
                    .join(' | ');

                return [
                    product.sku,
                    product.description,
                    `S/ ${product.unitPrice.toFixed(2)}`,
                    sizesText,
                    String(product.totalQuantity),
                    `S/ ${product.subtotal.toFixed(2)}`,
                ];
            });

            autoTable(doc, {
                startY: 96,

                head: [[
                    'ARTÍCULO',
                    'DESCRIPCIÓN',
                    'P. UNITARIO',
                    'TALLAS Y CANTIDADES',
                    'PARES',
                    'SUBTOTAL',
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

            const finalY =
                (doc as any).lastAutoTable.finalY + 10;

            doc.setDrawColor(220, 220, 220);
            doc.line(14, finalY, 196, finalY);

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(
                130,
                finalY,
                66,
                35,
                2,
                2,
                'F',
            );

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'normal');

            doc.text(
                'Total Pares:',
                135,
                finalY + 10,
            );

            doc.text(
                `${persisted.details.reduce(
                    (sum, item) =>
                        sum + Number(item.quantity || 0),
                    0,
                )}`,
                190,
                finalY + 10,
                {
                    align: 'right',
                },
            );

            doc.setTextColor(220, 38, 38);

            doc.text(
                'Descuento:',
                135,
                finalY + 18,
            );

            doc.text(
                `- S/ ${Number(
                    persisted.quotation.discount_total || 0,
                ).toFixed(2)}`,
                190,
                finalY + 18,
                {
                    align: 'right',
                },
            );

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');

            doc.text(
                'TOTAL FINAL:',
                135,
                finalY + 28,
            );

            doc.text(
                `S/ ${Number(
                    persisted.quotation.total || 0,
                ).toFixed(2)}`,
                190,
                finalY + 28,
                {
                    align: 'right',
                },
            );

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'normal');

            doc.text(
                'Método de Pago:',
                14,
                finalY + 10,
            );

            doc.text(
                `${cliente.metodoPago || '-'}`,
                60,
                finalY + 10,
            );

            doc.text(
                'Agencia:',
                14,
                finalY + 18,
            );

            doc.text(
                `${cliente.agencia || '-'}`,
                60,
                finalY + 18,
            );

            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);

            doc.text(
                'Esta cotización tiene una validez de 7 días hábiles.',
                14,
                finalY + 40,
            );

            const safeName = cliente.nombre.trim()
                ? cliente.nombre
                    .trim()
                    .replace(/\s+/g, '_')
                : 'Nuevo';

            const fileName =
                `Cotizacion_${persisted.quotation.quote_number}_${safeName}.pdf`;

            await guardarPdf(doc, fileName);

            await Swal.fire({
                icon: 'success',
                title: 'Cotización registrada',
                text: 'La cotización fue registrada correctamente y el PDF fue generado.',
                confirmButtonColor: '#4f46e5',
            });

            limpiarFormularioCotizacion();
        } catch (error) {
            console.error(error);

            await Swal.fire({
                icon: 'error',
                title: 'No se pudo emitir la cotización',
                text:
                    error instanceof Error
                        ? error.message
                        : 'Ocurrió un error inesperado',
                confirmButtonColor: '#4f46e5',
            });
        } finally {
            setGeneratingPdf(false);
        }
    };

    const construirDocumentoPdf = async (data: PdfData): Promise<jsPDF> => {
        const logoImg = await getCompressedLogo();

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true,
            precision: 2,
            putOnlyUsedFonts: true,
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const headerHeight = 40;
        const gradientImg = getGradientHeader(320, 70);

        doc.addImage(gradientImg, 'JPEG', 0, 0, pageWidth, headerHeight, undefined, 'FAST');

        const logoWidth = 50, logoHeight = 20;
        const logoY = (headerHeight - logoHeight) / 2;
        doc.addImage(logoImg.data, logoImg.format, 7, logoY, logoWidth, logoHeight, undefined, 'FAST');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        const title = 'COTIZACIÓN';
        doc.text(title, pageWidth - doc.getTextWidth(title) - 14, 22);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const dateText = `${data.quoteNumber} | Fecha: ${data.date}`;
        doc.text(dateText, pageWidth - doc.getTextWidth(dateText) - 14, 30);

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMACIÓN DEL CLIENTE', 14, 55);
        doc.setDrawColor(220, 220, 220);
        doc.line(14, 57, 196, 57);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Cliente: ${data.cliente.nombre || '---'}`, 14, 66);
        doc.text(`${data.cliente.tipoDoc}: ${data.cliente.numDoc || '---'}`, 14, 72);
        doc.text(`Teléfono: ${data.cliente.telefono || '---'}`, 14, 78);
        doc.text(`Departamento: ${data.cliente.departamento || '-'}`, 110, 66);
        doc.text(`Provincia: ${data.cliente.provincia || '-'}`, 110, 72);
        doc.text(`Distrito: ${data.cliente.distrito || '-'}`, 110, 78);
        doc.text(`Dirección: ${data.cliente.direccion || '---'}`, 110, 84);
        doc.text(`Método de Pago: ${data.cliente.metodoPago || '---'}`, 14, 88);
        doc.text(`Agencia: ${data.cliente.agencia || '---'}`, 110, 88);

        const tableBody = data.rows.map(r => [
            r.sku,
            r.description,
            `S/ ${r.unitPrice.toFixed(2)}`,
            r.sizesText,
            String(r.totalQuantity),
            `S/ ${r.subtotal.toFixed(2)}`,
        ]);

        autoTable(doc, {
            startY: 96,
            head: [['ARTÍCULO', 'DESCRIPCIÓN', 'P. UNITARIO', 'TALLAS Y CANTIDADES', 'PARES', 'SUBTOTAL']],
            body: tableBody,
            theme: 'striped',
            margin: { left: 14, right: 14 },
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 8, cellPadding: 3, valign: 'middle', overflow: 'linebreak' },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', cellWidth: 24 },
                1: { cellWidth: 48 },
                2: { halign: 'right', cellWidth: 24 },
                3: { halign: 'left', cellWidth: 45 },
                4: { halign: 'center', cellWidth: 17 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
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
        doc.text(`${data.totalPares}`, 190, finalY + 10, { align: 'right' });

        doc.setTextColor(220, 38, 38);
        doc.text('Descuento:', 135, finalY + 18);
        doc.text(`- S/ ${data.discountTotal.toFixed(2)}`, 190, finalY + 18, { align: 'right' });

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL FINAL:', 135, finalY + 28);
        doc.text(`S/ ${data.total.toFixed(2)}`, 190, finalY + 28, { align: 'right' });

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        doc.text('Método de Pago:', 14, finalY + 10);
        doc.text(`${data.cliente.metodoPago || '-'}`, 60, finalY + 10);
        doc.text('Agencia:', 14, finalY + 18);
        doc.text(`${data.cliente.agencia || '-'}`, 60, finalY + 18);

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Esta cotización tiene una validez de 7 días hábiles.', 14, finalY + 40);

        return doc;
    };

    const generarPDFRapido = async () => {
        if (items.length === 0 || generatingPdf) return;
        setGeneratingPdf(true);
        try {
            await waitNextPaint();

            const rows: PdfRow[] = items.map(item => ({
                sku: item.codigo,
                description: item.nombre,
                unitPrice: item.precio,
                sizesText: item.tallas.map(t => `T.${t.talla} × ${t.cantidad}`).join(' | '),
                totalQuantity: item.totalPares,
                subtotal: item.subtotal,
            }));

            const doc = await construirDocumentoPdf({
                quoteNumber: 'VISTA PREVIA (SIN REGISTRAR)',
                date: getPeruBusinessDate(),
                cliente,
                rows,
                totalPares: totalGeneralPares,
                discountTotal: totalDescuento,
                total: totalGeneralMonto,
            });

            const safeName = cliente.nombre.trim() ? cliente.nombre.trim().replace(/\s+/g, '_') : 'Nuevo';
            const fileName = `Cotizacion_Preliminar_${safeName}_${Date.now()}.pdf`;
            await guardarPdf(doc, fileName);

            await Swal.fire({ icon: 'success', title: 'PDF generado', text: 'Se generó el PDF sin registrar la cotización.', confirmButtonColor: '#4f46e5' });
            // Nota: a propósito NO se llama limpiarFormularioCotizacion() aquí,
            // porque el usuario puede querer seguir editando y luego sí registrarla.
        } catch (error) {
            await Swal.fire({ icon: 'error', title: 'No se pudo generar el PDF', text: error instanceof Error ? error.message : 'Error inesperado', confirmButtonColor: '#4f46e5' });
        } finally {
            setGeneratingPdf(false);
        }
    };

    const limpiarFormularioCotizacion = () => {
        setSelectedClient(null);
        setSavedQuotation(null);

        setCliente({
            ...CLIENTE_INICIAL,
        });

        setSearch('');
        setSelectedProduct(null);
        setTempPrice(0);
        setSelectedSizes({});
        setItems([]);
        setTempDiscount(0);

        setDepId('');
        setProvId('');
        setDistId('');

        setShowClienteModal(false);

        /*
         * Permite que la siguiente cotización
         * utilice una nueva clave de idempotencia.
         */
        idempotencyKeyRef.current = null;
    };



    return (
        <div className="min-h-screen bg-slate-50 p-3 font-sans sm:p-4 lg:p-8">
            <div className="mx-auto min-w-0 max-w-7xl space-y-6 lg:space-y-8">

                {/* ENCABEZADO */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="break-words text-2xl font-black tracking-tighter text-slate-900 sm:text-3xl">GENERAR COTIZACIÓN</h1>
                        <p className="text-slate-500 font-medium">Crea presupuestos para tus clientes</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            onClick={generarPDFRapido}
                            disabled={items.length === 0 || generatingPdf}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-900 px-4 py-3 font-bold text-slate-900 transition-all hover:bg-slate-100 active:scale-95 disabled:border-slate-300 disabled:text-slate-300 sm:w-auto sm:px-8 sm:py-4"
                        >
                            <Printer size={20} />
                            PDF SIN REGISTRAR
                        </button>

                        <button
                            onClick={generarPDF}
                            disabled={items.length === 0 || !selectedClient || generatingPdf}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition-all hover:bg-indigo-600 active:scale-95 disabled:bg-slate-300 sm:w-auto sm:px-8 sm:py-4"
                        >
                            {generatingPdf ? (<><Loader2 size={20} className="animate-spin" /> GENERANDO PDF...</>) : (<><Printer size={20} /> GENERAR PDF (REGISTRAR)</>)}
                        </button>
                    </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-8">

                    {/* COLUMNA IZQUIERDA: FORMULARIOS */}
                    <div className="min-w-0 space-y-5 lg:col-span-8 lg:space-y-8">

                        {/* 1. DATOS DEL CLIENTE */}
                        <div className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <User size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Datos del Cliente</h2>
                                        {savedQuotation && (
                                            <p className="text-xs font-bold text-emerald-600 mt-1">
                                                Guardada como {savedQuotation.quotation.quote_number}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowClienteModal(true)}
                                    className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 sm:w-auto"
                                >
                                    {selectedClient ? 'CAMBIAR CLIENTE' : 'BUSCAR CLIENTE'}
                                </button>
                            </div>

                            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">

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
                                        placeholder="Nombre del cliente"
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
                                        disabled
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
                                <div className="hidden md:block"></div>

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

                                            setCliente((current) => ({
                                                ...current,
                                                departamento: value ? ubigeo[value].nombre : '',
                                                provincia: '',
                                                distrito: ''
                                            }));
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

                                            setCliente((current) => ({
                                                ...current,
                                                provincia: value ? ubigeo[depId].provincias[value].nombre : '',
                                                distrito: ''
                                            }));
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

                                            setCliente((current) => ({
                                                ...current,
                                                distrito: value ? ubigeo[depId].provincias[provId].distritos[value] : ''
                                            }));
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
                        <div className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
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
                                <div className="min-w-0 animate-in rounded-[2rem] bg-slate-50 p-4 fade-in slide-in-from-top-4 duration-300 sm:p-6">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                        <div className="min-w-0">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Producto Seleccionado</span>
                                            <h3 className="break-words text-xl font-black uppercase tracking-tighter text-slate-800">{selectedProduct.nombre}</h3>
                                        </div>
                                        <div className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:w-auto sm:gap-6 sm:p-4">

                                            {/* PRECIO */}
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">
                                                    Precio (S/)
                                                </span>
                                                <input
                                                    type="number"
                                                    className="w-full min-w-0 rounded-xl bg-slate-100 p-2 text-center font-black text-indigo-600 outline-none sm:w-24"
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
                                                    className="w-full min-w-0 rounded-xl bg-red-50 p-2 text-center font-black text-red-500 outline-none sm:w-24"
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
                    <div className="min-w-0 space-y-6 lg:col-span-4">

                        {/* RESUMEN TOTALES */}
                        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-200 sm:p-8">
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
                                    <p className="break-all text-4xl font-black tracking-tighter sm:text-5xl">S/ {totalGeneralMonto.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* LISTA DE ITEMS */}
                        <div className="min-h-[400px] min-w-0 rounded-[2.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
                                            <div className="mb-2 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="break-words text-xs font-black uppercase text-slate-800">{item.nombre}</p>
                                                    <p className="text-[10px] font-bold text-indigo-500">{item.codigo}</p>
                                                </div>
                                                <p className="shrink-0 text-sm font-black italic text-slate-800">S/ {item.subtotal.toFixed(2)}</p>
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

            {user?.token && (
                <ClienteModal
                    open={showClienteModal}
                    token={user.token}
                    onClose={() => setShowClienteModal(false)}
                    onSelect={(selected) => {
                        const location = applyClientLocation(selected);
                        setSelectedClient(selected);
                        setCliente((current) => ({
                            ...current,
                            nombre: selected.razonSocial,
                            tipoDoc: selected.codigo,
                            numDoc: selected.ruc,
                            direccion: selected.direccion,
                            departamento: location.departmentName,
                            provincia: location.provinceName,
                            distrito: location.districtName,
                            telefono: selected.telefono,
                        }));
                        setSavedQuotation(null);
                        idempotencyKeyRef.current = null;
                        setShowClienteModal(false);
                    }}
                />
            )}

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
