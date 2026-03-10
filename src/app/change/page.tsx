'use client';

import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { changeProduct, returnProduct, getSaleByCode } from '../services/changeService';
import { AppStep, RequestType, Sale, SaleDetail } from './sale';
import { getProductStockByWarehouseAndCode } from '../services/stockServices';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, CheckCircle2, Package, ArrowLeftRight,
  RotateCcw, Scan, Plus, Minus, DollarSign, ChevronLeft, ArrowRight
} from 'lucide-react';
import Swal from "sweetalert2";

const Change = () => {
  const { user } = useUser();
  const [step, setStep] = useState<AppStep>('SEARCH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [saleCode, setSaleCode] = useState('');
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SaleDetail | null>(null);
  const [originalPrice, setOriginalPrice] = useState<number>(0);

  const [requestType, setRequestType] = useState<RequestType>(RequestType.EXCHANGE);
  const [reason, setReason] = useState('');

  const [searchNewCode, setSearchNewCode] = useState('');
  const [newProductData, setNewProductData] = useState<any | null>(null);
  const [selectedNewSizeId, setSelectedNewSizeId] = useState<number | null>(null);
  const [newProductQuantity, setNewProductQuantity] = useState<number>(1);
  const [newProductPrice, setNewProductPrice] = useState<number>(0);

  const handleSearchSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleCode.trim()) return;
    setIsSubmitting(true);
    try {
      const sale = await getSaleByCode(saleCode, user?.token || '');
      if (sale) {
        setCurrentSale(sale);
        setStep('SELECTION');
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Venta no encontrada',
          text: 'Verifique el código del ticket.',
          confirmButtonColor: '#4f46e5'
        });
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error de servidor',
        text: 'Intente nuevamente.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOriginal = (detail: SaleDetail) => {
    setSelectedProduct(detail);
    setOriginalPrice(parseFloat(detail.unit_price || '0'));
  };

  const handleSearchNewProduct = async () => {
    if (!searchNewCode.trim()) return;
    setIsSubmitting(true);
    try {
      const stock = await getProductStockByWarehouseAndCode(user?.warehouse_id!, searchNewCode, user?.token!);
      if (stock) {
        setNewProductData(stock);
        setNewProductPrice(Number(stock.price) || 0);
        setSelectedNewSizeId(null);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Sin stock',
          text: 'No hay stock disponible para este producto.',
          confirmButtonColor: '#f59e0b'
        });
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo buscar el producto.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFinal = async () => {
    if (requestType === RequestType.EXCHANGE && !selectedNewSizeId) return Swal.fire({
      icon: 'warning',
      title: 'Seleccione una talla',
      text: 'Debe elegir una talla para continuar.',
      confirmButtonColor: '#4f46e5'
    });;
    setIsSubmitting(true);
    try {
      if (requestType === RequestType.RETURN) {
        await returnProduct({
          sale_id: currentSale!.id,
          product_id: selectedProduct!.product_id,
          quantity: 1,
          price_at_return: originalPrice
        }, user?.token || '');
      } else {
        await changeProduct({
          sale_id: currentSale!.id,
          product_id: selectedProduct!.product_id,
          new_product_id: newProductData.id,
          new_product_size_id: selectedNewSizeId!,
          quantity: newProductQuantity,
          old_product_price: originalPrice,
          new_product_price: newProductPrice,
        }, user?.token || '');
      }
      setStep('CONFIRMATION');
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo completar la operación.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const diff = (Number(newProductPrice) * newProductQuantity) - Number(originalPrice);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100">
      {/* Header Refinado */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-indigo-200 shadow-lg">
            <ArrowLeftRight className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg leading-tight text-slate-800 tracking-tight">Gestión de Cambios</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Módulo de Post-Venta</p>
          </div>
        </div>
        {currentSale && (
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex flex-col items-end">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Ticket Activo</p>
            <p className="font-mono text-xs font-black text-indigo-600 tracking-wider">{currentSale.sale_code}</p>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 pb-32">
        <AnimatePresence mode="wait">
          {/* STEP 1: BUSCAR TICKET */}
          {step === 'SEARCH' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-center min-h-[60vh]"
            >
              <form onSubmit={handleSearchSale} className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 w-full max-w-md">
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">Localizar Venta</h2>
                  <p className="text-slate-400 text-sm mt-1">Ingrese el código del ticket para iniciar</p>
                </div>

                <div className="space-y-4">
                  <input
                    autoFocus
                    className="w-full text-center text-3xl font-mono py-5 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all uppercase placeholder:text-slate-200"
                    placeholder="V001-0000"
                    value={saleCode}
                    onChange={(e) => setSaleCode(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !saleCode.trim()}
                    className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isSubmitting ? 'Verificando...' : 'Continuar'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 2: SELECCIÓN DE PRODUCTO ORIGINAL */}
          {step === 'SELECTION' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">¿Qué producto devuelve?</h2>
                  <p className="text-slate-400 text-sm">Seleccione el artículo del ticket que será procesado</p>
                </div>
                <button
                  onClick={() => setStep('SEARCH')}
                  className="self-start md:self-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <ChevronLeft size={14} /> Cambiar Ticket
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentSale?.details.map((detail) => (
                  <div
                    key={detail.id}
                    onClick={() => handleSelectOriginal(detail)}
                    className={`group p-5 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${selectedProduct?.id === detail.id
                      ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100'
                      : 'border-white bg-white hover:border-slate-200 hover:shadow-md'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-indigo-50 px-2 py-1 rounded-lg">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{detail.product.article_code}</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-lg font-bold text-slate-500">Talla {detail.productSize.size}</span>
                    </div>
                    <p className="font-bold text-sm leading-snug text-slate-700 mb-4 line-clamp-2 h-10">{detail.product.article_description}</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Precio Pagado</p>
                        <p className="text-xl font-black text-slate-900">S/ {detail.unit_price}</p>
                      </div>
                      {selectedProduct?.id === detail.id && (
                        <div className="bg-indigo-600 p-1.5 rounded-full text-white">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-center z-40">
                <button
                  disabled={!selectedProduct}
                  onClick={() => setStep('DETAILS')}
                  className="w-full max-w-md bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                >
                  Siguiente Paso <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PROCESO DE CAMBIO/DEVOLUCIÓN */}
          {step === 'DETAILS' && (
            <motion.div
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* COLUMNA IZQUIERDA: LO QUE SALE (4/12) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-red-50 p-2 rounded-xl">
                      <RotateCcw size={20} className="text-red-500" />
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Producto de Salida</h3>
                  </div>

                  {/* INFO DEL PRODUCTO SELECCIONADO */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 mb-6">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-indigo-600 uppercase">{selectedProduct?.product.article_code}</span>
                      <span className="text-[10px] font-bold text-slate-400">Talla: {selectedProduct?.productSize.size}</span>
                    </div>
                    <p className="font-bold text-sm text-slate-700 leading-tight mb-3">{selectedProduct?.product.article_description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Original:</span>
                      <span className="text-xs font-black text-slate-900">S/ {selectedProduct?.unit_price}</span>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 ml-1">Precio a Reconocer</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                          <DollarSign size={18} />
                        </div>
                        <input
                          type="number"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-black text-2xl outline-none focus:ring-2 ring-indigo-500 focus:bg-white transition-all border border-transparent focus:border-indigo-100"
                          value={originalPrice ?? 0}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setOriginalPrice(isNaN(value) ? 0 : value);
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setRequestType(RequestType.EXCHANGE)}
                        className={`py-4 px-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all ${requestType === RequestType.EXCHANGE
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md shadow-indigo-100'
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                      >
                        <ArrowLeftRight size={16} /> Cambio
                      </button>
                      <button
                        onClick={() => setRequestType(RequestType.RETURN)}
                        className={`py-4 px-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all ${requestType === RequestType.RETURN
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md shadow-indigo-100'
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                      >
                        <RotateCcw size={16} /> Devolución
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 ml-1">Motivo</label>
                      <textarea
                        className="w-full p-4 bg-slate-50 rounded-2xl text-sm border border-transparent outline-none focus:ring-2 ring-indigo-500 focus:bg-white transition-all resize-none"
                        placeholder="Describa el motivo del cambio..."
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: LO QUE ENTRA (7/12) */}
              <div className="lg:col-span-7 space-y-6">
                {requestType === RequestType.EXCHANGE ? (
                  <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-50/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-indigo-50 p-2 rounded-xl">
                        <Package size={20} className="text-indigo-500" />
                      </div>
                      <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Producto de Entrada</h3>
                    </div>

                    <div className="flex gap-3 mb-8">
                      <div className="relative flex-1 group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                          <Scan size={20} />
                        </div>
                        <input
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500 focus:bg-white transition-all border border-transparent focus:border-indigo-100 font-bold text-sm"
                          placeholder="Escanee o escriba el código..."
                          value={searchNewCode}
                          onChange={(e) => setSearchNewCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchNewProduct()}
                        />
                      </div>
                      <button
                        onClick={handleSearchNewProduct}
                        className="bg-indigo-600 text-white px-6 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
                      >
                        <Search size={22} />
                      </button>
                    </div>

                    {newProductData ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-50">
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{newProductData.article_code}</p>
                            <p className="font-black text-base text-slate-800 leading-tight">{newProductData.article_description}</p>
                          </div>
                          <div className="w-full sm:w-auto bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                            <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Precio Unitario</label>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-400">S/</span>
                              <input
                                type="number"
                                className="w-20 bg-transparent text-indigo-600 font-black text-xl outline-none"
                                value={newProductPrice}
                                onChange={(e) => setNewProductPrice(Number(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Seleccionar Talla</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                              {newProductData.sizes.map((s: any) => (
                                <button
                                  key={s.id}
                                  disabled={s.stock <= 0}
                                  onClick={() => setSelectedNewSizeId(s.id)}
                                  className={`group py-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative ${selectedNewSizeId === s.id
                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                                    } ${s.stock <= 0 ? 'opacity-25 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <span className="text-sm font-black">{s.size}</span>
                                  <span className={`text-[8px] font-bold uppercase tracking-tighter ${selectedNewSizeId === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    Stk: {s.quantity}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-500 ml-3 uppercase tracking-widest">Cantidad</span>
                            <div className="flex items-center gap-6">
                              <button
                                onClick={() => setNewProductQuantity(Math.max(1, newProductQuantity - 1))}
                                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 hover:bg-slate-50 active:scale-90 transition-all"
                              >
                                <Minus size={16} className="text-slate-600" />
                              </button>
                              <span className="font-black text-2xl text-slate-800 w-8 text-center">{newProductQuantity}</span>
                              <button
                                onClick={() => setNewProductQuantity(newProductQuantity + 1)}
                                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 hover:bg-slate-50 active:scale-90 transition-all"
                              >
                                <Plus size={16} className="text-slate-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="bg-slate-50 h-64 rounded-3xl flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                          <Scan className="text-slate-300" size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-400 italic">Escanee un producto para continuar</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-100 h-full min-h-[300px] rounded-3xl flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                      <RotateCcw className="text-slate-300" size={40} />
                    </div>
                    <h4 className="text-lg font-black text-slate-800 mb-2">Modo Devolución Directa</h4>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">Se generará un saldo a favor del cliente por el monto reconocido.</p>
                  </div>
                )}
              </div>

              {/* RESUMEN FLOTANTE (BOTTOM BAR) */}
              <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 z-50 lg:rounded-t-[40px] shadow-2xl">
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="hidden md:flex w-12 h-12 bg-white/10 rounded-2xl items-center justify-center">
                    <DollarSign className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Diferencia Final</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-white tracking-tight">S/ {Math.abs(diff).toFixed(2)}</span>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${diff > 0 ? 'bg-emerald-500 text-white' :
                        diff < 0 ? 'bg-amber-500 text-white' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                        {diff > 0 ? 'Cobrar' : diff < 0 ? 'Saldo Favor' : 'Mano a mano'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setStep('SELECTION')}
                    className="flex-1 sm:flex-none px-8 py-4 text-slate-400 font-black text-sm hover:text-white transition-colors"
                  >
                    ATRÁS
                  </button>
                  <button
                    onClick={submitFinal}
                    disabled={isSubmitting || (requestType === RequestType.EXCHANGE && !selectedNewSizeId)}
                    className="flex-1 sm:flex-none bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3 hover:bg-indigo-500 active:scale-95 transition-all text-sm disabled:opacity-30 disabled:grayscale"
                  >
                    {isSubmitting ? 'PROCESANDO...' : 'FINALIZAR OPERACIÓN'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: CONFIRMACIÓN */}
          {step === 'CONFIRMATION' && (
            <motion.div
              key="confirmation"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md mx-auto text-center mt-12 md:mt-24"
            >
              <div className="bg-white p-10 md:p-16 rounded-[48px] shadow-2xl shadow-slate-200/50 border border-slate-50">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <CheckCircle2 className="text-emerald-500" size={48} />
                </div>
                <h2 className="text-3xl font-black mb-4 text-slate-800 tracking-tight">¡Operación Exitosa!</h2>
                <p className="text-slate-400 mb-10 font-medium leading-relaxed">
                  El registro se ha completado. El stock ha sido actualizado y el comprobante está listo.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-slate-200"
                >
                  NUEVA OPERACIÓN
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Change;
