'use client';

import { useState, useEffect } from 'react';
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
  const [cliente, setCliente] = useState<Cliente | null>(null);  // Guardar el cliente completo
  const [tipoDocumento, setTipoDocumento] = useState<string>('');  // Tipo de documento (DNI, RUC, etc.)
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
  const [scannerInitialized, setScannerInitialized] = useState(false); // Para controlar la inicialización del escáner

  // Función para manejar el tipo de documento
  const handleTipoDocumentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTipoDocumento(e.target.value);
  };
  
const handleScanButtonClick = async () => {
  if (scanning) return; // Evita abrir la cámara si ya está escaneando
  setScanning(true); // Activamos el escaneo
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("La cámara no está disponible en este dispositivo.");
    }

    // Solicitar acceso a la cámara
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },  // Resolución mínima
          height: { ideal: 720 }, // Resolución mínima
        },
      });

    // Asignamos el stream a un estado para poder visualizarlo
    setCameraStream(stream);

    // Crear un video element y asignar el stream
    const videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.setAttribute('playsinline', 'true');  // Importante para que funcione en iPhone
    videoElement.play();  // Inicia la reproducción
    document.getElementById('camera-container')?.appendChild(videoElement);  // Asegúrate de que el contenedor exista

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
            // Si la talla no está disponible
            console.error("Talla no válida para este artículo:", tallaEscaneada);
          }
        } else {
          console.error("Artículo no encontrado:", codigoArticulo);
        }

        playBeepSound(); // Reproducir sonido de escaneo solo cuando el escaneo fue exitoso
        stopScanning(); // Detener el escaneo después de obtener el resultado
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

  const playBeepSound = () => {
    const beep = new Audio('/beep.mp3'); // Asegúrate de tener un archivo beep.mp3 en tu proyecto
    beep.play();
  };

  const stopScanning = () => {
    setScanning(false); // Detener el escaneo
    if (cameraStream) {
      const tracks = cameraStream.getTracks();
      tracks.forEach(track => track.stop()); // Detener la cámara
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
    if (cantidad < 0 || cantidad > disponible) return;
    setCantidades((prev) => ({ ...prev, [talla]: cantidad }));
  };

  const handleDeleteItem = (index: number) => {
    const nuevosItems = items.filter((_, i) => i !== index);
    setItems(nuevosItems);
  };

  const agregarItem = () => {
    const total = Object.values(cantidades).reduce((sum, val) => sum + val, 0);
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

  const botonAgregarDeshabilitado = !codigoArticulo || Object.values(cantidades).reduce((sum, val) => sum + val, 0) === 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Registrar Venta</h1>

      {/* Aquí van los campos de tipo de documento, nombre, etc. */}

      <div className={styles.inputGroup}>
        <label className={styles.label}>Código del artículo:</label>
        <input
          className={styles.input}
          type="text"
          value={codigoArticulo}
          onChange={(e) => setCodigoArticulo(e.target.value.toUpperCase())}
        />
        <button
          className={styles.scanButton}
          onClick={handleScanButtonClick}
          disabled={scanning}
        >
          {scanning ? 'Escaneando...' : 'Escanear Producto'}
        </button>
      </div>

      {/* Mostrar cámara y el diseño de escáner con líneas rojas */}
      {scanning && (
        <div className={styles.cameraContainer} id="camera-container">
          <div className={styles.scannerOverlay}>
            {/* Las líneas rojas para el área de escaneo */}
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

      {/* Cantidades por talla */}
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
}
