import { useState, useEffect, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';
import { Package, Search, CheckCircle, Truck, X, AlertCircle, RefreshCw } from 'lucide-react';
import { scanItem, closePacking, getScanStatus } from '../services/packingService';
import { useUser } from '../context/UserContext';
import { Pedido } from '../utils/types/pedidos';

interface Props {
  pedido: Pedido;
  onClose: () => void;
  onFinalizar: () => void;
}

// Interfaz para la estructura unificada de items y tallas
interface ItemUnificado {
  codigo: string;
  nombre: string;
  tallas: {
    talla: string;
    solicitado: number;
    escaneado: number;
  }[];
}

export default function PickingModal({ pedido, onClose, onFinalizar }: Props) {
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeout = useRef<NodeJS.Timeout | null>(null);

  // ESTADOS PRINCIPALES
  const [itemsUnificados, setItemsUnificados] = useState<ItemUnificado[]>([]);
  const [loading, setLoading] = useState(true);

  // Función de normalización robusta
  const normalizarTalla = (t: any): string => {
    if (!t) return "";
    return String(t)
      .replace(/[\[\]\s]/g, '') // Elimina [ ], espacios y caracteres invisibles
      .toUpperCase()
      .trim();
  };

  // 1. CARGA Y UNIFICACIÓN DE DATOS
  const loadStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Obtenemos la realidad del servidor
      const scanStatusBackend = await getScanStatus(Number(pedido.id), user.token);

      // Mapeamos los items del pedido original para tener acceso a los nombres/descripciones
      const nombresMap: Record<string, string> = {};
      pedido.items.forEach(i => {
        nombresMap[i.codigo.trim()] = i.nombre;
      });

      // Agrupamos los datos del backend por código de producto
      const agrupado: Record<string, ItemUnificado> = {};

      scanStatusBackend.forEach((d: any) => {
        const codigo = String(d.codigo).trim();
        const tallaNorm = normalizarTalla(d.talla);

        if (!agrupado[codigo]) {
          agrupado[codigo] = {
            codigo,
            nombre: nombresMap[codigo] || "Producto no identificado",
            tallas: []
          };
        }

        agrupado[codigo].tallas.push({
          talla: tallaNorm,
          solicitado: Number(d.solicitado),
          escaneado: Number(d.escaneado)
        });
      });

      // Convertimos el objeto a un array y ordenamos tallas numéricamente
      const resultadoFinal = Object.values(agrupado).map(item => ({
        ...item,
        tallas: item.tallas.sort((a, b) => Number(a.talla) - Number(b.talla))
      }));

      setItemsUnificados(resultadoFinal);
    } catch (error: any) {
      Swal.fire('Error de sincronización', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
const didRun = useRef(false);
  useEffect(() => {
    if (didRun.current) return;
  didRun.current = true;
    loadStatus();
  }, [pedido.id, user]);

  // Mantener foco en el input
  useEffect(() => {
    const focusInterval = setInterval(() => inputRef.current?.focus(), 1000);
    return () => clearInterval(focusInterval);
  }, []);

  // 2. LÓGICA DE ESCANEO
  const marcarPorCodigo = async (codigoBarras: string) => {
    const rawValue = codigoBarras.trim().toUpperCase();
    if (rawValue.length < 5 || !user) return;

    // Lógica estándar: Codigo(7 chars) + Talla(resto)
    // Nota: Ajusta el slice si tus códigos de producto tienen longitud variable
    const codigoLeido = rawValue.slice(0, 7).trim();
    const tallaLeidaRaw = rawValue.slice(7).trim();
    const tallaLeidaNorm = normalizarTalla(tallaLeidaRaw);

    // Buscar el item en nuestra fuente unificada
    const itemEncontrado = itemsUnificados.find(i => i.codigo === codigoLeido);

    if (!itemEncontrado) {
      Swal.fire({ icon: 'error', title: 'Producto no válido', text: `El código ${codigoLeido} no pertenece a este pedido`, timer: 2000, showConfirmButton: false });
      return;
    }

    const tallaObj = itemEncontrado.tallas.find(t => t.talla === tallaLeidaNorm);

    if (!tallaObj) {
      Swal.fire({ icon: 'error', title: 'Talla no válida', text: `La talla ${tallaLeidaNorm} no está solicitada para este producto`, timer: 2000, showConfirmButton: false });
      return;
    }

    if (tallaObj.escaneado >= tallaObj.solicitado) {
      Swal.fire({ icon: 'warning', title: 'Talla Completa', text: `Ya se alcanzó la cantidad solicitada para la talla ${tallaLeidaNorm}`, timer: 1500, showConfirmButton: false });
      return;
    }

    try {
      // Enviamos al backend
      await scanItem({
        order_id: Number(pedido.id),
        codigo_producto: codigoLeido,
        talla: tallaLeidaRaw, // Enviamos el raw o el norm según prefiera tu API
        cantidad: 1,
      }, user.token);

      // Actualizamos estado local inmediatamente para feedback visual rápido
      setItemsUnificados(prev => prev.map(item => {
        if (item.codigo === codigoLeido) {
          return {
            ...item,
            tallas: item.tallas.map(t =>
              t.talla === tallaLeidaNorm ? { ...t, escaneado: t.escaneado + 1 } : t
            )
          };
        }
        return item;
      }));

    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error al registrar', text: error?.message });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (scanTimeout.current) clearTimeout(scanTimeout.current);
    scanTimeout.current = setTimeout(() => {
      if (value) {
        marcarPorCodigo(value);
        e.target.value = '';
      }
    }, 100);
  };

  // 3. CÁLCULO DE TOTALES (Memoizados para performance)
  const totales = useMemo(() => {
    let solicitado = 0;
    let escaneado = 0;
    itemsUnificados.forEach(item => {
      item.tallas.forEach(t => {
        solicitado += t.solicitado;
        escaneado += t.escaneado;
      });
    });
    return { solicitado, escaneado, completo: escaneado === solicitado && solicitado > 0 };
  }, [itemsUnificados]);

  const progressPercent = totales.solicitado > 0 ? (totales.escaneado / totales.solicitado) * 100 : 0;

  const handleFinalizar = async () => {
    if (!user) return;
    try {
      await closePacking({ order_id: Number(pedido.id), user_id: user.id }, user.token);
      Swal.fire('Éxito', 'Picking finalizado correctamente', 'success');
      onFinalizar();
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    }
  };

 return (
    <div className="fixed top-[70px] left-0 right-0 bottom-0 z-[999]  flex justify-center bg-slate-900/80 backdrop-blur">
      {/* CAMBIO: Se cambió h-[95vh] por max-h-[90vh] o un valor que deje ver el fondo y sea seguro */}
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">

        {/* HEADER: Se redujo un poco el padding vertical */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black italic tracking-tighter uppercase">OPERACIÓN PICKING</h2>
              <p className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest truncate max-w-[200px] sm:max-w-none">
                #{pedido.id} • {pedido.cliente.nombre}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end">
            <div className="text-2xl sm:text-3xl font-black text-indigo-400 tabular-nums">
              {totales.escaneado} <span className="text-slate-600 text-sm">/ {totales.solicitado}</span>
            </div>
            <div className="w-32 sm:w-40 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* INPUT DE ESCANEO: shrink-0 evita que se aplaste */}
        <div className="px-6 sm:px-8 pt-4 sm:pt-6 shrink-0">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-400" size={24} />
            <input
              ref={inputRef}
              type="text"
              placeholder="ESCANEE CÓDIGO DE BARRAS..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = e.currentTarget.value.trim().toUpperCase();
                  if (value) {
                    marcarPorCodigo(value);
                    e.currentTarget.value = '';
                  }
                }
              }}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-4 border-slate-100 rounded-2xl text-lg sm:text-xl font-black text-slate-800 focus:border-indigo-500 focus:bg-white transition-all outline-none text-center tracking-[0.1em] sm:tracking-[0.2em]"
            />
          </div>
        </div>

        {/* TABLA DE PRODUCTOS: CAMBIO CRITICO - min-h-0 y overflow-hidden */}
        <div className="p-4 sm:p-8 flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto rounded-2xl sm:rounded-3xl border border-slate-100 shadow-inner bg-slate-50/30">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 italic">
                <RefreshCw className="animate-spin mb-2" /> Cargando...
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-20 bg-white/95 backdrop-blur shadow-sm text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left">Artículo</th>
                    <th className="px-4 sm:px-6 py-4 text-center">Talla</th>
                    <th className="px-4 sm:px-6 py-4 text-center">Progreso</th>
                    <th className="px-4 sm:px-6 py-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemsUnificados.map((item) => (
                    item.tallas.map((t) => (
                      <tr key={`${item.codigo}-${t.talla}`} className={`transition-colors ${t.escaneado === t.solicitado ? 'bg-emerald-50/40' : t.escaneado > 0 ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 sm:px-6 py-3">
                          <div className="font-black text-slate-700 text-xs sm:text-sm">{item.codigo}</div>
                          <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold truncate max-w-[120px] sm:max-w-[200px]">{item.nombre}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-center">
                          <span className="text-sm sm:text-base font-black text-slate-800 bg-white px-2 sm:px-3 py-1 rounded-lg border border-slate-200">{t.talla}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-3">
                          <div className="flex flex-col items-center">
                            <span className={`text-[10px] sm:text-xs font-black ${t.escaneado === t.solicitado ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {t.escaneado} / {t.solicitado}
                            </span>
                            <div className="w-16 sm:w-20 h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(t.escaneado / t.solicitado) * 100}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-right">
                          {t.escaneado === t.solicitado ? (
                            <CheckCircle size={18} className="text-emerald-600 ml-auto" />
                          ) : (
                            <span className="text-slate-300 text-[9px] font-bold uppercase italic">Pendiente</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ACCIONES FOOTER: shrink-0 */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <button onClick={onClose} className="px-6 py-2 text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:text-slate-800 transition-all">
            Cancelar Operación
          </button>

          <div className="flex items-center gap-4">
            {!totales.completo && (
              <div className="hidden sm:flex items-center gap-2 text-amber-600 animate-pulse">
                <AlertCircle size={16} />
                <span className="text-[10px] font-black uppercase">Faltan {totales.solicitado - totales.escaneado} unid.</span>
              </div>
            )}
            <button
              onClick={handleFinalizar}
              disabled={!totales.completo}
              className={`px-8 sm:px-10 py-3 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs tracking-widest transition-all shadow-xl
                ${totales.completo ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              FINALIZAR DESPACHO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}