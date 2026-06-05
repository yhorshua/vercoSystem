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
import { getMyClients, ClientRow } from '../services/clientServices';

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
      c.document_number.includes(term)
    );
  }, [clients, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-55 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden border border-slate-200 shadow-2xl z-10 flex flex-col max-h-[85vh] animate-in fade-in-50 zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Seleccionar Cliente
            </h3>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
              Haz clic sobre un registro para vincularlo al pedido
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
        <div className="p-4 border-b border-slate-100 bg-white">
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
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30 custom-scrollbar">
          {loading ? (
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
                    // Map to expected ClienteUI type exactly
                    const mapped: ClienteUI = {
                      id: row.id,
                      codigo: docLabel,
                      ruc: row.document_number,
                      razonSocial: row.business_name,
                      direccion: row.address || '',
                      telefono: row.phone || '',
                      correo: row.email || '',
                      departamento: row.department || '',
                      provincia: row.province || '',
                      distrito: row.district || '',
                    };
                    onSelect(mapped);
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
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-slate-800 truncate leading-snug group-hover:text-indigo-900 transition-colors">
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

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500 pt-1 border-t border-slate-50 mt-1">
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
                        <div className="col-span-2 flex items-center gap-1">
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
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
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
