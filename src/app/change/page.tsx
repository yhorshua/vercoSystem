'use client';

import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { changeProduct, returnProduct, getSaleByCode } from '../services/changeService';
import { AppStep, RequestType, Sale } from './sale';
import { getProductStockByWarehouseAndCode } from '../services/stockServices';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CheckCircle2, ChevronRight, Package, ArrowLeftRight, RotateCcw, AlertCircle, Check } from 'lucide-react';

const StepIndicator: React.FC<{ currentStep: AppStep }> = ({ currentStep }) => {
  const steps: { label: string; key: AppStep }[] = [
    { label: 'Buscar', key: 'SEARCH' },
    { label: 'Seleccionar', key: 'SELECTION' },
    { label: 'Detalles', key: 'DETAILS' },
    { label: 'Listo', key: 'CONFIRMATION' }
  ];

  const currentIdx = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="relative flex justify-between items-center mb-12 px-4 max-w-full mx-auto mt-6">
      {/* Background Line */}
      <div className="absolute top-5 left-8 right-8 h-0.5 bg-neutral-200 -z-0" />

      {/* Progress Line */}
      <motion.div
        className="absolute top-5 left-8 h-0.5 bg-indigo-600 -z-0 origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: currentIdx / (steps.length - 1) }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ width: 'calc(100% - 64px)' }}
      />
      <div className="flex justify-between items-center w-full">
        {steps.map((s, idx) => {
          const isActive = s.key === currentStep;
          const isPast = currentIdx > idx;

          return (
            <div key={s.key} className="relative z-10 flex flex-col items-center w-1/4 sm:w-1/5 lg:w-1/4">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isActive || isPast ? '#4f46e5' : '#ffffff',
                  borderColor: isActive || isPast ? '#4f46e5' : '#e5e5e5',
                  scale: isActive ? 1.1 : 1
                }}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors duration-300 shadow-sm`}
              >
                {isPast ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <span className={isActive ? 'text-white' : 'text-neutral-400'}>{idx + 1}</span>
                )}
              </motion.div>
              <span className={`absolute -bottom-7 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-neutral-400'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Change = () => {
  const { user } = useUser();
  const [step, setStep] = useState<AppStep>('SEARCH');
  const [saleCode, setSaleCode] = useState('');
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [requestType, setRequestType] = useState<RequestType>(RequestType.RETURN);
  const [reason, setReason] = useState('');
  const [newProductId, setNewProductId] = useState<number | null>(null);
  const [newProductInfo, setNewProductInfo] = useState<any | null>(null);
  const [newProductSizeId, setNewProductSizeId] = useState<number | null>(null);
  const [newProductQuantity, setNewProductQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleCode.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const sale = await getSaleByCode(saleCode, user?.token || '');
      if (sale) {
        setCurrentSale(sale);
        setStep('SELECTION');
      } else {
        setError('No se encontró ninguna venta con ese código.');
      }
    } catch {
      setError('Ocurrió un error al buscar la venta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleProductSelection = (id: number) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleProcessDetails = async () => {
    if (selectedProductIds.length === 0) {
      setError('Por favor, selecciona al menos un producto.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const productCode = currentSale?.details.find(d => d.product_id === selectedProductIds[0])?.product.article_code || '';
      if (!productCode) throw new Error('No se encontró el código del producto.');

      if (!user?.warehouse_id) {
        setError('Información de almacén no disponible.');
        return;
      }

      const productStock = await getProductStockByWarehouseAndCode(user.warehouse_id, productCode, user.token);
      if (productStock) {
        setNewProductInfo(productStock);
        setNewProductSizeId(productStock.sizes[0]?.size || '');
        setStep('DETAILS');
      } else {
        setError('No se encontraron productos disponibles para el cambio.');
      }
    } catch {
      setError('Error al buscar stock disponible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFinal = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!currentSale) throw new Error('No hay venta seleccionada');

      if (requestType === RequestType.RETURN) {
        await returnProduct(
          {
            sale_id: currentSale.id,
            product_id: selectedProductIds[0],
            quantity: newProductQuantity,
          },
          user?.token || ''
        );
      } else {
        await changeProduct(
          {
            sale_id: currentSale.id,
            product_id: selectedProductIds[0],
            new_product_id: newProductId!, // Ensuring `newProductId` is not null
            quantity: newProductQuantity,
            new_product_size_id: newProductSizeId!,
          },
          user?.token || ''
        );
      }

      setStep('CONFIRMATION');
    } catch {
      setError('Ocurrió un error al procesar tu solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className=" min-h-screen w-full flex flex-col justify-center items-center px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-black tracking-tight text-neutral-900 mb-2">
          Portal de Devoluciones
        </h1>
        <p className="text-neutral-500 font-medium">Gestiona tus cambios y devoluciones de forma sencilla</p>
      </header>

      <div className="bg-white rounded-3xl shadow-xl shadow-neutral-200/50 border border-neutral-100 p-8 md:p-10 w-full lg:max-w-4xl">
        <StepIndicator currentStep={step} />
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {step === 'SEARCH' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2 mb-8">
                  
                  <h2 className="text-xl font-bold">Busca tu pedido</h2>
                  <p className="text-neutral-500 text-sm">Ingresa el código de venta que aparece en tu comprobante</p>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={saleCode}
                      onChange={(e) => setSaleCode(e.target.value.toUpperCase())}
                      placeholder="Ej: V00001"
                      required
                      className="w-full px-6 py-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all outline-none font-mono text-lg tracking-wider"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Buscando...' : 'Buscar Pedido'}
                    {!isSubmitting && <ChevronRight className="w-5 h-5" />}
                  </button>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-red-500 text-sm font-medium justify-center"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </motion.div>
                  )}
                </form>
              </motion.div>
            )}

            {step === 'SELECTION' && currentSale && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h2 className="text-xl font-bold">Selecciona productos</h2>
                    <p className="text-neutral-500 text-sm">Elige los artículos que deseas gestionar</p>
                  </div>
                  <span className="text-xs font-bold bg-neutral-100 px-3 py-1 rounded-full text-neutral-600">
                    Pedido: {currentSale.sale_code}
                  </span>
                </div>

                <div className=" space-y-3">
                  {currentSale.details.map((detail) => {
                    const isSelected = selectedProductIds.includes(detail.product_id);
                    return (
                      <div
                        key={detail.id}
                        onClick={() => toggleProductSelection(detail.product_id)}
                        className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected
                          ? 'border-indigo-600 bg-indigo-50/30'
                          : 'border-neutral-100 hover:border-neutral-200 bg-white'
                          }`}
                      >
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-neutral-300 group-hover:border-neutral-400'
                          }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-bold text-neutral-900">{detail.product.article_description}</h3>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs font-medium text-neutral-500">Talla: {detail.productSize.size}</span>
                            <span className="text-xs font-medium text-neutral-500">Cant: {detail.quantity}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-indigo-600">S/ {detail.unit_price}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleProcessDetails}
                    disabled={selectedProductIds.length === 0 || isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Procesando...' : 'Continuar'}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setStep('SEARCH')}
                    className="w-full text-neutral-400 hover:text-neutral-600 font-bold py-2 text-sm transition-colors"
                  >
                    Volver a buscar
                  </button>
                  {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
                </div>
              </motion.div>
            )}

            {step === 'DETAILS' && newProductInfo && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-xl font-bold">Configura tu solicitud</h2>
                  <p className="text-neutral-500 text-sm">Indícanos qué deseas hacer con el producto</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setRequestType(RequestType.RETURN)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${requestType === RequestType.RETURN
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600'
                      : 'border-neutral-100 text-neutral-400 hover:border-neutral-200'
                      }`}
                  >
                    <RotateCcw className="w-8 h-8" />
                    <span className="font-bold text-sm">Devolución</span>
                  </button>
                  <button
                    onClick={() => setRequestType(RequestType.EXCHANGE)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${requestType === RequestType.EXCHANGE
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600'
                      : 'border-neutral-100 text-neutral-400 hover:border-neutral-200'
                      }`}
                  >
                    <ArrowLeftRight className="w-8 h-8" />
                    <span className="font-bold text-sm">Cambio</span>
                  </button>
                </div>

                <div className="space-y-6 bg-neutral-50 p-6 rounded-2xl">
                  {requestType === RequestType.EXCHANGE && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Talla deseada</label>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">En Stock</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newProductInfo.sizes.map((s: any) => (
                          <button
                            key={s.id}
                            onClick={() => setNewProductSizeId(s.id)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${newProductSizeId === s.size
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-white border border-neutral-200 text-neutral-600 hover:border-indigo-300'
                              }`}
                          >
                            {s.size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Motivo de la solicitud</label>
                    <textarea
                      placeholder="Cuéntanos brevemente el motivo..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full p-4 bg-white border border-neutral-200 rounded-xl focus:border-indigo-500 outline-none min-h-[100px] text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={submitFinal}
                    disabled={isSubmitting || (requestType === RequestType.EXCHANGE && !newProductSizeId)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Procesando...' : 'Confirmar Solicitud'}
                  </button>
                  <button
                    onClick={() => setStep('SELECTION')}
                    className="w-full text-neutral-400 hover:text-neutral-600 font-bold py-2 text-sm transition-colors"
                  >
                    Volver a selección
                  </button>
                  {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
                </div>
              </motion.div>
            )}

            {step === 'CONFIRMATION' && (
              <motion.div
                key="confirmation"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-8 py-4"
              >
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="absolute -top-2 -right-2 bg-white p-1 rounded-full shadow-md"
                  >
                    <div className="bg-emerald-500 p-1 rounded-full">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black">¡Solicitud Procesada!</h2>
                  <p className="text-neutral-500">Hemos recibido tu solicitud correctamente.</p>
                </div>

                <div className="bg-neutral-50 rounded-2xl p-6 text-left space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Resumen</h3>
                  {selectedProductIds.map((id) => {
                    const detail = currentSale?.details.find(d => d.product_id === id);
                    return detail ? (
                      <div key={id} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-neutral-100">
                          <Package className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-800">{detail.product.article_description}</p>
                          <p className="text-[10px] font-medium text-neutral-500">
                            {requestType === RequestType.RETURN ? 'Devolución solicitada' : `Cambio por talla ${newProductSizeId}`}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>

                <button
                  onClick={() => {
                    setStep('SEARCH');
                    setSaleCode('');
                    setSelectedProductIds([]);
                    setReason('');
                  }}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  Finalizar y Salir
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Change;