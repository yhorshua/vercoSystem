'use client';

import { useReactTable, createColumnHelper, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import styles from './page.module.css';
import { useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';

interface Tallas {
  [talla: string]: number;
}

interface StockItem {
  codigo: string;
  serie: string;
  descripcion: string;
  tallas: Tallas;
  saldo: number;
  origin: string;
  precioventa: string;
}

export default function StockTable({ data, tallasDisponibles }: { data: StockItem[]; tallasDisponibles: string[] }) {
  const columnHelper = createColumnHelper<StockItem>();

  const columns = [
    columnHelper.accessor('codigo', {
      header: 'Código',
      cell: (info) => <span className={styles.codeCell}>{info.getValue()}</span>
    }),
    columnHelper.accessor('descripcion', {
      header: 'Descripción',
      cell: (info) => <span className={styles.descCell}>{info.getValue()}</span>
    }),
    columnHelper.accessor('serie', {
      header: 'Serie',
    }),
    ...tallasDisponibles.map((talla) =>
      columnHelper.accessor((row) => row.tallas[talla] ?? 0, {
        id: talla,
        header: talla,
        cell: (info) => {
          const val = info.getValue();
          return val > 0 ? (
            <span className={styles.qtyBadge}>{val}</span>
          ) : (
            <span className={styles.qtyZero}>-</span>
          );
        },
      })
    ),
    columnHelper.accessor('saldo', {
      header: 'Total',
      cell: (info) => <span className={styles.totalCell}>{info.getValue()}</span>
    }),
    columnHelper.accessor('precioventa', {
      header: 'Precio',
      cell: (info) => `S/ ${info.getValue()}`,
    }),
  ];

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

  if (data.length === 0) {
    return <div className={styles.emptyState}>No se encontraron productos.</div>;
  }

  return (
    <>
     <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Stock Total en Almacén: </span>
          <span className={styles.totalValue}>{totalSaldo}</span>
        </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={styles.th}
                  >
                    <div className={styles.thContent}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <ArrowUpDown size={14} className={styles.sortIcon} />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={styles.tr}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={styles.td}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer Fijo de Totales */}
      <div className={styles.tableFooter}>
        <div className={styles.footerInfo}>
          Mostrando {data.length} productos
        </div>
      </div>
    </>
  );
}