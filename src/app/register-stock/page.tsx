'use client';

import { useMemo, useState } from 'react';
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
  Boxes,
} from 'lucide-react';

import { getProductsByCodeOrDescription } from '../services/productsService';
import { registerStockForMultipleItems } from '../services/stockServices';
import { useUser } from '../context/UserContext';
import { generateLabelsPDF } from '../utils/generateLabels';
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

  const stockSummary = useMemo(() => {
    const sizeTotals = new Map<string, number>();
    let totalPairs = 0;
    let estimatedValue = 0;
    let sizeLines = 0;

    stockData.forEach((product) => {
      product.sizes.forEach((size) => {
        const quantity = Math.max(0, Math.floor(Number(size.quantity || 0)));
        if (!quantity) return;

        totalPairs += quantity;
        estimatedValue += quantity * Number(product.price || 0);
        sizeLines += 1;
        sizeTotals.set(
          size.size,
          (sizeTotals.get(size.size) || 0) + quantity,
        );
      });
    });

    return {
      productCount: stockData.length,
      sizeLines,
      totalPairs,
      estimatedValue,
      sizeTotals: Array.from(sizeTotals.entries()).sort(([a], [b]) =>
        a.localeCompare(b, 'es', { numeric: true }),
      ),
    };
  }, [stockData]);

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

    setStockData((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product_id === newProduct.product_id,
      );

      if (existingIndex < 0) return [...prev, newProduct];

      const next = [...prev];
      const existing = next[existingIndex];
      const quantitiesBySizeId = new Map(
        existing.sizes.map((size) => [size.id, Number(size.quantity || 0)]),
      );

      newProduct.sizes.forEach((size) => {
        quantitiesBySizeId.set(
          size.id,
          (quantitiesBySizeId.get(size.id) || 0) + Number(size.quantity || 0),
        );
      });

      next[existingIndex] = {
        ...existing,
        sizes: productData.sizes
          .map((size) => ({
            ...size,
            quantity: quantitiesBySizeId.get(size.id) || 0,
          }))
          .filter((size) => size.quantity > 0),
      };

      return next;
    });
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
  // GENERAR ETIQUETAS
  // ===============================

  const handleGenerateLabels = () => {

    const labels: any[] = [];

    stockData.forEach((product) => {
      product.sizes.forEach((size) => {
        const cantidad = Number(size.quantity || 0);
        if (cantidad > 0) {
          for (let i = 0; i < cantidad; i++) {
            labels.push({
              codigo: product.article_code,
              talla: size.size

            });
          }
        }
      });
    });

    if (labels.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin etiquetas',

        text: 'No existen cantidades para generar etiquetas.'

      });
      return;
    }

    generateLabelsPDF(labels);
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
      id: 'total_pairs',
      header: 'Total Pares',
      cell: (info) => (
        <strong className={styles.totalCell}>
          {info.row.original.sizes.reduce(
            (total, size) => total + Number(size.quantity || 0),
            0,
          )}
        </strong>
      ),
    }),

    columnHelper.display({
      id: 'estimated_value',
      header: 'Valor Referencial',
      cell: (info) => {
        const totalPairs = info.row.original.sizes.reduce(
          (total, size) => total + Number(size.quantity || 0),
          0,
        );

        return (
          <strong className={styles.moneyCell}>
            S/ {(totalPairs * Number(info.row.original.price || 0)).toFixed(2)}
          </strong>
        );
      },
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

          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span>Productos</span>
              <strong>{stockSummary.productCount}</strong>
            </div>

            <div className={styles.summaryCard}>
              <span>Registros por talla</span>
              <strong>{stockSummary.sizeLines}</strong>
            </div>

            <div className={styles.summaryCardPrimary}>
              <span>Total a ingresar</span>
              <strong>{stockSummary.totalPairs} pares</strong>
            </div>

            <div className={styles.summaryCardMoney}>
              <span>Valor referencial</span>
              <strong>S/ {stockSummary.estimatedValue.toFixed(2)}</strong>
            </div>
          </div>

          <div className={styles.sizeSummary}>
            <div className={styles.sizeSummaryTitle}>
              <Boxes size={17} />
              Total consolidado por talla
            </div>
            <div className={styles.sizeSummaryTags}>
              {stockSummary.sizeTotals.map(([size, quantity]) => (
                <span key={size}>
                  Talla {size}: <strong>{quantity}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Serie</th>
                  <th>Cantidades</th>
                  <th>Total pares</th>
                  <th>Valor referencial</th>
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
          <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4 mt-5">

            <button
              onClick={handleGenerateLabels}
              className={styles.registerStockBtn}
              disabled={isSubmitting}
            >
              <Tag size={24} />
              Generar Etiquetas
            </button>


            <button
              onClick={handleRegisterStock}
              className={styles.registerStockBtn}
              disabled={isSubmitting || !guideNumber.trim()}
            >
              <Save size={24} />
              {isSubmitting
                ? 'Registrando...'
                : 'Registrar Ingreso en Almacén'}
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
