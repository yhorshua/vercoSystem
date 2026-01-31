'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getProductsWithSizes } from '../services/productsService';  // Usar el nuevo servicio
import StockTable from './StockTable';
import { exportToExcel } from './exportUtils';
import styles from './page-register.module.css';

interface Tallas {
  [talla: string]: number;
}

interface StockItem {
  product_id: number;
  article_code: string;
  article_description: string;
  serie: string;
  tallas: Tallas;
  saldo: number;
}

export default function StockPage() {
  const { user } = useUser();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');

  // Obtener productos con tallas
useEffect(() => {
  const fetchStock = async () => {
    try {
      if (!user?.token) return;

      // Llamamos al nuevo servicio que trae los productos con las tallas
      const products = await getProductsWithSizes(user.token);

      console.log('Fetched products:', products);  // Verificar que los datos sean correctos

      const mapped = products.map((p: any) => {
        const tallas: Tallas = {};
        let saldo = 0;

        // Calculamos las cantidades totales por talla
        for (const size in p.sizes) {
          if (Object.hasOwnProperty.call(p.sizes, size)) {
            tallas[size] = p.sizes[size];  // Asignamos las cantidades por talla
            saldo += p.sizes[size];
          }
        }

        return {
          product_id: p.product_id,
          article_code: p.article_code,
          article_description: p.article_description,
          serie: p.series_id,
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

  fetchStock();  // Ejecutar la función de obtención de productos
}, [user]);


  // Filtrar los productos según la búsqueda
  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return stock;
    return stock.filter(
      (item) =>
        item.article_code.toUpperCase().includes(q) ||
        item.article_description.toUpperCase().includes(q)
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
         
        </div>
      </div>

      <StockTable data={filtered} />
    </div>
  );
}
