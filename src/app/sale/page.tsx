'use client';

import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { BrowserMultiFormatReader } from '@zxing/library';

import styles from '../register-requested/registerPedido.module.css';
import PedidoTabla from './PedidoTabla';
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

  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [tallasDisponibles, setTallasDisponibles] = useState<string[]>([]); // Cambiar a string[]
  const [stockPorTalla, setStockPorTalla] = useState<Record<string, number>>({});  // Cambiar a Record<string, number>

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
    const stockMap: Record<string, number> = {};  // Cambié de number a string para aceptar tanto números como letras
    const sizes: string[] = [];  // Ahora las tallas son de tipo string (pueden ser números o letras)
    const sizeIdMap: Record<string, number> = {};  // Cambié de number a string para mapear las tallas

    for (const row of data.stock ?? []) {
      if (!row.size) continue;  // Si no tiene tamaño, lo ignoramos
      const sizeStr = row.size;  // Ahora 'size' puede ser tanto un número como una letra
      sizes.push(sizeStr);  // Agregamos la talla (que puede ser un string) al array de tallas
      stockMap[sizeStr] = (stockMap[sizeStr] || 0) + Number(row.quantity || 0);  // Usamos el string de talla como clave

      // Si existe product_size_id, lo asociamos con la talla
      if (row.product_size_id) {
        sizeIdMap[sizeStr] = row.product_size_id;
      }
    }

    sizes.sort((a, b) => {
      // Ordenamos las tallas alfabéticamente si son letras
      if (isNaN(Number(a)) && isNaN(Number(b))) {
        return a.localeCompare(b);
      }
      // Ordenamos las tallas numéricas de menor a mayor
      return Number(a) - Number(b);
    });

    return {
      descripcion: data.article_description ?? '',
      serie: data.article_series ?? '',
      precio: Number(data.manufacturing_cost ?? 0),
      productId: Number(data.product_id ?? 0),
      unitOfMeasure: data.stock?.[0]?.unit_of_measure ?? 'PAR',
      tallasDisponibles: [...new Set(sizes)],  // Las tallas ahora pueden ser letras o números
      stockPorTalla: stockMap,
      sizeIdBySizeNumber: sizeIdMap,
    };
  };


  // =======================
  // ✅ Consulta stock por warehouse + articleCode (debounce)
  // =======================
  // Actualización en la función para eliminar la validación estricta de 7 caracteres
  useEffect(() => {
    if (!user?.token) return;
    if (!user?.warehouse_id) return;

    const code = codigoArticulo.trim().toUpperCase(); // El código que el usuario ingresa

    // No limitamos la longitud del código, se permite cualquier longitud
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
          code,  // Ahora puede ser un código con longitud variable
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
  }, [codigoArticulo, user?.token, user?.warehouse_id]);


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

    if (cantidadTotal === 0) return; // Si no hay productos, no calculamos el total con descuento

    // Calculamos el precio total antes de descuento
    const precioTotalSinDescuento = precio * cantidadTotal;

    // Aplicamos el descuento (restando el monto total del descuento, no porcentaje)
    const precioConDesc = precioTotalSinDescuento - descuento;

    // Si el descuento es mayor que el total, aseguramos que no sea un valor negativo
    const totalConDesc = precioConDesc < 0 ? 0 : precioConDesc;

    // Actualizamos el estado con el total con descuento
    setTotalConDescuento(totalConDesc);
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

const handleCantidadChange = (talla: string, value: string) => {
  if (!talla || !value) return;  // Verifica si talla o value están vacíos

  const cantidad = Number(value);  // Convertimos el valor a número
  if (isNaN(cantidad)) {
    console.error(`Talla ${talla} tiene una cantidad inválida: ${value}`);
    return;  // No procesar si el valor no es un número válido
  }

  if (cantidad < 0) return;  // Evitar cantidades negativas

  // Verificamos que la cantidad no exceda el stock disponible
  const disponible = stockPorTalla[talla] || 0;
  if (cantidad > disponible) {
    setCantidades((prev) => ({
      ...prev,
      [talla]: disponible,  // Limitar la cantidad al stock disponible
    }));
    return;
  }

  // Actualizamos las cantidades en el estado
  setCantidades((prev) => ({
    ...prev,
    [talla]: cantidad,  // Actualiza la cantidad para esa talla específica
  }));
};




 const agregarItem = () => {
  const total = Object.values(cantidades).reduce((sum, v) => sum + (Number(v) || 0), 0);
  if (!codigoArticulo || total === 0) return;

  if (!currentProductId) {
    Swal.fire({ icon: 'warning', title: 'Producto no encontrado', text: 'Ese código no existe en tu stock.' });
    return;
  }

  // Validamos si el descuento existe
  const precioConDescuento = descuento > 0 ? totalConDescuento / total : precio;

  // Crear el nuevo item con el precio actualizado (con o sin descuento)
  const nuevo: ItemUI = {
    codigo: codigoArticulo.toUpperCase(),
    descripcion,
    serie,
    precio: precioConDescuento, // Usamos el precio con descuento o el precio normal
    cantidades: { ...cantidades },  // Debe contener las tallas con sus cantidades
    total, // Este 'total' debe ser el número total de ítems agregados
    product_id: currentProductId,
    unit_of_measure: currentUnitOfMeasure,
    sizeIdBySizeNumber: { ...currentSizeIdBySizeNumber },
  };

  setItems((prev) => [...prev, nuevo]);

  // Limpiar producto actual
  setCodigoArticulo('');
  setDescripcion('');
  setSerie('');
  setPrecio(0);
  setCantidades({});  // Limpiar las cantidades después de agregar
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
    if (!user?.warehouse_id || !user?.id) {
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
          unit_price: it.precio,
        });
      }
    }

    if (!payloadItems.length) {
      Swal.fire({ icon: 'warning', title: 'Sin cantidades', text: 'No hay cantidades válidas para registrar.' });
      return;
    }

    const payload: CreateSalePayload = {
      warehouse_id: user.warehouse_id,
      user_id: user.id,
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
        <label className={styles.label}>Monto de Descuento (S/):</label>
        <input
          className={styles.input}
          type="number"
          value={descuento}
          onChange={(e) => setDescuento(Number(e.target.value))}
          placeholder="Ingrese monto de descuento"
        />
        <div>
          <label className={styles.label}>Total con descuento: </label>
          <input className={styles.input} value={totalConDescuento.toFixed(2)} readOnly />
        </div>
      </div>


      <div className={styles.tallasContainer}>
        <label className={styles.tallasLabel}>Cantidades por talla:</label>

        <div className={styles.tallasGrid}>
          {tallasDisponibles.map((talla) => {
            const tallaNumerica = Number(talla);  // Convertir talla a número
            return (
              <div key={talla} className={styles.tallaInput}>
                <label className={styles.tallaLabel}>{talla}</label>
                <input
                  className={styles.tallaField}
                  type="number"
                  value={cantidades[talla] ?? ''}  // Usar tallaNumerica como clave
                  onChange={(e) => handleCantidadChange(talla, e.target.value)}  // Pasar tallaNumerica
                />
              </div>
            );
          })}
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
          user?.token && user?.warehouse_id && user?.id
            ? { token: user.token, warehouseId: user.warehouse_id, userId: user.id }
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
