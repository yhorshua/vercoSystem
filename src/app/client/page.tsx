'use client';

import { useState } from 'react';
import styles from './clientes.module.css';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

// Simulación de datos de Perú (puedes ampliar)
const ubigeoPeru: Record<string, Record<string, string[]>> = {
  Lima: {
    Lima: ['Miraflores', 'San Isidro', 'Surco'],
    Barranca: ['Paramonga', 'Pativilca'],
  },
  Cusco: {
    Cusco: ['Santiago', 'Wanchaq'],
    Urubamba: ['Yucay', 'Ollantaytambo'],
  },
};

// Tipo de cliente
type Cliente = {
  codigo: string;
  ruc: string;
  razonSocial: string;
  direccion: string;
  direccion2: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
};

// Simula un servicio REST
const simularRegistroCliente = async (cliente: Omit<Cliente, 'codigo'>): Promise<Cliente> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const codigoGenerado = 'CLI' + Math.floor(Math.random() * 900 + 100);
      resolve({ codigo: codigoGenerado, ...cliente });
    }, 500);
  });
};

export default function RegisterClientePage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [direccion2, setDireccion2] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [provincia, setProvincia] = useState('');
  const [distrito, setDistrito] = useState('');
  const [cargando, setCargando] = useState(false);

  const agregarCliente = async () => {
    if (!ruc || !razonSocial || !departamento || !provincia || !distrito) return;

    setCargando(true);
    try {
      const clienteRegistrado = await simularRegistroCliente({
        ruc,
        razonSocial,
        direccion,
        direccion2,
        telefono,
        correo,
        departamento,
        provincia,
        distrito,
      });
      setClientes((prev) => [...prev, clienteRegistrado]);

      setRuc('');
      setRazonSocial('');
      setDireccion('');
      setDireccion2('');
      setTelefono('');
      setCorreo('');
      setDepartamento('');
      setProvincia('');
      setDistrito('');
    } catch (error) {
      console.error('Error registrando cliente:', error);
    } finally {
      setCargando(false);
    }
  };

  const columns = [
    { header: 'Código', accessorKey: 'codigo' },
    { header: 'RUC', accessorKey: 'ruc' },
    { header: 'Razón Social', accessorKey: 'razonSocial' },
    { header: 'Dirección', accessorKey: 'direccion' },
    { header: 'Dirección 2', accessorKey: 'direccion2' },
    { header: 'Teléfono', accessorKey: 'telefono' },
    { header: 'Correo', accessorKey: 'correo' },
    { header: 'Departamento', accessorKey: 'departamento' },
    { header: 'Provincia', accessorKey: 'provincia' },
    { header: 'Distrito', accessorKey: 'distrito' },
  ];

  const table = useReactTable({
    data: clientes,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Registrar Cliente</h1>

      <div className={styles.inputGroup}>
        <label className={styles.label}>RUC:</label>
        <input className={styles.input} type="text" value={ruc} onChange={(e) => setRuc(e.target.value)} />

        <label className={styles.label}>Razón Social:</label>
        <input className={styles.input} type="text" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />

        <label className={styles.label}>Dirección:</label>
        <input className={styles.input} type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />

        <label className={styles.label}>Dirección 2:</label>
        <input className={styles.input} type="text" value={direccion2} onChange={(e) => setDireccion2(e.target.value)} />

        <label className={styles.label}>Teléfono:</label>
        <input className={styles.input} type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

        <label className={styles.label}>Correo:</label>
        <input className={styles.input} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />

        <label className={styles.label}>Departamento:</label>
        <select className={styles.input} value={departamento} onChange={(e) => {
          setDepartamento(e.target.value);
          setProvincia('');
          setDistrito('');
        }}>
          <option value="">Selecciona un departamento</option>
          {Object.keys(ubigeoPeru).map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>

        <label className={styles.label}>Provincia:</label>
        <select className={styles.input} value={provincia} onChange={(e) => {
          setProvincia(e.target.value);
          setDistrito('');
        }} disabled={!departamento}>
          <option value="">Selecciona una provincia</option>
          {departamento && Object.keys(ubigeoPeru[departamento]).map(prov => (
            <option key={prov} value={prov}>{prov}</option>
          ))}
        </select>

        <label className={styles.label}>Distrito:</label>
        <select className={styles.input} value={distrito} onChange={(e) => setDistrito(e.target.value)} disabled={!provincia}>
          <option value="">Selecciona un distrito</option>
          {provincia && ubigeoPeru[departamento][provincia].map(dist => (
            <option key={dist} value={dist}>{dist}</option>
          ))}
        </select>
      </div>

      <button className={styles.addButton} onClick={agregarCliente} disabled={cargando}>
        {cargando ? 'Registrando...' : 'Agregar Cliente'}
      </button>

      <div className={styles.tableContainer}>
        <div className={styles.responsiveWrapper}>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className={styles.tableCell}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={styles.tableCell}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
