'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import ClienteModal from './ClienteModal';
import PedidoTabla from './PedidoTabla';
import { getProductStockByWarehouseAndCode } from '../services/stockServices';
import type { ItemUI } from '../components/types';
import { useUser } from '../context/UserContext';
import { 
  Search, 
  UserPlus, 
  FileText, 
  Tag, 
  HelpCircle, 
  Hash, 
  Layers, 
  Sparkles, 
  CheckCircle, 
  Building2, 
  ArrowRight,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';

type ClienteUI = {
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

export default function RegisterPedidoPage() {
  const { user } = useUser();

  const [isClientSide, setIsClientSide] = useState(false);
  const [cliente, setCliente] = useState<ClienteUI | null>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);

  // Core Form states (Preserved exactly as requested)
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [serie, setSerie] = useState('');
  const [precio, setPrecio] = useState(0);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]);
  const [stockPorTalla, setStockPorTalla] = useState<Record<number, number>>({});
  const [items, setItems] = useState<ItemUI[]>([]);
  const [productoActual, setProductoActual] = useState<any>(null);

  const [currentProductId, setCurrentProductId] = useState<number | null>(null);
  const [currentUnitOfMeasure, setCurrentUnitOfMeasure] = useState<string>('PAR');
  const [currentSizeIdBySizeNumber, setCurrentSizeIdBySizeNumber] = useState<Record<number, number>>({});

  const [token, setToken] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Client side mounting trigger
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  // Establish token sync safely on client side
  useEffect(() => {
    if (isClientSide && user?.token) {
      setToken(user.token);
    }
  }, [isClientSide, user]);

  const toSizeNumber = (sizeStr: string): number | null => {
    const n = Number(sizeStr);
    return Number.isFinite(n) ? n : null;
  };

  const buildFromApi = (data: any) => {
    const stockMap: Record<number, number> = {};
    const sizes: number[] = [];
    const sizeIdMap: Record<number, number> = {};

    for (const row of data.stock ?? []) {
      if (!row.size) continue;
      const sizeNum = toSizeNumber(row.size);
      if (sizeNum === null) continue;

      sizes.push(sizeNum);
      stockMap[sizeNum] = (stockMap[sizeNum] || 0) + Number(row.quantity || 0);

      if (row.product_size_id) {
        sizeIdMap[sizeNum] = row.product_size_id;
      }
    }

    sizes.sort((a, b) => a - b);

    return {
      descripcion: data.article_description ?? '',
      serie: data.article_series ?? '',
      precio: Number(data.manufacturing_cost ?? 0),
      productId: Number(data.product_id ?? 0),
      unitOfMeasure: data.stock?.[0]?.unit_of_measure ?? 'PAR',
      tallasDisponibles: [...new Set(sizes)],
      stockPorTalla: stockMap,
      sizeIdBySizeNumber: sizeIdMap,
    };
  };

  const buscarProducto = async () => {
    if (!token || !user?.warehouse_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Módulo de Consulta',
        text: 'La sesión no se pudo validar. Inicia sesión para recuperar token de almacén.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const code = codigoArticulo.trim().toUpperCase();
    if (!code) return;

    setSearching(true);
    try {
      const data = await getProductStockByWarehouseAndCode(
        user.warehouse_id,
        code,
        token
      );

      const mapped = buildFromApi(data);

      setDescripcion(mapped.descripcion);
      setSerie(mapped.serie);
      setPrecio(mapped.precio);
      setCurrentProductId(mapped.productId);
      setCurrentUnitOfMeasure(mapped.unitOfMeasure);
      setTallasDisponibles(mapped.tallasDisponibles);
      setStockPorTalla(mapped.stockPorTalla);
      setCurrentSizeIdBySizeNumber(mapped.sizeIdBySizeNumber);
      
      // Auto pre-populate quantity fields with 0s for easier tracking
      const tempQ: Record<number, number> = {};
      mapped.tallasDisponibles.forEach(t => {
        tempQ[t] = 0;
      });
      setCantidades(tempQ);

    } catch (err: any) {
      setDescripcion('');
      setSerie('');
      setPrecio(0);
      setTallasDisponibles([]);
      setStockPorTalla({});
      setCurrentProductId(null);
      setCurrentUnitOfMeasure('PAR');
      setCurrentSizeIdBySizeNumber({});

      Swal.fire({
        icon: 'info',
        title: 'Producto No Encontrado',
        text: err?.message || 'Código de calzado no registrado en este almacén.',
        confirmButtonColor: '#4f46e5'
      });
      console.error(err?.message || err);
    } finally {
      setSearching(false);
    }
  };

  const handleCantidadChange = (talla: number, value: string) => {
    const cantidad = parseInt(value) || 0;
    const disponible = stockPorTalla[talla] || 0;

    if (cantidad < 0 || cantidad > disponible) {
      setCantidades((prev) => ({ ...prev, [talla]: disponible }));
      return;
    }
    setCantidades((prev) => ({ ...prev, [talla]: cantidad }));
  };

  const agregarItem = () => {
    if (!codigoArticulo || !currentProductId) return;

    const total: number = Object.values(cantidades).reduce(
      (sum: number, v: any) => sum + (Number(v) || 0),
      0
    ) as number;

    if (total === 0) return;

    for (const tallaStr of Object.keys(cantidades)) {
      const talla = Number(tallaStr);
      const qty = cantidades[talla] || 0;
      const disponible = stockPorTalla[talla] || 0;

      if (qty > disponible) {
        Swal.fire({
          icon: 'error',
          title: 'Stock Excedido',
          text: `Fallo de stock: Solo hay ${disponible} pares de la talla ${talla} en almacén.`,
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      if (!currentSizeIdBySizeNumber[talla] && qty > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Asociación de Talla',
          text: `Error de mapeo. No se encontró id correlativo para la talla ${talla}.`,
          confirmButtonColor: '#4f46e5'
        });
        return;
      }
    }

    const nuevoItem: ItemUI = {
      codigo: codigoArticulo.toUpperCase(),
      descripcion,
      serie,
      precio,
      cantidades: { ...cantidades },
      total,
      product_id: currentProductId,
      unit_of_measure: currentUnitOfMeasure,
      sizeIdBySizeNumber: { ...currentSizeIdBySizeNumber },
    };

    setItems((prev) => [...prev, nuevoItem]);

    // Fast reset fields exactly as requested
    setCodigoArticulo('');
    setDescripcion('');
    setSerie('');
    setPrecio(0);
    setCantidades({});
    setTallasDisponibles([]);
    setStockPorTalla({});
    setCurrentProductId(null);
    setCurrentUnitOfMeasure('PAR');
    setCurrentSizeIdBySizeNumber({});

    Swal.fire({
      icon: 'success',
      title: 'Agregado al Carrito',
      text: 'Artículos ingresados con éxito. Continúa con otro calzado o confirma la orden.',
      toast: true,
      position: 'top-end',
      timer: 2500,
      showConfirmButton: false
    });
  };

  const onRecommendCode = (code: string) => {
    setCodigoArticulo(code);
  };

  if (!isClientSide) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
            Iniciando panel...
          </span>
        </div>
      </div>
    );
  }

  // Label stylings
  const labelStyles = "block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.2";
  const inputStyles = "w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-xs font-bold text-slate-705 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all duration-150 inline-flex items-center shadow-3xs";

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* TOP COMPONENT HEADER BRANDING */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/5 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                  Registrar Pedido
                </h1>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100">
                  Venta x Mayor
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Genera notas de despacho de calzado para distribuidores y puntos outlet.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase leading-none">Operador</p>
              <p className="text-xs font-bold text-slate-700 mt-1 leading-none">{user?.full_name || 'Vendedor'}</p>
            </div>
          </div>
        </div>

        {/* LAYOUT GRID DE BUSQUEDA Y ASIGNACIÓN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SECCIÓN CONFIGURACIÓN PRODUCTOS & CARGA (7 columnas) */}
          <div className="lg:col-span-12 space-y-6">
            
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              
              {/* BLOQUE ASOCIAR ADQUIRENTE / CLIENTE */}
              <div className="pb-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                <div className="md:col-span-4">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                    <UserPlus size={14} className="text-indigo-600" />
                    <span>Asignar Ficha Cliente</span>
                  </h3>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Obligatorio para la boleta de despacho
                  </p>
                </div>

                <div className="md:col-span-8 flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-grow">
                    <Building2 className="absolute left-3 top-2.5 text-slate-400 shrink-0" size={14} />
                    <input
                      className="w-full pl-9 pr-3 py-2 bg-[#FAFBFD] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-3xs"
                      type="text"
                      value={cliente?.razonSocial || ''}
                      onClick={() => setShowClienteModal(true)}
                      readOnly
                      placeholder="Selecciona o busca un cliente aquí..."
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowClienteModal(true)}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-3xs"
                  >
                    <span>Vincular</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

              </div>

              {/* BLOQUE CONSULTA CÓDIGO BARRAS / SKU */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                <div className="md:col-span-4">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Hash size={14} className="text-indigo-600" />
                    <span>Cargar Artículo</span>
                  </h3>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Establece el calzado que deseas cotizar
                  </p>
                
                </div>

                <div className="md:col-span-8 flex gap-2">
                  <div className="relative flex-grow">
                    <Tag className="absolute left-3 top-2.5 text-slate-400 shrink-0" size={14} />
                    <input
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-450 uppercase tracking-wider font-mono shadow-3xs"
                      type="text"
                      value={codigoArticulo}
                      onChange={(e) => setCodigoArticulo(e.target.value)}
                      placeholder="Ej: RUN-PEG-40"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          buscarProducto();
                        }
                      }}
                    />
                  </div>
                  
                  <button
                    type="button"
                    disabled={searching || !codigoArticulo.trim()}
                    onClick={buscarProducto}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white border border-indigo-700 font-black rounded-xl text-xs cursor-pointer shadow-lg shadow-indigo-150 transition-all shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:shadow-none"
                  >
                    <Search size={14} className={searching ? 'animate-spin' : ''} />
                    <span>{searching ? 'Cargando...' : 'Consultar'}</span>
                  </button>
                </div>

              </div>

            </div>

            {/* SECCIÓN DETALLE Y TALLERO INVENTARIO */}
            {(descripcion || codigoArticulo.trim()) && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-5 animate-in fade-in zoom-in-95 duration-100">
                
                {/* Cabecera del Calzado Encontrado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 shadow-3xs">
                      {codigoArticulo.substring(0, 3).toUpperCase() || 'REF'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-800 leading-none">
                          {descripcion || 'Completa la búsqueda para ver el nombre'}
                        </span>
                        {descripcion ? (
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-150 rounded">
                            Disponibilidad OK
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        Código SAP: <span className="font-mono font-bold text-slate-500 uppercase">{codigoArticulo}</span> 
                        {serie && ` • Catálogo Serie: ${serie}`}
                        {currentUnitOfMeasure && ` • Unidad: ${currentUnitOfMeasure}`}
                      </p>
                    </div>
                  </div>

                  {descripcion && (
                    <div className="flex items-center gap-1.5 bg-[#FAFBFD] border border-slate-200 px-3 py-1.5 rounded-xl shrink-0">
                      <span className="text-[9px] font-black uppercase text-slate-400">Precio Unitario:</span>
                      <span className="text-sm font-black font-mono text-indigo-700">S/. {precio.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Si no hemos buscado aún y hay texto, dar guía visual */}
                {!descripcion && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-2.5 items-center justify-center text-center">
                    <Info size={16} className="text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-500 font-medium">
                      Presiona el botón <span className="font-bold text-slate-700">"Consultar"</span> o pulsa Enter para cargar el stock de calzado en tiempo real.
                    </p>
                  </div>
                )}

                {/* Tallero e inputs de cantidades */}
                {descripcion && tallasDisponibles.length > 0 && (
                  <div className="space-y-4">
                    
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider text-slate-500">
                        Ingreso de Cantidades por Talla
                      </h4>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Introduce la cantidad requerida respetando el límite máximo disponible de cada talla.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      {tallasDisponibles.map((talla) => {
                        const stock = stockPorTalla[talla] || 0;
                        const qty = cantidades[talla] || 0;
                        
                        return (
                          <div 
                            key={talla} 
                            className={`border rounded-xl p-3 text-center transition-all ${
                              qty > 0 
                                ? 'bg-indigo-50/40 border-indigo-550 border-indigo-400 ring-2 ring-indigo-50' 
                                : 'bg-[#FAFBFD] border-slate-200'
                            }`}
                          >
                            <span className="block text-xs font-black text-slate-700 font-sans">Talla {talla}</span>
                            
                            {/* Stock Badge */}
                            <span className="block text-[8px] font-black mt-1 uppercase text-slate-400 leading-none">
                              Disp: <b className="font-mono text-slate-600">{stock}</b>
                            </span>

                            {/* Campo de Entrada */}
                            <input
                              className="w-full mt-2 bg-white border border-slate-200 focus:border-indigo-600 rounded-lg py-1 px-1.5 text-center text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono shadow-3xs"
                              type="number"
                              min="0"
                              max={stock}
                              value={cantidades[talla] === 0 ? '' : (cantidades[talla] || '')}
                              placeholder="0"
                              onChange={(e) => handleCantidadChange(talla, e.target.value)}
                            />
                            
                            {/* Visual Stock Bar */}
                            <div className="w-full bg-slate-200 h-1 rounded-full mt-2.5 overflow-hidden">
                              <div 
                                className={`h-full ${stock > 10 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${Math.min(100, (stock / 30) * 100)}%` }} 
                              />
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Botón de Agregar Ficha de Artículos */}
                    <div className="pt-4 border-t border-slate-50 flex justify-end gap-3 items-center">
                      <div className="text-right">
                        <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Selección</span>
                        <span className="block text-xs font-bold text-slate-700">
                          {Object.values(cantidades).reduce((s: number, v: any) => s + (Number(v) || 0), 0)} pares seleccionados
                        </span>
                      </div>
                      
                      <button
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:scale-100 shadow-lg shadow-indigo-150 inline-flex items-center gap-1.5 border border-indigo-700"
                        onClick={agregarItem}
                        disabled={
                          !codigoArticulo ||
                          Object.values(cantidades).reduce((s: number, v: any) => s + (Number(v) || 0), 0) === 0
                        }
                      >
                        <CheckCircle size={14} />
                        <span>Agregar al Pedido</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

          {/* TABLA MODERNIZADA DE FINALIZACIÓN (PedidoTabla activa) */}
          <div className="lg:col-span-12">
            <PedidoTabla
              items={items}
              cliente={cliente}
              user={{
                token: user!.token,
                id: user!.id,
                warehouseId: user?.warehouse_id || 1,
              }}
              onDeleteItem={(index) =>
                setItems((prev) => prev.filter((_, i) => i !== index))
              }
              onPedidoCreado={() => {
                setItems([]);
                setCliente(null);
              }}
            />
          </div>

        </div>

      </div>

      {/* MODAL DE SELECCIÓN DE CLIENTE */}
      <ClienteModal
        open={showClienteModal}
        token={user!.token}
        onClose={() => setShowClienteModal(false)}
        onSelect={(clienteSeleccionado) => {
          setCliente(clienteSeleccionado);
          setShowClienteModal(false);
        }}
      />

    </div>
  );
}
