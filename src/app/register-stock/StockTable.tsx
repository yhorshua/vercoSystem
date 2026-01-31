'use client';

import { useState, useEffect } from 'react';
import { useReactTable, createColumnHelper, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import styles from './page-table.module.css';

const tallasOrdenadas = Array.from({ length: 18 }, (_, i) => (27 + i).toString()); // Tallas 27, 28, ..., 44

interface Tallas {
  [talla: string]: number; // Las cantidades por cada talla
}

interface StockItem {
  product_id: number;
  article_code: string;
  article_description: string;
  serie: string;
  tallas: Tallas;
  saldo: number;
}

export default function StockTable({ data }: { data: StockItem[] }) {
  const [stockData, setStockData] = useState<StockItem[]>(data);

  useEffect(() => {
    setStockData(data);
  }, [data]);

  const columnHelper = createColumnHelper<StockItem>();

  const columns = [
    columnHelper.accessor('article_code', {
      header: 'Código',
    }),
    columnHelper.accessor('serie', {
      header: 'Serie',
    }),
    columnHelper.accessor('article_description', {
      header: 'Descripción',
    }),
    ...tallasOrdenadas.map((talla) =>
      columnHelper.accessor((row) => row.tallas[talla] ?? 0, {
        id: talla,
        header: talla,
        cell: (info) => (
          <input
            type="number"
            value={info.row.original.tallas[talla] || 0}  // Mostrar la cantidad correspondiente a la talla
            onChange={(e) => {
              const updatedValue = parseInt(e.target.value, 10);
              if (!isNaN(updatedValue) && updatedValue >= 0) {
                const newStockData = [...stockData];  // Copiar los datos para evitar mutación directa
                const rowIndex = info.row.index;
                const tallaKey = talla;

                // Actualizamos la cantidad para la talla
                newStockData[rowIndex].tallas[tallaKey] = updatedValue;

                // Recalcular el saldo
                newStockData[rowIndex].saldo = Object.values(newStockData[rowIndex].tallas).reduce(
                  (acc, curr) => acc + curr,
                  0
                );

                // Actualizamos el estado con los nuevos datos
                setStockData(newStockData);
              }
            }}
            min="0"
            style={{ width: '60px' }}  // Estilo para los inputs
          />
        ),
      })
    ),
    columnHelper.accessor('saldo', {
      header: 'Saldo',
    }),
  ];

  const table = useReactTable({
    data: stockData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.stickyHeader}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ cursor: 'pointer' }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() ? (
                    header.column.getIsSorted() === 'asc' ? ' 🔼' : ' 🔽'
                  ) : null}
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
