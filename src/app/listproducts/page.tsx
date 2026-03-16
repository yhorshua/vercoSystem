'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getProductsWithSizes } from '../services/productsService';
import { getCategories } from '../services/categoryService';
import { Search, Filter, Package, Loader2 } from 'lucide-react';
import styles from './productList.module.css';
import * as XLSX from "xlsx";

interface ProductSize {
    size: string;
    quantity: number;
}

interface ProductItem {
    codigo: string;
    serie: string;
    descripcion: string;
    tallas: Record<string, number>;
    origin: string;
    precio: string;
}

interface Category {
    id: number;
    name: string;
}

export default function ProductList() {
    const { user } = useUser();
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number>(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [allSizes, setAllSizes] = useState<string[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            if (!user?.token) return;
            try {
                const data = await getCategories(user.token);
                setCategories(data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, [user?.token]);

    useEffect(() => {
        const fetchProducts = async () => {
            if (!user?.token || !user?.warehouse_id) return;

            setLoading(true);
            try {
                const data = await getProductsWithSizes(user.token);

                const sizesSet = new Set<string>();
                const mapped = data.map((p: any) => {
                    const tallas: Record<string, number> = {};

                    Object.keys(p.sizes || {}).forEach((size) => {
                        tallas[size] = 1;
                        sizesSet.add(size);
                    });

                    return {
                        codigo: p.article_code,
                        serie: p.series.code,
                        descripcion: p.article_description,
                        tallas,
                        origin: p.type_origin,
                        precio: '0',
                    };
                });

                const sortedSizes = Array.from(sizesSet).sort((a, b) => {
                    const numA = parseFloat(a);
                    const numB = parseFloat(b);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return a.localeCompare(b);
                });

                setAllSizes(sortedSizes);
                setProducts(mapped);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [user?.token, user?.warehouse_id, selectedCategory]);

    const filteredProducts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products;
        return products.filter(p =>
            p.codigo.toLowerCase().includes(q) ||
            p.descripcion.toLowerCase().includes(q)
        );
    }, [products, search]);

    const exportToExcel = () => {
        const data = filteredProducts.map((p) => ({
            Codigo: p.codigo,
            Descripcion: p.descripcion,
            Serie: p.serie,
            Origen: p.origin,
            Tallas: Object.keys(p.tallas).join(", "),
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

        XLSX.writeFile(workbook, "productos.xlsx");
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerCard}>
                <div className={styles.titleRow}>
                    <div className={styles.iconBox}>
                        <Package size={28} color="white" />
                    </div>
                    <h1>Catálogo de Productos</h1>
                </div>
                <p className={styles.subtitle}>Listado de productos y tallas registradas en el sistema.</p>
            </div>

            <div className={styles.filtersCard}>
                <div className={styles.filterGrid}>
                    <div className={styles.inputWrapper}>
                        <Search className={styles.inputIcon} size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={styles.inputField}
                            placeholder="Buscar por código o descripción..."
                        />
                    </div>

                    <div className={styles.selectWrapper}>
                        <Filter className={styles.inputIcon} size={18} />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(Number(e.target.value))}
                            className={styles.selectField}
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
  onClick={exportToExcel}
  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"
>
  Exportar Excel
</button>
                </div>
            </div>

            <div className={styles.tableCard}>
                {loading ? (
                    <div className={styles.loadingOverlay}>
                        <div className={styles.spinner} />
                        <p>Cargando productos...</p>
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Descripción</th>
                                    <th>Origen</th>
                                    <th>Tallas Registradas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((product) => (
                                        <tr key={product.codigo}>
                                            <td>
                                                <span className={styles.codeBadge}>{product.codigo}</span>
                                            </td>
                                            <td>
                                                <div className="font-bold">{product.descripcion}</div>
                                                <div className="text-xs text-slate-500">Serie: {product.serie}</div>
                                            </td>
                                            <td>{product.origin}</td>
                                            <td>
                                                <div className={styles.sizeGrid}>
                                                    {allSizes
                                                        .filter(size => product.tallas[size] !== undefined)
                                                        .map(size => (
                                                            <div key={size} className={styles.simpleSizeBadge}>
                                                                {size}
                                                            </div>
                                                        ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-400">
                                            No se encontraron productos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
