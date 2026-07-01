'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  Boxes,
  Check,
  CheckCircle2,
  RefreshCw,
  Barcode,
  X,
  Keyboard,
  QrCode,
  Zap,
  PackageCheck,
  CircleDot,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers
} from 'lucide-react';
import { scanItemsBulk, closePacking, getScanStatus } from '../services/packingService';
import { useUser } from '../context/UserContext';
import { Pedido } from '../utils/types/pedidos';

interface PickingModalProps {
  pedido: Pedido;
  onClose: () => void;
  onFinalizar: () => void;
}

interface ItemUnificado {
  codigo: string;
  nombre: string;
  tallas: { talla: string; solicitado: number; escaneado: number; }[];
}

export default function PickingModal({ pedido, onClose, onFinalizar }: PickingModalProps) {
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeout = useRef<NodeJS.Timeout | null>(null);
  const [scannerMode, setScannerMode] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [itemsUnificados, setItemsUnificados] = useState<ItemUnificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastScanned, setLastScanned] = useState<{ codigo: string; talla: string; timestamp: number } | null>(null);

  const pendingScansRef = useRef<
    Map<
      string,
      {
        codigo_producto: string;
        talla: string;
        cantidad: number;
      }
    >
  >(new Map());

  const [pendingCount, setPendingCount] = useState(0);
  const [syncingScans, setSyncingScans] = useState(false);

  const normalizarTalla = (t: any): string => {
    if (!t) return "";
    return String(t).replace(/[\[\]\s]/g, '').toUpperCase().trim();
  };

  const loadStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const scanStatusBackend = await getScanStatus(Number(pedido.id), user.token);
      const nombresMap: Record<string, string> = {};
      pedido.items.forEach(i => { nombresMap[i.codigo.trim().toUpperCase()] = i.nombre; });

      const agrupado: Record<string, ItemUnificado> = {};
      scanStatusBackend.forEach((d: any) => {
        const codigo = String(d.codigo).trim().toUpperCase();
        const tallaNorm = normalizarTalla(d.talla);
        if (!agrupado[codigo]) {
          agrupado[codigo] = { codigo, nombre: nombresMap[codigo] || `Calzado Modelo #${codigo}`, tallas: [] };
        }
        agrupado[codigo].tallas.push({ talla: tallaNorm, solicitado: Number(d.solicitado), escaneado: Number(d.escaneado) });
      });

      setItemsUnificados(Object.values(agrupado).map(item => ({
        ...item,
        tallas: item.tallas.sort((a, b) => Number(a.talla) - Number(b.talla))
      })));
    } catch (e) {
      console.error("Error al cargar estado del picking:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, [pedido.id, user]);

  useEffect(() => {
    const focusInterval = setInterval(() => {
      // Automáticamente enfoca la caja de texto solo si el usuario no está tratando de escribir en otro lado
      if (document.activeElement?.tagName !== 'INPUT' && scannerMode) {
        inputRef.current?.focus();
      }
    }, 1500);
    return () => clearInterval(focusInterval);
  }, [scannerMode]);

  const refreshPendingCount = () => {
    const total = Array.from(pendingScansRef.current.values()).reduce(
      (acc, item) => acc + Number(item.cantidad || 0),
      0,
    );

    setPendingCount(total);
  };

  const addPendingScan = (
    codigo_producto: string,
    talla: string,
    cantidad: number,
  ) => {
    const codigo = codigo_producto.trim().toUpperCase();
    const tallaNorm = normalizarTalla(talla);

    const key = `${codigo}|${tallaNorm}`;
    const prev = pendingScansRef.current.get(key);

    if (prev) {
      pendingScansRef.current.set(key, {
        ...prev,
        cantidad: prev.cantidad + cantidad,
      });
    } else {
      pendingScansRef.current.set(key, {
        codigo_producto: codigo,
        talla: tallaNorm,
        cantidad,
      });
    }

    refreshPendingCount();
  };

  const flushPendingScans = async () => {
    if (!user) return;

    const items = Array.from(pendingScansRef.current.values());

    if (items.length === 0) return;

    setSyncingScans(true);

    try {
      await scanItemsBulk(
        {
          order_id: Number(pedido.id),
          items,
        },
        user.token,
      );

      pendingScansRef.current.clear();
      refreshPendingCount();
    } finally {
      setSyncingScans(false);
    }
  };

  const marcarPorCodigo = (codigoBarras: string) => {
    const rawValue = codigoBarras.trim().toUpperCase();

    if (rawValue.length < 5 || !user) return;

    const codigoLeido = rawValue.startsWith('PROD-')
      ? rawValue.slice(0, 8).trim()
      : rawValue.slice(0, 7).trim();

    const tallaLeida = rawValue.startsWith('PROD-')
      ? rawValue.slice(8).trim()
      : rawValue.slice(7).trim();

    const tallaLeidaNorm = normalizarTalla(tallaLeida);

    const itemEncontrado = itemsUnificados.find(
      (i) => i.codigo === codigoLeido,
    );

    if (!itemEncontrado) {
      Swal.fire({
        icon: 'error',
        title: 'Código Ajeno a Orden',
        text: `El SKU ${codigoLeido} no corresponde a los artículos solicitados de este pedido.`,
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#1e293b',
        color: '#fff',
        iconColor: '#f87171',
      });

      return;
    }

    const tallaObj = itemEncontrado.tallas.find(
      (t) => t.talla === tallaLeidaNorm,
    );

    if (!tallaObj) {
      Swal.fire({
        icon: 'warning',
        title: 'Talla no Solicitada',
        text: `Talla ${tallaLeidaNorm} no es parte de las unidades requeridas en el SKU ${itemEncontrado.codigo}.`,
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#1e293b',
        color: '#fff',
        iconColor: '#fbbf24',
      });

      return;
    }

    if (tallaObj.escaneado >= tallaObj.solicitado) {
      Swal.fire({
        icon: 'info',
        title: 'Cantidad Completa',
        text: `La talla ${tallaLeidaNorm} del SKU ${itemEncontrado.codigo} ya ha sido completamente surtida.`,
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#1e293b',
        color: '#fff',
        iconColor: '#60a5fa',
      });

      return;
    }

    addPendingScan(codigoLeido, tallaLeidaNorm, 1);

    setLastScanned({
      codigo: codigoLeido,
      talla: tallaLeidaNorm,
      timestamp: Date.now(),
    });

    setItemsUnificados((prev) =>
      prev.map((item) => {
        if (item.codigo !== codigoLeido) return item;

        return {
          ...item,
          tallas: item.tallas.map((t) =>
            t.talla === tallaLeidaNorm
              ? {
                ...t,
                escaneado: t.escaneado + 1,
              }
              : t,
          ),
        };
      }),
    );
  };

  const totales = useMemo(() => {
    let solicitado = 0, escaneado = 0;
    itemsUnificados.forEach(item => {
      item.tallas.forEach(t => { solicitado += t.solicitado; escaneado += t.escaneado; });
    });
    return { solicitado, escaneado, completo: escaneado === solicitado && solicitado > 0 };
  }, [itemsUnificados]);

  const progressPercent = totales.solicitado > 0 ? (totales.escaneado / totales.solicitado) * 100 : 0;

  const handleFinalizar = async () => {
    if (!user) return;

    if (!totales.completo) {
      Swal.fire({
        icon: 'warning',
        title: 'Pedido incompleto',
        text: 'Aún faltan productos por escanear.',
        background: '#0f172a',
        color: '#fff',
      });

      return;
    }

    try {
      Swal.fire({
        title: 'Sincronizando escaneos',
        text: 'Registrando escaneos pendientes antes de despachar...',
        background: '#0f172a',
        color: '#fff',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await flushPendingScans();

      await closePacking(
        {
          order_id: Number(pedido.id),
          user_id: user.id,
        },
        user.token,
      );

      Swal.fire({
        icon: 'success',
        title: '¡Surtido Despachado!',
        text: 'La orden ha sido precintada y turnada al área de transporte/embarques.',
        confirmButtonColor: '#6366f1',
        background: '#0f172a',
        color: '#fff',
        customClass: {
          popup: 'rounded-3xl border border-slate-800 shadow-2xl',
          confirmButton:
            'px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs tracking-widest uppercase transition-all',
        },
      });

      onFinalizar();
    } catch (error: any) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error?.message ||
          'No se pudo sincronizar el escaneo o cerrar el packing.',
        background: '#0f172a',
        color: '#fff',
      });
    }
  };

  const handleScanAll = async () => {
    if (!user) return;

    const items: {
      codigo_producto: string;
      talla: string;
      cantidad: number;
    }[] = [];

    for (const item of itemsUnificados) {
      for (const talla of item.tallas) {
        const faltantes = talla.solicitado - talla.escaneado;

        if (faltantes > 0) {
          items.push({
            codigo_producto: item.codigo,
            talla: talla.talla,
            cantidad: faltantes,
          });
        }
      }
    }

    if (items.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Pedido completo',
        text: 'No hay productos pendientes por escanear.',
        background: '#0f172a',
        color: '#fff',
      });

      return;
    }

    try {
      Swal.fire({
        title: 'Ejecutando Escaneo Masivo',
        text: 'Registrando todos los productos pendientes en un solo proceso...',
        background: '#0f172a',
        color: '#fff',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await scanItemsBulk(
        {
          order_id: Number(pedido.id),
          items,
        },
        user.token,
      );

      pendingScansRef.current.clear();
      refreshPendingCount();

      await loadStatus();

      Swal.fire({
        icon: 'success',
        title: '¡Operación realizada!',
        text: 'Escaneo completo y validado de manera exitosa en el servidor.',
        confirmButtonColor: '#10b981',
        background: '#0f172a',
        color: '#fff',
        customClass: {
          popup: 'rounded-2xl border border-slate-800',
        },
      });
    } catch (error: any) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.message || 'Ocurrió un error procesando el escaneo masivo.',
        background: '#0f172a',
        color: '#fff',
      });
    }
  };

  return (
    <div id="picking-modal-backdrop" className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 font-sans">
      {/* RICH BLURRED INDUSTRIAL OVERLAY */}
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />

      {/* FLUID METALLIC CONSOLE FRAMEWORK */}
      <div id="picking-modal-card" className="relative bg-[#fafbff] w-full max-w-6xl h-full sm:h-[95vh] sm:max-h-[95vh] rounded-none sm:rounded-[2.2rem] shadow-[0_30px_70px_rgba(2,6,23,0.35)] flex flex-col overflow-hidden border-0 sm:border border-slate-200/90 animate-in fade-in-50 zoom-in-95 duration-200">

        {/* NEON RACING HEADWAY STRIP */}
        <div className="h-2 w-full bg-gradient-to-r from-[#4f46e5] via-[#818cf8] to-[#10b981] shrink-0" />

        {/* LOGISTICS HEAD OFFICE STELLAR HEADER */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-slate-900 text-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-5 shadow-inner relative overflow-hidden shrink-0 border-b border-slate-800 pr-12 lg:pr-6">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-505/10 to-[#818cf8]/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Top-right close button for quick mobile dismissal */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-slate-800/60 p-2 rounded-full border border-slate-700/60 z-30 flex items-center justify-center cursor-pointer"
            title="Cerrar modal"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-3 sm:gap-4 relative z-10 w-full lg:w-auto">
            {/* Pulsing Logistics Cubic Badge */}
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-[0.9rem] sm:rounded-[1.25rem] flex items-center justify-center text-indigo-100 shrink-0 shadow-[0_10px_20px_rgba(99,102,241,0.3)] border border-indigo-400/20 relative">
              <Boxes size={22} className="sm:size-[26px] animate-pulse" />
              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-400 rounded-full border border-slate-900" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-[#a5b4fc] bg-indigo-500/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-indigo-500/20 font-mono inline-block">
                  CENTRO DE SURTIDO FÍSICO
                </span>
                <span className="bg-slate-800 text-[8px] sm:text-[9px] font-bold tracking-wider px-2 py-0.5 sm:py-1 rounded-md text-slate-330 border border-slate-700 font-mono">
                  ORDEN #{pedido.id}
                </span>
              </div>

              <h2 id="picking-title" className="text-base sm:text-2xl font-black tracking-tight text-white mt-1 sm:mt-1.5 uppercase flex items-center gap-1.5">
                OPERACIÓN PICKING & PACKING
              </h2>

              <p className="text-slate-400 text-xs mt-0.5 sm:mt-1 font-semibold flex flex-wrap items-center gap-1">
                Cliente: <span className="text-indigo-200 font-extrabold uppercase bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40 truncate max-w-[180px] sm:max-w-none">{pedido.cliente.nombre}</span>
              </p>
            </div>
          </div>

          {/* High contrast visual indicator panel */}
          <div className="flex items-center justify-between lg:justify-start gap-3 sm:gap-4 w-full lg:w-auto bg-slate-950/50 p-2.5 sm:p-3.5 rounded-2xl sm:rounded-2.5xl border border-slate-800 relative z-10 self-stretch lg:self-auto">
            <div className="leading-tight shrink-0">
              <span className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest block">EFICIENCIA DE CARGA</span>
              <div className="text-xl sm:text-3xl font-black text-white font-mono mt-0.5 flex items-baseline gap-1">
                <span className="text-indigo-400">{totales.escaneado}</span>
                <span className="text-slate-500 text-xs sm:text-sm font-medium">/ {totales.solicitado} pares</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="font-mono text-[9px] sm:text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-emerald-500/10">
                {progressPercent.toFixed(0)}%
              </span>
              <div className="w-20 sm:w-32 h-2 sm:h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5 mt-0.5">
                <div
                  className={`h-full transition-all duration-700 ease-out rounded-full ${totales.completo
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                    }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CONTROL DE ENTRADA INDUSTRIAL (Laser focus active style) */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 bg-slate-100/80 border-b border-slate-200 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center shrink-0">

          {/* Capture mode Switcher, redesigned to mimic dynamic digital switch */}
          <div className="flex flex-col gap-1 shrink-0 justify-center">
            <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-500 tracking-wider font-mono">Dispositivo de Captura</span>
            <div className="flex bg-slate-300/40 p-0.5 sm:p-1 rounded-xl border border-slate-200/90 self-start">
              <button
                type="button"
                onClick={() => {
                  setScannerMode(true);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer select-none ${scannerMode
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <QrCode size={13} className={scannerMode ? "text-indigo-600 animate-pulse" : "text-slate-400"} />
                Pistola Láser
              </button>
              <button
                type="button"
                onClick={() => setScannerMode(false)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer select-none ${!scannerMode
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Keyboard size={13} className={!scannerMode ? "text-indigo-600" : "text-slate-400"} />
                Teclado Manual
              </button>
            </div>
          </div>

          {/* INPUT BAR SYSTEM WITH NEON LASER BAR EFFECT */}
          <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3">
            <div className="flex-1 relative group">
              {/* Virtual scanning red line guide to indicate laser focus is active */}
              {scannerMode && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/40 animate-pulse pointer-events-none z-20" />
              )}

              <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400 pointer-events-none">
                {scannerMode ? (
                  <Barcode className="text-indigo-500 animate-pulse" size={18} />
                ) : (
                  <Keyboard className="text-slate-405" size={18} />
                )}
              </div>

              <input
                id="picking-scanner-input"
                ref={inputRef}
                type="text"
                value={manualCode}
                placeholder={
                  scannerMode
                    ? 'ESCANEAR CÓDIGO (PROD-XXXX)...'
                    : 'Escriba o pegue el SKU de la caja...'
                }
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setManualCode(value);

                  if (scannerMode) {
                    if (scanTimeout.current) clearTimeout(scanTimeout.current);
                    scanTimeout.current = setTimeout(() => {
                      if (value) {
                        marcarPorCodigo(value);
                        setManualCode('');
                      }
                    }, 150);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !scannerMode && manualCode.trim()) {
                    marcarPorCodigo(manualCode);
                    setManualCode('');
                  }
                }}
                className={`w-full pl-10 pr-4 py-3 sm:py-4 bg-white border rounded-xl text-xs sm:text-sm font-bold tracking-wider outline-none transition-all ${scannerMode
                  ? 'border-indigo-400 ring-4 ring-indigo-50/70 focus:border-indigo-600 placeholder:text-slate-400 font-mono shadow-[0_0_15px_rgba(99,102,241,0.1)] text-slate-900 bg-white'
                  : 'border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-450 text-slate-900 font-mono'
                  }`}
              />

              {scannerMode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="hidden sm:inline-block text-[8px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded font-mono">
                    LÁSER ACTIVO
                  </span>
                </div>
              )}
            </div>

            {/* Actions sub wrapper to fit button sizes on compact grids */}
            <div className="flex gap-2 shrink-0">
              {/* Action manual submit Button */}
              {!scannerMode && (
                <button
                  id="picking-trigger-btn"
                  onClick={() => {
                    if (!manualCode.trim()) return;
                    marcarPorCodigo(manualCode);
                    setManualCode('');
                  }}
                  disabled={!manualCode.trim()}
                  className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all select-none flex items-center justify-center gap-1.5 ${manualCode.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-150 active:scale-95 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                    }`}
                >
                  <ArrowRight size={13} />
                  Surtir
                </button>
              )}

              {/* Quick Surtido Exprés button */}
              <button
                id="picking-auto-fill-btn"
                onClick={handleScanAll}
                className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 hover:text-indigo-200 border border-indigo-900 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-sm"
                title="Completar automáticamente todo el calzado de este lote"
              >
                <Zap size={13} className="text-amber-400 fill-amber-400" />
                Escanear Todo
              </button>
            </div>
          </div>

          {/* floating last scanned feedback */}
          {lastScanned && (
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-2 animate-in slide-in-from-right-3 duration-200 shrink-0 self-start sm:self-center max-w-full">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 border border-emerald-200">
                <Check size={10} className="stroke-[3]" />
              </div>
              <div className="leading-tight">
                <p className="text-[7px] sm:text-[8px] text-emerald-500 font-extrabold uppercase tracking-widest font-mono">Última lectura ok</p>
                <p className="text-[10px] sm:text-[11px] font-mono font-black text-emerald-950">{lastScanned.codigo} • T. {lastScanned.talla}</p>
              </div>
            </div>
          )}

        </div>

        {/* MANIFEST CARGO DETAIL SECTION */}
        <div className="flex-1 overflow-hidden p-3 sm:p-6 bg-slate-50 flex flex-col min-h-0">

          <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-sm custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-450 py-16">
                <RefreshCw className="animate-spin mb-4 text-indigo-500" size={32} />
                <span className="text-xs font-bold tracking-widest text-slate-500 font-mono">DESPLEGANDO MANIFIESTO FISICO...</span>
              </div>
            ) : itemsUnificados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/50">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 mb-4 animate-bounce">
                  <PackageCheck size={32} />
                </div>
                <h4 className="text-slate-800 font-black text-sm uppercase tracking-wide">Pedido cerrado o sin artículos</h4>
                <p className="text-slate-405 text-xs mt-1 max-w-sm">No existen calzados pendientes para procesar picking en esta orden en particular.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-150/80">
                {itemsUnificados.map((item, idx) => {
                  const checkCompletoPorSku = item.tallas.every(t => t.escaneado === t.solicitado);

                  return (
                    <div
                      key={item.codigo}
                      className={`p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 transition-all duration-150 ${checkCompletoPorSku
                        ? 'bg-gradient-to-r from-emerald-500/[0.03] to-transparent'
                        : 'hover:bg-slate-50/50'
                        }`}
                    >
                      {/* Brand and product specs details */}
                      <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1 w-full">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${checkCompletoPorSku
                          ? 'bg-emerald-50 border-emerald-250 text-emerald-600 shadow-sm'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                          {checkCompletoPorSku ? (
                            <ShieldCheck size={20} className="sm:size-[22px] text-emerald-500" />
                          ) : (
                            <Package size={20} className="sm:size-[22px] text-slate-500 animate-pulse" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-150 text-slate-805 font-mono font-black text-[9px] sm:text-[10px] rounded-md sm:rounded-lg border border-slate-250 uppercase tracking-wider">
                              Código • {item.codigo}
                            </span>

                            {checkCompletoPorSku ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[8px] sm:text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                                <CheckCircle2 size={10} /> COMPLETADO
                              </span>
                            ) : (
                              <span className="bg-indigo-50 text-indigo-700 text-[8px] sm:text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 border border-indigo-150">
                                <Layers size={10} className="animate-spin text-indigo-500" /> EN PROCESO
                              </span>
                            )}
                          </div>

                          <h4 className="font-extrabold text-slate-850 text-xs sm:text-sm uppercase tracking-tight mt-1 sm:mt-1.5 leading-snug">
                            {item.nombre}
                          </h4>
                        </div>
                      </div>

                      {/* Tactile grid of sizes and stock counters */}
                      <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 xl:flex xl:flex-wrap gap-2 w-full xl:w-auto items-center justify-start xl:justify-end shrink-0 mt-2 xl:mt-0">
                        {item.tallas.map((t) => {
                          const completado = t.escaneado === t.solicitado;
                          const parcial = t.escaneado > 0 && !completado;

                          return (
                            <button
                              key={t.talla}
                              type="button"
                              onClick={() => {
                                if (t.escaneado < t.solicitado) {
                                  marcarPorCodigo(`${item.codigo}${t.talla}`);
                                }
                              }}
                              disabled={completado}
                              title={completado ? 'Talla totalmente surtida' : `Haga clic para leer la lectura de Talla ${t.talla}`}
                              className={`flex items-center border rounded-xl p-2 sm:p-2.5 shadow-2xs relative select-none transition-all duration-150 text-left outline-none cursor-pointer group/btn min-h-[44px] sm:min-h-[46px] w-full xl:min-w-[124px] ${completado
                                ? 'bg-emerald-500/10 border-emerald-300 text-emerald-800 shadow-inner'
                                : parcial
                                  ? 'bg-amber-500/[0.08] border-amber-305 text-amber-900 font-bold ring-2 ring-amber-100 hover:bg-amber-100/50'
                                  : 'bg-white border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-900 font-medium active:scale-95'
                                }`}
                            >
                              <div className="flex flex-col min-w-[32px] sm:min-w-[45px]">
                                <span className={`text-[7px] sm:text-[8px] uppercase tracking-wider font-mono font-bold ${completado ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  Talla
                                </span>
                                <span className={`font-mono text-xs sm:text-sm leading-tight mt-0.5 ${completado ? 'text-emerald-700 font-black' : parcial ? 'text-amber-850 font-black' : 'text-slate-800 font-black'}`}>
                                  {t.talla}
                                </span>
                              </div>

                              <div className="h-5 sm:h-6 w-[1px] sm:w-[1.5px] bg-slate-200 group-hover/btn:bg-indigo-100 mx-1.5 sm:mx-2 shrink-0" />

                              <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                                <span className="font-bold text-[7px] sm:text-[8px] text-slate-450 uppercase tracking-widest leading-none">Pares</span>
                                <span className="font-mono text-[10px] sm:text-[11px] leading-tight font-black mt-0.5 shrink-0 truncate">
                                  <span className={completado ? 'text-emerald-700 font-black' : parcial ? 'text-amber-850 font-black' : 'text-slate-800'}>{t.escaneado}</span>
                                  <span className="text-slate-400 font-semibold text-[9px] sm:text-[10px]">/{t.solicitado}</span>
                                </span>
                              </div>

                              {completado && (
                                <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center border border-white shadow-sm">
                                  <Check size={9} className="sm:size-[10px] stroke-[3]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* DESPATCH CONTROL FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-815 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sm:gap-5 shrink-0 shadow-2xl relative z-20">

          <button
            type="button"
            onClick={onClose}
            className="w-full md:w-auto px-5 py-3 sm:py-3.5 text-slate-350 hover:text-white font-extrabold text-[11px] sm:text-xs uppercase tracking-widest transition-all cursor-pointer text-center bg-slate-800 hover:bg-slate-750 rounded-xl border border-slate-700"
          >
            Detener Surtido
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
            {!totales.completo && (
              <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 self-stretch sm:self-auto font-mono justify-center">
                <CircleDot size={14} className="text-amber-400 animate-pulse shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                  Faltan {totales.solicitado - totales.escaneado} pares
                </span>
              </div>
            )}

            <button
              id="picking-finalize-btn"
              onClick={handleFinalizar}
              disabled={!totales.completo || syncingScans}
              className={`w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl font-black text-[11px] sm:text-xs tracking-widest transition-all select-none uppercase border flex items-center justify-center gap-2
    ${totales.completo && !syncingScans
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-emerald-600 shadow-lg shadow-emerald-500/20 hover:scale-102 active:scale-98 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed shadow-none'}`}
            >
              <PackageCheck
                size={15}
                className={totales.completo ? 'animate-bounce' : 'opacity-40'}
              />
              {syncingScans ? 'Sincronizando...' : 'Aprobar y Despachar'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
