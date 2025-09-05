'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from '../register-requested/registerPedido.module.css';
import PedidoTabla from '../register-requested/PedidoTabla';
import { getProductoByCodigo } from '../register-requested/mockData';
import { clientesMock, Cliente } from '../register-requested/./mockClientes';
import { BrowserMultiFormatReader } from '@zxing/library'; // Importamos la librería para escanear

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
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<string>('');  // Tipo de documento (DNI, RUC, etc.)
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

  // Función para manejar el tipo de documento
  const handleTipoDocumentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTipoDocumento(e.target.value);
  };

 const handleScanButtonClick = async () => {
  setScanning(true);
  try {
    // Verificar si el navegador soporta getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("La cámara no está disponible en este dispositivo.");
    }

    // Solicitar acceso a la cámara
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });

    const videoElement = document.createElement("video");
    videoElement.srcObject = stream;
    videoElement.setAttribute("playsinline", "true");
    videoElement.play();

    const scanner = new BrowserMultiFormatReader();
    scanner.decodeFromVideoDevice(null, videoElement, (result, error) => {
      if (result) {
        setCodigoArticulo(result.getText());
        stopScanning(); // Detener el escaneo después de obtener el resultado
      }
      if (error) {
        console.error(error); // Manejar errores
      }
    });
  } catch (error) {
    // Aseguramos que 'error' sea tratado como un objeto de tipo Error
    if (error instanceof Error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo acceder a la cámara.",
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Error desconocido",
        text: "Ocurrió un error inesperado.",
      });
    }
    stopScanning();
  }
};

  useEffect(() => {
    if (scanning) {
      const scanner = new BrowserMultiFormatReader();
      
      // Usamos la API getUserMedia para acceder a la cámara del dispositivo
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          const videoElement = document.createElement('video');
          videoElement.srcObject = stream;
          videoElement.setAttribute('playsinline', 'true');
          videoElement.play();

          scanner.decodeFromVideoDevice(null, videoElement, (result, error) => {
            if (result) {
              setCodigoArticulo(result.getText()); // Establecer el código escaneado en el input
              stopScanning(); // Detener el escaneo después de obtener el resultado
            }
            if (error) {
              console.error(error); // Manejar errores
            }
          });
        })
        .catch((err) => console.error("Error al acceder a la cámara: ", err));
    }

    return () => {
      // Limpiar scanner cuando el componente se desmonta o dejamos de escanear
      setScanning(false);
    };
  }, [scanning]);

  const stopScanning = () => {
    setScanning(false); // Detener el escaneo
  };



  
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

      {/* Código del artículo */}
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
          >
            {scanning ? 'Escaneando...' : 'Escanear Producto'}
          </button>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Descripción:</label>
        <input className={`${styles.input} ${styles.inputDescripcion}`} value={descripcion} readOnly />
        <label className={styles.label}>Serie:</label>
        <input className={`${styles.input} ${styles.inputSerie}`} value={serie} readOnly />
        <label className={styles.label}>Precio Unitario:</label>
        <input className={`${styles.input} ${styles.inputPrecio}`} type="number" value={precio} onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)} />
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

      <PedidoTabla items={items} onDelete={handleDeleteItem} cliente={cliente} /> {/* Aquí pasamos el cliente completo */}
    </div>
  );
}
