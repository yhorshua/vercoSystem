'use client';

import { useState, useEffect } from 'react';
import styles from './clientes.module.css';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { simularRegistroCliente, getClientes, Cliente } from '../register-requested/mockData';
import { getUbigeoPeru } from './ubigeoData'; // Asegúrate de importar el servicio que creamos

export default function RegisterClientePage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ubigeo, setUbigeo] = useState<Record<string, Record<string, string[]>>>({});
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

  // Cargar clientes desde localStorage y mock al montar el componente
  useEffect(() => {
    const clientesGuardados = JSON.parse(localStorage.getItem('clientes') || '[]');
    const clientesMock = getClientes();  // Aquí obtienes los clientes mock de tu servicio
    
    // Combinamos ambos conjuntos de datos (localStorage y mock) y aseguramos que no haya duplicados
    const clientesUnicos = [
      ...clientesMock,
      ...clientesGuardados.filter((clienteGuardado: Cliente) => 
        !clientesMock.some((clienteMock: Cliente) => clienteMock.ruc === clienteGuardado.ruc)
      ),
    ];

    setClientes(clientesUnicos);  // Asigna correctamente el tipo
    // Llamar al simulador de servicio para obtener el ubigeo
    const loadUbigeo = async () => {
      const ubigeoData = await getUbigeoPeru();
      setUbigeo(ubigeoData);
    };

    loadUbigeo();
  }, []);

  // Función para agregar un cliente
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

      // Verificar si el cliente ya existe antes de agregarlo
      const clienteExistente = clientes.some(cliente => cliente.ruc === clienteRegistrado.ruc);
      if (clienteExistente) {
        alert('Este cliente ya ha sido registrado');
        return;
      }

      // Actualizar el estado de los clientes solo si no es duplicado
      const clientesActualizados = [...clientes, clienteRegistrado];
      setClientes(clientesActualizados);

      // Guardar el nuevo cliente en localStorage
      localStorage.setItem('clientes', JSON.stringify(clientesActualizados));

      // Limpiar los campos
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

  // Columnas de la tabla
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

  // Crear la tabla con los datos de los clientes
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

        <div className={styles.selectContainer}>
          <label className={styles.label}>Departamento:</label>
          <select
            className={styles.input}
            value={departamento}
            onChange={(e) => {
              setDepartamento(e.target.value);
              setProvincia('');
              setDistrito('');
            }}
          >
            <option value="">Selecciona un departamento</option>
            {Object.keys(ubigeo).map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.selectContainer}>
          <label className={styles.label}>Provincia:</label>
          <select
            className={styles.input}
            value={provincia}
            onChange={(e) => {
              setProvincia(e.target.value);
              setDistrito('');
            }}
            disabled={!departamento}
          >
            <option value="">Selecciona una provincia</option>
            {departamento &&
              Object.keys(ubigeo[departamento]).map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
          </select>
        </div>

        <div className={styles.selectContainer}>
          <label className={styles.label}>Distrito:</label>
          <select
            className={styles.input}
            value={distrito}
            onChange={(e) => setDistrito(e.target.value)}
            disabled={!provincia}
          >
            <option value="">Selecciona un distrito</option>
            {provincia &&
              ubigeo[departamento][provincia].map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
          </select>
        </div>
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
