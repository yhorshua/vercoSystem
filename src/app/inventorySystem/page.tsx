'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Save, Package, Store, Tag,
  AlertCircle, CheckCircle2, ChevronRight,
  ArrowUpRight, ArrowDownRight, RefreshCcw
} from 'lucide-react';
import { adjustInventory, getInventoryByWarehouseAndCategory } from '../services/stockServices';
import { useUser } from '../context/UserContext';
import { getCategories } from '../services/categoryService';
import { getWarehouses, WarehouseRow } from '../services/warehouseServices';
import Swal from 'sweetalert2';

type Size = {
  stock_id: number;
  product_size_id: number;
  size: string | number;
  quantity: number;
};

type Product = {
  product_id: number;
  article_code: string;
  article_description: string;
  brand_name: string;
  model_code: string;
  category: string;
  color: string;
  unit_price: number;
  product_image: string;
  total_stock: number;
  sizes: Size[];
};

type Changes = Record<number, number>;

type InventoryCardProps = {
  product: Product;
  changes: Record<number, number>;
  onQuantityChange: (
    productSizeId: number,
    newVal: string,
    oldVal: number
  ) => void;
};

const InventorySystem = () => {
  // --- Estados ---
  const [warehouseId, setWarehouseId] = useState('1');
  const [category, setCategory] = useState(1);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [changes, setChanges] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);

  // --- Lógica de Negocio ---


  const { user } = useUser();

  const fetchInventory = async () => {

    if (!user || !user.token) {
      showNotification('error', 'Sesión expirada. Vuelve a iniciar sesión');
      return;
    }
    setLoading(true);
    setNotification(null);
    try {
      const data = await getInventoryByWarehouseAndCategory(
        Number(warehouseId),
        category,
        user?.token || ''
      );

      // ⚠️ IMPORTANTE: adaptar estructura (stock → sizes)
      const formatted = data.map((p: any) => ({
        ...p,
        sizes: (p.stock || []).map((s: any) => ({
          stock_id: s.stock_id,
          product_size_id: s.product_size_id,
          size: s.size ?? 'N/A',
          quantity: Number(s.quantity || 0)
        }))
      }));

      setInventory(formatted);
      setChanges({});
    } catch (error: any) {
      showNotification('error', error.message || 'Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [catData, whData] = await Promise.all([
          getCategories(user?.token || ''),
          getWarehouses(user?.token || '')
        ]);

        setCategories(catData || []);
        setWarehouses(whData || []);

        // Opcional: setear valores por defecto dinámicos
        if (whData?.length) {
          setWarehouseId(String(whData[0].id));
        }
        if (catData?.length) {
          setCategory(catData[0].id); // o catData[0].code dependiendo tu API
        }

      } catch (error) {
        showNotification('error', 'Error cargando categorías o almacenes');
      }
    };

    if (user?.token) {
      loadInitialData();
    }
  }, [user]);


  const saveChanges = async () => {

    if (!user || !user.token) {
      showNotification('error', 'Sesión expirada. Vuelve a iniciar sesión');
      return;
    }
    if (Object.keys(changes).length === 0) return;

    const result = await Swal.fire({
      title: '¿Confirmar ajustes?',
      text: 'Se aplicarán cambios al inventario',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setSaving(true);

    const payloadItems = Object.entries(changes)
      .map(([sizeId, newQty]) => {
        const product = inventory.find((p) =>
          p.sizes.some((s) => s.product_size_id === Number(sizeId))
        );

        if (!product) return null;

        return {
          product_id: product.product_id,
          product_size_id: Number(sizeId),
          new_quantity: Number(newQty),
        };
      })
      .filter(Boolean) as {
        product_id: number;
        product_size_id: number;
        new_quantity: number;
      }[];

    try {
      await adjustInventory(
        Number(warehouseId),
        user?.id,
        payloadItems,
        user.token
      );

      showNotification('success', 'Inventario actualizado correctamente');
      setChanges({});
      fetchInventory();

    } catch (error: any) {
      showNotification('error', error.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    Swal.fire({
      icon: type,
      title: type === 'success' ? 'Éxito' : 'Error',
      text: message,
      timer: 2500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  const handleQuantityChange = (
    productSizeId: number,
    newVal: string,
    oldVal: number
  ) => {
    const value = newVal === '' ? '' : parseInt(newVal);

    if (value !== '' && value < 0) return;

    setChanges((prev) => {
      const updated = { ...prev };

      if (value === oldVal || value === '') {
        delete updated[productSizeId];
      } else {
        updated[productSizeId] = value;
      }

      return updated;
    });
  };

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      {/* Header & Filtros */}
      <div className="max-w-6xl mx-auto mb-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Control de Stock</h1>
            <p className="text-slate-500">Ajuste de inventario físico y existencias</p>
          </div>

          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-200 gap-2">
            <div className="flex items-center px-3 gap-2 border-r border-slate-100">
              <Store size={18} className="text-slate-400" />
              <select
                className="bg-transparent font-medium focus:outline-none"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.warehouse_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center px-3 gap-2">
              <Tag size={18} className="text-slate-400" />
              <select
                className="bg-transparent font-medium focus:outline-none"
                value={category}
                onChange={(e) => setCategory(Number(e.target.value))}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchInventory}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-100 disabled:opacity-50"
            >
              {loading ? <RefreshCcw className="animate-spin" size={18} /> : <Search size={18} />}
              Buscar
            </button>
          </div>
        </header>

        {/* Lista de Productos */}
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 opacity-50">
              {[1, 2].map(i => <div key={i} className="h-64 bg-white rounded-3xl animate-pulse" />)}
            </div>
          ) : inventory.length > 0 ? (
            inventory.map((product) => (
              <InventoryCard
                key={product.product_id}
                product={product}
                changes={changes}
                onQuantityChange={handleQuantityChange}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Package className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 font-medium">No se encontraron productos. Inicia una búsqueda.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Flotante de Guardado */}
      {hasChanges && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-4 ml-2">
            <div className="bg-blue-500 p-2 rounded-lg">
              <RefreshCcw size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Cambios pendientes</p>
              <p className="font-bold text-lg">{Object.keys(changes).length} tallas modificadas</p>
            </div>
          </div>
          <button
            onClick={saveChanges}
            disabled={saving}
            className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Guardando...' : 'Guardar Ajustes'}
          </button>
        </div>
      )}
    </div>
  );
};

// --- Subcomponentes ---

const InventoryCard: React.FC<InventoryCardProps> = ({ product, changes, onQuantityChange }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Info Producto */}
          <div className="flex gap-6 flex-1">
            <div className="w-32 h-32 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100">
              <img
                src={product.product_image}
                alt={product.article_description}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                  {product.brand_name}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  CODIGO: {product.article_code}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{product.article_description}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Modelo</p>
                  <p className="font-medium">{product.model_code}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Color</p>
                  <p className="font-medium">{product.color}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Precio</p>
                  <p className="font-medium text-blue-600">S/.{product.unit_price}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Stock Actual</p>
                  <p className="font-bold">{product.total_stock} uds.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Tallas */}
        <div className="mt-8 border-t border-slate-50 pt-6">
          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Package size={16} /> Ajuste de Stock por Talla
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {product.sizes.map((size: Size) => {
              const newValue = changes[size.product_size_id];
              const isModified = newValue !== undefined;
              const diff = isModified ? newValue - size.quantity : 0;

              return (
                <div
                  key={size.product_size_id}
                  className={`p-4 rounded-2xl border-2 transition-all ${isModified ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-slate-50/50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-black text-slate-700">Talla {size.size}</span>
                    {isModified && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {diff >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {diff >= 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Actual</p>
                      <p className="text-lg font-semibold text-slate-500">{size.quantity}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Conteo Físico</p>
                      <input
                        type="number"
                        min="0"
                        placeholder={size.quantity.toString()}
                        className={`w-full bg-white border rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-400 outline-none transition-all ${isModified ? 'border-blue-400 text-blue-700' : 'border-slate-300'
                          }`}
                        value={newValue ?? ''}
                        onChange={(e) => onQuantityChange(size.product_size_id, e.target.value, size.quantity)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventorySystem;