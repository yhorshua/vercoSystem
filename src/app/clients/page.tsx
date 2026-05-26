// src/app/client/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import { 
  UserPlus, 
  Search, 
  RefreshCw, 
  Trash2, 
  MapPin, 
  Contact, 
  Mail, 
  Phone, 
  CreditCard,
  Building2,
  ChevronDown
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import type { Ubigeo } from '../utils/types/ubigeo';
import rawUbigeo from '../utils/ubigeo-peru-optimizado.json';
import { createClient, getMyClients, ClientRow, CreateClientPayload } from '../services/clientServices';

// Funciones de utilidad (se mantienen igual)
function onlyDigits(s: string) { return s.replace(/\D/g, ''); }
function docLabelFromCode(code: string) {
  if (code === '01') return 'DNI (8 dígitos)';
  if (code === '06') return 'RUC (11 dígitos)';
  return 'Documento';
}
function docPlaceholderFromCode(code: string) {
  if (code === '01') return 'Ej: 12345678';
  if (code === '06') return 'Ej: 20123456789';
  return 'Ingrese documento';
}
function validateDocByCode(code: string, value: string) {
  const digits = onlyDigits(value);
  if (code === '01') { if (digits.length !== 8) return 'DNI debe tener 8 dígitos'; } 
  else if (code === '06') { if (digits.length !== 11) return 'RUC debe tener 11 dígitos'; } 
  else { if (digits.length < 6) return 'Documento inválido'; }
  return null;
}

