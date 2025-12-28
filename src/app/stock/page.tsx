'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getProductsByWarehouse } from '../services/productsService';
import StockTable from './StockTable';
import { exportToExcel } from './exportUtils';
import styles from './page.module.css';

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

// Tipos mínimos del backend (ajústalos si tu backend cambia)
type BackendProduct = {
  article_code: string;
  article_series: string;
  article_description: string;
  stock: Array<{
    quantity: number;
    productSize?: { size: string } | null; // viene si agregas join stock.productSize
  }>;
};

export default function StockPage() {
  const { user } = useUser();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchStock = async () => {
      try {
        if (!user?.token) return;

        const products = await getProductsByWarehouse(user.warehouseId, user.token);

        const mapped = products.map((p: any) => {
          const tallas: Record<string, number> = {};
          let saldo = 0;

          for (const s of p.stock || []) {
            const size = s.productSize?.size;
            const qty = Number(s.quantity || 0);
            saldo += qty;
            if (size) tallas[size] = (tallas[size] || 0) + qty;
          }

          return {
            codigo: p.article_code,
            serie: p.article_series,
            descripcion: p.article_description,
            tallas,
            saldo,
          };
        });

        setStock(mapped);
      } catch (err: any) {
        console.error(err);
        alert(err.message);
      }
    };

    fetchStock();
  }, [user]);


  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return stock;
    return stock.filter(
      (item) =>
        item.codigo.toUpperCase().includes(q) ||
        item.descripcion.toUpperCase().includes(q)
    );
  }, [stock, search]);

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
          <button onClick={() => exportToExcel(filtered)} className={styles.exportButton}>
            Exportar a Excel
          </button>
        </div>
      </div>

      <StockTable data={filtered} />
    </div>
  );
}
