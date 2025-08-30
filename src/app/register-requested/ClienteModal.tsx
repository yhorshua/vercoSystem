'use client';
import { useState, useMemo } from 'react';
import { ColumnDef, useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import styles from './clienteModal.module.css';

interface Cliente {
  codigo: string;
  ruc: string;
  razonSocial: string;
  direccion: string;
  direccion2?: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

interface ClienteModalProps {
  clientes: Cliente[];  // Aquí recibes la lista de clientes
  onClose: () => void;
  onSelect: (cliente: Cliente) => void;
}

export default function ClienteModal({ clientes, onClose, onSelect }: ClienteModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtramos los clientes según el término de búsqueda
  const filteredClientes = useMemo(
    () => clientes.filter(c => c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase())),
    [clientes, searchTerm]
  );

  const columns = useMemo<ColumnDef<Cliente>[]>(() => [
    {
      id: 'select',
      header: 'Seleccionar',
      cell: ({ row }) => (
        <button
          className={styles.selectButton}
          onClick={() => onSelect(row.original)}  // Al seleccionar un cliente, ejecutas onSelect
        >
          Seleccionar
        </button>
      ),
    },
    {
      accessorKey: 'codigo',
      header: 'Código',
    },
    {
      accessorKey: 'razonSocial',
      header: 'Nombre del Cliente',
    },
    // Otras columnas si lo deseas, como RUC, Razón Social, etc.
  ], [onSelect]);

  const table = useReactTable({
    data: filteredClientes,  // Datos filtrados de los clientes
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Seleccionar Cliente</h2>
        <input
          type="text"
          placeholder="Buscar cliente..."
          className={styles.input}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}  // Filtras mientras escribes
        />

        <div className={styles.responsiveWrapper}>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
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
          </table>
        </div>

        <button className={styles.addButton} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
