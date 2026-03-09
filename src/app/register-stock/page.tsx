'use client';

import { useState } from 'react';
import { useReactTable, createColumnHelper, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import Swal from 'sweetalert2';
import {
  Search,
  PackagePlus,
  Save,
  Box,
  Tag,
  Layers,
  PlusCircle,
  Trash2
} from 'lucide-react';

import { getProductsByCodeOrDescription } from '../services/productsService';
import { registerStockForMultipleItems } from '../services/stockServices';
import { useUser } from '../context/UserContext';

import styles from './page-register.module.css';

interface StockItem {
  product_id: number;
  article_code: string;
  article_description: string;
  article_series: string;
  material_type: string | null;
  color: string;
  stock_minimum: number | null;
  product_image: string | null;
  price: number;
  category: {
    id: number;
    name: string | null;
    description: string | null;
  };
  series: {
    code: string;
    description_serie: string;
    size_from: string;
    size_up: string;
  };
  sizes: {
    size: string;
    id: number;
    quantity: number;
  }[];
}

export default function StockPage() {
  const { user } = useUser();

  const [productData, setProductData] = useState<StockItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [cantidadTallas, setCantidadTallas] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lista de productos listos para registrar
  const [stockData, setStockData] = useState<StockItem[]>([]);

  // Buscar producto
  const handleSearch = async () => {

    if (!user?.token) {
      Swal.fire({
        icon: 'error',
        title: 'Token no disponible',
        text: 'No se pudo realizar la acción porque no se encuentra el token.'
      });
      return;
    }

    if (!searchQuery.trim()) return;
    setLoading(true);
    setProductData(null);
    setCantidadTallas({});

    try {
      const product = await getProductsByCodeOrDescription(searchQuery, user?.token);
      if (product) {
        setProductData(product);
      } else {
        Swal.fire({ icon: 'info', title: 'Sin resultados', text: 'No se encontró el producto.' });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al buscar el producto.' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleCantidadChange = (size: string, value: string) => {
    // Usamos parseInt para asegurar que sea entero desde la entrada
    const num = Math.floor(parseFloat(value));
    if (isNaN(num) || num < 0) return;

    setCantidadTallas((prevState) => ({
      ...prevState,
      [size]: num,
    }));
  };

  // Agregar producto a la tabla temporal
  const addProductToTable = () => {
    if (!productData) return;

    // Verificar si hay cantidades ingresadas
    const totalQty = Object.values(cantidadTallas).reduce((a, b) => a + b, 0);
    if (totalQty === 0) {
      Swal.fire({ icon: 'warning', text: 'Ingresa al menos una cantidad.' });
      return;
    }

    const newProduct: StockItem = {
      ...productData,
      sizes: productData.sizes.map(size => ({
        size: size.size,
        id: size.id,
        // Aseguramos entero con Math.floor
        quantity: Math.floor(cantidadTallas[size.size] || 0),
      })).filter(s => s.quantity > 0), // Solo guardamos tallas con cantidad > 0
    };
    setStockData((prev) => [...prev, newProduct]);
    setProductData(null);
    setSearchQuery('');
    setCantidadTallas({});

    Swal.fire({
      icon: 'success',
      title: 'Agregado',
      text: 'Producto agregado a la lista. Sigue buscando o registra el stock.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleRemoveItem = (index: number) => {
    setStockData((prev) => prev.filter((_, i) => i !== index));
  };

  // Registrar todo en BD
  const handleRegisterStock = async () => {
    const warehouseId = user?.warehouse_id;

    if (isSubmitting) return;

    setIsSubmitting(true);

    if (!warehouseId) {
      Swal.fire({ icon: 'error', text: 'No tienes un almacén asignado.' });
      setIsSubmitting(false);
      return;
    }
    const productsToRegister = stockData.flatMap((item) =>
      item.sizes.map((size) => ({
        productId: item.product_id,
        productSizeId: size.id,
        // Aseguramos entero al generar el payload final
        quantity: Math.floor(size.quantity),
      }))
    );
    try {
      await registerStockForMultipleItems(warehouseId, productsToRegister, user?.token);

      Swal.fire({
        icon: 'success',
        title: '¡Stock Registrado!',
        text: 'El inventario ha sido actualizado correctamente.'
      });

      setStockData([]);
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar el stock.' });
    }finally {
    // Habilitar el botón nuevamente después de que el proceso haya terminado
    setIsSubmitting(false);
  }
  };

  // Renderizado de las tallas (Grid de inputs)
  const renderSizes = () => {
    if (!productData?.sizes || productData.sizes.length === 0) {
      return <p style={{ color: '#64748b' }}>No hay tallas configuradas para este producto.</p>;
    }

    // Ordenar tallas para que sea amigable (numérico si es posible)
    const sortedSizes = [...productData.sizes].sort((a, b) => {
      const na = Number(a.size);
      const nb = Number(b.size);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.size.localeCompare(b.size);
    });

    return (
      <div className={styles.sizesGrid}>
        {sortedSizes.map((size) => (
          <div key={size.id} className={styles.sizeCard}>
            <label className={styles.sizeLabel}>{size.size}</label>
            <input
              type="number"
              value={cantidadTallas[size.size] || ''}
              onChange={(e) => handleCantidadChange(size.size, e.target.value)}
              min="0"
              placeholder="0"
              className={styles.sizeInput}
            />
          </div>
        ))}
      </div>
    );
  };

  // Configuración de la tabla
  const columnHelper = createColumnHelper<StockItem>();
  const columns = [
    columnHelper.accessor('article_code', {
      header: 'Código',
    }),
    columnHelper.accessor('article_description', {
      header: 'Descripción',
    }),
    columnHelper.accessor('article_series', {
      header: 'Serie',
    }),
    columnHelper.accessor('sizes', {
      header: 'Tallas a Ingresar',
      cell: (info) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {info.getValue().map((size) => (
            <span key={size.size} className={styles.sizeTag}>
              {size.size}: {size.quantity}
            </span>
          ))}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acción',
      cell: (info) => (
        <button
          onClick={() => handleRemoveItem(info.row.index)}
          className={styles.deleteButton}
          title="Eliminar"
        >
          <Trash2 size={18} />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: stockData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <PackagePlus size={32} color="#0f172a" />
        <h1 className={styles.title}>Ingreso de Mercadería</h1>
      </div>

      {/* TARJETA 1: BUSCADOR */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Buscar Producto</h2>
        <div className={styles.searchContainer}>
          <div className={styles.inputGroup}>
            <Search className={styles.searchIcon} size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escanear código de barras o escribir código..."
              className={styles.inputSearch}
              autoFocus
            />
          </div>
          <button onClick={handleSearch} className={styles.searchButton} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {loading && <p className={styles.loadingText}>Cargando datos del producto...</p>}
      </div>

      {/* TARJETA 2: DETALLES DEL PRODUCTO (Solo si se encontró) */}
      {productData && (
        <div className={styles.card} style={{ border: '2px solid #bfdbfe' }}>
          <h2 className={styles.cardTitle} style={{ color: '#2563eb' }}>
            <Box size={20} /> Detalles del Producto
          </h2>

          <div className={styles.productGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Código</label>
              <div className={styles.inputDisabled}>{productData.article_code}</div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Descripción</label>
              <div className={styles.inputDisabled}>{productData.article_description}</div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Serie</label>
              <div className={styles.inputDisabled}>{productData.article_series}</div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Categoría</label>
              <div className={styles.inputDisabled}>{productData.category?.name || '-'}</div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Precio Venta</label>
              <div className={styles.inputDisabled}>S/ {Number(productData.price).toFixed(2)}</div>
            </div>
          </div>

          <div className={styles.sizesSection}>
            <h3 className={styles.label} style={{ fontSize: '1rem', display: 'flex', gap: '8px' }}>
              <Layers size={18} /> Ingresar Cantidades por Talla
            </h3>
            {renderSizes()}
          </div>

          <button onClick={addProductToTable} className={styles.addProductBtn}>
            <PlusCircle size={20} /> Agregar a la Lista
          </button>
        </div>
      )}

      {/* TARJETA 3: LISTA DE PRODUCTOS A INGRESAR */}
      {stockData.length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Tag size={20} /> Productos Listos para Registrar ({stockData.length})
          </h2>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Serie</th>
                  <th>Cantidades</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleRegisterStock}
            className={styles.registerStockBtn}
          >
            <Save size={24} /> {isSubmitting ? 'Registrando...' : 'Registrar Ingreso en Almacén'}
          </button>
        </div>
      )}
    </div>
  );
}