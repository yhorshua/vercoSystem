'use client';

import { useEffect, useState } from 'react';
import { useReactTable, createColumnHelper, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import styles from './page.module.css';

// Definir el tipo para las tallas y los artículos
const tallasOrdenadas = Array.from({ length: 18 }, (_, i) => (27 + i).toString());

interface Tallas {
  [talla: string]: number; // Representa las cantidades por cada talla
}

interface StockItem {
  codigo: string;
  serie: string;
  descripcion: string;
  tallas: Tallas;  // Usamos el tipo Tallas que define las cantidades por talla
  saldo: number;
}

export default function StockTable({ data }: { data: StockItem[] }) {
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]); // Aseguramos que 'sorting' tenga el tipo correcto
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
    ...tallasOrdenadas.map((talla) =>
      columnHelper.accessor((row) => row.tallas[talla] ?? 0, {
        id: talla,
        header: talla,
        cell: (info) => info.getValue(),
      })
    ),
    columnHelper.accessor('saldo', {
      header: 'Saldo',
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting, // Ahora 'onSortingChange' usa correctamente 'setSorting'
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
    </div>
  );
}
