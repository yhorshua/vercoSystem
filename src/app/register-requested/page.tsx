'use client';

import { useState, useEffect } from 'react';
import styles from './registerPedido.module.css';
import ClienteModal from './ClienteModal';
import PedidoTabla from './PedidoTabla';
import { getProductoByCodigo } from './mockData';
import { clientesMock, Cliente } from './mockClientes';

interface Item {
  codigo: string;
  descripcion: string;
  serie: string;
  precio: number;
  cantidades: Record<number, number>;
  total: number;
}

export default function RegisterPedidoPage() {
  const [cliente, setCliente] = useState<Cliente | null>(null);  // Guardar el cliente completo
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [serie, setSerie] = useState('');
  const [precio, setPrecio] = useState(0);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]);
  const [stockPorTalla, setStockPorTalla] = useState<Record<number, number>>({});
  const [items, setItems] = useState<Item[]>([]);

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
      <h1 className={styles.heading}>Registrar Pedido</h1>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Cliente:</label>
        <input
          className={`${styles.input} ${styles.inputClient}`}
          type="text"
          value={cliente?.razonSocial || ''}
          onClick={() => setShowClienteModal(true)}
          readOnly
          placeholder="Selecciona un cliente"
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Código del artículo:</label>
        <input
          className={styles.input}
          type="text"
          value={codigoArticulo}
          onChange={(e) => setCodigoArticulo(e.target.value.toUpperCase())}
        />
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

      {showClienteModal && (
        <ClienteModal
          clientes={clientesMock}
          onClose={() => setShowClienteModal(false)}
          onSelect={(clienteSeleccionado) => {
            setCliente(clienteSeleccionado);  // Asignamos el cliente completo
            setShowClienteModal(false);
          }}
        />
      )}
    </div>
  );
}
