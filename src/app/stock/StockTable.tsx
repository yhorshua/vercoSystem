'use client';

import { useReactTable, createColumnHelper, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import styles from './page.module.css';
import { useMemo } from 'react';

// Definir el tipo para las tallas y los artículos

interface Tallas {
  [talla: string]: number; // Representa las cantidades por cada talla
}

interface StockItem {
  codigo: string;
  serie: string;
  descripcion: string;
  tallas: Tallas;  // Usamos el tipo Tallas que define las cantidades por talla
  saldo: number;
  origin: string;
  precioventa: string;
}

export default function StockTable({ data, tallasDisponibles }: { data: StockItem[]; tallasDisponibles: string[] }) {
  const columnHelper = createColumnHelper<StockItem>();

  const columns = [
    columnHelper.accessor('codigo', {
      header: 'Código',
    }),
    columnHelper.accessor('serie', {
      header: 'Serie',
    }),
    columnHelper.accessor('descripcion', {
      header: 'Descripción',
    }),
    ...tallasDisponibles.map((talla) =>
      columnHelper.accessor((row) => row.tallas[talla] ?? 0, {
        id: talla,
        header: talla,
        cell: (info) => info.getValue(),
      })
    ),
    columnHelper.accessor('saldo', {
      header: 'Saldo',
    }),
    columnHelper.accessor('origin', {
      header: 'Origen',
    }),
    columnHelper.accessor('precioventa', {
      header: 'Precio de Venta',
      cell: (info) => `S/ ${info.getValue()}`,
    }),
  ];

// Calcular el total de saldos
  const totalSaldo = useMemo(
    () => data.reduce((sum, item) => sum + item.saldo, 0),
    [data]
  );
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ cursor: 'pointer' }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{
                    asc: ' 🔼',
                    desc: ' 🔽',
                  }[header.column.getIsSorted() as string] ?? ''}
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
      </table>
      {/* Fila de Total */}
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Saldo Total: </span>
        <span className={styles.totalValue}>{ totalSaldo}</span>
      </div>
    </div>
  );
}
