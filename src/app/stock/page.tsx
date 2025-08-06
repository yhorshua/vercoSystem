'use client';

import { useEffect, useState } from 'react';
import { getStockData } from './stockService';
import StockTable from './StockTable';
import { exportToExcel } from './exportUtils';
import styles from './page.module.css';

export default function StockPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchStock = async () => {
      const data = await getStockData();
      setStock(data);
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
      onChange={(e) => setSearch(e.target.value)}
      className={styles.inputField}
      placeholder="Buscar por código o nombre"
    />
    <button
      onClick={() => exportToExcel(filtered)}
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
