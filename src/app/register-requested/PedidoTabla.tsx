'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import Swal from 'sweetalert2';
import styles from './registerPedido.module.css';
import type { ItemUI } from '../components/types';
import { createOrder } from '../services/ordersService';

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

  const totalCompra = items.reduce((sum, item) => {
    const totalItem = Object.entries(item.cantidades)
      .reduce((s, [, qty]) => s + qty * item.precio, 0);
    return sum + totalItem;
  }, 0);

  /* ======================
     COLUMNAS TABLA
  ====================== */
  const columns: ColumnDef<ItemUI>[] = [
    { accessorKey: 'codigo', header: 'Código' },
    { accessorKey: 'descripcion', header: 'Descripción' },
    { accessorKey: 'serie', header: 'Serie' },

    {
      header: 'Cantidades',
      cell: ({ row }) =>
        Object.entries(row.original.cantidades)
          .map(([talla, qty]) => `${talla}/${qty}`)
          .join(' '),
    },

    {
      header: 'Precio Unit.',
      cell: ({ row }) =>
        `S/ ${row.original.precio.toFixed(2)}`,
    },

    {
      header: 'Total S/',
      cell: ({ row }) => {
        const item = row.original;
        const totalItem = Object.entries(item.cantidades)
          .reduce((s, [, qty]) => s + qty * item.precio, 0);

        return `S/ ${totalItem.toFixed(2)}`;
      },
    },

    {
      header: 'Acción',
      cell: ({ row }) => (
        <button
          className={styles.deleteButton}
          onClick={() => onDeleteItem(row.index)}
        >
          🗑️
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
    if (!cliente || !user) {
      Swal.fire('Datos incompletos', 'Seleccione cliente', 'warning');
      return;
    }

    if (!items.length) {
      Swal.fire('Pedido vacío', 'Agrega productos', 'warning');
      return;
    }

    const payload = {
      user_id: user.id,
      client_id: cliente.id,
      warehouse_id: user.warehouseId,
      items: items.flatMap((item) =>
        Object.entries(item.cantidades).map(([talla, cantidad]) => ({
          product_id: item.product_id,
          product_size_id: item.sizeIdBySizeNumber[Number(talla)],
          size: String(talla),
          quantity: cantidad,
          unit_price: item.precio,
        }))
      ),
    };

    const confirm = await Swal.fire({
      title: 'Confirmar pedido',
      text: `Total: ${totalPares} pares | S/ ${totalCompra.toFixed(2)}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Registrar',
    });

    if (!confirm.isConfirmed) return;

    try {
      await createOrder(payload, user.token);
      Swal.fire('Pedido creado', 'Stock reservado correctamente', 'success');
      onPedidoCreado?.();
    } catch (error: any) {
      Swal.fire(
        'Error',
        error?.message || 'Error al registrar pedido',
        'error'
      );
    }
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={4}><strong>Total pares</strong></td>
            <td colSpan={2}><strong>{totalPares}</strong></td>
          </tr>
          <tr>
            <td colSpan={4}><strong>Total S/</strong></td>
            <td colSpan={2}>
              <strong>S/ {totalCompra.toFixed(2)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>

      <button
        className={styles.registrarButton}
        onClick={handleRegistrarPedido}
        disabled={!items.length || !cliente}
      >
        Registrar Pedido
      </button>
    </div>
  );
}
