'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import Swal from 'sweetalert2';

import {
  ShoppingBag,
  Trash2,
  DollarSign,
  FileCheck,
  AlertTriangle,
  Activity,
  Boxes,
} from 'lucide-react';

import type { ItemUI } from '../components/types';
import {
  createOrder,
  CreateOrderPayload,
} from '../services/ordersService';

interface ClienteUI {
  id: number;
  razonSocial: string;
}

interface PedidoTablaProps {
  items: ItemUI[];
  cliente: ClienteUI | null;
  user: {
    token: string;
    id: number;
    warehouseId: number;
  } | null;
  onDeleteItem: (index: number) => void;
  onPedidoCreado?: () => void;
  quotationId?: number | null;
}

type DisplayItem = ItemUI & {
  sourceIndexes: number[];
};

/*
 * Agrupa las líneas del carrito por artículo.
 *
 * Ejemplo:
 *
 * A1324NY - talla 38 - 2 pares
 * A1324NY - talla 39 - 3 pares
 *
 * Se convierte visualmente en:
 *
 * A1324NY | T.38 x 2 | T.39 x 3
 */
const groupItemsByProduct = (
  items: ItemUI[],
): DisplayItem[] => {
  const grouped = new Map<string, DisplayItem>();

  items.forEach((item, index) => {
    const source = item.source ?? 'MANUAL';

    const key = [
      source,
      Number(item.product_id),
      item.quotation_id ?? '',
      item.codigo,
    ].join('|');

    const existing = grouped.get(key);

    if (!existing) {
      const quantities: Record<number, number> = {};
      const sizeIds: Record<number, number> = {};

      Object.entries(item.cantidades).forEach(
        ([size, quantity]) => {
          const sizeNumber = Number(size);

          quantities[sizeNumber] =
            Number(quantity) || 0;

          const sizeId =
            item.sizeIdBySizeNumber?.[sizeNumber];

          if (sizeId !== undefined && sizeId !== null) {
            sizeIds[sizeNumber] = Number(sizeId);
          }
        },
      );

      grouped.set(key, {
        ...item,
        cantidades: quantities,
        sizeIdBySizeNumber: sizeIds,
        total: Object.values(quantities).reduce(
          (sum, quantity) => sum + Number(quantity || 0),
          0,
        ),
        sourceIndexes: [index],
      });

      return;
    }

    existing.sourceIndexes.push(index);

    Object.entries(item.cantidades).forEach(
      ([size, quantity]) => {
        const sizeNumber = Number(size);

        existing.cantidades[sizeNumber] =
          Number(existing.cantidades[sizeNumber] || 0) +
          Number(quantity || 0);

        const sizeId =
          item.sizeIdBySizeNumber?.[sizeNumber];

        if (sizeId !== undefined && sizeId !== null) {
          existing.sizeIdBySizeNumber[sizeNumber] =
            Number(sizeId);
        }
      },
    );

    existing.total = Object.values(
      existing.cantidades,
    ).reduce(
      (sum, quantity) => sum + Number(quantity || 0),
      0,
    );
  });

  return Array.from(grouped.values());
};

