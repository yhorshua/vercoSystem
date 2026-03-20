'use client';

import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getRoles, RoleRow } from '../services/roleServices';
import { getWarehouses, WarehouseRow } from '../services/warehouseServices';
import { createUser } from '../services/userServices';
import { 
  UserPlus, Mail, Lock, Shield, Building, 
  Phone, MapPin, IdCard, Loader2, CheckCircle2, AlertCircle 
} from 'lucide-react';

export default function CreateUserPage() {
  const { user } = useUser();
  const token = user?.token;

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados del formulario
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
      .catch((e) => setMsg({ type: 'error', text: String(e.message ?? e) }));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return setMsg({ type: 'error', text: 'Sesión expirada o token no válido' });
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

      setMsg({ type: 'success', text: '¡Usuario creado exitosamente!' });
      // Resetear campos
      setFullName(''); setEmail(''); setPassword(''); setRolId(0);
      setWarehouseId(0); setCellphone(''); setAddressHome(''); setIdCedula('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message ?? 'Error al crear el usuario' });
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
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur-md">
            <UserPlus size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Registro de Usuario</h2>
            <p className="text-indigo-100 text-sm">Completa los datos para dar de alta un nuevo integrante.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nombre Completo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <UserPlus size={16} className="text-indigo-500" /> Nombre Completo
              </label>
              <input 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-slate-600"
                placeholder="Ej. Juan Pérez"
                value={full_name} 
                onChange={(e) => setFullName(e.target.value)} 
              />
            </div>

            {/* Correo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Mail size={16} className="text-indigo-500" /> Correo Electrónico
              </label>
              <input 
                type="email"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-slate-600"
                placeholder="correo@ejemplo.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Lock size={16} className="text-indigo-500" /> Contraseña
              </label>
              <input 
                type="password"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-slate-600"
                placeholder="Mínimo 6 caracteres"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            {/* DNI */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <IdCard size={16} className="text-indigo-500" /> Documento (DNI/Cédula)
              </label>
              <input 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-slate-600"
                placeholder="Número de identidad"
                value={id_cedula} 
                onChange={(e) => setIdCedula(e.target.value)} 
              />
            </div>

            {/* Rol */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Shield size={16} className="text-indigo-500" /> Rol de Usuario
              </label>
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-slate-600 appearance-none"
                value={rol_id} 
                onChange={(e) => setRolId(Number(e.target.value))}
              >
                <option value={0}>Seleccionar rol</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name_role}</option>
                ))}
              </select>
            </div>

            {/* Almacén */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-indigo-500" /> Almacén Asignado
              </label>
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-slate-600 appearance-none"
                value={warehouse_id} 
                onChange={(e) => setWarehouseId(Number(e.target.value))}
              >
                <option value={0}>Seleccionar almacén</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.warehouse_name}</option>
                ))}
              </select>
            </div>

            {/* Celular */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Phone size={16} className="text-indigo-500" /> Celular
              </label>
              <input 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-slate-600"
                placeholder="Ej. +54 9 11..."
                value={cellphone} 
                onChange={(e) => setCellphone(e.target.value)} 
              />
            </div>

            {/* Dirección */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MapPin size={16} className="text-indigo-500" /> Dirección de domicilio
              </label>
              <input 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-slate-600"
                placeholder="Calle, Número, Ciudad..."
                value={address_home} 
                onChange={(e) => setAddressHome(e.target.value)} 
              />
            </div>
          </div>

          {/* Mensajes de feedback */}
          {msg && (
            <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              {msg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="text-sm font-medium">{msg.text}</p>
            </div>
          )}

          {/* Botón de acción */}
          <div className="mt-8">
            <button 
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                loading || !canSubmit 
                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              disabled={loading || !canSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Procesando...
                </>
              ) : (
                'Crear Usuario'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}