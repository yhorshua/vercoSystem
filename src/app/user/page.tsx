'use client';

import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getRoles, RoleRow } from '../services/roleServices';
import { getWarehouses, WarehouseRow } from '../services/warehouseServices';
import { createUser } from '../services/userServices';
import style from './create-user.module.css';

export default function CreateUserPage() {
  const { user } = useUser();
  const token = user?.token;

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol_id, setRolId] = useState<number>(0);
  const [warehouse_id, setWarehouseId] = useState<number>(0);
  const [cellphone, setCellphone] = useState('');
  const [address_home, setAddressHome] = useState('');
  const [id_cedula, setIdCedula] = useState('');

  useEffect(() => {
    if (!token) return;
    Promise.all([getRoles(token), getWarehouses(token)])
      .then(([r, w]) => {
        setRoles(r);
        setWarehouses(w);
      })
      .catch((e) => setMsg(String(e.message ?? e)));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return setMsg('No hay token');
    setMsg(null);

    try {
      setLoading(true);
      await createUser(
        {
          full_name,
          email,
          password,
          rol_id,
          warehouse_id,
          cellphone: cellphone || undefined,
          address_home: address_home || undefined,
          id_cedula: id_cedula || undefined,
        },
        token
      );

      setMsg('✅ Usuario creado');
      setFullName('');
      setEmail('');
      setPassword('');
      setRolId(0);
      setWarehouseId(0);
      setCellphone('');
      setAddressHome('');
      setIdCedula('');
    } catch (err: any) {
      setMsg(err?.message ?? 'Error creando usuario');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !!full_name.trim() &&
    !!email.trim() &&
    password.length >= 6 &&
    rol_id >= 1 &&
    warehouse_id >= 1;

  return (
    <div className={style.page}>
      <h2 className={style.title}>Crear Usuario</h2>

      <form onSubmit={onSubmit} className={style.form}>
        <div className={style.grid}>
          <div className={style.field}>
            <label className={style.label}>Nombre completo</label>
            <input className={style.input} value={full_name} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className={style.field}>
            <label className={style.label}>Correo</label>
            <input className={style.input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className={style.field}>
            <label className={style.label}>Password</label>
            <input className={style.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className={style.field}>
            <label className={style.label}>Rol</label>
            <select className={style.input} value={rol_id} onChange={(e) => setRolId(Number(e.target.value))}>
              <option value={0}>Seleccionar rol</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name_role}
                </option>
              ))}
            </select>
          </div>

          <div className={style.field}>
            <label className={style.label}>Almacen</label>
            <select className={style.input} value={warehouse_id} onChange={(e) => setWarehouseId(Number(e.target.value))}>
              <option value={0}>Seleccionar almacen</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          <div className={style.field}>
            <label className={style.label}>Celular</label>
            <input className={style.input} value={cellphone} onChange={(e) => setCellphone(e.target.value)} />
          </div>

          <div className={style.field}>
            <label className={style.label}>DNI</label>
            <input className={style.input} value={id_cedula} onChange={(e) => setIdCedula(e.target.value)} />
          </div>

          <div className={`${style.field} ${style.full}`}>
            <label className={style.label}>Dirección</label>
            <input className={style.input} value={address_home} onChange={(e) => setAddressHome(e.target.value)} />
          </div>
        </div>

        <button className={style.button} disabled={loading || !canSubmit}>
          {loading ? 'Guardando...' : 'Crear usuario'}
        </button>

        {msg && <div className={style.message}>{msg}</div>}
      </form>
    </div>
  );
}
