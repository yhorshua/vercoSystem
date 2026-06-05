'use client';

import React from 'react';
import { X, Package, Hash, DollarSign, ArrowRight, TableProperties, Download, Truck } from 'lucide-react';
import { Pedido, PedidoItem } from '../utils/types/pedidos';
import { startPacking } from '../services/packingService';
import { useUser } from '../context/UserContext';
import Swal from 'sweetalert2';
import { buildPedidoPdfBlob } from '../utils/pdfPedido';

interface PedidoDetalleModalProps {
  pedido: Pedido;
  onClose: () => void;
}

export default function PedidoDetalleModal({ pedido, onClose }: PedidoDetalleModalProps) {
  const { user } = useUser();
  const rolUsuario = user?.role?.name_role || '';

  const handleStartPacking = async () => {
    if (!user) return;
    try {
      await startPacking(Number(pedido.id), user.token);
      Swal.fire({
        icon: 'success',
        title: '¡Surtido Iniciado!',
        text: 'La orden ha sido asignada para picking en almacén físico.',
        confirmButtonColor: '#4f46e5'
      });
      onClose();
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Surtido',
        text: e.message || 'No se pudo iniciar el proceso.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  function agruparItems(items: PedidoItem[]): PedidoItem[] {
    const map = new Map<string, PedidoItem>();
    for (const item of items) {
      const key = item.codigo;
      if (!map.has(key)) {
        map.set(key, { ...item, tallas: [...item.tallas], subtotal: item.subtotal });
      } else {
        const existing = map.get(key)!;
        existing.tallas.push(...item.tallas);
        existing.subtotal += item.subtotal;
      }
    }
    return Array.from(map.values());
  }

  const handleGeneratePdf = async () => {
    try {
      const blob = await buildPedidoPdfBlob(pedido);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ORDEN_DESPACHO_PEDIDO_${pedido.id}_${pedido.cliente.nombre.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de PDF',
        text: e.message,
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const itemsAgrupados = agruparItems(pedido.items || []);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-150 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-[#FAFBFD]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 shadow-3xs">
              <Package size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 leading-none tracking-tight font-display">
                  PEDIDO <span className="font-mono text-indigo-600 font-extrabold">#{pedido.id}</span>
                </h2>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 text-[10px] font-extrabold rounded-md border border-indigo-100 uppercase font-mono">
                  {pedido.estado}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Vendedor Asignado: <span className="font-semibold text-slate-700">{pedido.vendedor}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-3xs">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block mb-1.5">CLIENTE ADQUIRENTE</span>
              <p className="font-extrabold text-slate-800 text-sm tracking-tight">{pedido.cliente.nombre}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1 font-mono">{pedido.cliente.telefono}</p>
              {pedido.cliente.email && <p className="text-[10px] text-slate-400 truncate mt-0.5">{pedido.cliente.email}</p>}
            </div>

            <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/60 shadow-3xs">
              <span className="text-[9px] font-black tracking-widest text-indigo-500 uppercase block mb-1.5">VALOR COMPRA TOTAL</span>
              <p className="text-xl font-black text-indigo-600 italic tracking-tight font-mono leading-none">
                S/ {pedido.totalPrecio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-indigo-500 font-bold mt-1.5">Impuestros y despachos incluidos</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-3xs">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block mb-1.5">TRIBUTACIÓN Y DESCUENTOS</span>
              <div className="space-y-1 mt-1 text-xs font-semibold">
                <div className="flex justify-between text-slate-600">
                  <span>Impuesto (IGV):</span>
                  <span className="font-mono text-slate-800">S/ {(pedido.taxAmount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-500 italic">
                  <span>Descuento Aplicado:</span>
                  <span className="font-mono font-bold">-S/ {(pedido.totalDiscount ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <TableProperties size={13} className="text-slate-400" />
              <span>Gamas Solicitadas en Pedido</span>
            </h3>

            {/* TABLA ESCRITORIO */}
            <div className="hidden sm:block border border-slate-200/70 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAFBFD] text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-slate-200/50">
                  <tr>
                    <th className="px-5 py-3.5">Sku / Descripción</th>
                    <th className="px-5 py-3.5 text-center">Talleros Disponibles (Cant)</th>
                    <th className="px-5 py-3.5 text-right">Pares Surtidos</th>
                    <th className="px-5 py-3.5 text-right">Precio Unit.</th>
                    <th className="px-5 py-3.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {itemsAgrupados.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-mono font-black text-[10px] rounded border border-slate-200 uppercase">
                          {item.id}
                        </span>
                        <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-tight mt-1 max-w-[180px] truncate">
                          {item.nombre}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-center gap-1 max-w-[260px] mx-auto">
                          {item.tallas.map((t, i) => (
                            <div key={i} className="flex flex-col items-center bg-white border border-slate-200 rounded-md px-2 py-0.5 shadow-3xs min-w-[34px]">
                              <span className="text-[8px] font-black text-indigo-500 font-mono">T.{t.talla}</span>
                              <span className="text-[10px] font-black text-slate-800 font-mono">{t.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-slate-800 font-mono text-sm">
                        {item.tallas.reduce((acc, curr) => acc + curr.cantidad, 0)}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-500 font-mono">
                        S/ {item.precio?.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-indigo-600 font-mono text-sm">
                        S/ {item.subtotal?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VISTA MOBILE */}
            <div className="sm:hidden space-y-3">
              {itemsAgrupados.map((item, idx) => {
                const itemTotalPares = item.tallas.reduce((acc, curr) => acc + curr.cantidad, 0);
                return (
                  <div key={idx} className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-3 shadow-3xs font-sans">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-mono font-black text-[10px] rounded border border-slate-200 uppercase">
                          {item.id}
                        </span>
                        <p className="text-xs font-bold text-slate-800 uppercase mt-1 leading-tight">{item.nombre}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Subtotal</span>
                        <span className="text-xs font-black text-indigo-600 font-mono">S/ {item.subtotal?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-50 pt-2.5">
                      <div className="flex flex-wrap gap-1">
                        {item.tallas.map((t, i) => (
                          <span key={i} className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-700 font-mono">
                            T.{t.talla}: <span className="font-extrabold text-indigo-600">{t.cantidad}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <button onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bolder text-xs uppercase tracking-wider rounded-xl transition-all">
            Cerrar Historial
          </button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {rolUsuario === 'Jefe Ventas' && pedido.estado === 'Aprobado' && (
              <button onClick={handleStartPacking} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm">
                <Truck size={14} /> <span>Iniciar Picking</span>
              </button>
            )}
            <button onClick={handleGeneratePdf} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm">
              <Download size={14} /> <span>Descargar Orden (PDF)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}