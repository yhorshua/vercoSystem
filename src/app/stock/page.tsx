'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getProductsByWarehouse } from '../services/productsService';
import { getCategories } from '../services/categoryService';  // Importa el servicio de categorías
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
  const [categories, setCategories] = useState<Category[]>([]); // Estado para las categorías
  const [selectedCategory, setSelectedCategory] = useState<number | null>(3); // Estado para la categoría seleccionada
  const [search, setSearch] = useState('');
  const [tallasDisponibles, setTallasDisponibles] = useState<string[]>([]); // Estado para las tallas disponibles
  const [selectedSerie, setSelectedSerie] = useState<string>(''); // Estado para la serie
  const [isShoeCategory, setIsShoeCategory] = useState<boolean>(false); // Cambiar a booleano, inicialmente no es Zapatillas

  // Dentro de tu componente StockPage
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCategoryId = Number(e.target.value);
    setSelectedCategory(selectedCategoryId);  // Ahora categoryId será siempre un número
    setSelectedSerie('');  // Resetear serie seleccionada al cambiar categoría
    setIsShoeCategory(selectedCategoryId === 1);  // Verificar si la categoría seleccionada es "Zapatillas"
  };


  useEffect(() => {
    const fetchStock = async () => {
      try {
        if (!user?.token || !user?.warehouse_id) {
          console.error('Usuario no autenticado o datos de usuario incompletos.');
          return;
        }

        const products = await getProductsByWarehouse(user.warehouse_id, selectedCategory, user.token, selectedSerie);

        const mapped = products.map((p: any) => {
          const tallas: Record<string, number> = {};
          let saldo = 0;

          // Extraer tallas dinámicas del stock
          const productTallas: string[] = [];

          for (const s of p.stock || []) {
            const size = s.productSize?.size;
            const qty = Number(s.quantity || 0);
            saldo += qty;
            if (size) {
              tallas[size] = (tallas[size] || 0) + qty;
              if (!productTallas.includes(size)) {
                productTallas.push(size); // Agregar talla si no está en el array
              }
            }
          }

          // Actualiza el estado de las tallas disponibles
          if (productTallas.length > 0) {
            setTallasDisponibles(productTallas);
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

        setStock(mapped);
      } catch (err: any) {
        console.error(err);
        alert(err.message);
      }
    };

    const fetchCategories = async () => {
      try {
        if (!user?.token) return;

        const categoriesData = await getCategories(user.token);
        setCategories(categoriesData); // Guardar las categorías obtenidas
      } catch (err: any) {
        console.error('Error al obtener las categorías:', err);
        alert('Error al obtener las categorías.');
      }
    };

    fetchStock();
    fetchCategories();  // Llamamos para obtener las categorías
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

          {/* Selector de Categoría */}
          <select
            value={selectedCategory || ''}
            onChange={handleCategoryChange}
            className={styles.inputField}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {isShoeCategory && (
              <select
                value={selectedSerie}
                onChange={(e) => setSelectedSerie(e.target.value)}
                className={styles.inputField}
              >
                <option value="">Seleccionar Serie</option>
                <option value="3">Junior (27-32)</option>
                <option value="4">Mediano (33-39)</option>
                <option value="5">Adulto (38-44)</option>
                <option value="8">Adulto (37-44)</option>
              </select>
          )}

          <button onClick={() => exportToExcel(filtered)} className={styles.exportButton}>
            Exportar a Excel
          </button>
        </div>
      </div>

      <StockTable data={filtered} tallasDisponibles={tallasDisponibles} />
    </div>
  );
}
