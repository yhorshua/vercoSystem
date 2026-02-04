'use client';

import { useState, useEffect } from 'react';
import { useReactTable, createColumnHelper, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { getProductsByCodeOrDescription } from '../services/productsService'; // Importar el servicio para la búsqueda
import { registerStockForMultipleItems } from '../services/stockServices'; // Importar el servicio para registrar el stock
import styles from './page-register.module.css';
import { useUser } from '../context/UserContext';

interface Tallas {
  [talla: string]: number;
}

// Cambiar la declaración de "sizes" en StockItem
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
    id: number;   // Aquí agregamos el id de la talla
    quantity: number;
  }[];
}


export default function StockPage() {
  const [productData, setProductData] = useState<StockItem | null>(null);  // Estado para almacenar el producto encontrado
  const [searchQuery, setSearchQuery] = useState('');  // Estado para almacenar la consulta de búsqueda
  const [loading, setLoading] = useState(false);  // Estado para manejar la carga
  const [cantidadTallas, setCantidadTallas] = useState<{ [key: string]: number }>({});  // Estado para las cantidades de tallas
  const [stockData, setStockData] = useState<StockItem[]>([]); // Datos de stock agregados a la tabla
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);  // Estado para habilitar/deshabilitar el botón de guardar
  const { user } = useUser();

  // Función para buscar productos por código
  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);

    try {
      // Llamar al servicio para obtener el producto
      const product = await getProductsByCodeOrDescription(searchQuery);
      setProductData(product);
    } catch (error) {
      console.error(error);
      alert('Producto no encontrado');
    } finally {
      setLoading(false);
    }
  };

  // Cuando la cantidad de una talla cambie, se actualizará la tabla
  const handleCantidadChange = (size: string, value: number) => {
    setCantidadTallas((prevState) => ({
      ...prevState,
      [size]: value,
    }));
  };

  // Función para agregar la información del producto y las cantidades a la tabla
  // Función para agregar la información del producto y las cantidades a la tabla
  // Función para agregar la información del producto y las cantidades a la tabla
  const addProductToTable = () => {
    if (!productData) return;

    const newProduct: StockItem = {
      product_id: productData.product_id,
      article_code: productData.article_code,
      article_description: productData.article_description,
      article_series: productData.article_series,
      material_type: productData.material_type,
      color: productData.color,
      stock_minimum: productData.stock_minimum,
      product_image: productData.product_image,
      price: productData.price,
      category: productData.category,
      series: productData.series,
      sizes: productData.sizes.map(size => {
        const quantity = cantidadTallas[size.size]; // Obtiene la cantidad ingresada para la talla
        return {
          size: size.size,  // El nombre visible de la talla
          id: size.id,      // El ID de la talla
          quantity: quantity || 0,  // La cantidad ingresada para esa talla
        };
      }),
    };

    setStockData((prev) => [...prev, newProduct]);
    setCantidadTallas({}); // Limpiamos las cantidades después de agregar el producto
    setIsSaveButtonDisabled(false); // Habilitamos el botón de registrar
  };



  // Función para registrar el stock en el backend
  const handleRegisterStock = async (): Promise<void> => {
    const warehouseId = user?.warehouseId;

    if (!warehouseId) {
      alert('No se ha encontrado el ID del almacén.');
      return;
    }

    // Mapear las tallas y cantidades correctamente, enviando el productSizeId
    const productsToRegister = stockData.flatMap((item) =>
      item.sizes.map((size) => ({
        productId: item.product_id,
        productSizeId: size.id,  // Usamos el ID de la talla
        quantity: size.quantity,
      }))
    );

    console.log({
      warehouseId,
      products: productsToRegister,
    });

    try {
      await registerStockForMultipleItems(warehouseId, productsToRegister);
      alert('Stock registrado correctamente');
      setStockData([]);
      setIsSaveButtonDisabled(true);
    } catch (error) {
      console.error(error);
      alert('Error al registrar el stock');
    }
  };


  // Renderizar las tallas disponibles dependiendo de la categoría
  const renderSizes = () => {
  if (productData?.category?.name === 'Zapatillas') {
    return productData.sizes.map((size) => (
      <div key={size.size} className={styles.sizeInput}>
        <label>{size.size}:</label>
        <input
          type="number"
          value={cantidadTallas[size.size] || 0}
          onChange={(e) => handleCantidadChange(size.size, parseInt(e.target.value, 10))}
          min="0"
          className={styles.sizeInputField}
        />
      </div>
    ));
  } else if (productData?.category?.name === 'Ropa Deportiva') {
    const ropaDeportivaTallas = ['S', 'M', 'L', 'XL', 'XXL'];
    return ropaDeportivaTallas.map((size) => (
      <div key={size} className={styles.sizeInput}>
        <label>{size}:</label>
        <input
          type="number"
          value={cantidadTallas[size] || 0}
          onChange={(e) => handleCantidadChange(size, parseInt(e.target.value, 10))}
          min="0"
          className={styles.sizeInputField}
        />
      </div>
    ));
  }
  return null;
};

  // Columnas para la tabla usando useReactTable
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
      header: 'Tallas',
      cell: (info) => (
        <div>
          {info.getValue().map((size: { size: string; quantity: number }) => (
            <div key={size.size}>{size.size}: {size.quantity}</div>
          ))}
        </div>
      ),
    }),
    columnHelper.accessor('price', {
      header: 'Precio',
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
      <h1>Buscar Producto</h1>
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por código de artículo"
          className={styles.inputField}
        />
        <button onClick={handleSearch} className={styles.searchButton}>
          Buscar
        </button>
      </div>

      {loading && <p className={styles.loading}>Cargando...</p>}

      {productData && (
        <div className={styles.productInfo}>
          <div className={styles.productField}>
            <div>
              <label>Código:</label>
              <input type="text" value={productData.article_code} disabled className={styles.inputDisabled} />
            </div>
            <div>
              <label>Descripción:</label>
              <input type="text" value={productData.article_description} disabled className={styles.inputDisabled} />
            </div>
            <div>
              <label>Serie:</label>
              <input type="text" value={productData.article_series} disabled className={styles.inputDisabled} />
            </div>
            <div>
              <label>Categoría:</label>
              <input type="text" value={productData.category?.name || ''} disabled className={styles.inputDisabled} />
            </div>
            <div>
              <label>Precio de venta:</label>
              <input type="text" value={productData.price} disabled className={styles.inputDisabled} />
            </div>
          </div>

          <div className={styles.sizes}>
            <h4>Ingresar cantidades:</h4>
            {renderSizes()}
          </div>

          <button onClick={addProductToTable} className={styles.saveButton}>
            Guardar Producto
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Serie</th>
              <th>Tallas</th>
              <th>Saldo</th>
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
        className={styles.registerButton}
        disabled={stockData.length === 0}  // El botón solo se habilita si hay productos en la tabla
      >
        Registrar Stock
      </button>

    </div>
  );
}
