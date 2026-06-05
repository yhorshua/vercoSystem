'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Building2,
  ChevronDown,
  FileText,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
  Hash,
  Users,
  CheckCircle,
  Globe2,
  X,
  CreditCard
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import type { Ubigeo } from '../utils/types/ubigeo';
import rawUbigeo from '../utils/ubigeo-peru-optimizado.json';
import { createClient, getMyClients, ClientRow, CreateClientPayload } from '../services/clientServices';

// Funciones de utilidad (se mantienen exactamente igual)
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
  if (code === '01') { if (digits.length !== 8) return 'El DNI de la persona debe tener exactamente 8 dígitos'; } 
  else if (code === '06') { if (digits.length !== 11) return 'El RUC de la empresa debe tener exactamente 11 dígitos'; } 
  else { if (digits.length < 6) return 'Documento o cédula inválido'; }
  return null;
}

export default function RegisterClientePage() {
  const { user } = useUser();
  const token = user?.token ?? '';
  const ubigeo = rawUbigeo as Ubigeo;
  
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tblSearch, setTblSearch] = useState('');

  // Form states (preserved exactly as requested)
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

  const docError = useMemo(() => validateDocByCode(docTypeCode, docNumber), [docTypeCode, docNumber]);
  const docLabel = docLabelFromCode(docTypeCode);
  const docPlaceholder = docPlaceholderFromCode(docTypeCode);

  // Ubigeo logic (preserved exactly as requested)
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
    setLoading(true);
    try {
      const data = await getMyClients(token);
      setRows(data);
    } catch(e) {
      console.error(e);
    } finally {
      // Smooth visual feedback
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  }

  function resetForm() {
    setDocTypeCode('06'); 
    setDocNumber(''); 
    setBusinessName(''); 
    setTradeName('');
    setAddress(''); 
    setPhone(''); 
    setEmail(''); 
    setDepId(''); 
    setProvId(''); 
    setDistId('');
    setDepartamento(''); 
    setProvincia(''); 
    setDistrito('');
  }

  useEffect(() => {
    if (token) {
      refresh().catch((e) => {
        Swal.fire({ 
          icon: 'error', 
          title: 'Error de Red', 
          text: e?.message ?? 'Ocurrió un error cargando el listado' 
        });
      });
    }
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Sesión Inactiva', 
        text: 'No hay token. Vuelve a iniciar sesión para realizar cambios.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }
    const err = validateDocByCode(docTypeCode, docNumber);
    if (err) { 
      Swal.fire({ 
        icon: 'warning', 
        title: 'Documento Inválido', 
        text: err,
        confirmButtonColor: '#4f46e5'
      }); 
      return; 
    }
    if (!businessName.trim()) { 
      Swal.fire({ 
        icon: 'warning', 
        title: 'Campo Requerido', 
        text: 'La razón social / nombre del cliente es estrictamente obligatorio.',
        confirmButtonColor: '#4f46e5'
      }); 
      return; 
    }

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
      Swal.fire({ 
        icon: 'success', 
        title: '¡Operación Exitosa!', 
        text: 'Cliente registrado y sincronizado correctamente con el outlet.', 
        timer: 2000, 
        showConfirmButton: false 
      });
    } catch (err2: any) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Error Servidor', 
        text: err2?.message ?? 'No se pudo guardar el cliente' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Client filtering computed state
  const filteredRows = useMemo(() => {
    if (!tblSearch.trim()) return rows;
    return rows.filter(r => {
      const field = `${r.business_name} ${r.trade_name || ''} ${r.document_number} ${r.email || ''}`.toLowerCase();
      return field.includes(tblSearch.toLowerCase());
    });
  }, [rows, tblSearch]);

  const columns = useMemo<ColumnDef<ClientRow>[]>(
    () => [
      {
        header: 'Nombre Comercial / Razón Social',
        accessorKey: 'business_name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              row.original.document_type === '06' 
                ? 'bg-blue-50/75 border-blue-105 border-blue-100 text-blue-600' 
                : 'bg-indigo-50/75 border-indigo-105 border-indigo-100 text-indigo-600'
            }`}>
              {row.original.document_type === '06' ? <Building2 size={16} /> : <Contact size={16} />}
            </div>
            <div className="min-w-0">
              <span className="block font-bold text-slate-800 text-xs md:text-sm tracking-tight truncate max-w-[220px]">
                {row.original.business_name}
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold truncate max-w-[200px]">
                {row.original.trade_name || 'Sin nombre comercial'}
              </span>
            </div>
          </div>
        )
      },
      {
        header: 'Identificación',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wide ${
                row.original.document_type === '06' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                  : 'bg-purple-50 text-purple-700 border border-purple-100'
              }`}>
                {row.original.document_type === '06' ? 'RUC' : 'DNI'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">{row.original.document_number}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 font-sans">Perú</span>
          </div>
        )
      },
      {
        header: 'Canales de Contacto',
        cell: ({ row }) => (
          <div className="text-xs space-y-1">
            {row.original.email ? (
              <div className="flex items-center gap-1 text-slate-600 font-medium">
                <Mail size={12} className="text-slate-400 shrink-0" /> 
                <span className="truncate max-w-[150px]" title={row.original.email}>{row.original.email}</span>
              </div>
            ) : null}
            {row.original.phone ? (
              <div className="flex items-center gap-1 text-slate-600 font-mono font-medium">
                <Phone size={11} className="text-slate-400 shrink-0" /> 
                <span>{row.original.phone}</span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 font-medium">Sin contacto registrado</div>
            )}
          </div>
        )
      },
      {
        header: 'Dirección Registrada',
        cell: ({ row }) => (
          <div className="text-[11px] text-slate-600 leading-tight max-w-[200px]">
            <div className="font-semibold text-slate-700 truncate" title={row.original.address ?? undefined}>{row.original.address || 'Sin dirección fiscal'}</div>
            <div className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
              {row.original.district ? `${row.original.district}` : 'S/D'}
            </div>
          </div>
        )
      }
    ],
    []
  );

  const table = useReactTable({ 
    data: filteredRows, 
    columns, 
    getCoreRowModel: getCoreRowModel() 
  });

  // Clases comunes para inputs (Eleva a Shopify visual vibes)
  const inputStyles = "w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-650 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500 transition-all duration-150 shadow-3xs";
  const labelStyles = "block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1.5 flex items-center gap-1 text-slate-500";

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER BRANDING */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/5 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                  Gestión de Clientes
                </h1>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100">
                  CRM
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Registra la base de datos de compradores, empresas e instituciones para facturación electrónica.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => refresh()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all shadow-3xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Sincronizar base</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* TAB 1: FORMULARIO NUEVA FICHA */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/75 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-indigo-700 font-extrabold uppercase text-xs tracking-widest">
                  <UserPlus size={16} />
                  <span>Registrar Ficha Cliente</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <form onSubmit={onSubmit} className="p-5 space-y-4.5 space-y-4">
                
                {/* Alerta de autollenado legal */}
                <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50 flex gap-2">
                  <Info size={14} className="text-indigo-650 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 font-medium leading-normal">
                    La validación verifica que el número de caracteres coincida con el estándar de SUNAT (Perú) para evitar rechazos de comprobantes.
                  </p>
                </div>

                {/* Identidad de Documento */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelStyles}>
                        <FileText size={12} className="text-slate-400" /> Documento
                      </label>
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
                      <label className={labelStyles}>
                        <Hash size={12} className="text-slate-400" /> {docLabel}
                      </label>
                      <input 
                        className={`${inputStyles} ${docError ? 'border-amber-400 focus:ring-amber-50' : 'border-slate-200'}`}
                        type="text" 
                        value={docNumber} 
                        onChange={(e) => setDocNumber(e.target.value)}
                        placeholder={docPlaceholder}
                        disabled={loading}
                        maxLength={docTypeCode === '06' ? 11 : 8}
                      />
                    </div>
                  </div>
                  
                  {docError && (
                    <div className="flex items-center gap-1 bg-amber-50 rounded-lg p-2 border border-amber-100">
                      <AlertCircle size={12} className="text-amber-600 shrink-0" />
                      <p className="text-[9px] text-amber-700 font-semibold italic">{docError}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className={labelStyles}>Razón Social o Nombre Oficial</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2 text-slate-400" size={14} />
                      <input 
                        className={`${inputStyles} pl-9`} 
                        type="text" 
                        value={businessName} 
                        onChange={(e) => setBusinessName(e.target.value)}
                        disabled={loading}
                        required
                        placeholder="Ej: Inversiones Globales S.A.C"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelStyles}>Nombre Comercial (Marca)</label>
                    <input 
                      className={inputStyles} 
                      type="text" 
                      value={tradeName} 
                      onChange={(e) => setTradeName(e.target.value)}
                      disabled={loading}
                      placeholder="Ej: Tienda El Amigo"
                    />
                  </div>
                </div>

                {/* Datos de Contacto y Canales */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelStyles}>WhatsApp / Celular</label>
                      <input 
                        className={inputStyles} 
                        type="text" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        disabled={loading} 
                        placeholder="Ej: 999 999 999"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelStyles}>Email Electrónico</label>
                      <input 
                        className={inputStyles} 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        disabled={loading} 
                        placeholder="cliente@dominio.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className={labelStyles}>Dirección Fiscal / Delivery</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2 text-slate-400" size={14} />
                      <input 
                        className={`${inputStyles} pl-9`} 
                        type="text" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        disabled={loading} 
                        placeholder="Dirección, calle, número, interior, dpto"
                      />
                    </div>
                  </div>
                </div>

                {/* Selección Ubicación Ubigeo */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className={labelStyles}>Departamento</label>
                    <select 
                      className={inputStyles} 
                      value={depId} 
                      disabled={loading}
                      onChange={(e) => {
                        const val = e.target.value as keyof Ubigeo;
                        setDepId(val); 
                        setProvId(''); 
                        setDistId('');
                        if (val) {
                          setDepartamento(ubigeo[val].nombre); 
                          setProvincia(''); 
                          setDistrito('');
                        } else {
                          setDepartamento('');
                          setProvincia('');
                          setDistrito('');
                        }
                      }}
                    >
                      <option value="">- Elegir -</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={labelStyles}>Provincia</label>
                    <select 
                      className={inputStyles} 
                      value={provId} 
                      disabled={!depId || loading} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setProvId(val); 
                        setDistId('');
                        if (val && depId) {
                          setProvincia(ubigeo[depId].provincias[val].nombre); 
                          setDistrito('');
                        } else {
                          setProvincia('');
                          setDistrito('');
                        }
                      }}
                    >
                      <option value="">- Elegir -</option>
                      {provincias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={labelStyles}>Distrito</label>
                    <select 
                      className={inputStyles} 
                      value={distId} 
                      disabled={!provId || loading} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setDistId(val);
                        if (val && depId && provId) {
                          setDistrito(ubigeo[depId].provincias[provId].distritos[val]);
                        } else {
                          setDistrito('');
                        }
                      }}
                    >
                      <option value="">- Elegir -</option>
                      {distritos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                </div>

                {/* Acciones del Formulario */}
                <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={loading || !!docError}
                    className="flex-grow inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-750 active:scale-97 text-white py-2.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-150 transition-all border border-indigo-700 cursor-pointer disabled:opacity-50 disabled:scale-100"
                  >
                    <span>{loading ? 'Sincronizando...' : 'Alta Nuevo Cliente'}</span>
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={resetForm}
                    disabled={loading}
                    className="p-2.5 border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                    title="Limpiar campos"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* TAB 2: LISTA DE CLIENTES REGISTRADOS */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Buscador de Clientes */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex-1 min-w-0 w-full flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 hover:border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100/50 transition-all">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  value={tblSearch}
                  onChange={(e) => setTblSearch(e.target.value)}
                  placeholder="Buscar cliente por teléfono, razón social o RUC..."
                  className="w-full bg-transparent outline-none font-medium text-slate-700 text-xs placeholder-slate-400"
                />
                {tblSearch && (
                  <button 
                    onClick={() => setTblSearch('')}
                    className="p-1 hover:bg-slate-200 text-slate-400 rounded-full"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0 text-[10px] font-extrabold text-slate-500 flex items-center gap-1">
                <span>Total de fichas:</span>
                <span className="text-slate-800 font-mono font-black">{filteredRows.length}</span>
              </div>
            </div>

            {/* TABLA MODERNIZADA */}
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/85 overflow-hidden">
              
              {/* Header De Tabla */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-850 font-extrabold text-xs uppercase tracking-widest text-slate-700">
                  <Contact size={16} className="text-indigo-600 shrink-0" />
                  <span>Base de Datos de Clientes</span>
                </div>
                {loading && <span className="text-[10px] text-indigo-600 font-bold animate-pulse">Cargando actualización...</span>}
              </div>

              {/* CARD MODE ON MOBILE (<= 768px) */}
              <div className="md:hidden divide-y divide-slate-100 p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {filteredRows.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-3xl mb-3">📭</p>
                    <p className="text-xs font-bold">Sin coincidencias en la búsqueda</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Ingresa otra razón social o RUC.</p>
                  </div>
                ) : (
                  filteredRows.map((cli) => (
                    <div key={cli.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/40 transition-colors">
                      <div className="flex gap-2.5 items-start">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${cli.document_type === '06' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                          {cli.document_type === '06' ? <Building2 size={14} /> : <Contact size={14} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-xs tracking-tight line-clamp-2 leading-snug">
                            {cli.business_name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold">{cli.trade_name || 'Sin nombre comercial'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 border-t border-slate-50 pt-2 text-[11px] text-slate-600">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${cli.document_type === '06' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {cli.document_type === '06' ? 'RUC' : 'DNI'}
                        </span>
                        <span className="font-mono font-bold">{cli.document_number}</span>
                      </div>

                      {(cli.email || cli.phone || cli.address) && (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-1.5">
                          {cli.phone && (
                            <p className="text-[10px] text-slate-600 flex items-center gap-1.5 font-mono">
                              <Phone size={10} className="text-slate-400" />
                              <span>{cli.phone}</span>
                            </p>
                          )}
                          {cli.email && (
                            <p className="text-[10px] text-slate-600 flex items-center gap-1.5">
                              <Mail size={10} className="text-slate-400" />
                              <span className="truncate">{cli.email}</span>
                            </p>
                          )}
                          {cli.address && (
                            <p className="text-[10px] text-slate-600 flex items-center gap-1.5">
                              <MapPin size={10} className="text-slate-400 shrink-0" />
                              <span className="line-clamp-1">{cli.address} {cli.district && `, ${cli.district}`}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* TABLE MODE ON DESKTOP (> 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBFD] border-b border-slate-150">
                      {table.getHeaderGroups().map(hg => (
                        hg.headers.map(h => (
                          <th key={h.id} className="px-6 py-3.5 text-[10px] font-black text-slate-450 text-slate-500 uppercase tracking-wider">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))
                      ))}
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-20 text-slate-400">
                          <Search size={44} className="mb-3 opacity-20 mx-auto" />
                          <p className="text-xs font-bold text-slate-600">No se encontraron clientes registrados</p>
                          <p className="text-[10px] text-slate-450 mt-0.5">Comienza agregando un cliente en la sección izquierda.</p>
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map(row => (
                        <tr 
                          key={row.id} 
                          className="hover:bg-slate-50/50 transition-colors duration-150 group border-b border-slate-50 last:border-none"
                        >
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-6 py-4.5 py-4">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