export default function RegisterClientePage() {
  const { user } = useUser();
  const token = user?.token ?? '';
  const ubigeo = rawUbigeo as Ubigeo;
  const [rows, setRows] = useState<ClientRow[]>([]);

  // Form state
  const [docTypeCode, setDocTypeCode] = useState<string>('06');
  const [docNumber, setDocNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [depId, setDepId] = useState<keyof Ubigeo | ''>('');
  const [provId, setProvId] = useState<string>('');
  const [distId, setDistId] = useState<string>('');
  const [departamento, setDepartamento] = useState('');
  const [provincia, setProvincia] = useState('');
  const [distrito, setDistrito] = useState('');

  const [loading, setLoading] = useState(false);

  const docError = useMemo(() => validateDocByCode(docTypeCode, docNumber), [docTypeCode, docNumber]);
  const docLabel = docLabelFromCode(docTypeCode);
  const docPlaceholder = docPlaceholderFromCode(docTypeCode);

  // Lógica de Ubigeo (se mantiene igual)
  const departamentos = useMemo(() => Object.entries(ubigeo).map(([id, dep]: any) => ({ id, nombre: dep.nombre })), [ubigeo]);
  const provincias = useMemo(() => {
    if (!depId) return [];
    return Object.entries(ubigeo[depId].provincias).map(([id, prov]: any) => ({ id, nombre: prov.nombre }));
  }, [depId, ubigeo]);
  const distritos = useMemo(() => {
    if (!depId || !provId) return [];
    return Object.entries(ubigeo[depId].provincias[provId].distritos).map(([id, nombre]) => ({ id, nombre }));
  }, [depId, provId, ubigeo]);

  async function refresh() {
    if (!token) return;
    const data = await getMyClients(token);
    setRows(data);
  }

  function resetForm() {
    setDocTypeCode('06'); setDocNumber(''); setBusinessName(''); setTradeName('');
    setAddress(''); setPhone(''); setEmail(''); setDepId(''); setProvId(''); setDistId('');
    setDepartamento(''); setProvincia(''); setDistrito('');
  }

  useEffect(() => {
    refresh().catch((e) => {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message ?? 'Error cargando clientes' });
    });
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      Swal.fire({ icon: 'warning', title: 'Sesión', text: 'No hay token. Vuelve a iniciar sesión.' });
      return;
    }
    const err = validateDocByCode(docTypeCode, docNumber);
    if (err) { Swal.fire({ icon: 'warning', title: 'Documento inválido', text: err }); return; }
    if (!businessName.trim()) { Swal.fire({ icon: 'warning', title: 'Validación', text: 'Razón social es obligatorio' }); return; }

    const payload: CreateClientPayload = {
      document_type_code: docTypeCode,
      document_number: onlyDigits(docNumber),
      business_name: businessName.trim(),
      trade_name: tradeName.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      department: departamento || undefined,
      province: provincia || undefined,
      district: distrito || undefined,
      country: 'Perú',
    };

    setLoading(true);
    try {
      await createClient(payload, token);
      await refresh();
      resetForm();
      Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Cliente registrado correctamente', timer: 2000, showConfirmButton: false });
    } catch (err2: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err2?.message ?? 'Error registrando cliente' });
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<ClientRow>[]>(
    () => [
      {
        header: 'Cliente',
        accessorKey: 'business_name',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">{row.original.business_name}</span>
            <span className="text-xs text-slate-500">{row.original.trade_name || 'Sin nombre comercial'}</span>
          </div>
        )
      },
      {
        header: 'Documento',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.original.document_type === '06' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
              {row.original.document_type === '06' ? 'RUC' : 'DNI'}
            </span>
            <span className="text-sm font-mono">{row.original.document_number}</span>
          </div>
        )
      },
      {
        header: 'Contacto',
        cell: ({ row }) => (
          <div className="text-sm space-y-1">
            {row.original.email && <div className="flex items-center gap-1 text-slate-600"><Mail size={12}/> {row.original.email}</div>}
            {row.original.phone && <div className="flex items-center gap-1 text-slate-600"><Phone size={12}/> {row.original.phone}</div>}
          </div>
        )
      },
      {
        header: 'Ubicación',
        cell: ({ row }) => (
          <div className="text-xs text-slate-600 italic leading-tight max-w-[200px]">
            {row.original.address}, {row.original.district}
          </div>
        )
      }
    ],
    []
  );

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  // Clases comunes para inputs
  const inputStyles = "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all";
  const labelStyles = "block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Clientes</h1>
            <p className="text-slate-500">Registra y administra tus clientes</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => refresh()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Columna Formulario */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase text-sm tracking-widest">
                  <UserPlus size={18} />
                  Nuevo Cliente
                </div>
              </div>

              <form onSubmit={onSubmit} className="p-6 space-y-6">
                
                {/* Sección Identidad */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={labelStyles}>Tipo Documento</label>
                      <select 
                        className={inputStyles} 
                        value={docTypeCode} 
                        onChange={(e) => { setDocTypeCode(e.target.value); setDocNumber(''); }}
                        disabled={loading}
                      >
                        <option value="06">RUC (Empresa)</option>
                        <option value="01">DNI (Persona)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelStyles}>{docLabel}</label>
                      <input 
                        className={`${inputStyles} ${docError ? 'border-red-500 focus:ring-red-500' : ''}`}
                        type="text" 
                        value={docNumber} 
                        onChange={(e) => setDocNumber(e.target.value)}
                        placeholder={docPlaceholder}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  {docError && <p className="text-[10px] text-red-500 font-medium italic">{docError}</p>}

                  <div className="space-y-1">
                    <label className={labelStyles}>Razón Social / Nombre Completo</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                      <input 
                        className={`${inputStyles} pl-10`} 
                        type="text" 
                        value={businessName} 
                        onChange={(e) => setBusinessName(e.target.value)}
                        disabled={loading}
                        placeholder="Ej: Inversiones Globales S.A.C"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelStyles}>Nombre Comercial (Opcional)</label>
                    <input 
                      className={inputStyles} 
                      type="text" 
                      value={tradeName} 
                      onChange={(e) => setTradeName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Sección Contacto */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={labelStyles}>Teléfono</label>
                      <input className={inputStyles} type="text" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelStyles}>Correo</label>
                      <input className={inputStyles} type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={labelStyles}>Dirección Fiscal</label>
                    <input className={inputStyles} type="text" value={address} onChange={(e) => setAddress(e.target.value)} disabled={loading} />
                  </div>
                </div>

                {/* Ubigeo Section */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className={labelStyles}>Dep.</label>
                    <select className={inputStyles} value={depId} onChange={(e) => {
                      const val = e.target.value as keyof Ubigeo;
                      setDepId(val); setProvId(''); setDistId('');
                      setDepartamento(ubigeo[val].nombre); setProvincia(''); setDistrito('');
                    }}>
                      <option value="">-</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelStyles}>Prov.</label>
                    <select className={inputStyles} value={provId} disabled={!depId} onChange={(e) => {
                      const val = e.target.value;
                      setProvId(val); setDistId('');
                      setProvincia(ubigeo[depId as keyof Ubigeo].provincias[val].nombre); setDistrito('');
                    }}>
                      <option value="">-</option>
                      {provincias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelStyles}>Dist.</label>
                    <select className={inputStyles} value={distId} disabled={!provId} onChange={(e) => {
                      const val = e.target.value;
                      setDistId(val);
                      setDistrito(ubigeo[depId as keyof Ubigeo].provincias[provId].distritos[val]);
                    }}>
                      <option value="">-</option>
                      {distritos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    disabled={loading || !!docError}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:transform active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {loading ? 'Procesando...' : 'Guardar Cliente'}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Columna Tabla */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold uppercase text-sm tracking-widest">
                  <Contact size={18} className="text-indigo-500" />
                  Lista de Clientes
                </div>
                <div className="text-xs font-medium text-slate-400">
                  {rows.length} Registrados
                </div>
              </div>

              <div className="overflow-x-auto flex-grow">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      {table.getHeaderGroups().map(hg => (
                        hg.headers.map(h => (
                          <th key={h.id} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {table.getRowModel().rows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-6 py-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {rows.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-sm italic">No se encontraron clientes registrados</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}