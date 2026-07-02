'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Swal from 'sweetalert2';
import {
  Search,
  Package,
  Tag,
  DollarSign,
  Save,
  Loader2,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

import { useUser } from '../context/UserContext';

import {
  getVercoZapatillas,
  updateManyProductPrices,
  VercoZapatillaProduct,
  VercoZapatillaPrices,
  UpdateProductPriceItemDto,
} from '../services/productsService';

type PriceFieldName = keyof VercoZapatillaPrices;

type DraftPrices = Record<PriceFieldName, string>;

const priceFields: {
  label: string;
  shortLabel: string;
  name: PriceFieldName;
  icon: React.ReactNode;
  highlight?: boolean;
}[] = [
    /*
  {
    label: 'Costo Manufactura',
    shortLabel: 'Costo',
    name: 'manufacturing_cost',
    icon: <Package size={15} />,
  },
  {
    label: 'Precio Unitario',
    shortLabel: 'Unitario Tienda',
    name: 'unit_price',
    icon: <Tag size={15} />,
  },
  */
  {
    label: 'Precio Fábrica',
    shortLabel: 'Precio de Fábrica',
    name: 'factory_price',
    icon: <DollarSign size={15} />,
  },
  /*
  {
    label: 'Precio Dropshipping',
    shortLabel: 'Dropshipping',
    name: 'dropshipping_price',
    icon: <DollarSign size={15} />,
  },
  {
    label: 'Precio Mayorista',
    shortLabel: 'Mayorista',
    name: 'wholesale_price',
    icon: <DollarSign size={15} />,
  },
  {
    label: 'Precio Venta Final',
    shortLabel: 'Venta Final',
    name: 'selling_price',
    icon: <DollarSign size={15} />,
    highlight: true,
  },

  */
];

const emptyPrices: VercoZapatillaPrices = {
  manufacturing_cost: 0,
  unit_price: 0,
  factory_price: 0,
  dropshipping_price: 0,
  wholesale_price: 0,
  selling_price: 0,
};

const normalizePrices = (
  prices?: Partial<VercoZapatillaPrices>,
): VercoZapatillaPrices => {
  return {
    manufacturing_cost: Number(prices?.manufacturing_cost ?? 0),
    unit_price: Number(prices?.unit_price ?? 0),
    factory_price: Number(prices?.factory_price ?? 0),
    dropshipping_price: Number(prices?.dropshipping_price ?? 0),
    wholesale_price: Number(prices?.wholesale_price ?? 0),
    selling_price: Number(prices?.selling_price ?? 0),
  };
};

const pricesToDraft = (prices: VercoZapatillaPrices): DraftPrices => {
  return {
    manufacturing_cost: String(prices.manufacturing_cost ?? 0),
    unit_price: String(prices.unit_price ?? 0),
    factory_price: String(prices.factory_price ?? 0),
    dropshipping_price: String(prices.dropshipping_price ?? 0),
    wholesale_price: String(prices.wholesale_price ?? 0),
    selling_price: String(prices.selling_price ?? 0),
  };
};

const isRowChanged = (
  draft: DraftPrices,
  original: VercoZapatillaPrices,
) => {
  return priceFields.some((field) => {
    const rawValue = draft[field.name];

    if (rawValue === '') return true;

    return Number(rawValue) !== Number(original[field.name] ?? 0);
  });
};

const ProductList = () => {
  const { user } = useUser();
  const token = user?.token;

  const [products, setProducts] = useState<VercoZapatillaProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [priceDrafts, setPriceDrafts] = useState<
    Record<number, DraftPrices>
  >({});

  const [originalPrices, setOriginalPrices] = useState<
    Record<number, VercoZapatillaPrices>
  >({});

  const [dirtyRows, setDirtyRows] = useState<Record<number, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirtyCount = Object.keys(dirtyRows).length;

  const loadProducts = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);

      const data = await getVercoZapatillas(token);

      const normalizedProducts = data.map((product) => ({
        ...product,
        prices: normalizePrices(product.prices),
      }));

      const nextDrafts: Record<number, DraftPrices> = {};
      const nextOriginalPrices: Record<number, VercoZapatillaPrices> = {};

      normalizedProducts.forEach((product) => {
        const normalized = normalizePrices(product.prices);

        nextOriginalPrices[product.id] = normalized;
        nextDrafts[product.id] = pricesToDraft(normalized);
      });

      setProducts(normalizedProducts);
      setOriginalPrices(nextOriginalPrices);
      setPriceDrafts(nextDrafts);
      setDirtyRows({});
    } catch (error) {
      console.error(error);

      Swal.fire({
        title: 'Error',
        text:
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los productos',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) => {
      const articleCode = product.article_code?.toLowerCase() || '';
      const description = product.article_description?.toLowerCase() || '';
      const brand = product.brand_name?.toLowerCase() || '';
      const category = product.category?.name?.toLowerCase() || '';
      const model = product.model_code?.toLowerCase() || '';
      const color = product.color?.toLowerCase() || '';
      const serie = product.series?.name?.toLowerCase() || '';

      return (
        articleCode.includes(term) ||
        description.includes(term) ||
        brand.includes(term) ||
        category.includes(term) ||
        model.includes(term) ||
        color.includes(term) ||
        serie.includes(term)
      );
    });
  }, [searchTerm, products]);

  const handlePriceChange = (
    productId: number,
    fieldName: PriceFieldName,
    value: string,
  ) => {
    const currentDraft =
      priceDrafts[productId] ??
      pricesToDraft(originalPrices[productId] ?? emptyPrices);

    const updatedDraft: DraftPrices = {
      ...currentDraft,
      [fieldName]: value,
    };

    setPriceDrafts((prev) => ({
      ...prev,
      [productId]: updatedDraft,
    }));

    const original = originalPrices[productId] ?? emptyPrices;
    const changed = isRowChanged(updatedDraft, original);

    setDirtyRows((prev) => {
      const next = { ...prev };

      if (changed) {
        next[productId] = true;
      } else {
        delete next[productId];
      }

      return next;
    });
  };

  const isFieldDirty = (
    productId: number,
    fieldName: PriceFieldName,
  ) => {
    const draftValue = priceDrafts[productId]?.[fieldName];

    if (draftValue === undefined) return false;
    if (draftValue === '') return true;

    const originalValue = originalPrices[productId]?.[fieldName] ?? 0;

    return Number(draftValue) !== Number(originalValue);
  };

  const buildPayload = (productIds: number[]) => {
    const payload: UpdateProductPriceItemDto[] = [];
    const newPricesById: Record<number, VercoZapatillaPrices> = {};

    for (const productId of productIds) {
      const product = products.find((item) => item.id === productId);
      const draft = priceDrafts[productId];
      const original = originalPrices[productId];

      if (!product || !draft || !original) continue;

      const itemPayload: UpdateProductPriceItemDto = {
        id: productId,
      };

      const newPrices: VercoZapatillaPrices = {
        ...original,
      };

      for (const field of priceFields) {
        const rawValue = draft[field.name];

        if (rawValue === '') {
          throw new Error(
            `El producto ${product.article_code} tiene vacío el campo ${field.label}`,
          );
        }

        const numericValue = Number(rawValue);

        if (Number.isNaN(numericValue)) {
          throw new Error(
            `El producto ${product.article_code} tiene un valor inválido en ${field.label}`,
          );
        }

        if (numericValue < 0) {
          throw new Error(
            `El producto ${product.article_code} tiene un valor negativo en ${field.label}`,
          );
        }

        newPrices[field.name] = numericValue;

        if (numericValue !== Number(original[field.name] ?? 0)) {
          (itemPayload as any)[field.name] = numericValue;
        }
      }

      const fieldsChanged = Object.keys(itemPayload).filter(
        (key) => key !== 'id',
      );

      if (fieldsChanged.length > 0) {
        payload.push(itemPayload);
        newPricesById[productId] = newPrices;
      }
    }

    return {
      payload,
      newPricesById,
    };
  };

  const applySavedChanges = (
    newPricesById: Record<number, VercoZapatillaPrices>,
  ) => {
    setProducts((prev) =>
      prev.map((product) => {
        const newPrices = newPricesById[product.id];

        if (!newPrices) return product;

        return {
          ...product,
          prices: newPrices,
        };
      }),
    );

    setOriginalPrices((prev) => ({
      ...prev,
      ...newPricesById,
    }));

    setPriceDrafts((prev) => {
      const next = { ...prev };

      Object.entries(newPricesById).forEach(([productId, prices]) => {
        next[Number(productId)] = pricesToDraft(prices);
      });

      return next;
    });

    setDirtyRows((prev) => {
      const next = { ...prev };

      Object.keys(newPricesById).forEach((productId) => {
        delete next[Number(productId)];
      });

      return next;
    });
  };

  const handleSaveRow = async (productId: number) => {
    if (!token) return;

    try {
      setSaving(true);

      const { payload, newPricesById } = buildPayload([productId]);

      if (payload.length === 0) {
        Swal.fire({
          title: 'Sin cambios',
          text: 'No se modificó ningún precio en este producto.',
          icon: 'info',
          confirmButtonColor: '#3b82f6',
        });

        return;
      }

      await updateManyProductPrices(payload, token);

      applySavedChanges(newPricesById);

      Swal.fire({
        title: 'Guardado',
        text: 'Producto actualizado correctamente.',
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        timer: 1600,
      });
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el producto.',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!token) return;

    const ids = Object.keys(dirtyRows).map(Number);

    if (ids.length === 0) {
      Swal.fire({
        title: 'Sin cambios',
        text: 'No tienes precios modificados.',
        icon: 'info',
        confirmButtonColor: '#3b82f6',
      });

      return;
    }

    try {
      setSaving(true);

      const { payload, newPricesById } = buildPayload(ids);

      if (payload.length === 0) {
        Swal.fire({
          title: 'Sin cambios',
          text: 'No tienes precios modificados.',
          icon: 'info',
          confirmButtonColor: '#3b82f6',
        });

        return;
      }

      await updateManyProductPrices(payload, token);

      applySavedChanges(newPricesById);

      Swal.fire({
        title: '¡Actualizado!',
        text: `Se actualizaron ${payload.length} productos correctamente.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        timer: 2000,
      });
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text:
          error instanceof Error
            ? error.message
            : 'No se pudieron actualizar los precios.',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetRow = (productId: number) => {
    const original = originalPrices[productId];

    if (!original) return;

    setPriceDrafts((prev) => ({
      ...prev,
      [productId]: pricesToDraft(original),
    }));

    setDirtyRows((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Sesión no disponible
          </h2>

          <p className="text-gray-500">
            No se encontró el token del usuario. Vuelve a iniciar sesión.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Gestión rápida de precios
            </h1>

            <p className="text-gray-500">
              Edita directamente en la tabla los productos VERCO - Zapatillas
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-white border text-gray-600">
                Total: {products.length}
              </span>

              <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700">
                Filtrados: {filteredProducts.length}
              </span>

              <span className="px-3 py-1 rounded-full bg-yellow-50 border border-yellow-100 text-yellow-700">
                Modificados: {dirtyCount}
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full lg:w-[420px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />

              <input
                type="text"
                placeholder="Buscar código, descripción, serie, color..."
                value={searchTerm}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={loadProducts}
              disabled={loading || saving}
              className="px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Recargar
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || dirtyCount === 0}
              className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Guardar cambios ({dirtyCount})
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-auto max-h-[75vh]">
            <table className="w-full min-w-[1450px] text-left">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-600 uppercase min-w-[280px]">
                    Producto
                  </th>

                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase min-w-[140px]">
                    Serie / Tallas
                  </th>

                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase min-w-[110px]">
                    Marca
                  </th>

                  {priceFields.map((field) => (
                    <th
                      key={field.name}
                      className={`px-3 py-3 text-xs font-bold uppercase min-w-[145px] ${
                        field.highlight
                          ? 'text-blue-700 bg-blue-50'
                          : 'text-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {field.icon}
                        {field.shortLabel}
                      </div>
                    </th>
                  ))}

                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase text-center min-w-[150px]">
                    Estado
                  </th>

                  <th className="sticky right-0 z-30 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-600 uppercase text-center min-w-[150px]">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-16 text-center text-gray-500"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={22} />
                        Cargando productos...
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const draft =
                      priceDrafts[product.id] ??
                      pricesToDraft(normalizePrices(product.prices));

                    const isDirty = Boolean(dirtyRows[product.id]);

                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors ${
                          isDirty
                            ? 'bg-yellow-50/50'
                            : 'hover:bg-blue-50/20'
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-r border-gray-100">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-800">
                              {product.article_code}
                            </span>

                            <span className="text-sm text-gray-600 leading-tight">
                              {product.article_description}
                            </span>

                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="px-2 py-[2px] rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold">
                                {product.category?.name || 'Sin categoría'}
                              </span>

                              {product.color ? (
                                <span className="px-2 py-[2px] rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold">
                                  {product.color}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">
                              {product.series?.name || 'Sin serie'}
                            </span>

                            <span className="text-xs text-gray-400">
                              {product.sizes?.map((s) => s.size).join(', ') ||
                                'Sin tallas'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="px-3 py-1 rounded-full bg-black text-white text-xs font-bold uppercase">
                            {product.brand_name || 'Sin marca'}
                          </span>
                        </td>

                        {priceFields.map((field) => {
                          const fieldDirty = isFieldDirty(
                            product.id,
                            field.name,
                          );

                          return (
                            <td
                              key={field.name}
                              className={`px-3 py-3 ${
                                field.highlight ? 'bg-blue-50/40' : ''
                              }`}
                            >
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={draft[field.name] ?? ''}
                                disabled={saving}
                                onChange={(e) =>
                                  handlePriceChange(
                                    product.id,
                                    field.name,
                                    e.target.value,
                                  )
                                }
                                className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none transition-all ${
                                  fieldDirty
                                    ? 'border-yellow-400 bg-yellow-50 text-yellow-800 focus:ring-2 focus:ring-yellow-300'
                                    : field.highlight
                                      ? 'border-blue-200 bg-white text-blue-700 focus:ring-2 focus:ring-blue-400'
                                      : 'border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-blue-400'
                                }`}
                              />
                            </td>
                          );
                        })}

                        <td className="px-4 py-3 text-center">
                          {isDirty ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                              Editado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                              <CheckCircle2 size={14} />
                              Sin cambios
                            </span>
                          )}
                        </td>

                        <td className="sticky right-0 z-10 bg-inherit px-4 py-3 border-l border-gray-100">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveRow(product.id)}
                              disabled={saving || !isDirty}
                              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors"
                              title="Guardar esta fila"
                            >
                              <Save size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResetRow(product.id)}
                              disabled={saving || !isDirty}
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
                              title="Deshacer cambios"
                            >
                              <RotateCcw size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredProducts.length === 0 && (
            <div className="p-12 text-center text-gray-500 italic">
              No se encontraron productos con ese criterio.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;