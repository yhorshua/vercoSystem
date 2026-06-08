'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  Search,
  Calendar,
  TrendingDown,
  Check,
  AlertCircle,
  ChevronRight,
  FileText,
  User as UserIcon,
  Code,
  Layers,
  ClipboardCheck,
  ArrowUpRight,
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import { useEstadoCuenta } from './hooksEstadoCuenta';

export default function ConsultaCliente() {
  const { user } = useUser();

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('token') || ''
      : '';

  const {
    data,
    loading,
    cargarEstadoCuenta,
    crearAbono,
  } = useEstadoCuenta(token);

  // UI STATE
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'docs'>('preview');

  // AUTO LOAD cuando cambia cliente
  useEffect(() => {
    if (selectedClientId) {
      cargarEstadoCuenta(selectedClientId);
    }
  }, [selectedClientId]);

  // =========================
  // BACKEND DATA
  // =========================
  const cliente = data?.cliente;
  const cuentas = data?.cuentas || [];
  const cuotas = data?.cuotas || [];
  const abonos = data?.historialAbonos?.map((x: any) => x.abono) || [];

  // =========================
  // FILTRO FECHAS
  // =========================
  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c: any) => {
      const fecha = c.fecha_registro?.substring(0, 10);
      return fecha >= startDate && fecha <= endDate;
    });
  }, [cuentas, startDate, endDate]);

  // =========================
  // SELECCIÓN
  // =========================
  const cuentaSeleccionada = useMemo(() => {
    if (!selectedStatementId) return null;
    return cuentasFiltradas.find((c: any) => c.id === selectedStatementId);
  }, [selectedStatementId, cuentasFiltradas]);

  const cuotasActivas = useMemo(() => {
    if (!cuentaSeleccionada) return [];
    return cuotas.filter((c: any) => c.estadoCuenta?.id === cuentaSeleccionada.id);
  }, [cuotas, cuentaSeleccionada]);

  const abonosActivos = useMemo(() => {
    if (!cuentaSeleccionada) return [];
    return abonos.filter((a: any) => a.id_estado_cuenta === cuentaSeleccionada.id);
  }, [abonos, cuentaSeleccionada]);

  // =========================
  // RESUMEN
  // =========================
  const resumen = useMemo(() => {
    const deuda = cuentas.reduce((a: number, x: any) => a + Number(x.monto_inicial), 0);
    const pagado = cuentas.reduce((a: number, x: any) => a + Number(x.monto_pago || 0), 0);
    const saldo = cuentas.reduce((a: number, x: any) => a + Number(x.monto_saldo), 0);

    const vencidos = cuotas.filter((c: any) => c.estado === 'VENCIDO').length;

    return { deuda, pagado, saldo, vencidos };
  }, [cuentas, cuotas]);

  // =========================
  // ABONO
  // =========================
  const handleAbono = async () => {
    if (!selectedClientId) return;

    const monto = prompt('Monto de abono');
    if (!monto) return;

    try {
      const res = await crearAbono({
        cliente_id: selectedClientId,
        monto_abono: Number(monto),
        tipo_abono: 'EFECTIVO',
        moneda_abono: 'PEN',
      });

      await cargarEstadoCuenta(selectedClientId);

      Swal.fire('OK', `Aplicado: ${res.montoAplicado}`, 'success');
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="space-y-6 text-left">

      {/* HEADER */}
      <div className="bg-[#0b0b0e] p-4 rounded-xl border border-zinc-900 flex justify-between">
        <h1 className="text-white font-bold">
          Estado de Cuenta
        </h1>

        <button
          onClick={handleAbono}
          className="bg-indigo-600 px-4 py-2 rounded-lg text-white text-xs font-bold"
        >
          Registrar Abono
        </button>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-zinc-900 p-3 rounded-lg">
          <p className="text-xs text-zinc-400">Deuda</p>
          <p className="text-white font-bold">S/ {resumen.deuda.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-900 p-3 rounded-lg">
          <p className="text-xs text-zinc-400">Pagado</p>
          <p className="text-green-400 font-bold">S/ {resumen.pagado.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-900 p-3 rounded-lg">
          <p className="text-xs text-zinc-400">Saldo</p>
          <p className="text-yellow-400 font-bold">S/ {resumen.saldo.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-900 p-3 rounded-lg">
          <p className="text-xs text-zinc-400">Vencidos</p>
          <p className="text-red-400 font-bold">{resumen.vencidos}</p>
        </div>
      </div>

      {/* CUENTAS */}
      <div className="bg-[#0b0b0d] p-4 rounded-xl border border-zinc-900">
        {cuentasFiltradas.map((c: any) => (
          <div
            key={c.id}
            onClick={() => setSelectedStatementId(c.id)}
            className="p-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-900"
          >
            <div className="flex justify-between">
              <span className="text-white">{c.guia_interna_code}</span>
              <span className="text-zinc-400 text-xs">{c.estado}</span>
            </div>
          </div>
        ))}
      </div>

      {/* DETALLE */}
      {cuentaSeleccionada && (
        <div className="bg-[#0b0b0d] p-4 rounded-xl border border-zinc-900">
          <h2 className="text-white font-bold">
            {cuentaSeleccionada.guia_interna_code}
          </h2>

          <p className="text-zinc-400 text-xs mt-2">
            Cuotas: {cuotasActivas.length}
          </p>

          <p className="text-zinc-400 text-xs">
            Abonos: {abonosActivos.length}
          </p>
        </div>
      )}
    </div>
  );
}