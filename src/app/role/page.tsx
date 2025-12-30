'use client';

import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { createRole, getRoles, RoleRow } from '../services/roleServices';
import style from './roles.module.css';

export default function RolesPage() {
  const { user } = useUser();
  const token = user?.token;

  const [rows, setRows] = useState<RoleRow[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    const data = await getRoles(token);
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
      await createRole(name, token);
      setName('');
      await refresh();
      setMsg('✅ Rol creado');
    } catch (err: any) {
      setMsg(err?.message ?? 'Error creando rol');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={style.page}>
      <h2 className={style.title}>Roles</h2>

      <form onSubmit={onSubmit} className={style.formRow}>
        <input
          className={style.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del rol (ej: Administrador)"
        />
        <button className={style.button} disabled={loading || !name.trim()}>
          {loading ? 'Guardando...' : 'Crear'}
        </button>
      </form>

      {msg && <div className={style.message}>{msg}</div>}

      <div className={style.card}>
        <h3 className={style.cardTitle}>Listado</h3>
        {rows.length === 0 ? (
          <div className={style.empty}>Sin roles</div>
        ) : (
          <ul className={style.list}>
            {rows.map((r) => (
              <li key={r.id} className={style.listItem}>
                <span className={style.badge}>#{r.id}</span>
                <span>{r.name_role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
