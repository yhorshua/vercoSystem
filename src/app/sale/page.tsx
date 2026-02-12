'use client';

import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { BrowserMultiFormatReader } from '@zxing/library';
import { 
  User, 
  Search, 
  Scan, 
  ShoppingCart, 
  CreditCard, 
  Tag, 
  Box,
  BadgePercent
} from 'lucide-react';

import styles from './registerPedido.module.css';
import PedidoTabla from './PedidoTabla';
import { Cliente } from '../register-requested/mockClientes';

import { useUser } from '../context/UserContext';
import { getProductStockByWarehouseAndCode } from '../services/stockServices';

import { registerSale, CreateSalePayload } from '../services/saleServices';
import { GETDNI } from '../services/dniServices';
import { GETRUC } from '../services/rucServices';
import type { PaymentMethod } from '../services/saleServices';
import type { ItemUI } from '../components/types';

// Tipos mínimos esperados del BACK
type ApiStockRow = {
  stock_id?: number;
  id?: number;
  warehouse_id: number;
  product_id: number;
  product_size_id: number | null;
  size: string | null; 
  quantity: number;
  unit_of_measure: string;
};

type ApiProductResponse = {
  product_id: number;
  article_code: string;
  article_description: string;
  article_series: string;
  unit_price: number;
  manufacturing_cost?: number;
  status: boolean;
  stock: ApiStockRow[];
};

function money(n: number) {
  return Number(n || 0).toFixed(2);
}


