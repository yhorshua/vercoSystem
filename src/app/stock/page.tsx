'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getProductsByWarehouse } from '../services/productsService';
import { getCategories } from '../services/categoryService';
import StockTable from './StockTable';
import { exportToExcel } from './exportUtils';
import styles from './page.module.css';
import { Search, Download, Filter, Package } from 'lucide-react';

interface Tallas {
  [talla: string]: number;
}

interface StockItem {
  codigo: string;
  serie: string;
  descripcion: string;
  tallas: Tallas;
  saldo: number;
  origin: string;
  precioventa: string;
}

type Category = {
  id: number;
  name: string;
};

export default function StockPage() {
  const { user } = useUser();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(3); 
  const [search, setSearch] = useState('');
  const [tallasDisponibles, setTallasDisponibles] = useState<string[]>([]);
  const [selectedSerie, setSelectedSerie] = useState<string>('');
  const [isShoeCategory, setIsShoeCategory] = useState<boolean>(false);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCategoryId = Number(e.target.value);
    setSelectedCategory(selectedCategoryId);
    setSelectedSerie('');
    // Asumimos que ID 1 es Zapatillas
    setIsShoeCategory(selectedCategoryId === 1);
  };

  useEffect(() => {
    const fetchStock = async () => {
      try {
        if (!user?.token || !user?.warehouse_id) {
          return;
        }

        const products = await getProductsByWarehouse(user.warehouse_id, selectedCategory, user.token, selectedSerie);

        // Usamos un Set para recolectar TODAS las tallas únicas de TODOS los productos devueltos
        const allSizesSet = new Set<string>();

        const mapped = products.map((p: any) => {
          const tallas: Record<string, number> = {};
          let saldo = 0;

          for (const s of p.stock || []) {
            const size = s.productSize?.size;
            const qty = Number(s.quantity || 0);
            saldo += qty;
            
            if (size) {
              // Limpiamos la talla (quitamos espacios)
              const cleanSize = size.trim();
              tallas[cleanSize] = (tallas[cleanSize] || 0) + qty;
              allSizesSet.add(cleanSize); // Agregamos al conjunto global de tallas
            }
          }

          return {
            codigo: p.article_code,
            serie: p.article_series,
            descripcion: p.article_description,
            tallas,
            saldo,
            origin: p.type_origin,
            precioventa: p.manufacturing_cost,
          };
        });

        // Convertimos el Set a Array y ordenamos numéricamente
        const sortedSizes = Array.from(allSizesSet).sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          // Si son números, ordenar numéricamente
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          // Si son texto (S, M, L), ordenar alfabéticamente o mantener orden
          return a.localeCompare(b);
        });

        setTallasDisponibles(sortedSizes);
        setStock(mapped);

      } catch (err: any) {
        console.error(err);
        // alert(err.message); // Mejor manejar errores en UI silenciosamente o con un toast
      }
    };

    const fetchCategories = async () => {
      try {
        if (!user?.token) return;
        const categoriesData = await getCategories(user.token);
        setCategories(categoriesData);
      } catch (err: any) {
        console.error('Error al obtener las categorías:', err);
      }
    };

    fetchStock();
    fetchCategories();
  }, [user, selectedCategory, selectedSerie]);

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
    <div className={styles.pageContainer}>
      <div className={styles.headerCard}>
        <div className={styles.titleRow}>
          <div className={styles.iconBox}>
            <Package size={28} color="white" />
          </div>
          <h1>Control de Inventario</h1>
        </div>
        <p className={styles.subtitle}>Consulta y gestiona el stock de tu almacén en tiempo real.</p>
      </div>

      <div className={styles.filtersCard}>
        <div className={styles.filterGrid}>
          {/* Buscador */}
          <div className={styles.inputWrapper}>
            <Search className={styles.inputIcon} size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.inputField}
              placeholder="Buscar por código..."
            />
          </div>

          {/* Categoría */}
          <div className={styles.selectWrapper}>
             <Filter className={styles.inputIcon} size={18} />
            <select
              value={selectedCategory || ''}
              onChange={handleCategoryChange}
              className={styles.selectField}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Serie (Condicional) */}
          {isShoeCategory && (
            <div className={styles.selectWrapper}>
               <Filter className={styles.inputIcon} size={18} />
              <select
                value={selectedSerie}
                onChange={(e) => setSelectedSerie(e.target.value)}
                className={styles.selectField}
              >
                <option value="">Todas las series</option>
                <option value="3">Junior (27-32)</option>
                <option value="4">Mediano (33-39)</option>
                <option value="5">Adulto (38-44)</option>
                <option value="8">Adulto (37-44)</option>
              </select>
            </div>
          )}

          {/* Botón Exportar */}
          <button onClick={() => exportToExcel(filtered)} className={styles.exportButton}>
            <Download size={18} />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      <div className={styles.tableCard}>
        <StockTable data={filtered} tallasDisponibles={tallasDisponibles} />
      </div>
    </div>
  );
}