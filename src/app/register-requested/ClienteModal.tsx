'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { ColumnDef, useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import styles from './clienteModal.module.css';

import { getMyClients, ClientRow } from '../services/clientServices';

type ClienteUI = {
  id: number;
  codigo: string;          // lo puedes usar como id string si quieres
  ruc: string;             // aquí guardaremos document_number
  razonSocial: string;     // aquí guardaremos business_name
  direccion: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
};

function mapClientRowToUI(c: ClientRow): ClienteUI {
  return {
    id: c.id,
    codigo: String(c.id),
    ruc: c.document_number,
    razonSocial: c.business_name,
    direccion: c.address ?? '',
    telefono: c.phone ?? '',
    correo: c.email ?? '',
    departamento: c.department ?? '',
    provincia: c.province ?? '',
    distrito: c.district ?? '',
  };
}

interface ClienteModalProps {
  token: string;                 // ✅ necesario para llamar a /clients/mine
  open: boolean;                 // ✅ para saber cuándo cargar
  onClose: () => void;
  onSelect: (cliente: ClienteUI) => void;
}

export default function ClienteModal({ token, open, onClose, onSelect }: ClienteModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<ClienteUI[]>([]);

  // ✅ Cargar clientes SOLO cuando el modal se abre
  useEffect(() => {
    if (!open) return;

    if (!token) {
      Swal.fire({ icon: 'warning', title: 'Sesión', text: 'No hay token. Inicia sesión.' });
      return;
    }

    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const data = await getMyClients(token);
        if (!alive) return;
        setClientes(data.map(mapClientRowToUI));
      } catch (e: any) {
        if (!alive) return;
        Swal.fire({ icon: 'error', title: 'Error', text: e?.message ?? 'No se pudo cargar clientes' });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, token]);

  const filteredClientes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      (c.razonSocial || '').toLowerCase().includes(q) ||
      (c.ruc || '').toLowerCase().includes(q)
    );
  }, [clientes, searchTerm]);

  const columns = useMemo<ColumnDef<ClienteUI>[]>(() => [
    {
      id: 'select',
      header: 'Seleccionar',
      cell: ({ row }) => (
        <button className={styles.selectButton} onClick={() => onSelect(row.original)}>
          Seleccionar
        </button>
      ),
    },
    { accessorKey: 'codigo', header: 'ID' },
    { accessorKey: 'ruc', header: 'Documento' },
    { accessorKey: 'razonSocial', header: 'Cliente' },
  ], [onSelect]);

  const table = useReactTable({
    data: filteredClientes,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Seleccionar Cliente</h2>

        <input
          type="text"
          placeholder="Buscar por nombre o documento..."
          className={styles.input}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {loading ? (
          <div style={{ padding: 12 }}>Cargando clientes...</div>
        ) : (
          <div className={styles.responsiveWrapper}>
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
            </table>

            {filteredClientes.length === 0 && (
              <div style={{ padding: 12, color: '#666' }}>Sin clientes</div>
            )}
          </div>
        )}

        <button className={styles.addButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
