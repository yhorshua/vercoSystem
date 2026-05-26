import { X, Package, Hash, DollarSign } from 'lucide-react';
import { Pedido, PedidoItem } from '../utils/types/pedidos'; // Ajusta la ruta a tus tipos
import { startPacking } from '../services/packingService';
import { useUser } from '../context/UserContext';
import Swal from 'sweetalert2';
import { buildPedidoPdfBlob } from '../utils/pdfPedido';


export default function PedidoDetalleModal({ pedido, onClose }: { pedido: Pedido, onClose: () => void }) {

  const { user } = useUser();
  const rolUsuario = user?.role?.name_role || '';

  const handleStartPacking = async () => {
    if (!user) return;

    try {
      await startPacking(Number(pedido.id), user.token);

      Swal.fire({
        icon: 'success',
        title: 'Alistamiento iniciado',
        text: 'Ya puedes comenzar el picking'
      });

      onClose(); // opcional
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e.message
      });
    }
  };

  function agruparItems(items: PedidoItem[]): PedidoItem[] {
    const map = new Map<string, PedidoItem>();

    for (const item of items) {
      const key = item.codigo; // 🔥 usar codigo

      if (!map.has(key)) {
        map.set(key, {
          ...item,
          tallas: [...item.tallas],
          subtotal: item.subtotal,
        });
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
      a.download = `pedido-${pedido.id}.pdf`;
      a.click();

      URL.revokeObjectURL(url); // 🔥 importante

    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  const itemsAgrupados = agruparItems(pedido.items);
  return (
    <div className="fixed top-[70px] left-0 right-0 bottom-0 z-[999]  flex justify-center bg-slate-900/80 backdrop-blur">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 leading-none">PEDIDO #{pedido.id}</h2>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter italic">Vendedor: {pedido.vendedor}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-grow overflow-y-auto p-6 space-y-8">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
              <p className="font-bold text-slate-800">{pedido.cliente.nombre}</p>
              <p className="text-xs text-slate-500 mt-1">{pedido.cliente.telefono}</p>
            </div>
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Monto Total</p>
              <p className="text-xl font-black text-indigo-600 italic leading-none">S/ {pedido.totalPrecio.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impuestos / Descuentos</p>
              <p className="text-xs font-bold text-slate-700">Tax: S/ {pedido.taxAmount?.toFixed(2) || '0.00'}</p>
              <p className="text-xs font-bold text-rose-500 italic">Desc: -S/ {pedido.totalDiscount?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          {/* Table */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Hash size={14} /> Artículos del Pedido
            </h3>
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="px-4 py-3">Item / Descripción</th>
                    <th className="px-4 py-3 text-center">Tallas / Cant</th>
                    <th className="px-4 py-3 text-right">Pares</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {itemsAgrupados.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-black text-slate-800">{item.id}</div>
                        <div className="text-[10px] text-slate-400 uppercase leading-tight max-w-[150px]">{item.nombre}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-center gap-1 max-w-[200px] mx-auto">
                          {item.tallas.map((t, i) => (
                            <div key={i} className="flex flex-col items-center bg-white border border-slate-200 rounded-md px-1.5 py-0.5">
                              <span className="text-[9px] font-black text-indigo-500">{t.talla}</span>
                              <span className="text-[10px] font-bold text-slate-700">{t.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-600">
                        {item.tallas.reduce((acc, curr) => acc + curr.cantidad, 0)}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-400 font-medium">S/ {item.precio.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-black text-indigo-600">S/ {item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/80 font-black text-slate-800">
                  <tr>
                    <td colSpan={2} className="px-4 py-4">TOTALES</td>
                    <td className="px-4 py-4 text-right text-indigo-600">{pedido.totalUnidades}</td>
                    <td></td>
                    <td className="px-4 py-4 text-right text-indigo-600 italic">S/ {pedido.totalPrecio.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-slate-800 hover:bg-black text-white rounded-2xl font-black text-xs tracking-widest transition-all shadow-lg active:scale-95"
            >
              CERRAR DETALLES
            </button>
            {rolUsuario === 'Jefe Ventas' && pedido.estado === 'Aprobado' && (
              <button
                onClick={handleStartPacking}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-lg transition-all"
              >
                INICIAR ALISTAMIENTO
              </button>
            )}
            <button
              onClick={handleGeneratePdf}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg transition-all"
            >
              DESCARGAR ORDEN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}