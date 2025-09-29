'use client';

import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import styles from '../register-requested/registerPedido.module.css';
import PedidoTabla from '../register-requested/PedidoTabla';
import { getProductoByCodigo } from '../register-requested/mockData';
import { clientesMock, Cliente } from '../register-requested/mockClientes';
import { BrowserMultiFormatReader } from '@zxing/library'; // Importamos la librería para escanear códigos de barras

interface Item {
  codigo: string;
  descripcion: string;
  serie: string;
  precio: number;
  cantidades: Record<number, number>;
  total: number;
}

export default function RegisterSalePage() {
  const [nombres, setNombres] = useState<string>('');  // Nombres del cliente
  const [apellidos, setApellidos] = useState<string>('');  // Apellidos del cliente
  const [correo, setCorreo] = useState<string>('');  // Correo del cliente
  const [celular, setCelular] = useState<string>('');  // Celular del cliente
  const [codigoArticulo, setCodigoArticulo] = useState('');  // Código del artículo
  const [descripcion, setDescripcion] = useState('');  // Descripción del artículo
  const [serie, setSerie] = useState('');  // Serie del artículo
  const [precio, setPrecio] = useState(0);  // Precio del artículo
  const [cantidades, setCantidades] = useState<Record<number, number>>({});  // Cantidades por talla
  const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]);  // Tallas disponibles
  const [stockPorTalla, setStockPorTalla] = useState<Record<number, number>>({});  // Stock por talla
  const [items, setItems] = useState<Item[]>([]);
  const [scanning, setScanning] = useState(false); // Estado para manejar el escaneo
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null); // Guardar el stream de la cámara
  const inputRef = useRef<HTMLInputElement>(null); // Referencia para el input de código de artículo
  const [cliente, setCliente] = useState<Cliente | null>(null);  // Guardar el cliente completo
  const [tipoDocumento, setTipoDocumento] = useState<string>('');  // Tipo de documento (DNI, RUC, etc.)
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');  // Número de DNI o RUC
  const [accion, setAccion] = useState<string>('venta'); // "cambio" por defecto
  const [descuento, setDescuento] = useState<number>(0); // Descuento en porcentaje
  const [totalConDescuento, setTotalConDescuento] = useState<number>(0); // Total con descuento
  const [metodoPago, setMetodoPago] = useState<string>('efectivo'); // Método de pago
  const [tipoDocumentoVenta, setTipoDocumentoVenta] = useState<string>('boleta'); // Tipo de documento (Boleta o Factura)

  // Función para reproducir el sonido del escaneo (beep)
  const playBeepSound = () => {
    const beep = new Audio('/beep.mp3'); // Asegúrate de tener un archivo beep.mp3
    beep.play();
  };

  // Detener el escaneo y liberar la cámara
  const stopScanning = () => {
    setScanning(false); // Detener el escaneo
    if (cameraStream) {
      const tracks = cameraStream.getTracks();
      tracks.forEach(track => track.stop()); // Detener la cámara
    }
  };

  const handleTipoDocumentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTipoDocumento(e.target.value);
  };



  // Manejador para el escaneo usando la cámara
  const handleScanButtonClick = async () => {
    if (scanning) return; // Evita abrir la cámara si ya está escaneando
    setScanning(true); // Activamos el escaneo
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("La cámara no está disponible en este dispositivo.");
      }

      // Solicitar acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      // Asignamos el stream a un estado para poder visualizarlo
      setCameraStream(stream);

      // Crear un video element y asignar el stream
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.setAttribute('playsinline', 'true');
      videoElement.play();
      document.getElementById('camera-container')?.appendChild(videoElement);

      // Usar la librería ZXing para escanear el código
      const scanner = new BrowserMultiFormatReader();
      scanner.decodeFromVideoDevice(null, videoElement, (result, error) => {
        if (result) {
          console.log('Escaneado exitoso', result); // Asegúrate de ver si llega el resultado

          const codigoCompleto = result.getText(); // Código completo escaneado

          // Obtener los primeros 7 dígitos para el código de artículo
          const codigoArticulo = codigoCompleto.substring(0, 7); // Los primeros 7 caracteres
          setCodigoArticulo(codigoArticulo); // Asignamos al campo de código de artículo

          // Obtener la talla de los dígitos 8 y 9
          const tallaEscaneada = parseInt(codigoCompleto.substring(7, 9)); // Los dígitos 8 y 9 (talla)

          // Obtener las tallas disponibles del artículo escaneado
          const producto = getProductoByCodigo(codigoArticulo); // Simulación de consulta a la base de datos

          if (producto) {
            // Validar si la talla escaneada está en las tallas disponibles para el artículo
            if (producto.stock[tallaEscaneada]) {
              // Si la talla está disponible en el stock, agregar 1 a la cantidad
              const cantidadActual = cantidades[tallaEscaneada] || 0;
              setCantidades((prev) => ({
                ...prev,
                [tallaEscaneada]: cantidadActual + 1,
              }));
            } else {
              console.error("Talla no válida para este artículo:", tallaEscaneada);
            }
          } else {
            console.error("Artículo no encontrado:", codigoArticulo);
          }

          // Reproducir sonido de escaneo solo cuando el escaneo fue exitoso
          playBeepSound();
          // Detener el escaneo después de obtener el resultado
          stopScanning();
        }

        if (error) {
          console.error('Error en escaneo', error); // Manejar errores y ver qué pasa en la consola
        }
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error instanceof Error ? error.message : "Error al acceder a la cámara.",
      });
      stopScanning(); // Detener el escaneo si ocurre un error
    }
  };



  // Manejador para detectar la entrada del lector de código de barras (por teclado)
  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const barcode = e.target.value.trim();  // Código escaneado
    setCodigoArticulo(barcode); // Actualizar directamente el estado

    if (barcode.length >= 7) {
      const tallaEscaneada = parseInt(barcode.substring(7, 9)); // Obtener los dígitos 8 y 9 (talla)
      // Validar la talla y realizar la acción de agregar al stock
      const producto = getProductoByCodigo(barcode.substring(0, 7));
      if (producto && producto.stock[tallaEscaneada]) {
        const cantidadActual = cantidades[tallaEscaneada] || 0;
        setCantidades((prev) => ({
          ...prev,
          [tallaEscaneada]: cantidadActual + 1,
        }));
      }
      playBeepSound(); // Reproducir sonido de escaneo solo cuando el escaneo fue exitoso
    }
  };

  // Efecto para cargar el producto basado en el código escaneado
  useEffect(() => {
    const producto = getProductoByCodigo(codigoArticulo);
    if (producto) {
      setDescripcion(producto.descripcion);
      setSerie(producto.serie);
      setPrecio(producto.precio);
      setTallasDisponibles(Object.keys(producto.stock).map(Number));
      setStockPorTalla(producto.stock);
    } else {
      setDescripcion('');
      setSerie('');
      setPrecio(0);
      setTallasDisponibles([]);
      setStockPorTalla({});
    }
  }, [codigoArticulo]);

  const handleCantidadChange = (talla: number, value: string) => {
    const cantidad = parseInt(value) || 0;
    const disponible = stockPorTalla[talla] || 0;

    if (cantidad < 0 || cantidad > disponible) {
      // Si la cantidad es mayor que el stock, restablecer al máximo disponible
      setCantidades((prev) => ({ ...prev, [talla]: disponible }));
      return;
    }
    setCantidades((prev) => ({ ...prev, [talla]: cantidad }));
  };

  const handleDeleteItem = (index: number) => {
    const nuevosItems = items.filter((_, i) => i !== index);
    setItems(nuevosItems);
  };

  const agregarItem = () => {
    const total = Object.values(cantidades).reduce((sum, val) => sum + val, 0);

    // Verificar que no se superen los stocks
    for (const talla in cantidades) {
      const cantidad = cantidades[parseInt(talla)];
      if (cantidad > (stockPorTalla[parseInt(talla)] || 0)) {
        alert(`La cantidad de talla ${talla} excede el stock disponible`);
        return;
      }
    }

    if (!codigoArticulo || total === 0) return;
    const nuevoItem: Item = { codigo: codigoArticulo.toUpperCase(), descripcion, serie, precio, cantidades, total };
    setItems([...items, nuevoItem]);
    setCodigoArticulo('');
    setDescripcion('');
    setSerie('');
    setPrecio(0);
    setCantidades({});
    setTallasDisponibles([]);
    setStockPorTalla({});
  };


  const botonAgregarDeshabilitado =
    !codigoArticulo ||
    Object.values(cantidades).reduce((sum, val) => sum + val, 0) === 0 ||
    Object.keys(cantidades).some((talla) => cantidades[parseInt(talla)] > stockPorTalla[parseInt(talla)]);
  const handleDescuentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const descuentoSeleccionado = parseInt(e.target.value); // Valor del descuento seleccionado
    setDescuento(descuentoSeleccionado); // Actualizar el estado del descuento

    // Calcular el precio con descuento (por par)
    const precioConDescuento = precio - (precio * (descuentoSeleccionado / 100)); // Precio con el descuento aplicado

    // Calcular el total con descuento para la cantidad seleccionada (multiplicar por la cantidad total)
    const cantidadTotal = Object.values(cantidades).reduce((sum, val) => sum + val, 0); // Obtener la cantidad total de pares

    // Calcular el total con descuento basado en el precio con descuento por par
    const totalConDescuento = precioConDescuento * cantidadTotal;

    setTotalConDescuento(totalConDescuento); // Actualizar el total con descuento
  };

  // Si las cantidades cambian, recalcular el total con descuento
  useEffect(() => {
    // Recalcular el total con descuento cada vez que cambian las cantidades
    const cantidadTotal = Object.values(cantidades).reduce((sum, val) => sum + val, 0); // Obtener la cantidad total de pares
    const precioConDescuento = precio - (precio * (descuento / 100)); // Calcular el precio con descuento
    const totalConDescuento = precioConDescuento * cantidadTotal; // Calcular el total con descuento

    setTotalConDescuento(totalConDescuento); // Actualizar el total con descuento
  }, [cantidades, descuento, precio]); // Dependencias para recalcular

  const handleMetodoPagoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMetodoPago(e.target.value); // Actualizar el método de pago seleccionado
  };

  const handleTipoDocumentoVentaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTipoDocumentoVenta(e.target.value); // Actualizar el tipo de documento (Boleta o Factura)
  };



  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Registros de Ventas</h1>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Tipo de Documento:</label>
        <select
          className={`${styles.inputDocument} ${styles.labelDocument}`}
          value={tipoDocumento}
          onChange={handleTipoDocumentoChange}
        >
          <option value="">Seleccionar Tipo de Documento</option>
          <option value="DNI">DNI</option>
          <option value="RUC">RUC</option>
          <option value="Carnet de Extranjería">Carnet de Extranjería</option>
        </select>
      </div>

      {/* Campos adicionales cuando se selecciona DNI */}
      {tipoDocumento === 'DNI' && (
        <>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Número de DNI:</label>
            <input
              className={`${styles.inputDocument} ${styles.labelDocument}`}
              type="text"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
            />
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
        </>
      )}

      {/* Campos adicionales cuando se selecciona RUC */}
      {tipoDocumento === 'RUC' && (
        <>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Número de RUC:</label>
            <input
              className={`${styles.inputDocument} ${styles.labelDocument}`}
              type="text"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
            />
            <label className={styles.label}>Razón Social:</label>
            <input
              className={`${styles.inputDocument} ${styles.labelDocument}`}
              type="text"
              value={nombres}  // Usamos 'nombres' para razón social
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
        </>
      )}

      <div className={styles.inputGroup}>
        <label className={styles.label}>Código del artículo:</label>
        <input
          className={styles.input}
          type="text"
          value={codigoArticulo}
          onChange={handleBarcodeInput}  // Detectar el código de barras de lectores
        />
        <button
          className={styles.scanButton}
          onClick={handleScanButtonClick}
          disabled={scanning}
        >
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
        <input className={`${styles.input} ${styles.inputPrecio}`} type="number" value={precio} onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)} />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Descuento por par (%):</label>
        <select
          className={styles.input}
          value={descuento} // Estado que guarda el descuento
          onChange={handleDescuentoChange}
        >
          <option value="0">0%</option>
          <option value="10">10%</option>
          <option value="15">15%</option>
          <option value="20">20%</option>
          <option value="25">25%</option>
          <option value="30">30%</option>
          <option value="35">35%</option>
          <option value="40">40%</option>
          <option value="45">45%</option>
          <option value="50">50%</option>
        </select>

        <div>
          <label className={styles.label}>Total con descuento: </label>
          <input
            className={`${styles.input} ${styles.input}`}
            value={totalConDescuento.toFixed(2)}  // Mostrar el total con descuento
            readOnly
          />

        </div>
      </div>

      <div className={styles.inputGroup}>
      
        <label className={styles.label}>Método de Pago:</label>
        <select
          className={styles.input}
          value={metodoPago}
          onChange={handleMetodoPagoChange}
        >
          <option value="efectivo">Efectivo</option>
          <option value="yape">Yape</option>
          <option value="plin">Plin</option>
          <option value="tarjetaDebito">Tarjeta Débito</option>
          <option value="tarjetaCredito">Tarjeta Crédito</option>
          <option value="yapeEfectivo">Yape/Efectivo</option>
          <option value="obsequio">Obsequio</option>
        </select>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Tipo de Documento:</label>
        <select
          className={styles.input}
          value={tipoDocumentoVenta}
          onChange={handleTipoDocumentoVentaChange}
        >
          <option value="boleta">Boleta</option>
          <option value="factura">Factura</option>
        </select>
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
                value={cantidades[talla] || ''}
                onChange={(e) => handleCantidadChange(talla, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className={styles.tallasGrid}>
          {tallasDisponibles.map((talla) => (
            <div key={talla} className={styles.tallaInput}>
              <label className={styles.tallaLabel}>Stock {talla}</label>
              <input className={styles.tallaField} type="number" value={stockPorTalla[talla]} readOnly />
            </div>
          ))}
        </div>
      </div>

      <button
        className={styles.addButton}
        onClick={agregarItem}
        disabled={botonAgregarDeshabilitado}
      >
        Agregar al Pedido
      </button>

      <PedidoTabla items={items} onDelete={handleDeleteItem} cliente={cliente} />
    </div>
  );
};
