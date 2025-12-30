'use client';

import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { createWarehouse, getWarehouses, WarehouseRow } from '../services/warehouseServices';
import style from './warehouses.module.css';

export default function WarehousesPage() {
  const { user } = useUser();
  const token = user?.token;

  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [warehouseName, setWarehouseName] = useState(''); // ✅ antes: name
  const [location, setLocation] = useState(''); // ✅ antes: address
  const [type, setType] = useState(''); // ✅ antes: phone

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    const data = await getWarehouses(token);
    setRows(data);
  }

  useEffect(() => {
    refresh().catch((e) => setMsg(String(e.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return setMsg('No hay token');
    setMsg(null);

    try {
      setLoading(true);

      await createWarehouse(
        {
          warehouse_name: warehouseName.trim(),
          location: location.trim() || undefined,
          type: type.trim() || undefined,
        },
        token
      );

      setWarehouseName('');
      setLocation('');
      setType('');

      await refresh();
      setMsg('✅ Warehouse creado');
    } catch (err: any) {
      setMsg(err?.message ?? 'Error creando warehouse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={style.page}>
      <h2 className={style.title}>Warehouses</h2>

      <form onSubmit={onSubmit} className={style.formGrid}>
        <input
          className={style.input}
          value={warehouseName}
          onChange={(e) => setWarehouseName(e.target.value)}
          placeholder="Nombre"
        />

        <input
          className={style.input}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ubicación / Dirección (opcional)"
        />

        <input
          className={style.input}
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Tipo (opcional)"
        />

        <button className={style.button} disabled={loading || !warehouseName.trim()}>
          {loading ? 'Guardando...' : 'Crear'}
        </button>
      </form>

      {msg && <div className={style.message}>{msg}</div>}

      <div className={style.card}>
        <h3 className={style.cardTitle}>Listado</h3>

        {rows.length === 0 ? (
          <div className={style.empty}>Sin warehouses</div>
        ) : (
          <div className={style.tableWrap}>
            <table className={style.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Ubicación</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((w) => (
                  <tr key={w.id}>
                    <td>{w.id}</td>
                    <td>{w.warehouse_name}</td>
                    <td>{w.location ?? '-'}</td>
                    <td>{w.type ?? '-'}</td>
                    <td>{w.status ? 'Activo' : 'Inactivo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
