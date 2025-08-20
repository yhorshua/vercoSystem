'use client';

import { useEffect, useState } from 'react';
import { getStockData } from './stockService';
import StockTable from './StockTable';
import { exportToExcel } from './exportUtils';
import styles from './page.module.css';

// Definir las interfaces para los datos
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
          <button
            onClick={() => exportToExcel(filtered)} // Filtramos los datos antes de exportarlos
            className={styles.exportButton}
          >
            Exportar a Excel
          </button>
        </div>
      </div>
      <StockTable data={filtered} />
    </div>
  );
}
