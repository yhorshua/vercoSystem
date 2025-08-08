'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from './registerPedido.module.css';

interface Cliente {
  codigo: string;
  nombre: string;
}

interface Item {
  codigo: string;
  descripcion: string;
  serie: string;
  precio: number;
  cantidades: Record<number, number>;
  total: number;
}

interface PedidoTablaProps {
  items: Item[];
  onDelete: (index: number) => void;
  cliente: Cliente | null;
}

export default function PedidoTabla({ items, onDelete, cliente }: PedidoTablaProps) {
  const router = useRouter();

  const totalUnidades = items.reduce((sum, item) => sum + item.total, 0);
  const totalPrecio = items.reduce((sum, item) => sum + item.total * item.precio, 0);

  const columns: ColumnDef<Item>[] = [
    {
      accessorKey: 'codigo',
      header: 'Artículo',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'descripcion',
      header: 'Descripción',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'serie',
      header: 'Serie',
      cell: info => info.getValue(),
    },
    {
      id: 'cantidades',
      header: 'Cantidades por talla',
      cell: info => {
        const item = info.row.original;
        const tallas = Object.keys(item.cantidades).map(Number).sort((a, b) => a - b);
        return tallas.map(t => `${t}/${item.cantidades[t]}`).join(' ');
      },
    },
    {
      accessorKey: 'total',
      header: 'Pares',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'precio',
      header: 'Precio',
      cell: info => (Number(info.getValue())).toFixed(2),
    },
    {
      id: 'valor',
      header: 'Valor',
      cell: info => {
        const item = info.row.original;
        return (item.total * item.precio).toFixed(2);
      },
    },
    {
      id: 'acciones',
      header: 'Eliminar',
      cell: info => (
        <button
          className={styles.deleteButton}
          onClick={() => onDelete(info.row.index)}
          title="Eliminar"
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

  const handleRegistrarPedido = async () => {
    if (!cliente) {
      Swal.fire({
        icon: 'warning',
        title: 'Cliente no seleccionado',
        text: 'Por favor selecciona un cliente antes de registrar el pedido.',
      });
      return;
    }

    const nuevoPedido = {
      id: crypto.randomUUID(),
      cliente,
      totalUnidades,
      totalPrecio,
      estado: 'Pendiente',
      items,
    };

    const pedidosGuardados = JSON.parse(localStorage.getItem('pedidos') || '[]');
    const nuevosPedidos = [...pedidosGuardados, nuevoPedido];
    localStorage.setItem('pedidos', JSON.stringify(nuevosPedidos));

    Swal.fire({
      icon: 'success',
      title: '¡Pedido registrado!',
      text: 'El pedido ha sido guardado correctamente.',
    }).then(() => {
      router.push('/order-list');
    });
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.responsiveWrapper}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}><strong>Total General</strong></td>
              <td>{totalUnidades}</td>
              <td></td>
              <td><strong>{totalPrecio.toFixed(2)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button
        className={styles.registrarButton}
        onClick={handleRegistrarPedido}
        disabled={items.length === 0 || !cliente}
      >
        Registrar Pedido
      </button>
    </div>
  );
}