export default function RegisterSalePage() {
  const { user } = useUser();

  // Cliente UI
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [celular, setCelular] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<string>('');
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docFetched, setDocFetched] = useState(false);

  // Producto
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [serie, setSerie] = useState('');
  const [precio, setPrecio] = useState(0);

  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [tallasDisponibles, setTallasDisponibles] = useState<string[]>([]);
  const [stockPorTalla, setStockPorTalla] = useState<Record<string, number>>({});

  const [currentProductId, setCurrentProductId] = useState<number | null>(null);
  const [currentUnitOfMeasure, setCurrentUnitOfMeasure] = useState<string>('PAR');
  const [currentSizeIdBySizeNumber, setCurrentSizeIdBySizeNumber] = useState<Record<number, number>>({});

  // Carrito
  const [items, setItems] = useState<ItemUI[]>([]);

  // Descuento
  const [descuento, setDescuento] = useState<number>(0);
  const [totalConDescuento, setTotalConDescuento] = useState<number>(0);
  const [tipoDocumentoVenta, setTipoDocumentoVenta] = useState<string>('boleta');

  // Escaneo
  const [scanning, setScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const playBeepSound = () => {
    const beep = new Audio('/beep.mp3');
    void beep.play();
  };

  const stopScanning = () => {
    setScanning(false);
    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
  };

  const buildFromApi = (data: ApiProductResponse) => {
    const stockMap: Record<string, number> = {};
    const sizes: string[] = [];
    const sizeIdMap: Record<string, number> = {};

    for (const row of data.stock ?? []) {
      if (!row.size) continue;
      const sizeStr = row.size;
      sizes.push(sizeStr);
      stockMap[sizeStr] = (stockMap[sizeStr] || 0) + Number(row.quantity || 0);

      if (row.product_size_id) {
        sizeIdMap[sizeStr] = row.product_size_id;
      }
    }

    sizes.sort((a, b) => {
      if (isNaN(Number(a)) && isNaN(Number(b))) {
        return a.localeCompare(b);
      }
      return Number(a) - Number(b);
    });

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

  // Consulta stock (debounce)
  useEffect(() => {
    if (!user?.token) return;
    if (!user?.warehouse_id) return;

    const code = codigoArticulo.trim().toUpperCase();

    if (code.length < 4) {
      setDescripcion('');
      setSerie('');
      setPrecio(0);
      setTallasDisponibles([]);
      setStockPorTalla({});
      setCurrentProductId(null);
      setCurrentUnitOfMeasure('PAR');
      setCurrentSizeIdBySizeNumber({});
      return;
    }

    const t = setTimeout(async () => {
      try {
        const data: ApiProductResponse = await getProductStockByWarehouseAndCode(
          user.warehouse_id,
          code,
          user.token
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
      } catch (err: any) {
        setDescripcion('');
        setSerie('');
        setPrecio(0);
        setTallasDisponibles([]);
        setStockPorTalla({});
        setCurrentProductId(null);
        setCurrentUnitOfMeasure('PAR');
        setCurrentSizeIdBySizeNumber({});
      }
    }, 300);

    return () => clearTimeout(t);
  }, [codigoArticulo, user?.token, user?.warehouse_id]);

  // Consulta DNI/RUC
  useEffect(() => {
    if (!tipoDocumento) return;
    const n = (numeroDocumento || '').trim();
    setDocFetched(false);

    const isDniOk = tipoDocumento === 'DNI' && /^\d{8}$/.test(n);
    const isRucOk = tipoDocumento === 'RUC' && /^\d{11}$/.test(n);

    if (!isDniOk && !isRucOk) return;

    const t = setTimeout(async () => {
      try {
        setLoadingDoc(true);

        if (tipoDocumento === 'DNI') {
          const data = await GETDNI(n);
          setNombres(data?.nombres ?? '');
          setApellidos(`${data?.apellido_paterno ?? ''} ${data?.apellido_materno ?? ''}`.trim());
        }

        if (tipoDocumento === 'RUC') {
          const data = await GETRUC(n);
          const razon =
            data?.razon_social ??
            data?.razonSocial ??
            data?.nombre_o_razon_social ??
            '';
          setNombres(razon);
          setApellidos('');
        }

        setDocFetched(true);
      } catch (e: any) {
        Swal.fire({
          icon: 'error',
          title: 'Consulta fallida',
          text: e?.message || 'No se pudo consultar el documento',
        });
      } finally {
        setLoadingDoc(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [tipoDocumento, numeroDocumento]);

  // Calculo Descuento
  useEffect(() => {
    const cantidadTotal = Object.values(cantidades).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (cantidadTotal === 0) {
      setTotalConDescuento(0);
      return;
    }
    const precioTotalSinDescuento = precio * cantidadTotal;
    const precioConDesc = precioTotalSinDescuento - descuento;
    const totalConDesc = precioConDesc < 0 ? 0 : precioConDesc;
    setTotalConDescuento(totalConDesc);
  }, [cantidades, descuento, precio]);

  // Handlers Cámara
  const handleScanButtonClick = async () => {
    if (scanning) {
        stopScanning();
        return;
    }
    setScanning(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara no está disponible.');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);

      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.setAttribute('playsinline', 'true');
      await videoElement.play();
      document.getElementById('camera-container')?.appendChild(videoElement);

      const scanner = new BrowserMultiFormatReader();
      scanner.decodeFromVideoDevice(null, videoElement, (result) => {
        if (result) {
          const codigoCompleto = result.getText().toUpperCase();
          const code7 = codigoCompleto.substring(0, 7);
          setCodigoArticulo(code7);

          if (codigoCompleto.length >= 9) {
            const tallaEscaneada = Number.parseInt(codigoCompleto.substring(7, 9), 10);
            const disponible = stockPorTalla[tallaEscaneada] || 0;
            if (disponible > 0) {
              setCantidades((prev) => {
                const actual = prev[tallaEscaneada] || 0;
                if (actual + 1 <= disponible) return { ...prev, [tallaEscaneada]: actual + 1 };
                return prev;
              });
            }
          }
          playBeepSound();
          stopScanning();
        }
      });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error?.message });
      stopScanning();
    }
  };

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim().toUpperCase();
    const code7 = raw.substring(0, 7);
    setCodigoArticulo(code7);

    if (raw.length >= 9) {
      const tallaEscaneada = Number.parseInt(raw.substring(7, 9), 10);
      const disponible = stockPorTalla[tallaEscaneada] || 0;
      if (disponible > 0) {
        setCantidades((prev) => {
          const actual = prev[tallaEscaneada] || 0;
          if (actual + 1 <= disponible) return { ...prev, [tallaEscaneada]: actual + 1 };
          return prev;
        });
      }
      playBeepSound();
    }
  };

  const handleCantidadChange = (talla: string, value: string) => {
    if (!talla) return;
    const cantidad = Number(value);
    if (isNaN(cantidad) || cantidad < 0) return;

    const disponible = stockPorTalla[talla] || 0;
    if (cantidad > disponible) {
      setCantidades((prev) => ({ ...prev, [talla]: disponible }));
      return;
    }
    setCantidades((prev) => ({ ...prev, [talla]: cantidad }));
  };

 const agregarItem = () => {
    // 1. Filtrar solo cantidades mayores a 0 para agregar al carrito
    const cantidadesFiltradas: Record<string, number> = {};
    let total = 0;

    Object.keys(cantidades).forEach((talla) => {
      const cantidad = Number(cantidades[talla]);
      if (cantidad > 0) {
        cantidadesFiltradas[talla] = cantidad;
        total += cantidad;
      }
    });

    if (!codigoArticulo || total === 0) {
         Swal.fire({ icon: 'info', text: 'Ingresa un código y selecciona cantidades válidas (mayor a 0).' });
         return;
    }

    if (!currentProductId) {
      Swal.fire({ icon: 'warning', text: 'Ese código no existe en tu stock.' });
      return;
    }

    const precioConDescuento = descuento > 0 ? totalConDescuento / total : precio;

    const nuevo: ItemUI = {
      codigo: codigoArticulo.toUpperCase(),
      descripcion,
      serie,
      precio: precioConDescuento,
      cantidades: { ...cantidades },
      total,
      product_id: currentProductId,
      unit_of_measure: currentUnitOfMeasure,
      sizeIdBySizeNumber: { ...currentSizeIdBySizeNumber },
    };

    setItems((prev) => [...prev, nuevo]);

    // Reset fields
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
    setDescuento(0);
    setTotalConDescuento(0);
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <ShoppingCart size={32} />
        <h1>Punto de Venta</h1>
      </div>

      {/* SECCIÓN 1: DATOS DEL CLIENTE */}
      <section className={styles.cardSection}>
        <h2 className={styles.cardTitle}>
            <User size={20} /> Datos del Cliente
        </h2>
        
        <div className={styles.gridThree}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Tipo Doc.</label>
                <select
                    className={styles.select}
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="Carnet de Extranjería">C. Extranjería</option>
                </select>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Número Doc.</label>
                <input
                    className={styles.inputDocument}
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="Ingrese número..."
                />
                 {loadingDoc && <small>Buscando...</small>}
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>{tipoDocumento === 'RUC' ? 'Razón Social' : 'Nombres'}</label>
                <input
                    className={styles.input}
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                />
            </div>
            
            {tipoDocumento !== 'RUC' && (
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Apellidos</label>
                    <input
                        className={styles.input}
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                    />
                </div>
            )}

             <div className={styles.inputGroup}>
                <label className={styles.label}>Correo</label>
                <input
                    className={styles.input}
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="cliente@email.com"
                />
            </div>

             <div className={styles.inputGroup}>
                <label className={styles.label}>Celular</label>
                <input
                    className={styles.input}
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                />
            </div>
             
             {/* Tipo de Comprobante para Venta */}
            <div className={styles.inputGroup}>
                <label className={styles.label}>Comprobante a emitir</label>
                <select 
                    className={styles.select} 
                    value={tipoDocumentoVenta} 
                    onChange={(e) => setTipoDocumentoVenta(e.target.value)}
                >
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
                </select>
            </div>
        </div>
      </section>

      {/* SECCIÓN 2: AGREGAR PRODUCTO */}
      <section className={styles.cardSection}>
        <h2 className={styles.cardTitle}>
            <Tag size={20} /> Producto
        </h2>

        <div className={styles.gridTwo}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Código (Escanear)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                        className={styles.input} 
                        value={codigoArticulo} 
                        onChange={handleBarcodeInput} 
                        ref={inputRef} 
                        placeholder="Escanear o digitar..."
                    />
                    <button className={styles.scanButton} onClick={handleScanButtonClick} type="button">
                        {scanning ? 'Detener' : <><Scan size={18}/> Scan</>}
                    </button>
                </div>
            </div>

            {scanning && (
                <div className={styles.cameraWrapper} id="camera-container">
                <div className={styles.scannerOverlay}></div>
                </div>
            )}
        </div>

        <div className={`${styles.gridFour} ${styles.mt4}`} style={{ marginTop: '1rem' }}>
             <div className={styles.inputGroup}>
                <label className={styles.label}>Descripción</label>
                <input className={`${styles.input} ${styles.inputReadOnly}`} value={descripcion} readOnly />
            </div>
             <div className={styles.inputGroup}>
                <label className={styles.label}>Serie</label>
                <input className={`${styles.input} ${styles.inputReadOnly}`} value={serie} readOnly />
            </div>
             <div className={styles.inputGroup}>
                <label className={styles.label}>Precio Unit. (S/)</label>
                <input
                    className={styles.input}
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(Number.parseFloat(e.target.value) || 0)}
                />
            </div>
        </div>

        {/* Descuentos */}
        <div className={styles.gridTwo} style={{ marginTop: '1rem', background: '#fffbeb', padding: '10px', borderRadius: '8px' }}>
             <div className={styles.inputGroup}>
                <label className={styles.label} style={{ color: '#b45309' }}><BadgePercent size={14}/> Descuento Global (S/)</label>
                <input
                    className={styles.input}
                    type="number"
                    value={descuento}
                    onChange={(e) => setDescuento(Number(e.target.value))}
                    placeholder="0.00"
                />
            </div>
             <div className={styles.inputGroup}>
                <label className={styles.label} style={{ color: '#b45309' }}>Total con Dcto.</label>
                <input className={`${styles.input} ${styles.inputReadOnly}`} value={totalConDescuento.toFixed(2)} readOnly />
            </div>
        </div>

        {/* Grid de Tallas */}
        {tallasDisponibles.length > 0 && (
            <div className={styles.tallasContainer}>
                <label className={styles.tallasLabel}>Selecciona Cantidades por Talla:</label>
                <div className={styles.tallasGrid}>
                    {tallasDisponibles.map((talla) => (
                        <div key={talla} className={styles.tallaItem}>
                            <span className={styles.tallaTitle}>{talla}</span>
                            <input
                                className={styles.tallaInput}
                                type="number"
                                min={0}
                                placeholder="0"
                                value={cantidades[talla] === 0 ? '' : cantidades[talla] ?? ''}
                                onChange={(e) => handleCantidadChange(talla, e.target.value)}
                            />
                            <span className={styles.stockBadge}>Stock: {stockPorTalla[talla] ?? 0}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <button 
            className={styles.addButton} 
            onClick={agregarItem} 
            disabled={!currentProductId || Object.keys(cantidades).length === 0}
        >
            <Box size={20} /> Agregar al Pedido
        </button>
      </section>

      {/* SECCIÓN 3: CARRITO Y PAGO */}
      <section className={styles.cardSection}>
         <h2 className={styles.cardTitle}>
            <ShoppingCart size={20} /> Carrito de Compras
        </h2>
        <PedidoTabla
            items={items}
            onDelete={handleDeleteItem}
            cliente={cliente}
            user={
            user?.token && user?.warehouse_id && user?.id
                ? { token: user.token, warehouseId: user.warehouse_id, userId: user.id }
                : null
            }
            onSaleRegistered={() => {
                setItems([]);
                Swal.fire({ icon: 'success', title: 'Venta Registrada', timer: 2000, showConfirmButton: false });
            }}
        />
      </section>
    </div>
  );
}