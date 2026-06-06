'use client';

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
    Package,
    Search,
    UploadCloud,
    RefreshCw,
    FileSpreadsheet
} from 'lucide-react';

import {
    importStockExcel
} from '../services/productsService';

import { useUser } from '../context/UserContext';
import { getInventoryByWarehouseAndCategory } from '../services/stockServices';

interface ProductSize {
    id: number;
    size: string;
    lot_pair: number;
}

interface ProductStock {
    stock_id: number;
    product_size_id: number;
    size: string;
    quantity: number;
}

interface Product {
    product_id: number;
    article_code: string;
    article_description: string;
    brand_name: string;
    model_code: string;
    color: string;
    unit_price: number;
    product_image: string;

    sizes: ProductSize[];
    stock: ProductStock[];

    total_stock: number;
}

export default function StockPage() {
    const { user } = useUser();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [stock, setStock] = useState([]);
    const [tallasDisponibles, setTallasDisponibles] = useState([]);
    useEffect(() => {
        if (user?.token && user?.warehouse_id) {
            loadProducts();
        }
    }, [user]);

    const loadProducts = async () => {
        if (!user?.token || !user?.warehouse_id) return;

        try {
            setLoading(true);

            const data = await getInventoryByWarehouseAndCategory(
                user.warehouse_id,
                1,
                user.token,
            );

            setProducts(data);
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (!e.target.files?.length) return;

        setFile(e.target.files[0]);
    };

    const handleImportExcel = async () => {
        if (!file) {
            Swal.fire({
                icon: 'warning',
                title: 'Archivo requerido',
                text: 'Seleccione un archivo Excel'
            });

            return;
        }

        try {
            setUploading(true);

            const result = await importStockExcel(
                file,
                user!.token
            );

            Swal.fire({
                icon: 'success',
                title: 'Stock actualizado',
                text: `Se procesaron ${result.successCount ?? 0} registros`
            });

            setFile(null);

            await loadProducts();

        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
        } finally {
            setUploading(false);
        }
    };

    const filteredProducts = products.filter((p) => {
        const search = searchQuery.toLowerCase();

        return (
            p.article_code.toLowerCase().includes(search) ||
            p.article_description.toLowerCase().includes(search)
        );
    });

    return (
        <div className="max-w-7xl mx-auto p-6">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Package size={24} />
                    Stock de Productos
                </h1>

                <button
                    onClick={loadProducts}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg"
                >
                    <RefreshCw
                        size={16}
                        className={loading ? 'animate-spin' : ''}
                    />
                    Refrescar
                </button>
            </div>

            {/* IMPORTAR EXCEL */}
            <div className="bg-white border rounded-xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3 items-center">

                    <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer">
                        <UploadCloud size={16} />
                        Seleccionar Excel

                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>

                    {file && (
                        <span className="text-sm text-slate-600 flex items-center gap-2">
                            <FileSpreadsheet size={16} />
                            {file.name}
                        </span>
                    )}

                    <button
                        onClick={handleImportExcel}
                        disabled={!file || uploading}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:bg-slate-300"
                    >
                        {uploading
                            ? 'Actualizando...'
                            : 'Actualizar Stock'}
                    </button>

                    <span className="px-3 py-1 text-sm font-semibold bg-green-100 text-green-700 rounded-full">
                        Total Stock:{" "}
                        {filteredProducts.reduce(
                            (acc, p) =>
                                acc + p.stock.reduce((sum, s) => sum + s.quantity, 0),
                            0
                        )}
                    </span>
                </div>
            </div>

            {/* BUSCADOR */}
            <div className="relative mb-6">
                <Search
                    size={16}
                    className="absolute left-3 top-3 text-slate-400"
                />

                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) =>
                        setSearchQuery(e.target.value)
                    }
                    placeholder="Buscar producto..."
                    className="w-full border rounded-lg pl-10 pr-4 py-2"
                />
            </div>

            {/* TABLA */}
            {loading ? (
                <div className="text-center py-10">
                    Cargando productos...
                </div>
            ) : (
                <div className="overflow-auto border rounded-xl">
                    <table className="w-full">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="text-left p-3">
                                    Código
                                </th>
                                <th className="text-left p-3">
                                    Descripción
                                </th>
                                <th className="text-left p-3">
                                    Tallas
                                </th>
                                <th className="text-left p-3">
                                    Stock Total
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredProducts.map((product) => {

                                return (
                                    <tr
                                        key={product.article_code}
                                        className="border-t"
                                    >
                                        <td className="p-3 font-medium">
                                            {product.article_code}
                                        </td>

                                        <td className="p-3">
                                            {
                                                product.article_description
                                            }
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1">
                                                {product.stock.map((item) => (
                                                    <span
                                                        key={item.stock_id}
                                                        className="px-2 py-1 text-xs rounded bg-slate-100"
                                                    >
                                                        {item.size}: {item.quantity}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>

                                        <td className="p-3">
                                            {product.total_stock}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

