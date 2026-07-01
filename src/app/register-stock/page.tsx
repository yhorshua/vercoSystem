'use client';

import { useState } from 'react';
import {
  useReactTable,
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';

import Swal from 'sweetalert2';

import {
  Search,
  PackagePlus,
  Save,
  Box,
  Tag,
  Layers,
  PlusCircle,
  Trash2,
  FileText,
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

  const [guideNumber, setGuideNumber] = useState('');

  const [productData, setProductData] = useState<StockItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [cantidadTallas, setCantidadTallas] = useState<{
    [key: string]: number;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [stockData, setStockData] = useState<StockItem[]>([]);

  // ===============================
  // BUSCAR PRODUCTO
  // ===============================
  const handleSearch = async () => {
    if (!user?.token) {
      Swal.fire({
        icon: 'error',
        title: 'Token no disponible',
        text: 'No se pudo realizar la acción porque no se encuentra el token.',
      });
      return;
    }

    if (!searchQuery.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Ingresa un código o descripción para buscar.',
      });
      return;
    }

    setLoading(true);
    setProductData(null);
    setCantidadTallas({});

    try {
      const product = await getProductsByCodeOrDescription(
        searchQuery.trim(),
        user.token,
      );

      if (product) {
        setProductData(product);
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Sin resultados',
          text: 'No se encontró el producto.',
        });
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al buscar el producto.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // ===============================
  // CAMBIAR CANTIDAD POR TALLA
  // ===============================
  const handleCantidadChange = (size: string, value: string) => {
    const num = Math.floor(Number(value));

    if (Number.isNaN(num) || num < 0) {
      return;
    }

    setCantidadTallas((prevState) => ({
      ...prevState,
      [size]: num,
    }));
  };

  // ===============================
  // AGREGAR PRODUCTO A TABLA TEMPORAL
  // ===============================
  const addProductToTable = () => {
    if (!productData) return;

    const totalQty = Object.values(cantidadTallas).reduce(
      (acc, qty) => acc + Number(qty || 0),
      0,
    );

    if (totalQty === 0) {
      Swal.fire({
        icon: 'warning',
        text: 'Ingresa al menos una cantidad.',
      });
      return;
    }

    const newProduct: StockItem = {
      ...productData,
      sizes: productData.sizes
        .map((size) => ({
          size: size.size,
          id: size.id,
          quantity: Math.floor(Number(cantidadTallas[size.size] || 0)),
        }))
        .filter((s) => s.quantity > 0),
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
      showConfirmButton: false,
    });
  };

  const handleRemoveItem = (index: number) => {
    setStockData((prev) => prev.filter((_, i) => i !== index));
  };

  // ===============================
  // REGISTRAR STOCK
  // ===============================
  const handleRegisterStock = async () => {
    if (isSubmitting) return;

    const warehouseId = user?.warehouse_id;
    const token = user?.token;

    if (!token) {
      Swal.fire({
        icon: 'error',
        title: 'Token no disponible',
        text: 'No se pudo realizar la acción porque no se encuentra el token.',
      });
      return;
    }

    if (!warehouseId) {
      Swal.fire({
        icon: 'error',
        text: 'No tienes un almacén asignado.',
      });
      return;
    }

    if (!guideNumber.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Guía interna requerida',
        text: 'Debes ingresar el número de guía interna antes de registrar el stock.',
      });
      return;
    }

    const guideText = guideNumber.trim().toUpperCase();
    const guideId = extractGuideNumber(guideText);

    if (stockData.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin productos',
        text: 'Agrega al menos un producto para registrar el ingreso.',
      });
      return;
    }

    const productsToRegister = stockData.flatMap((item) =>
      item.sizes.map((size) => ({
        productId: item.product_id,
        productSizeId: size.id,
        quantity: Math.floor(Number(size.quantity || 0)),
      })),
    );

    const productsValidos = productsToRegister.filter(
      (item) => item.quantity > 0,
    );

    if (productsValidos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Cantidades inválidas',
        text: 'No hay cantidades válidas para registrar.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await registerStockForMultipleItems(
        {
          warehouseId: Number(warehouseId),
          guideNumber: guideNumber.trim().toUpperCase(),
          guideId: guideId,
          products: productsValidos,
        },
        token,
      );

      Swal.fire({
        icon: 'success',
        title: '¡Stock Registrado!',
        text: 'El inventario ha sido actualizado correctamente y quedó registrado en el historial.',
      });

      setStockData([]);
      setGuideNumber('');
      setProductData(null);
      setSearchQuery('');
      setCantidadTallas({});
    } catch (error: any) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.message || 'No se pudo registrar el stock.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===============================
  // RENDER TALLAS
  // ===============================
  const renderSizes = () => {
    if (!productData?.sizes || productData.sizes.length === 0) {
      return (
        <p style={{ color: '#64748b' }}>
          No hay tallas configuradas para este producto.
        </p>
      );
    }

    const sortedSizes = [...productData.sizes].sort((a, b) => {
      const na = Number(a.size);
      const nb = Number(b.size);

      if (!Number.isNaN(na) && !Number.isNaN(nb)) {
        return na - nb;
      }

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
              onChange={(e) =>
                handleCantidadChange(size.size, e.target.value)
              }
              min="0"
              placeholder="0"
              className={styles.sizeInput}
              disabled={isSubmitting}
            />
          </div>
        ))}
      </div>
    );
  };

  // ===============================
  // TABLA
  // ===============================
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
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
          }}
        >
          {info.getValue().map((size) => (
            <span key={size.id} className={styles.sizeTag}>
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
          disabled={isSubmitting}
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

  function extractGuideNumber(value: string): number | null {
    const onlyNumbers = value.replace(/\D/g, '');

    if (!onlyNumbers) return null;

    return Number(onlyNumbers);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <PackagePlus size={32} color="#0f172a" />
        <h1 className={styles.title}>Ingreso de Mercadería</h1>
      </div>

      {/* TARJETA 1: GUÍA INTERNA */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <FileText size={20} /> Guía Interna
        </h2>

        <div className={styles.productGrid}>
          <div
            className={styles.fieldGroup}
            style={{
              gridColumn: '1 / -1',
            }}
          >

            <input
              type="text"
              value={guideNumber}
              onChange={(e) => setGuideNumber(e.target.value)}
              placeholder="Ejemplo: GI-000155"
              className={styles.inputSearch}
              disabled={isSubmitting}
            />

            <small style={{ color: '#64748b', marginTop: '6px' }}>
              Ingrese el número de guía interna.
            </small>
          </div>
        </div>
      </div>

      {/* TARJETA 2: BUSCADOR */}
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
              disabled={isSubmitting}
            />
          </div>

          <button
            onClick={handleSearch}
            className={styles.searchButton}
            disabled={loading || isSubmitting}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {loading && (
          <p className={styles.loadingText}>
            Cargando datos del producto...
          </p>
        )}
      </div>

      {/* TARJETA 3: DETALLES DEL PRODUCTO */}
      {productData && (
        <div className={styles.card} style={{ border: '2px solid #bfdbfe' }}>
          <h2 className={styles.cardTitle} style={{ color: '#2563eb' }}>
            <Box size={20} /> Detalles del Producto
          </h2>

          <div className={styles.productGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Código</label>
              <div className={styles.inputDisabled}>
                {productData.article_code}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Descripción</label>
              <div className={styles.inputDisabled}>
                {productData.article_description}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Serie</label>
              <div className={styles.inputDisabled}>
                {productData.article_series}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Categoría</label>
              <div className={styles.inputDisabled}>
                {productData.category?.name || '-'}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Precio Venta</label>
              <div className={styles.inputDisabled}>
                S/ {Number(productData.price || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className={styles.sizesSection}>
            <h3
              className={styles.label}
              style={{
                fontSize: '1rem',
                display: 'flex',
                gap: '8px',
              }}
            >
              <Layers size={18} /> Ingresar Cantidades por Talla
            </h3>

            {renderSizes()}
          </div>

          <button
            onClick={addProductToTable}
            className={styles.addProductBtn}
            disabled={isSubmitting}
          >
            <PlusCircle size={20} /> Agregar a la Lista
          </button>
        </div>
      )}

      {/* TARJETA 4: LISTA DE PRODUCTOS A INGRESAR */}
      {stockData.length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Tag size={20} /> Productos Listos para Registrar (
            {stockData.length})
          </h2>

          <div
            style={{
              marginBottom: '12px',
              color: '#475569',
              fontWeight: 600,
            }}
          >
            Guía interna:{' '}
            <span style={{ color: '#0f172a' }}>
              {guideNumber.trim() || 'Pendiente de ingresar'}
            </span>
          </div>

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
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleRegisterStock}
            className={styles.registerStockBtn}
            disabled={isSubmitting || !guideNumber.trim()}
          >
            <Save size={24} />{' '}
            {isSubmitting
              ? 'Registrando...'
              : 'Registrar Ingreso en Almacén'}
          </button>
        </div>
      )}
    </div>
  );
}