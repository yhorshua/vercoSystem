'use client';

import React, { useState } from 'react';
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
  Layers,
  DollarSign,
  FileCheck,
  AlertTriangle,
  Activity,
  Boxes
} from 'lucide-react';
import type { ItemUI } from '../components/types';
import { createOrder, CreateOrderPayload } from '../services/ordersService';

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
}

export default function PedidoTabla({
  items,
  cliente,
  user,
  onDeleteItem,
  onPedidoCreado,
}: PedidoTablaProps) {

  /* ======================
     TOTALES
  ====================== */
  const totalPares = items.reduce((sum, item) => sum + item.total, 0);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const totalCompra = items.reduce((sum, item) => {
    const totalItem = Object.entries(item.cantidades)
      .reduce((s, [, qty]) => s + qty * item.precio, 0);
    return sum + totalItem;
  }, 0);

  /* ======================
     COLUMNAS TABLA (WITH TAILWIND DESIGN)
  ====================== */
  const columns: ColumnDef<ItemUI>[] = [
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-extrabold text-[10px] rounded font-mono border border-slate-200 uppercase">
          {String(row.original.codigo)}
        </span>
      )
    },
    {
      accessorKey: 'descripcion',
      header: 'Descripción',
      cell: ({ row }) => (
        <span className="font-extrabold text-slate-900 text-xs tracking-tight block">
          {row.original.descripcion}
        </span>
      )
    },
    {
      accessorKey: 'serie',
      header: 'Serie',
      cell: ({ row }) => (
        <span className="text-[10px] font-semibold text-slate-500 font-mono">
          {row.original.serie}
        </span>
      )
    },
    {
      header: 'Cantidades',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {Object.entries(row.original.cantidades)
            .filter(([, qty]) => qty > 0)
            .map(([talla, qty]) => (
              <span key={talla} className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 font-mono">
                T.{talla} × <span className="font-black text-slate-800">{qty}</span>
              </span>
            ))}
        </div>
      )
    },
    {
      header: 'Precio Unit.',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-600 font-bold">
          S/ {row.original.precio.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Total S/',
      cell: ({ row }) => {
        const item = row.original;
        const totalItem = Object.entries(item.cantidades)
          .reduce((s, [, qty]) => s + qty * item.precio, 0);

        return (
          <span className="font-mono font-black text-xs text-slate-900">
            S/ {totalItem.toFixed(2)}
          </span>
        );
      },
    },
    {
      header: 'Acción',
      cell: ({ row }) => (
        <button
          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-100 shadow-3xs flex items-center justify-center mx-auto"
          onClick={() => onDeleteItem(row.index)}
          title="Eliminar calzado de la lista"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  /* ======================
     REGISTRAR PEDIDO
  ====================== */
  const handleRegistrarPedido = async () => {

    if (isCreatingOrder) return;

    if (!cliente || !user) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor, asigne un cliente en la parte superior antes de registrar el pedido.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    if (!items.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Pedido vacío',
        text: 'Agrega por lo menos un producto al carrito de compras.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const payload: CreateOrderPayload = {
      user_id: user.id,
      client_id: cliente.id,
      warehouse_id: user.warehouseId,
      order_type: 'NORMAL',

      items: items.flatMap((item: ItemUI) => {
        const entries = Object.entries(item.cantidades) as [string, number][];

        return entries
          .filter(([, cantidad]) => cantidad > 0)
          .map(([talla, cantidad]) => ({
            product_id: item.product_id,
            product_size_id: item.sizeIdBySizeNumber[Number(talla)],
            size: String(talla),
            quantity: cantidad,
            unit_price: item.precio,
          }));
      }),
    };

    const confirm = await Swal.fire({
      title: 'Confirmar registro',
      html: `¿Deseas enviar este pedido?<br/><span class="text-xs text-slate-500 font-semibold uppercase mt-2 block">Resumen: <b class="font-bold text-indigo-700">${totalPares} pares</b> • Total: <b class="font-bold text-emerald-700">S/ ${totalCompra.toFixed(2)}</b></span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b'
    });

    if (!confirm.isConfirmed) return;

    try {

      setIsCreatingOrder(true);
      await createOrder(payload, user.token);
      Swal.fire({
        icon: 'success',
        title: 'Pedido creado',
        text: 'Stock reservado correctamente en el sistema',
        confirmButtonColor: '#4f46e5'
      });
      onPedidoCreado?.();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.message || 'Error al registrar pedido',
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setIsCreatingOrder(false); // 🔥 STOP LOADING
    }
  };

  return (
    <div className="space-y-6">

      {/* SECCIÓN RESUMEN METRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card Total Pares */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-3xs hover:border-slate-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-650 text-orange-600 flex items-center justify-center shrink-0">
            <Boxes size={18} />
          </div>
          <div>
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Surtido</span>
            <span className="text-base font-extrabold text-slate-800 tracking-tight block mt-0.5 font-mono">
              {totalPares} pares
            </span>
          </div>
        </div>

        {/* Card Importe Total */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-3xs hover:border-slate-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-650 text-emerald-650 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={18} />
          </div>
          <div>
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Importe General</span>
            <span className="text-base font-black text-emerald-700 tracking-tight block mt-0.5 font-mono">
              S/ {totalCompra.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card Cliente Vinculado */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-3xs text-white">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-indigo-300 flex items-center justify-center shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Adquirente Activo</span>
            <span className="text-xs font-extrabold block truncate mt-0.5" title={cliente?.razonSocial || 'Ninguno asignado'}>
              {cliente ? cliente.razonSocial : 'Por favor vincular'}
            </span>
          </div>
        </div>

      </div>

      {/* COMPOSICIÓN DEL CARRO / DATA GRID */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">

        {/* Cabecera Interna */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">Artículos en Proceso de Despacho</span>
          </div>
          <span className="self-start sm:self-center text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-lg font-mono">
            Modelos: {items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-3xl mb-2">📥</p>
            <p className="text-xs font-bold text-slate-700">La canasta de ventas está vacía</p>
            <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs mx-auto px-4 leading-normal">
              Ingresa el código SKU del calzado arriba, consulta la disponibilidad de inventario y agrega tallas.
            </p>
          </div>
        ) : (
          /* Responsive Table Wrapper with proper grid control */
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">

              {/* Header */}
              <thead className="bg-[#FAFBFD] border-b border-slate-150 select-none">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="p-3 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider font-sans border-b border-slate-200"
                        style={{ textAlign: h.id === 'Acción' ? 'center' : 'left' }}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-150 bg-white">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-3 text-xs leading-normal">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

              {/* Footer */}
              <tfoot className="bg-[#FAFBFD] border-t-2 border-slate-200 text-xs font-sans">
                <tr className="border-b border-slate-200/50">
                  <td colSpan={4} className="p-3 font-bold text-right text-slate-500 uppercase tracking-wider text-[10px]">
                    Total Pares Acumulados:
                  </td>
                  <td colSpan={3} className="p-3 font-black text-slate-800 font-mono text-sm">
                    {totalPares} pares
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="p-3 font-bold text-right text-slate-500 uppercase tracking-wider text-[10px]">
                    Importe Bruto Total:
                  </td>
                  <td colSpan={3} className="p-3 font-black text-indigo-700 font-mono text-sm">
                    S/ {totalCompra.toFixed(2)}
                  </td>
                </tr>
              </tfoot>

            </table>
          </div>
        )}

      </div>

      {/* FOOTER ACTIONS - BOTÓN PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 gap-4 shadow-3xs">

        {/* Dynamic Warning Alert */}
        {!cliente && items.length > 0 ? (
          <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 rounded-xl px-3.5 py-2.5 border border-amber-150">
            <AlertTriangle size={13} className="shrink-0 animate-pulse text-amber-500" />
            <span className="font-semibold italic">
              Recuerda deslizarte hacia arriba y hacer clic en <b>"Vincular"</b> para registrar un cliente en la venta.
            </span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200">
            <Activity size={13} className="shrink-0" />
            <span>Agrega artículos para habilitar el botón de envío.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-indigo-700 bg-indigo-50 rounded-xl px-3.5 py-2.5 border border-indigo-150">
            <FileCheck size={13} className="shrink-0" />
            <span className="font-semibold">{totalPares} productos listos para despacho.</span>
          </div>
        )}

        <button
          onClick={handleRegistrarPedido}
          disabled={!items.length || !cliente || isCreatingOrder}
          className={`
    w-full sm:w-auto inline-flex items-center justify-center gap-2
    font-black uppercase tracking-widest text-[10px] px-6 py-3 rounded-xl
    transition-all border cursor-pointer
    ${isCreatingOrder
              ? 'bg-indigo-400 text-white cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-150 border-indigo-700'
            }
    disabled:opacity-40 disabled:shadow-none
  `}
        >
          {isCreatingOrder ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
              Registrar Pedido
            </>
          )}
        </button>

      </div>

    </div>
  );
}
