'use client';

import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { BrowserMultiFormatReader } from '@zxing/library';

import styles from '../register-requested/registerPedido.module.css';
import PedidoTabla from '../register-requested/PedidoTabla';
import { Cliente } from '../register-requested/mockClientes';

import { useUser } from '../context/UserContext';
import { getProductStockByWarehouseAndCode } from '../services/stockServices';

import { registerSale, CreateSalePayload } from '../services/saleServices';

// ✅ NUEVO: servicios de consulta DNI/RUC
import { GETDNI } from '../services/dniServices';
import { GETRUC } from '../services/rucServices';
import type { PaymentMethod } from '../services/saleServices';
import type { ItemUI } from '../components/types';

// =======================
// Tipos mínimos esperados del BACK
// =======================
type ApiStockRow = {
  stock_id?: number;
  id?: number;
  warehouse_id: number;
  product_id: number;
  product_size_id: number | null;
  size: string | null; // "38","39"...
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


export default function RegisterSalePage() {
  const { user } = useUser();

  // Cliente (tu UI)
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [celular, setCelular] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<string>('');
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');

  // ✅ NUEVO (solo para UI de consulta)
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docFetched, setDocFetched] = useState(false);

  // Producto actual
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [serie, setSerie] = useState('');
  const [precio, setPrecio] = useState(0);

  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]);
  const [stockPorTalla, setStockPorTalla] = useState<Record<number, number>>({});

  // para payload
  const [currentProductId, setCurrentProductId] = useState<number | null>(null);
  const [currentUnitOfMeasure, setCurrentUnitOfMeasure] = useState<string>('PAR');
  const [currentSizeIdBySizeNumber, setCurrentSizeIdBySizeNumber] = useState<Record<number, number>>({});

  // carrito
  const [items, setItems] = useState<ItemUI[]>([]);

  // descuento y pago
  const [descuento, setDescuento] = useState<number>(0);
  const [totalConDescuento, setTotalConDescuento] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('efectivo');
  const [tipoDocumentoVenta, setTipoDocumentoVenta] = useState<string>('boleta');

  // escaneo
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

  const toSizeNumber = (sizeStr: string): number | null => {
    const n = Number(sizeStr);
    return Number.isFinite(n) ? n : null;
  };

  const buildFromApi = (data: ApiProductResponse) => {
    const stockMap: Record<number, number> = {};
    const sizes: number[] = [];
    const sizeIdMap: Record<number, number> = {};

    for (const row of data.stock ?? []) {
      if (!row.size) continue;
      const sizeNum = toSizeNumber(row.size);
      if (sizeNum === null) continue;

      sizes.push(sizeNum);
      stockMap[sizeNum] = (stockMap[sizeNum] || 0) + Number(row.quantity || 0);

      // ✅ si viene product_size_id
      if (row.product_size_id) {
        sizeIdMap[sizeNum] = row.product_size_id;
      }
    }

    sizes.sort((a, b) => a - b);

    return {
      descripcion: data.article_description ?? '',
      serie: data.article_series ?? '',
      precio: Number(data.unit_price ?? 0),
      productId: Number(data.product_id ?? 0),
      unitOfMeasure: data.stock?.[0]?.unit_of_measure ?? 'PAR',
      tallasDisponibles: [...new Set(sizes)],
      stockPorTalla: stockMap,
      sizeIdBySizeNumber: sizeIdMap,
    };
  };

  // =======================
  // ✅ Consulta stock por warehouse + articleCode (debounce)
  // =======================
  useEffect(() => {
    if (!user?.token) return;
    if (!user?.warehouseId) return;

    const code = codigoArticulo.trim().toUpperCase();

    if (code.length < 7) {
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
          user.warehouseId,
          code.substring(0, 7),
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
        // Limpia si no existe
        setDescripcion('');
        setSerie('');
        setPrecio(0);
        setTallasDisponibles([]);
        setStockPorTalla({});
        setCurrentProductId(null);
        setCurrentUnitOfMeasure('PAR');
        setCurrentSizeIdBySizeNumber({});
        console.error(err?.message || err);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [codigoArticulo, user?.token, user?.warehouseId]);

  // ✅ NUEVO: consulta DNI/RUC según selección (debounce)
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

  // total descuento
  useEffect(() => {
    const cantidadTotal = Object.values(cantidades).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const precioConDesc = precio - precio * (descuento / 100);
    setTotalConDescuento(precioConDesc * cantidadTotal);
  }, [cantidades, descuento, precio]);

  // Escaneo por cámara
  const handleScanButtonClick = async () => {
    if (scanning) return;
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

          // talla (si viene 2 dígitos)
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
      Swal.fire({ icon: 'error', title: 'Error', text: error?.message || 'Error al acceder a la cámara.' });
      stopScanning();
    }
  };

  // lector por teclado
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

  const handleCantidadChange = (talla: number, value: string) => {
    const cantidad = Number.parseInt(value, 10) || 0;
    const disponible = stockPorTalla[talla] || 0;

    if (cantidad < 0) return;
    if (cantidad > disponible) {
      setCantidades((prev) => ({ ...prev, [talla]: disponible }));
      return;
    }
    setCantidades((prev) => ({ ...prev, [talla]: cantidad }));
  };

  const agregarItem = () => {
    const total = Object.values(cantidades).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (!codigoArticulo || total === 0) return;

    if (!currentProductId) {
      Swal.fire({ icon: 'warning', title: 'Producto no encontrado', text: 'Ese código no existe en tu stock.' });
      return;
    }

    // validar stock y mapeo
    for (const tallaStr of Object.keys(cantidades)) {
      const talla = Number(tallaStr);
      const cant = cantidades[talla] || 0;
      const disp = stockPorTalla[talla] || 0;

      if (cant > disp) {
        Swal.fire({ icon: 'warning', title: 'Stock insuficiente', text: `Talla ${talla} excede stock (${disp})` });
        return;
      }

      const sizeId = currentSizeIdBySizeNumber[talla];
      if (!sizeId && cant > 0) {
        Swal.fire({ icon: 'warning', title: 'Talla inválida', text: `No existe product_size_id para talla ${talla}` });
        return;
      }
    }

    const nuevo: ItemUI = {
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

    setItems((prev) => [...prev, nuevo]);

    // limpiar producto actual
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
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const botonAgregarDeshabilitado =
    !codigoArticulo ||
    Object.values(cantidades).reduce((sum, v) => sum + (Number(v) || 0), 0) === 0 ||
    Object.keys(cantidades).some((t) => (cantidades[Number(t)] || 0) > (stockPorTalla[Number(t)] || 0));

  // =====================================================
  // ✅ REGISTRAR VENTA (BD)
  // =====================================================
  const handleRegisterSale = async () => {
    if (!user?.token) {
      Swal.fire({ icon: 'warning', title: 'Sesión', text: 'No hay token. Inicia sesión.' });
      return;
    }
    if (!user?.warehouseId || !user?.userId) {
      Swal.fire({ icon: 'warning', title: 'Usuario', text: 'Falta warehouseId o userId.' });
      return;
    }
    if (!items.length) {
      Swal.fire({ icon: 'warning', title: 'Carrito vacío', text: 'Agrega productos antes de registrar.' });
      return;
    }

    const payloadItems: CreateSalePayload['items'] = [];

    for (const it of items) {
      const tallas = Object.keys(it.cantidades).map(Number);

      for (const talla of tallas) {
        const qty = Number(it.cantidades[talla] || 0);
        if (qty <= 0) continue;

        const product_size_id = it.sizeIdBySizeNumber[talla];

        if (!product_size_id) {
          await Swal.fire({
            icon: 'warning',
            title: 'Talla sin ID',
            text: `No existe product_size_id para la talla ${talla} del artículo ${it.codigo}`,
          });
          return;
        }

        payloadItems.push({
          product_id: it.product_id,
          product_size_id: product_size_id ?? null,
          quantity: qty,
          unit_of_measure: it.unit_of_measure || 'PAR',
        });
      }
    }

    if (!payloadItems.length) {
      Swal.fire({ icon: 'warning', title: 'Sin cantidades', text: 'No hay cantidades válidas para registrar.' });
      return;
    }

    const payload: CreateSalePayload = {
      warehouse_id: user.warehouseId,
      user_id: user.userId,
      payment_method: metodoPago,
      items: payloadItems,
    };

    try {
      const res = await registerSale(payload, user.token);

      Swal.fire({
        icon: 'success',
        title: 'Venta registrada',
        text: `Código: ${res?.sale?.sale_code ?? ''}`,
      });

      setItems([]);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo registrar la venta' });
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Registros de Ventas</h1>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Tipo de Documento:</label>
        <select
          className={`${styles.inputDocument} ${styles.labelDocument}`}
          value={tipoDocumento}
          onChange={(e) => setTipoDocumento(e.target.value)}
        >
          <option value="">Seleccionar Tipo de Documento</option>
          <option value="DNI">DNI</option>
          <option value="RUC">RUC</option>
          <option value="Carnet de Extranjería">Carnet de Extranjería</option>
        </select>
      </div>

      {tipoDocumento === 'DNI' && (
        <div className={styles.inputGroup}>
          <label className={styles.label}>Número de DNI:</label>
          <input
            className={`${styles.inputDocument} ${styles.labelDocument}`}
            type="text"
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
          />
          {loadingDoc && <small style={{ marginLeft: 8 }}>Consultando...</small>}
          {docFetched && !loadingDoc && <small style={{ marginLeft: 8 }}>✅ Encontrado</small>}

          <label className={styles.label}>Nombres:</label>
          <input
            className={`${styles.inputDocument} ${styles.labelDocument}`}
            type="text"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
          <label className={styles.label}>Apellidos:</label>
          <input
            className={`${styles.inputDocument} ${styles.labelDocument}`}
            type="text"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
          <label className={styles.label}>Correo:</label>
          <input
            className={`${styles.inputDocument} ${styles.labelDocument}`}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          <label className={styles.label}>Celular:</label>
          <input
            className={`${styles.inputDocument} ${styles.labelDocument}`}
            type="text"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
          />
        </div>
      )}

      {tipoDocumento === 'RUC' && (
        <div className={styles.inputGroup}>
          <label className={styles.label}>Número de RUC:</label>
          <input
            className={`${styles.inputDocument} ${styles.labelDocument}`}
            type="text"
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
          />
          {loadingDoc && <small style={{ marginLeft: 8 }}>Consultando...</small>}
          {docFetched && !loadingDoc && <small style={{ marginLeft: 8 }}>✅ Encontrado</small>}

          <label className={styles.label}>Razón Social:</label>
          <input
            className={`${styles.inputDocument} ${styles.labelDocument}`}
            type="text"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
          <label className={styles.label}>Correo:</label>
          <input
            className={`${styles.inputDocument} ${styles.labelDocument}`}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          <label className={styles.label}>Celular:</label>
          <input
            className={`${styles.inputDocument} ${styles.labelDocument}`}
            type="text"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
          />
        </div>
      )}

      <div className={styles.inputGroup}>
        <label className={styles.label}>Código del artículo:</label>
        <input className={styles.input} type="text" value={codigoArticulo} onChange={handleBarcodeInput} ref={inputRef} />
        <button className={styles.scanButton} onClick={handleScanButtonClick} disabled={scanning}>
          {scanning ? 'Escaneando...' : 'Escanear Producto'}
        </button>
      </div>

      {scanning && (
        <div className={styles.cameraContainer} id="camera-container">
          <div className={styles.scannerOverlay}>
            <div className={styles.redLineTop}></div>
            <div className={styles.redLineBottom}></div>
            <div className={styles.redLineLeft}></div>
            <div className={styles.redLineRight}></div>
          </div>
        </div>
      )}

      <div className={styles.inputGroup}>
        <label className={styles.label}>Descripción:</label>
        <input className={`${styles.input} ${styles.inputDescripcion}`} value={descripcion} readOnly />
        <label className={styles.label}>Serie:</label>
        <input className={`${styles.input} ${styles.inputSerie}`} value={serie} readOnly />
        <label className={styles.label}>Precio Unitario:</label>
        <input
          className={`${styles.input} ${styles.inputPrecio}`}
          type="number"
          value={precio}
          onChange={(e) => setPrecio(Number.parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Descuento por par (%):</label>
        <select className={styles.input} value={descuento} onChange={(e) => setDescuento(Number(e.target.value))}>
          {[0, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((d) => (
            <option key={d} value={d}>
              {d}%
            </option>
          ))}
        </select>

        <div>
          <label className={styles.label}>Total con descuento: </label>
          <input className={styles.input} value={totalConDescuento.toFixed(2)} readOnly />
        </div>
      </div>

      <div className={styles.tallasContainer}>
        <label className={styles.tallasLabel}>Cantidades por talla:</label>

        <div className={styles.tallasGrid}>
          {tallasDisponibles.map((talla) => (
            <div key={talla} className={styles.tallaInput}>
              <label className={styles.tallaLabel}>{talla}</label>
              <input
                className={styles.tallaField}
                type="number"
                value={cantidades[talla] ?? ''}
                onChange={(e) => handleCantidadChange(talla, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className={styles.tallasGrid}>
          {tallasDisponibles.map((talla) => (
            <div key={talla} className={styles.tallaInput}>
              <label className={styles.tallaLabel}>Talla: {talla}</label>
              <input className={styles.tallaField} type="number" value={stockPorTalla[talla] ?? 0} readOnly />
            </div>
          ))}
        </div>
      </div>

      {/* Tipo doc venta */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>Tipo de Documento:</label>
        <select className={styles.input} value={tipoDocumentoVenta} onChange={(e) => setTipoDocumentoVenta(e.target.value)}>
          <option value="boleta">Boleta</option>
          <option value="factura">Factura</option>
        </select>
      </div>

      <button className={styles.addButton} onClick={agregarItem} disabled={botonAgregarDeshabilitado}>
        Agregar al Pedido
      </button>

      <PedidoTabla
        items={items}
        onDelete={handleDeleteItem}
        cliente={cliente}
        user={
          user?.token && user?.warehouseId && user?.userId
            ? { token: user.token, warehouseId: user.warehouseId, userId: user.userId }
            : null
        }
        onSaleRegistered={() => {
          setItems([]);
          Swal.fire({ icon: 'success', title: 'Listo', text: 'Carrito limpiado.' });
        }}
      />

    </div>
  );
}
