'use client';

import React, { useState, useEffect } from 'react';
import { CreateProductDto } from './CreateProductDto';
import { createProduct } from '../services/productsService';
import { getCategories } from '../services/categoryService';
import { useUser } from '../context/UserContext';
import styles from './register.module.css';

export default function CreateProductPage() {
    const [articleCode, setArticleCode] = useState('');
    const [articleDescription, setArticleDescription] = useState('');
    const [articleSeries, setArticleSeries] = useState('');
    const [typeOrigin, setTypeOrigin] = useState('');
    const [manufacturingCost, setManufacturingCost] = useState<number>(0);
    const [unitPrice, setUnitPrice] = useState<number>(0);
    const [sellingPrice, setSellingPrice] = useState<number>(0);
    const [brandName, setBrandName] = useState('');
    const [modelCode, setModelCode] = useState('');
    const [categoryId, setCategoryId] = useState<number>(0);
    const [materialType, setMaterialType] = useState('');
    const [color, setColor] = useState('');
    const [stockMinimum, setStockMinimum] = useState<number>(0);
    const [productImage, setProductImage] = useState('');
    const [sizes, setSizes] = useState<string[]>([]); // Array de tallas
    const [lotPair, setLotPair] = useState<number>(0);
    const [categories, setCategories] = useState<any[]>([]); // Este estado lo usamos para cargar las categorías de un API
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [newSize, setNewSize] = useState(''); // Estado para manejar el input de talla
    const [isShoeCategory, setIsShoeCategory] = useState<boolean>(false); // Estado para verificar si la categoría es zapatillas
    const [sizeRange, setSizeRange] = useState<{ min: number, max: number } | null>(null); // Estado para guardar el rango de tallas basado en la serie seleccionada
    const { user } = useUser(); // Acceder al contexto del usuario para obtener el token

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                if (user?.token) {
                    const categoriesData = await getCategories(user.token); // Llamada al servicio para obtener categorías usando el token
                    setCategories(categoriesData);
                } else {
                    setError('Token no disponible');
                }
            } catch (error) {
                console.error('Error al cargar categorías', error);
                setError('No se pudo cargar las categorías');
            }
        };

        fetchCategories();
    }, [user]);
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCategoryId = Number(e.target.value);
        setCategoryId(selectedCategoryId);  // Ahora categoryId será siempre un número
        setIsShoeCategory(selectedCategoryId === 1);  // Verificar si la categoría seleccionada es "Zapatillas"
        setArticleSeries('');  // Limpiar el campo de serie
        setSizeRange(null);  // Limpiar el rango de tallas
    };

    const handleSeriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setArticleSeries(e.target.value);
        // Validar la serie y establecer el rango de tallas correspondiente
        if (e.target.value === '3') {
            setSizeRange({ min: 27, max: 32 });
        } else if (e.target.value === '4') {
            setSizeRange({ min: 33, max: 37 });
        } else if (e.target.value === '5') {
            setSizeRange({ min: 38, max: 44 });
        } else if (e.target.value === '8') {
            setSizeRange({ min: 37, max: 44 });
        } else {
            setSizeRange(null); // Si la serie no es una zapatilla, limpiar el rango de tallas
        }
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'unitPrice' | 'sellingPrice') => {
        // Limpiar el valor de la entrada para que solo contenga números y el punto como separador decimal
        let value = e.target.value.replace('S/. ', '').replace(/[^0-9.]/g, '').trim();  // Elimina el símbolo "S/." y cualquier otro carácter no numérico

        // Permitir un solo punto decimal
        const pointCount = (value.match(/\./g) || []).length;
        if (pointCount > 1) {
            return;  // Si ya hay más de un punto decimal, no permite más
        }

        // Convertir el valor a número flotante
        if (!isNaN(parseFloat(value))) {
            const parsedValue = parseFloat(value);
            if (field === 'unitPrice') {
                setUnitPrice(parsedValue);  // Actualiza el estado para Precio Unitario
            } else if (field === 'sellingPrice') {
                setSellingPrice(parsedValue);  // Actualiza el estado para Precio de Venta
            }
        }
    };

    const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewSize(e.target.value.trim()); // Actualizar el estado de la nueva talla
    };

    const handleAutoAddSizes = () => {
        if (sizeRange) {
            const sizesToAdd = [];
            for (let i = sizeRange.min; i <= sizeRange.max; i++) {
                sizesToAdd.push(i.toString());
            }
            setSizes(sizesToAdd);
        }
    };

    const handleAddSize = () => {
        if (newSize && !sizes.includes(newSize)) {
            // Si la categoría es zapatillas, validamos la talla dentro del rango permitido
            if (isShoeCategory && sizeRange) {
                const sizeNumber = parseInt(newSize);
                if (sizeNumber < sizeRange.min || sizeNumber > sizeRange.max) {
                    setError(`Talla fuera de rango. El rango permitido es de ${sizeRange.min} a ${sizeRange.max}`);
                    return;
                }
            }
            setSizes((prevSizes) => [...prevSizes, newSize]); // Agregar la talla al array de tallas
            setNewSize(''); // Limpiar el input después de agregar
        }
    };

    const handleRemoveSize = (size: string) => {
        setSizes((prevSizes) => prevSizes.filter((item) => item !== size)); // Eliminar la talla
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData: CreateProductDto = {
            article_code: articleCode,
            article_description: articleDescription,
            article_series: articleSeries,
            type_origin: typeOrigin,
            manufacturing_cost: manufacturingCost,
            unit_price: unitPrice,
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

        try {
            const response = await createProduct(formData); // Crear producto usando el servicio
            console.log('Producto creado:', response);
            alert('Producto creado con éxito');
        } catch (error: any) {
            console.error('Error al crear el producto:', error);
            setError('Hubo un error al crear el producto. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Crear Producto</h1>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.row}>
                    <div className={styles.column}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Código de Artículo</label>
                            <input
                                className={styles.inputField}
                                type="text"
                                value={articleCode}
                                onChange={(e) => setArticleCode(e.target.value)}
                                required
                            />
                        </div>

                        {/* Mostrar solo el campo Serie si la categoría es "Zapatillas" */}
                        {isShoeCategory && (
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Serie</label>
                                <input
                                    className={styles.inputField}
                                    type="text"
                                    value={articleSeries}
                                    onChange={handleSeriesChange}
                                    required
                                />
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Origen</label>
                            <select
                                className={styles.inputField}
                                value={typeOrigin}
                                onChange={(e) => setTypeOrigin(e.target.value)}
                                required
                            >
                                <option value="">Seleccionar Origen</option>
                                <option value="NACIONAL">NACIONAL</option>
                                <option value="IMPORTADO">IMPORTADO</option>
                            </select>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Categoría</label>
                            <select
                                className={styles.inputField}
                                value={categoryId}
                                onChange={handleCategoryChange}
                            >
                                <option value="">Seleccionar Categoría</option>  {/* Opción predeterminada */}
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>

                    <div className={styles.column}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Descripción</label>
                            <input
                                className={styles.inputField}
                                type="text"
                                value={articleDescription}
                                onChange={(e) => setArticleDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Precio Unitario</label>
                            <div className={styles.inputWithCurrency}>
                                <input
                                    className={styles.inputField}
                                    type="text"
                                    value={`S/. ${unitPrice.toFixed(2)}`}  // Asegura que se muestren siempre dos decimales
                                    onChange={(e) => handleCurrencyChange(e, 'unitPrice')}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Precio de Venta</label>
                            <div className={styles.inputWithCurrency}>
                                <input
                                    className={styles.inputField}
                                    type="text"
                                    value={`S/. ${sellingPrice.toFixed(2)}`}  // Asegura que se muestren siempre dos decimales
                                    onChange={(e) => handleCurrencyChange(e, 'sellingPrice')}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Marca</label>
                            <input
                                className={styles.inputField}
                                type="text"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Tallas</label>
                    <div className={styles.sizeInputWrapper}>
                        {/* Mostrar el campo de tallas dependiendo de la categoría */}
                        {(isShoeCategory || !isShoeCategory) && (
                            <input
                                className={styles.inputField}
                                type="text"
                                value={newSize}
                                onChange={handleSizeChange}
                                placeholder="Ingrese talla"
                            />
                        )}

                        <button
                            type="button"
                            onClick={handleAddSize}
                            className={styles.addSizeButton}
                            disabled={!newSize}  // Habilitar solo si hay un valor en el input
                        >
                            Agregar Talla
                        </button>

                        {isShoeCategory && sizeRange && (
                            <button
                                type="button"
                                onClick={handleAutoAddSizes}
                                className={styles.addSizeButton}
                            >
                                Agregar Tallas Automáticas
                            </button>
                        )}
                    </div>

                    <div className={styles.sizeList}>
                        {sizes.map((size) => (
                            <div key={size} className={styles.sizeItem}>
                                {size}{' '}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveSize(size)}
                                    className={styles.removeSizeButton}
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.submitGroup}>
                    <button type="submit" disabled={loading} className={styles.submitButton}>
                        {loading ? 'Cargando...' : 'Crear Producto'}
                    </button>
                </div>
            </form>
        </div>
    );
}
