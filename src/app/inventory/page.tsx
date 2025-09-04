'use client';

import { useEffect, useState } from 'react';
import { getStockData } from '../stock/stockService'; // Aquí traemos los datos de stock
import StockTable from '../stock/StockTable'; // El componente de la tabla
import Swal from 'sweetalert2'; // Importar SweetAlert2
import styles from './InventoryPage.module.css'; // Estilos de la página

// Definir las interfaces para los datos
interface Tallas {
  [talla: string]: number; // Cantidad por cada talla
}

interface StockItem {
  codigo: string;
  serie: string;
  descripcion: string;
  tallas: Tallas;
  saldo: number;  // Aseguramos que saldo sea un número
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]); // Almacenamos los artículos del inventario
  const [search, setSearch] = useState(''); // Búsqueda por código o nombre
  const [codigoBarras, setCodigoBarras] = useState(''); // Código de barras escaneado
  const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]); // Tallas disponibles para el artículo

  // Fetch de los artículos del stock al cargar la página
  useEffect(() => {
    const fetchStock = async () => {
      const data = await getStockData();
      setStock(data); // Asumimos que getStockData devuelve un array de StockItem
    };
    fetchStock();
  }, []);

  // Filtrado de artículos basado en la búsqueda
  const filtered = stock.filter(item =>
    item.codigo.includes(search) || item.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  // Lógica para escanear el código de barras y actualizar el stock
  const handleEscanearCodigo = () => {
    const codigoMayus = codigoBarras.toUpperCase().trim();

    if (codigoMayus.length !== 9) {
      // Usar SweetAlert2 para mostrar un mensaje de error
      Swal.fire({
        icon: 'warning',
        title: 'Código de barras inválido',
        text: 'El código de barras debe tener 9 caracteres.',
      });
      return;
    }

    const codigoArticulo = codigoMayus.substring(0, 7); // Código de artículo (primeros 7 caracteres)
    const talla = Number(codigoMayus.substring(7, 9)); // Talla (últimos 2 caracteres)

    // Validar si el artículo existe en el inventario
    const producto = stock.find(item => item.codigo === codigoArticulo);
    if (!producto) {
      // Usar SweetAlert2 para mostrar un mensaje de error
      Swal.fire({
        icon: 'error',
        title: 'Artículo no encontrado',
        text: 'El artículo no se encuentra en el inventario.',
      });
      return;
    }

    // Validar si la talla existe para el artículo
    if (!producto.tallas[talla]) {
      // Usar SweetAlert2 para mostrar un mensaje de error
      Swal.fire({
        icon: 'error',
        title: 'Talla no disponible',
        text: `La talla ${talla} no está disponible para este artículo.`,
      });
      return;
    }

    // Actualizar la cantidad del artículo en el stock
   const updatedStock = stock.map(item => {
  if (item.codigo === codigoArticulo) {
    const updatedTallas = { ...item.tallas, [talla]: (item.tallas[talla] || 0) + 1 };

    return { ...item, tallas: updatedTallas };
  }
  return item;
});

    setStock(updatedStock); // Actualizar el estado del stock
    setCodigoBarras(''); // Limpiar el campo de código de barras

    // Usar SweetAlert2 para mostrar un mensaje de éxito
    Swal.fire({
      icon: 'success',
      title: 'Artículo escaneado con éxito',
      text: `El artículo con código ${codigoArticulo} y talla ${talla} ha sido agregado al inventario.`,
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.textTitlle}>Formulario de Inventario</h1>

      {/* Input para escanear código de barras */}
      <input
        type="text"
        value={codigoBarras}
        onChange={(e) => setCodigoBarras(e.target.value)}
        onBlur={handleEscanearCodigo}
        placeholder="Escanea el código de barras"
        className={styles.input}
      />

      {/* Búsqueda de artículos */}
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
          className={styles.inputField}
          placeholder="Buscar por código o nombre"
        />
      </div>

      {/* Mostrar tabla con artículos */}
      <StockTable data={filtered} />
    </div>
  );
}
