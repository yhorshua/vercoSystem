import React, { useEffect, useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Building2, 
  Contact, 
  MapPin, 
  Phone, 
  Mail, 
  PlusCircle, 
  AlertCircle 
} from 'lucide-react';
import { createClient, getMyClients, ClientRow } from '../services/clientServices';

export type ClienteUI = {
  id: number;
  codigo: string;
  ruc: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
};

interface ClienteModalProps {
  open: boolean;
  token: string;
  onClose: () => void;
  onSelect: (cliente: ClienteUI) => void;
}

export default function ClienteModal({ open, token, onClose, onSelect }: ClienteModalProps) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    document_type_code: '01',
    document_number: '',
    business_name: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    if (open && token) {
      setLoading(true);
      getMyClients(token)
        .then(data => setClients(data))
        .catch(err => console.error("Error fetching clients", err))
        .finally(() => setLoading(false));
    }
  }, [open, token]);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const term = search.toLowerCase();
    return clients.filter(c => 
      c.business_name.toLowerCase().includes(term) ||
      (c.trade_name && c.trade_name.toLowerCase().includes(term)) ||
      c.document_number.includes(term) ||
      (c.phone && c.phone.includes(term)) ||
      String(c.id).includes(term)
    );
  }, [clients, search]);

  const mapClient = (row: ClientRow): ClienteUI => ({
    id: row.id,
    codigo: row.document_type === '01' ? 'DNI' : 'RUC',
    ruc: row.document_number,
    razonSocial: row.business_name,
    direccion: row.address || '',
    telefono: row.phone || '',
    correo: row.email || '',
    departamento: row.department || '',
    provincia: row.province || '',
    distrito: row.district || '',
  });

  const handleCreate = async () => {
    if (!form.business_name.trim() || !form.document_number.trim()) return;
    setSaving(true);
    try {
      const created = await createClient({
        ...form,
        business_name: form.business_name.trim(),
        document_number: form.document_number.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
      }, token);
      setClients((current) => [created, ...current.filter((client) => client.id !== created.id)]);
      onSelect(mapClient(created));
      setCreating(false);
      setForm({ document_type_code: '01', document_number: '', business_name: '', phone: '', email: '', address: '' });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo registrar el cliente');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="z-10 flex max-h-[calc(100dvh-1rem)] min-w-0 w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150 sm:max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {creating ? 'Registrar Cliente' : 'Seleccionar Cliente'}
            </h3>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
              {creating ? 'El cliente se seleccionará sin perder los productos cargados' : 'Busca por nombre, documento, teléfono o código'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Bar */}
        {!creating && <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100/50 transition-all">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por Razón Social o Documento..."
              className="w-full bg-transparent outline-none text-xs font-semibold text-slate-700 placeholder-slate-400"
              autoFocus
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="p-1 hover:bg-slate-200 text-slate-400 rounded-full"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30 custom-scrollbar">
          {creating ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={form.document_type_code}
                  onChange={(event) => setForm((current) => ({ ...current, document_type_code: event.target.value }))}
                  className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-base font-bold sm:text-xs"
                >
                  <option value="01">DNI</option>
                  <option value="06">RUC</option>
                </select>
                <input
                  value={form.document_number}
                  onChange={(event) => setForm((current) => ({ ...current, document_number: event.target.value.replace(/\D/g, '') }))}
                  maxLength={form.document_type_code === '01' ? 8 : 11}
                  placeholder="Documento *"
                  className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-base font-semibold sm:col-span-2 sm:text-xs"
                />
              </div>
              <input
                value={form.business_name}
                onChange={(event) => setForm((current) => ({ ...current, business_name: event.target.value }))}
                maxLength={200}
                placeholder="Nombre o razón social *"
                className="min-w-0 w-full rounded-lg border border-slate-200 px-3 py-2 text-base font-semibold sm:text-xs"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Teléfono" className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-base sm:text-xs" />
                <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Correo" className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-base sm:text-xs" />
              </div>
              <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} maxLength={250} placeholder="Dirección" className="min-w-0 w-full rounded-lg border border-slate-200 px-3 py-2 text-base sm:text-xs" />
              <button
                type="button"
                disabled={saving || !form.business_name.trim() || !form.document_number.trim()}
                onClick={handleCreate}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                {saving ? 'GUARDANDO...' : 'GUARDAR Y SELECCIONAR'}
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest animate-pulse">
                Cargando base de datos...
              </span>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-10 bg-white border border-slate-150 rounded-xl p-6">
              <AlertCircle size={32} className="mx-auto text-amber-500 opacity-60 mb-2" />
              <p className="text-xs font-bold text-slate-700">No se encontraron clientes</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal max-w-xs mx-auto">
                No hay clientes que coincidan con la búsqueda. Puedes crearlos primero en la pestaña "Base Clientes".
              </p>
            </div>
          ) : (
            filteredClients.map((row) => {
              const docLabel = row.document_type === '01' ? 'DNI' : 'RUC';
              return (
                <div 
                  key={row.id}
                  onClick={() => {
                    onSelect(mapClient(row));
                  }}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-indigo-600 hover:shadow-2xs hover:bg-indigo-50/10 cursor-pointer transition-all duration-150 group flex items-start gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    row.document_type === '06' 
                      ? 'bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-100' 
                      : 'bg-purple-50 border-purple-100 text-purple-600 group-hover:bg-purple-100'
                  }`}>
                    {row.document_type === '06' ? <Building2 size={15} /> : <Contact size={15} />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <h4 className="max-w-full break-words font-bold text-xs leading-snug text-slate-800 transition-colors group-hover:text-indigo-900 sm:truncate">
                        {row.business_name}
                      </h4>
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-black shrink-0 ${
                        row.document_type === '06' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : 'bg-purple-50 text-purple-700 border border-purple-100'
                      }`}>
                        {docLabel}: {row.document_number}
                      </span>
                    </div>

                    {row.trade_name && (
                      <p className="text-[10px] text-slate-400 font-semibold italic">
                        Marca: {row.trade_name}
                      </p>
                    )}

                    <div className="mt-1 grid grid-cols-1 gap-x-2 gap-y-1 border-t border-slate-50 pt-1 text-[10px] text-slate-500 sm:grid-cols-2">
                      {row.phone && (
                        <div className="flex items-center gap-1 font-mono">
                          <Phone size={10} className="text-slate-400" />
                          <span>{row.phone}</span>
                        </div>
                      )}
                      {row.email && (
                        <div className="flex items-center gap-1 truncate">
                          <Mail size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate">{row.email}</span>
                        </div>
                      )}
                      {row.address && (
                        <div className="flex min-w-0 items-center gap-1 sm:col-span-2">
                          <MapPin size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate">{row.address}, {row.district || row.province || 'Perú'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 p-3">
          {/*
          <button
            type="button"
            onClick={() => setCreating((value) => !value)}
            className="mr-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-[10px] font-black text-white uppercase tracking-wider"
          >
            {creating ? 'Volver a buscar' : 'Nuevo cliente'}
          </button>
          */}
          <button 
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
