'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  FileText, 
  Search, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  UserPlus,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import ClienteModal, { ClienteUI } from '../register-requested/ClienteModal';
import { useEstadoCuenta } from './hooksEstadoCuenta';
import { useUser } from '../context/UserContext';
import { registrarAbono as registrarAbonoService, RegistrarAbonoDto } from '../services/estadoCuentaService';

export default function EstadoCuentaClientePage() {
  const { user } = useUser();
  const token = user?.token || '';

  const [selectedClient, setSelectedClient] = useState<ClienteUI | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  const { data, loading, cargarEstadoCuenta } = useEstadoCuenta(token);

  // --- Tipos ---
  type EstadoCuentaType = {
    id: number;
    monto_inicial: number;
    monto_pago?: number;
    monto_saldo: number;
    fecha_registro?: string;
    estado?: string;
    guia_interna_code?: string;
  };

  type CuotaType = { id: number; estadoCuenta?: { id: number }; estado?: string };
  type AbonoType = { id_estado_cuenta: number };
  type HistorialAbono = { abono: AbonoType };

  // --- Efectos ---
  useEffect(() => {
    if (selectedClient) {
      cargarEstadoCuenta(selectedClient.id, startDate, endDate);
    }
  }, [selectedClient, startDate, endDate]);

  const cuentas: EstadoCuentaType[] = data?.cuentas || [];
  const cuotas: CuotaType[] = data?.cuotas || [];
  const abonos: AbonoType[] = data?.historialAbonos?.map((x: HistorialAbono) => x.abono) || [];

  // --- Lógica de filtrado ---
  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter(c => 
      c.fecha_registro && 
      c.fecha_registro.substring(0, 10) >= startDate && 
      c.fecha_registro.substring(0, 10) <= endDate
    );
  }, [cuentas, startDate, endDate]);

  const cuentaSeleccionada = useMemo(() => {
    if (!selectedStatementId) return null;
    return cuentasFiltradas.find(c => c.id === selectedStatementId) || null;
  }, [selectedStatementId, cuentasFiltradas]);

  const cuotasActivas = useMemo(() => {
    if (!cuentaSeleccionada) return [];
    return cuotas.filter(c => c.estadoCuenta?.id === cuentaSeleccionada.id);
  }, [cuotas, cuentaSeleccionada]);

  const abonosActivos = useMemo(() => {
    if (!cuentaSeleccionada) return [];
    return abonos.filter(a => a.id_estado_cuenta === cuentaSeleccionada.id);
  }, [abonos, cuentaSeleccionada]);

  const resumen = useMemo(() => {
    const deuda = cuentas.reduce((a, x) => a + Number(x.monto_inicial), 0);
    const pagado = cuentas.reduce((a, x) => a + Number(x.monto_pago || 0), 0);
    const saldo = cuentas.reduce((a, x) => a + Number(x.monto_saldo), 0);
    const vencidos = cuotas.filter(c => c.estado === 'VENCIDO').length;
    return { deuda, pagado, saldo, vencidos };
  }, [cuentas, cuotas]);

  // --- Handlers ---
  const handleAbono = async () => {
    if (!selectedClient || !token) return;

    const { value: montoStr } = await Swal.fire({
      title: 'Registrar Nuevo Abono',
      input: 'number',
      inputLabel: 'Monto en Soles (S/)',
      inputPlaceholder: '0.00',
      showCancelButton: true,
      confirmButtonText: 'Procesar Pago',
      confirmButtonColor: '#4f46e5',
      cancelButtonText: 'Cancelar'
    });

    if (!montoStr) return;

    const monto = Number(montoStr);
    if (isNaN(monto) || monto <= 0) {
      return Swal.fire('Error', 'El monto debe ser un número mayor a 0', 'error');
    }

    try {
      const dto: RegistrarAbonoDto = {
        cliente_id: selectedClient.id,
        monto_abono: monto,
        tipo_abono: 'EFECTIVO',
        moneda_abono: 'PEN',
      };

      const res = await registrarAbonoService(dto, token);
      await cargarEstadoCuenta(selectedClient.id, startDate, endDate);

      Swal.fire({
        icon: 'success',
        title: '¡Abono Exitoso!',
        text: `Aplicado: S/ ${res.montoAplicado}. Sobrante: S/ ${res.montoSobrante}`,
        confirmButtonColor: '#4f46e5',
      });
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error registrando abono', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              Estado de Cuenta
            </h1>
            {selectedClient ? (
              <div className="flex items-center gap-2 mt-1 text-indigo-600 font-medium">
                <CheckCircle2 size={16} />
                <span>{selectedClient.razonSocial}</span>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Selecciona un cliente para ver sus movimientos.</p>
            )}
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-colors px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md shadow-indigo-100"
          >
            <UserPlus size={18} />
            {selectedClient ? 'Cambiar Cliente' : 'Seleccionar Cliente'}
          </button>
        </header>

        {selectedClient && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Deuda Total" value={resumen.deuda} icon={<DollarSign className="text-blue-600" />} color="blue" />
              <StatCard label="Monto Pagado" value={resumen.pagado} icon={<CheckCircle2 className="text-emerald-600" />} color="emerald" />
              <StatCard label="Saldo Pendiente" value={resumen.saldo} icon={<Clock className="text-amber-600" />} color="amber" />
              <StatCard label="Cuotas Vencidas" value={resumen.vencidos} icon={<AlertCircle className="text-rose-600" />} color="rose" isCount />
            </div>

            {/* Filters and Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: List and Filters */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold text-sm uppercase tracking-wider">
                    <Filter size={16} />
                    Filtros de Fecha
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Desde</label>
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Hasta</label>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="font-bold text-slate-700 text-sm">Documentos / Guías</h3>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                    {loading ? (
                      <div className="p-10 text-center text-slate-400 text-sm italic">Cargando...</div>
                    ) : cuentasFiltradas.length === 0 ? (
                      <div className="p-10 text-center space-y-2">
                        <Search className="mx-auto text-gray-300" size={32} />
                        <p className="text-slate-400 text-xs">No se encontraron registros</p>
                      </div>
                    ) : (
                      cuentasFiltradas.map(c => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedStatementId(c.id)}
                          className={`p-4 cursor-pointer transition-all flex items-center justify-between group ${
                            selectedStatementId === c.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-gray-50 border-l-4 border-transparent'
                          }`}
                        >
                          <div>
                            <p className={`font-bold text-sm ${selectedStatementId === c.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                              {c.guia_interna_code || `ID: ${c.id}`}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                              <Calendar size={12} /> {c.fecha_registro?.substring(0, 10)}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                                <p className="text-xs font-bold text-slate-700">S/ {c.monto_saldo.toFixed(2)}</p>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    c.estado === 'PAGADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {c.estado}
                                </span>
                            </div>
                            <ChevronRight size={16} className={`text-slate-300 transition-transform ${selectedStatementId === c.id ? 'translate-x-1 text-indigo-400' : ''}`} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={handleAbono}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-all py-4 rounded-2xl text-white font-bold shadow-lg shadow-emerald-100 uppercase tracking-widest text-xs"
                >
                  <ArrowUpRight size={18} />
                  Registrar Nuevo Abono
                </button>
              </div>

              {/* Right Column: Details */}
              <div className="lg:col-span-8">
                {cuentaSeleccionada ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Detalle de Operación</span>
                        <h2 className="text-xl font-bold text-slate-800">{cuentaSeleccionada.guia_interna_code}</h2>
                      </div>
                      <div className="flex gap-2">
                        <div className="bg-gray-100 px-4 py-2 rounded-xl text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Cuotas</p>
                            <p className="text-sm font-bold text-slate-700">{cuotasActivas.length}</p>
                        </div>
                        <div className="bg-gray-100 px-4 py-2 rounded-xl text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Abonos</p>
                            <p className="text-sm font-bold text-slate-700">{abonosActivos.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
                        <section className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                <Clock size={14} /> Historial de Cuotas
                            </h4>
                            {cuotasActivas.length > 0 ? (
                                <div className="space-y-2">
                                    {cuotasActivas.map(cuota => (
                                        <div key={cuota.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-600">ID Cuota #{cuota.id}</span>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                                cuota.estado === 'VENCIDO' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                                {cuota.estado}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-xs text-slate-400 italic">No hay cuotas registradas.</p>}
                        </section>

                        <section className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                <FileText size={14} /> Abonos Aplicados
                            </h4>
                            {abonosActivos.length > 0 ? (
                                <div className="space-y-2">
                                    {abonosActivos.map((abono, idx) => (
                                        <div key={idx} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                                            <span className="text-xs font-medium text-emerald-800 tracking-tight">Referencia EC-{abono.id_estado_cuenta}</span>
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-xs text-slate-400 italic">No se han realizado abonos.</p>}
                        </section>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-300 h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10">
                    <div className="bg-gray-50 p-6 rounded-full mb-4">
                        <FileText size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-slate-600 font-bold">Ninguna cuenta seleccionada</h3>
                    <p className="text-slate-400 text-sm max-w-xs mt-2">
                        Selecciona un documento del listado de la izquierda para ver el detalle de cuotas y pagos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Modal Cliente */}
        <ClienteModal
          open={modalOpen}
          token={token}
          onClose={() => setModalOpen(false)}
          onSelect={cliente => {
            setSelectedClient(cliente);
            setModalOpen(false);
            setSelectedStatementId(null);
          }}
        />
      </div>
    </div>
  );
}

// --- Componentes Auxiliares ---

function StatCard({ label, value, icon, color, isCount = false }: { label: string, value: number, icon: React.ReactNode, color: string, isCount?: boolean }) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        rose: 'bg-rose-50 text-rose-700 border-rose-100'
    };

    return (
        <div className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between`}>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-800">
                    {isCount ? value : `S/ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
            </div>
            <div className={`p-3 rounded-xl ${colors[color]} border`}>
                {icon}
            </div>
        </div>
    );
}