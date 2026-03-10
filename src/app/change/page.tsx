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

const Change = () => {
  const { user } = useUser();
  const [step, setStep] = useState<AppStep>('SEARCH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } else { alert('Venta no encontrada.'); }
    } catch { alert('Error de servidor.'); } finally { setIsSubmitting(false); }
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
      } else { alert('Sin stock disponible.'); }
    } catch { alert('Error en búsqueda.'); } finally { setIsSubmitting(false); }
  };

  const submitFinal = async () => {
    if (requestType === RequestType.EXCHANGE && !selectedNewSizeId) return alert('Selecciona una talla');
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
    } catch { alert('Error al procesar'); } finally { setIsSubmitting(false); }
  };

  const diff = (Number(newProductPrice) * newProductQuantity) - Number(originalPrice);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header Compacto */}
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <ArrowLeftRight className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-sm md:text-base leading-tight">Gestión de Cambios</h1>
        </div>
        {currentSale && (
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Ticket</p>
            <p className="font-mono text-xs font-bold text-indigo-600">{currentSale.sale_code}</p>
          </div>
        )}
      </header>

      <main className="flex-1 p-2 md:p-4 pb-24">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {/* STEP 1: BUSCAR TICKET */}
            {step === 'SEARCH' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10 max-w-sm mx-auto">
                <form onSubmit={handleSearchSale} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-500" /> Buscar Venta
                  </h2>
                  <input
                    autoFocus
                    className="w-full text-center text-2xl font-mono py-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all uppercase"
                    placeholder="V001-0000"
                    value={saleCode}
                    onChange={(e) => setSaleCode(e.target.value)}
                  />
                  <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all">
                    {isSubmitting ? 'Buscando...' : 'Continuar'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 2: SELECCIÓN DE PRODUCTO ORIGINAL */}
            {step === 'SELECTION' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex justify-between items-end">
                  <h2 className="text-lg font-bold italic underline decoration-indigo-500">¿Qué producto devuelve?</h2>
                  <button onClick={() => setStep('SEARCH')} className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <ChevronLeft size={14} /> Cambiar Ticket
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentSale?.details.map((detail) => (
                    <div
                      key={detail.id}
                      onClick={() => handleSelectOriginal(detail)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${selectedProduct?.id === detail.id ? 'border-indigo-600 bg-white shadow-md' : 'border-white bg-white/60'}`}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">{detail.product.article_code}</span>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-500">Talla {detail.productSize.size}</span>
                      </div>
                      <p className="font-bold text-sm leading-tight mb-2 line-clamp-2">{detail.product.article_description}</p>
                      <p className="text-lg font-black text-slate-800">S/ {detail.unit_price}</p>
                    </div>
                  ))}
                </div>
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-center z-10">
                  <button
                    disabled={!selectedProduct}
                    onClick={() => setStep('DETAILS')}
                    className="w-full max-w-md bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Siguiente Paso <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PROCESO DE CAMBIO/DEVOLUCIÓN (NUEVO DISEÑO) */}
            {step === 'DETAILS' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* COLUMNA IZQUIERDA: LO QUE SALE */}
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <RotateCcw size={16} className="text-red-500" />
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500">Producto de Salida</h3>
                    </div>
                    {/* INFO DEL PRODUCTO SELECCIONADO */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-300 mb-4">
                      <p className="text-[10px] font-bold text-indigo-600">{selectedProduct?.product.article_code}</p>
                      <p className="font-bold text-sm">{selectedProduct?.product.article_description}</p>
                      <div className="flex gap-4 mt-1 text-xs">
                        <span className="bg-white px-2 py-0.5 rounded border font-medium text-slate-600">Talla: {selectedProduct?.productSize.size}</span>
                        <span className="bg-white px-2 py-0.5 rounded border font-medium text-slate-600">Precio Original: S/ {selectedProduct?.unit_price}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Precio a Reconocer</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="number"
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg font-bold text-lg outline-none focus:ring-2 ring-indigo-500"
                            value={originalPrice}
                            onChange={(e) => setOriginalPrice(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setRequestType(RequestType.EXCHANGE)}
                          className={`flex-1 py-2 px-3 rounded-lg border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${requestType === RequestType.EXCHANGE ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'bg-white border-slate-100'}`}
                        >
                          <ArrowLeftRight size={14}/> Cambio
                        </button>
                        <button 
                          onClick={() => setRequestType(RequestType.RETURN)}
                          className={`flex-1 py-2 px-3 rounded-lg border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${requestType === RequestType.RETURN ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'bg-white border-slate-100'}`}
                        >
                          <RotateCcw size={14}/> Devolución
                        </button>
                      </div>

                      <textarea
                        className="w-full p-3 bg-slate-50 rounded-lg text-xs border-none outline-none focus:ring-1 ring-slate-300 mt-2"
                        placeholder="Motivo del cambio..."
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA: LO QUE ENTRA */}
                <div className="space-y-4">
                  {requestType === RequestType.EXCHANGE ? (
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm shadow-indigo-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Package size={16} className="text-indigo-500" />
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500">Producto de Entrada</h3>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                          <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            className="w-full pl-10 pr-3 py-2 bg-slate-100 rounded-xl outline-none focus:ring-2 ring-indigo-500 font-bold text-sm"
                            placeholder="Código de artículo..."
                            value={searchNewCode}
                            onChange={(e) => setSearchNewCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchNewProduct()}
                          />
                        </div>
                        <button onClick={handleSearchNewProduct} className="bg-indigo-600 text-white px-4 rounded-xl"><Search size={18}/></button>
                      </div>

                      {newProductData && (
                        <div className="animate-in fade-in duration-300">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-bold text-sm leading-tight">{newProductData.article_description}</p>
                              <p className="text-[10px] font-mono text-indigo-500">{newProductData.article_code}</p>
                            </div>
                            <div className="text-right">
                              <label className="text-[8px] font-bold text-slate-400 uppercase block">Precio Unit.</label>
                              <input 
                                type="number" 
                                className="w-20 bg-indigo-50 text-indigo-600 font-black text-right rounded p-1 outline-none text-sm"
                                value={newProductPrice}
                                onChange={(e) => setNewProductPrice(Number(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-1.5">
                              {newProductData.sizes.map((s: any) => (
                                <button
                                  key={s.id}
                                  disabled={s.stock <= 0}
                                  onClick={() => setSelectedNewSizeId(s.id)}
                                  className={`py-2 rounded-lg border-2 text-[10px] font-black transition-all ${selectedNewSizeId === s.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-slate-50'} ${s.stock <= 0 ? 'opacity-30 grayscale' : ''}`}
                                >
                                  {s.size}
                                  <span className="block text-[7px] font-normal">S: {s.stock}</span>
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl">
                              <span className="text-[10px] font-bold text-slate-500 ml-2">CANTIDAD</span>
                              <div className="flex items-center gap-4">
                                <button onClick={() => setNewProductQuantity(Math.max(1, newProductQuantity - 1))} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm"><Minus size={14}/></button>
                                <span className="font-black text-lg">{newProductQuantity}</span>
                                <button onClick={() => setNewProductQuantity(newProductQuantity + 1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm"><Plus size={14}/></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-100 h-full min-h-[200px] rounded-2xl flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200">
                      <RotateCcw className="text-slate-300 mb-2" size={32} />
                      <p className="text-sm font-bold text-slate-400 italic">Modo Devolución Directa</p>
                    </div>
                  )}
                </div>

                {/* RESUMEN FLOTANTE (BOTTOM BAR) */}
                <div className="fixed bottom-0 left-0 right-0 bg-slate-900 p-4 flex items-center justify-between z-30 lg:rounded-t-[32px]">
                   <div className="text-white">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diferencia Total</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black">S/ {Math.abs(diff).toFixed(2)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diff >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {diff > 0 ? 'Cobrar' : diff < 0 ? 'Saldo Favor' : 'Mano a mano'}
                        </span>
                      </div>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => setStep('SELECTION')} className="px-4 py-3 text-slate-400 font-bold text-sm">Atrás</button>
                     <button 
                      onClick={submitFinal}
                      disabled={isSubmitting || (requestType === RequestType.EXCHANGE && !selectedNewSizeId)}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-indigo-900/50 flex items-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all text-sm"
                     >
                        {isSubmitting ? '...' : 'FINALIZAR'}
                     </button>
                   </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: CONFIRMACIÓN */}
            {step === 'CONFIRMATION' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-xs mx-auto text-center mt-20">
                <div className="bg-white p-8 rounded-[40px] shadow-xl">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="text-emerald-500" size={32} />
                  </div>
                  <h2 className="text-2xl font-black mb-2 text-slate-800">¡Éxito!</h2>
                  <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">Operación registrada y stock actualizado correctamente.</p>
                  <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all">Nueva Operación</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Change;