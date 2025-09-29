'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2'; // Importar SweetAlert2
import { getStockData } from '../stock/stockService'; // Función que traerá los datos de stock
import StockTable from '../stock/StockTable'; // El componente de la tabla para mostrar los productos
import styles from '../inventory/InventoryPage.module.css'; // Estilos de la página

// StockPage.tsx
interface Tallas {
  [talla: string]: number;
}

interface StockItem {
  codigo: string;
  serie: string;
  descripcion: string;
  tallas: Tallas;
  saldo: number;
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]); // Tipamos el estado de stock
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchStock = async () => {
      const data = await getStockData();
      setStock(data); // Aquí asumimos que getStockData devuelve un array de StockItem
    };
    fetchStock();
  }, []);

  const filtered = stock.filter(item =>
    item.codigo.includes(search) || item.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <h1>Consulta de Stock</h1>
      <div className={styles.contentCenter}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            className={styles.inputField}
            placeholder="Buscar por código o nombre"
          />
        </div>
      </div>
      <StockTable data={filtered} />
    </div>
  );
}