export default function PedidoTabla({
  items,
  cliente,
  user,
  onDeleteItem,
  onPedidoCreado,
  quotationId,
}: PedidoTablaProps) {
  const [isCreatingOrder, setIsCreatingOrder] =
    useState(false);

  const totalPares = items.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0,
  );

  const totalCompra = items.reduce((sum, item) => {
    const totalItem = Object.entries(item.cantidades).reduce(
      (subtotal, [, quantity]) =>
        subtotal +
        Number(quantity || 0) * Number(item.precio || 0),
      0,
    );

    return sum + totalItem;
  }, 0);

  /*
   * Esta es la información que se muestra en pantalla.
   * El payload continúa utilizando items originales.
   */
  const displayItems = useMemo(
    () => groupItemsByProduct(items),
    [items],
  );

  /*
   * El componente padre solamente elimina por índice.
   * Por eso se eliminan los índices agrupados de mayor a menor,
   * evitando que el índice cambie durante el proceso.
   */
  const deleteDisplayItem = (sourceIndexes: number[]) => {
    [...sourceIndexes]
      .sort((a, b) => b - a)
      .forEach((index) => onDeleteItem(index));
  };

  const columns: ColumnDef<DisplayItem>[] = [
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: ({ row }) => (
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase text-slate-800">
          {String(row.original.codigo)}
        </span>
      ),
    },
    {
      accessorKey: 'descripcion',
      header: 'Descripción',
      cell: ({ row }) => (
        <div>
          <span className="block text-xs font-extrabold tracking-tight text-slate-900">
            {row.original.descripcion}
          </span>

          {row.original.source === 'QUOTATION' && (
            <span className="mt-1 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black text-emerald-700">
              {row.original.quotation_number}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'serie',
      header: 'Serie',
      cell: ({ row }) => (
        <span className="font-mono text-[10px] font-semibold text-slate-500">
          {row.original.serie}
        </span>
      ),
    },
    {
      header: 'Tallas y cantidades',
      cell: ({ row }) => {
        const quantities = Object.entries(
          row.original.cantidades,
        )
          .filter(([, quantity]) => Number(quantity) > 0)
          .sort(
            ([sizeA], [sizeB]) =>
              Number(sizeA) - Number(sizeB),
          );

        return (
          <div className="flex min-w-[220px] flex-wrap gap-1">
            {quantities.map(([size, quantity]) => (
              <span
                key={size}
                className="inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-indigo-700"
              >
                T.{size} ×{' '}
                <span className="font-black text-slate-800">
                  {quantity}
                </span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Total pares',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-black text-slate-900">
          {row.original.total}
        </span>
      ),
    },
    {
      header: 'Precio unit.',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-slate-600">
          S/{' '}
          {Number(row.original.precio || 0).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Total S/',
      cell: ({ row }) => {
        const item = row.original;

        const totalItem = Object.entries(
          item.cantidades,
        ).reduce(
          (sum, [, quantity]) =>
            sum +
            Number(quantity || 0) *
              Number(item.precio || 0),
          0,
        );

        return (
          <span className="font-mono text-xs font-black text-slate-900">
            S/ {totalItem.toFixed(2)}
          </span>
        );
      },
    },
    {
      header: 'Acción',
      cell: ({ row }) => (
        <button
          type="button"
          className="mx-auto flex items-center justify-center rounded-lg border border-transparent p-1.5 text-slate-400 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
          onClick={() =>
            deleteDisplayItem(row.original.sourceIndexes)
          }
          title="Eliminar artículo completo"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: displayItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRegistrarPedido = async () => {
    if (isCreatingOrder) return;

    if (!cliente || !user) {
      await Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor, asigne un cliente antes de registrar el pedido.',
        confirmButtonColor: '#4f46e5',
      });

      return;
    }

    if (!items.length) {
      await Swal.fire({
        icon: 'warning',
        title: 'Pedido vacío',
        text: 'Agrega por lo menos un producto al pedido.',
        confirmButtonColor: '#4f46e5',
      });

      return;
    }

    const payload: CreateOrderPayload = {
      user_id: Number(user.id),
      client_id: Number(cliente.id),
      warehouse_id: Number(user.warehouseId),
      quotation_id:
        quotationId == null ? null : Number(quotationId),
      order_type: 'NORMAL',

      /*
       * Se utilizan los items originales, no displayItems,
       * porque cada talla cotizada conserva su quotation_detail_id.
       */
      items: items.flatMap((item: ItemUI) => {
        const entries = Object.entries(
          item.cantidades,
        ) as [string, number][];

        return entries
          .filter(([, quantity]) => Number(quantity) > 0)
          .map(([size, quantity]) => {
            const sizeNumber = Number(size);

            const productSizeId =
              item.sizeIdBySizeNumber?.[sizeNumber];

            return {
              product_id: Number(item.product_id),
              product_size_id:
                productSizeId == null
                  ? null
                  : Number(productSizeId),
              size: String(size),
              quantity: Number(quantity),
              unit_price: Number(item.precio),
              quotation_detail_id:
                item.quotation_detail_id == null
                  ? null
                  : Number(item.quotation_detail_id),
            };
          });
      }),
    };

    if (!payload.items.length) {
      await Swal.fire({
        icon: 'warning',
        title: 'Cantidades inválidas',
        text: 'Debe existir al menos una talla con cantidad mayor que cero.',
        confirmButtonColor: '#4f46e5',
      });

      return;
    }

    const confirm = await Swal.fire({
      title: 'Confirmar registro',
      html: `
        ¿Deseas enviar este pedido?
        <br />
        <span class="mt-2 block text-xs font-semibold uppercase text-slate-500">
          Resumen:
          <b class="font-bold text-indigo-700">
            ${totalPares} pares
          </b>
          • Total:
          <b class="font-bold text-emerald-700">
            S/ ${totalCompra.toFixed(2)}
          </b>
        </span>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
    });

    if (!confirm.isConfirmed) return;

    try {
      setIsCreatingOrder(true);

      await createOrder(payload, user.token);

      await Swal.fire({
        icon: 'success',
        title: 'Pedido creado',
        text: 'Stock reservado correctamente en el sistema.',
        confirmButtonColor: '#4f46e5',
      });

      onPedidoCreado?.();
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error?.message || 'Error al registrar pedido',
        confirmButtonColor: '#4f46e5',
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-3xs transition-all hover:border-slate-300">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-orange-600">
            <Boxes size={18} />
          </div>

          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
              Total surtido
            </span>

            <span className="mt-0.5 block font-mono text-base font-extrabold tracking-tight text-slate-800">
              {totalPares} pares
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-3xs transition-all hover:border-slate-300">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
            <DollarSign size={18} />
          </div>

          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
              Importe general
            </span>

            <span className="mt-0.5 block font-mono text-base font-black tracking-tight text-emerald-700">
              S/ {totalCompra.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-3xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-indigo-300">
            <ShoppingBag size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
              Adquirente activo
            </span>

            <span
              className="mt-0.5 block truncate text-xs font-extrabold"
              title={cliente?.razonSocial || 'Ninguno asignado'}
            >
              {cliente
                ? cliente.razonSocial
                : 'Por favor vincular'}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:flex-row sm:items-center">
          <span className="block text-xs font-black uppercase tracking-wider text-slate-700">
            Artículos en proceso de despacho
          </span>

          <span className="self-start rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700 sm:self-center">
            Artículos: {displayItems.length}
          </span>
        </div>

        {displayItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="mb-2 text-3xl">📥</p>

            <p className="text-xs font-bold text-slate-700">
              La canasta de ventas está vacía
            </p>

            <p className="mx-auto mt-0.5 max-w-xs px-4 text-[10px] leading-normal text-slate-400">
              Ingresa el código SKU del calzado y agrega las
              tallas requeridas.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden w-full overflow-x-auto md:block">
              <table className="w-full min-w-[950px] border-collapse text-left">
                <thead className="border-b border-slate-150 bg-slate-50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="border-b border-slate-200 p-3 text-[10px] font-black uppercase tracking-wider text-slate-500"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>

                <tbody className="divide-y divide-slate-150 bg-white">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-slate-50/40"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="p-3 text-xs leading-normal"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>

                <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs">
                  <tr className="border-b border-slate-200/50">
                    <td
                      colSpan={5}
                      className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      Total pares acumulados:
                    </td>

                    <td
                      colSpan={3}
                      className="p-3 font-mono text-sm font-black text-slate-800"
                    >
                      {totalPares} pares
                    </td>
                  </tr>

                  <tr>
                    <td
                      colSpan={5}
                      className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      Importe bruto total:
                    </td>

                    <td
                      colSpan={3}
                      className="p-3 font-mono text-sm font-black text-indigo-700"
                    >
                      S/ {totalCompra.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {displayItems.map((item) => {
                const totalItem = Object.entries(
                  item.cantidades,
                ).reduce(
                  (sum, [, quantity]) =>
                    sum +
                    Number(quantity || 0) *
                      Number(item.precio || 0),
                  0,
                );

                const sizes = Object.entries(
                  item.cantidades,
                )
                  .filter(([, quantity]) => quantity > 0)
                  .sort(
                    ([sizeA], [sizeB]) =>
                      Number(sizeA) - Number(sizeB),
                  );

                return (
                  <article
                    key={`${item.codigo}-${item.product_id}-${item.sourceIndexes.join('-')}`}
                    className="min-w-0 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-block max-w-full break-all rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase text-slate-800">
                          {String(item.codigo)}
                        </span>

                        <p className="mt-2 break-words text-xs font-extrabold text-slate-900">
                          {item.descripcion}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-500">
                          Serie: {item.serie || '—'}
                        </p>

                        {item.source === 'QUOTATION' && (
                          <span className="mt-1 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black text-emerald-700">
                            {item.quotation_number}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        aria-label={`Eliminar ${item.descripcion}`}
                        className="shrink-0 rounded-lg border border-rose-100 p-2 text-rose-600"
                        onClick={() =>
                          deleteDisplayItem(item.sourceIndexes)
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {sizes.map(([size, quantity]) => (
                        <span
                          key={size}
                          className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-mono text-[10px] font-bold text-indigo-700"
                        >
                          T.{size} × {quantity}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                      <span>
                        Pares:{' '}
                        <b>{item.total}</b>
                      </span>

                      <span>
                        Total:{' '}
                        <b className="text-indigo-700">
                          S/ {totalItem.toFixed(2)}
                        </b>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-3xs sm:flex-row">
        {!cliente && items.length > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-150 bg-amber-50 px-3.5 py-2.5 text-[10px] text-amber-700">
            <AlertTriangle
              size={13}
              className="shrink-0 animate-pulse text-amber-500"
            />

            <span className="font-semibold italic">
              Recuerda vincular un cliente antes de registrar
              el pedido.
            </span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[10px] text-slate-500">
            <Activity size={13} className="shrink-0" />

            <span>
              Agrega artículos para habilitar el botón de envío.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-150 bg-indigo-50 px-3.5 py-2.5 text-[10px] text-indigo-700">
            <FileCheck size={13} className="shrink-0" />

            <span className="font-semibold">
              {totalPares} productos listos para despacho.
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleRegistrarPedido}
          disabled={
            !items.length ||
            !cliente ||
            isCreatingOrder
          }
          className={`
            inline-flex w-full items-center justify-center gap-2
            rounded-xl border px-6 py-3 text-[10px] font-black
            uppercase tracking-widest transition-all sm:w-auto
            ${
              isCreatingOrder
                ? 'cursor-not-allowed border-indigo-400 bg-indigo-400 text-white'
                : 'border-indigo-700 bg-indigo-600 text-white shadow-lg shadow-indigo-150 hover:bg-indigo-700'
            }
            disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none
          `}
        >
          {isCreatingOrder ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />

                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>

              Procesando...
            </>
          ) : (
            <>
              <FileCheck size={14} />
              Registrar pedido
            </>
          )}
        </button>
      </div>
    </div>
  );
}