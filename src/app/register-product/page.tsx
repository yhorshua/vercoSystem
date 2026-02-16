'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
    PackagePlus,
    Box,
    Tag,
    DollarSign,
    Layers,
    Plus,
    Trash2,
    Save,
    ListPlus,
    Wand2,
    X
} from 'lucide-react';

import { CreateProductDto } from './CreateProductDto';
import { createProduct } from '../services/productsService';
import { getCategories } from '../services/categoryService';
import { useUser } from '../context/UserContext';
import styles from './register.module.css';

export default function CreateProductPage() {
    const { user } = useUser();

    // Estados del Formulario
    const [articleCode, setArticleCode] = useState('');
    const [articleDescription, setArticleDescription] = useState('');
    const [articleSeries, setArticleSeries] = useState('');
    const [typeOrigin, setTypeOrigin] = useState('');
    const [manufacturingCost, setManufacturingCost] = useState<number>(0); // En UI: Precio Venta
    const [unitPrice, setUnitPrice] = useState<number>(0); // En UI: Precio Unitario
    const [sellingPrice, setSellingPrice] = useState<number>(0); // No usado en UI, pero requerido en DTO
    const [brandName, setBrandName] = useState('');
    const [modelCode, setModelCode] = useState('');
    const [categoryId, setCategoryId] = useState<number>(0);
    const [materialType, setMaterialType] = useState('');
    const [color, setColor] = useState('');
    const [stockMinimum, setStockMinimum] = useState<number>(0);
    const [productImage, setProductImage] = useState('');

    // Estados para Tallas
    const [sizes, setSizes] = useState<string[]>([]);
    const [newSize, setNewSize] = useState('');
    const [isShoeCategory, setIsShoeCategory] = useState<boolean>(false);
    const [sizeRange, setSizeRange] = useState<{ min: number, max: number } | null>(null);
    const [lotPair, setLotPair] = useState<number>(0);

    // Estados de Datos
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<CreateProductDto[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchCategories = async () => {
            if (user?.token) {
                try {
                    const categoriesData = await getCategories(user.token);
                    setCategories(categoriesData);
                } catch (error) {
                    console.error('Error al cargar categorías', error);
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las categorías.' });
                }
            }
        };
        fetchCategories();
    }, [user]);

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCategoryId = Number(e.target.value);
        setCategoryId(selectedCategoryId);
        setIsShoeCategory(selectedCategoryId === 1);
        setArticleSeries('');
        setSizeRange(null);
    };

    const handleSeriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setArticleSeries(val);
        if (val === '3') setSizeRange({ min: 27, max: 32 });
        else if (val === '4') setSizeRange({ min: 33, max: 39 });
        else if (val === '5') setSizeRange({ min: 38, max: 44 });
        else if (val === '8') setSizeRange({ min: 37, max: 44 });
        else setSizeRange(null);
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'unitPrice' | 'manufacturingCost') => {
        let value = e.target.value.replace(/[^0-9.]/g, '');
        const pointCount = (value.match(/\./g) || []).length;
        if (pointCount > 1) return;

        const parsedValue = parseFloat(value);
        if (!isNaN(parsedValue)) {
            if (field === 'unitPrice') setUnitPrice(parsedValue);
            else if (field === 'manufacturingCost') setManufacturingCost(parsedValue);
        } else if (value === '') {
            if (field === 'unitPrice') setUnitPrice(0);
            else if (field === 'manufacturingCost') setManufacturingCost(0);
        }
    };

    const handleAddSize = () => {
        const trimmedSize = newSize.trim();
        if (trimmedSize && !sizes.includes(trimmedSize)) {
            if (isShoeCategory && sizeRange) {
                const sizeNumber = parseInt(trimmedSize);
                if (sizeNumber < sizeRange.min || sizeNumber > sizeRange.max) {
                    Swal.fire({ icon: 'warning', text: `Talla fuera de rango (${sizeRange.min} - ${sizeRange.max})` });
                    return;
                }
            }
            setSizes((prev) => [...prev, trimmedSize]);
            setNewSize('');
        }
    };

    const handleAutoAddSizes = () => {
        if (sizeRange) {
            const sizesToAdd: string[] = [];
            for (let i = sizeRange.min; i <= sizeRange.max; i++) {
                sizesToAdd.push(i.toString());
            }
            // Merge unique sizes
            setSizes((prev) => Array.from(new Set([...prev, ...sizesToAdd])).sort((a, b) => Number(a) - Number(b)));
        }
    };

    const handleRemoveSize = (sizeToRemove: string) => {
        setSizes((prev) => prev.filter((s) => s !== sizeToRemove));
    };

    const addProductToTable = () => {
        if (!articleCode || !articleDescription || !categoryId || sizes.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Verifica código, descripción, categoría y tallas.' });
            return;
        }

        const newProduct: CreateProductDto = {
            article_code: articleCode,
            article_description: articleDescription,
            article_series: articleSeries,
            type_origin: typeOrigin,
            manufacturing_cost: manufacturingCost, // Mapeado a "Precio Venta" por lógica de usuario original
            unit_price: unitPrice,                 // Mapeado a "Precio Unitario"
            selling_price: sellingPrice,
            brand_name: brandName,
            model_code: modelCode,
            categoryId,
            material_type: materialType,
            color,
            stock_minimum: stockMinimum,
            product_image: productImage,
            sizes,
            lot_pair: lotPair,
        };

        setProducts((prev) => [...prev, newProduct]);
        clearFields();
        Swal.fire({ icon: 'success', title: 'Agregado', text: 'Producto listo para registrar.', timer: 1500, showConfirmButton: false });
    };

    const clearFields = () => {
        setArticleCode('');
        setArticleDescription('');
        setArticleSeries('');
        setTypeOrigin('');
        setManufacturingCost(0);
        setUnitPrice(0);
        setSellingPrice(0);
        setBrandName('');
        setModelCode('');
        // No reseteamos categoryId para agilizar la carga masiva de una misma categoria
        // setCategoryId(0); 
        setMaterialType('');
        setColor('');
        setStockMinimum(0);
        setProductImage('');
        setSizes([]);
        setLotPair(0);
        setNewSize('');
    };

    const handleSubmit = async () => {
        if (products.length === 0) return;

        if (!user?.token) {
            Swal.fire({
                icon: 'error',
                title: 'Token no disponible',
                text: 'No se pudo realizar la acción porque no se encuentra el token.'
            });
            return;
        }
        setLoading(true);
        try {
            await createProduct(products, user?.token);
            Swal.fire({
                icon: 'success',
                title: '¡Productos Creados!',
                text: `${products.length} productos registrados exitosamente.`
            });
            setProducts([]);
        } catch (error: any) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un error al crear los productos.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = (index: number) => {
        setProducts((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <PackagePlus size={32} color="#0f172a" />
                <h1 className={styles.title}>Crear Producto</h1>
            </div>

            {/* FORMULARIO */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>
                    <Box size={20} /> Información General
                </h2>

                <div className={styles.formGrid}>
                    {/* COLUMNA 1 */}
                    <div className={styles.field}>
                        <label className={styles.label}>Código de Artículo</label>
                        <input
                            className={styles.input}
                            value={articleCode}
                            onChange={(e) => setArticleCode(e.target.value)}
                            placeholder="Ej. ABC-123"
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Descripción</label>
                        <input
                            className={styles.input}
                            value={articleDescription}
                            onChange={(e) => setArticleDescription(e.target.value)}
                            placeholder="Nombre del producto"
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Categoría</label>
                        <select className={styles.select} value={categoryId} onChange={handleCategoryChange}>
                            <option value="0">Seleccionar...</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {isShoeCategory && (
                        <div className={styles.field}>
                            <label className={styles.label}>Serie</label>
                            <input
                                className={styles.input}
                                value={articleSeries}
                                onChange={handleSeriesChange}
                                placeholder="Ej. 3, 4, 5"
                            />
                        </div>
                    )}

                    <div className={styles.field}>
                        <label className={styles.label}>Origen</label>
                        <select className={styles.select} value={typeOrigin} onChange={(e) => setTypeOrigin(e.target.value)}>
                            <option value="">Seleccionar...</option>
                            <option value="NACIONAL">NACIONAL</option>
                            <option value="IMPORTADO">IMPORTADO</option>
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Marca</label>
                        <input
                            className={styles.input}
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="Opcional"
                        />
                    </div>
                </div>

                <h2 className={styles.cardTitle} style={{ marginTop: '2rem' }}>
                    <DollarSign size={20} /> Precios
                </h2>

                <div className={styles.formGrid}>
                    <div className={styles.field}>
                        <label className={styles.label}>Precio Unitario (Costo)</label>
                        <div className={styles.inputGroup}>
                            <DollarSign size={16} className={styles.inputIcon} />
                            <input
                                className={`${styles.input} ${styles.inputWithIcon}`}
                                type="number"
                                step="0.01"
                                value={unitPrice === 0 ? '' : unitPrice}
                                onChange={(e) => handleCurrencyChange(e, 'unitPrice')}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Precio de Venta</label>
                        <div className={styles.inputGroup}>
                            <DollarSign size={16} className={styles.inputIcon} />
                            <input
                                className={`${styles.input} ${styles.inputWithIcon}`}
                                type="number"
                                step="0.01"
                                value={manufacturingCost === 0 ? '' : manufacturingCost}
                                onChange={(e) => handleCurrencyChange(e, 'manufacturingCost')}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.sizesSection}>
                    <h3 className={styles.label} style={{ fontSize: '1rem', display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                        <Layers size={18} /> Gestión de Tallas
                    </h3>

                    <div className={styles.sizeControls}>
                        <input
                            className={styles.sizeInput}
                            value={newSize}
                            onChange={(e) => setNewSize(e.target.value)}
                            placeholder="Talla"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSize()}
                        />
                        <button type="button" onClick={handleAddSize} className={styles.btnAddSize}>
                            <Plus size={16} style={{ display: 'inline', marginRight: 4 }} /> Agregar
                        </button>

                        {isShoeCategory && sizeRange && (
                            <button type="button" onClick={handleAutoAddSizes} className={`${styles.btnAddSize} ${styles.btnAuto}`}>
                                <Wand2 size={16} style={{ display: 'inline', marginRight: 4 }} />
                                Rango Automático ({sizeRange.min}-{sizeRange.max})
                            </button>
                        )}
                    </div>

                    {sizes.length > 0 ? (
                        <div className={styles.sizeList}>
                            {sizes.map((s) => (
                                <div key={s} className={styles.sizeTag}>
                                    {s}
                                    <button type="button" onClick={() => handleRemoveSize(s)} className={styles.removeSizeBtn}>
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No has agregado tallas aún.
                        </p>
                    )}
                </div>

                <button type="button" onClick={addProductToTable} className={styles.btnAddToTable}>
                    <ListPlus size={20} /> Agregar Producto a la Lista
                </button>
            </div>

            {/* TABLA DE PRE-REGISTRO */}
            {products.length > 0 && (
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <Tag size={20} /> Productos a Registrar ({products.length})
                    </h2>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Descripción</th>
                                    <th>Serie</th>
                                    <th>Tallas</th>
                                    <th>P. Venta</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p, idx) => (
                                    <tr key={idx}>
                                        <td>{p.article_code.toUpperCase()}</td>
                                        <td>{p.article_description.toUpperCase()}</td>
                                        <td>{p.article_series || '-'}</td>
                                        <td>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                {p.sizes.join(', ')}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 'bold' }}>S/ {p.manufacturing_cost.toFixed(2)}</td>
                                        <td>
                                            <button
                                                onClick={() => handleDeleteProduct(idx)}
                                                className={styles.btnDelete}
                                                title="Eliminar de la lista"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={styles.btnSubmit}
                    >
                        <Save size={20} /> {loading ? 'Registrando...' : 'Guardar Todo en Base de Datos'}
                    </button>
                </div>
            )}
        </div>
    );
}