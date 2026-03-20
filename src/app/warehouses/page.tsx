'use client';

import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { createWarehouse, getWarehouses, WarehouseRow } from '../services/warehouseServices';
import { 
  Building2, 
  MapPin, 
  Tags, 
  Plus, 
  Loader2, 
  LayoutGrid, 
  CheckCircle, 
  AlertCircle,
  Search
} from 'lucide-react';

export default function WarehousesPage() {
  const { user } = useUser();
  const token = user?.token;

  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [warehouseName, setWarehouseName] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function refresh() {
    if (!token) return;
    try {
      const data = await getWarehouses(token);
      setRows(data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    refresh().catch((e) => setMsg({ type: 'error', text: String(e.message ?? e) }));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return setMsg({ type: 'error', text: 'No hay token' });
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
      setMsg({ type: 'success', text: '¡Almacén creado exitosamente!' });
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message ?? 'Error creando warehouse' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Building2 className="text-indigo-600" size={28} />
              Gestión de Almacenes
            </h1>
            <p className="text-slate-500 text-sm font-medium">Configura y visualiza tus puntos de stock.</p>
          </div>
        </div>

        {/* Create Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Plus size={16} /> Crear Nuevo Almacén
            </h2>
          </div>
          <form onSubmit={onSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  placeholder="Nombre del almacén"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ubicación (opcional)"
                />
              </div>

              <div className="relative">
                <Tags className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Tipo (ej. Principal)"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-auto">
                {msg && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-left-2 ${
                    msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {msg.text}
                  </div>
                )}
              </div>
              <button 
                className={`w-full md:w-48 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  loading || !warehouseName.trim() 
                  ? 'bg-slate-300 shadow-none cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                }`} 
                disabled={loading || !warehouseName.trim()}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                {loading ? 'Guardando...' : 'Crear Almacén'}
              </button>
            </div>
          </form>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid size={16} /> Listado de Almacenes
            </h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
              {rows.length} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            {rows.length === 0 ? (
              <div className="p-12 text-center">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Building2 size={32} />
                </div>
                <p className="text-slate-400 font-medium">No hay almacenes registrados aún.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-widest">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Nombre Almacén</th>
                    <th className="px-6 py-4">Ubicación / Dirección</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">#{w.id}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                          {w.warehouse_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 italic">
                        {w.location ? (
                          <span className="flex items-center gap-1"><MapPin size={14} /> {w.location}</span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium uppercase tracking-tighter">
                          {w.type ?? 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          w.status 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${w.status ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {w.status ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}