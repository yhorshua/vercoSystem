'use client';

import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';
import { useState } from 'react';
import styles from './page.module.css';

const tallasOrdenadas = Array.from({ length: 18 }, (_, i) => (27 + i).toString());

export default function StockTable({ data }: { data: any[] }) {
  const [sorting, setSorting] = useState([]);
  const columnHelper = createColumnHelper<any>();

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
    onSortingChange: setSorting,
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
