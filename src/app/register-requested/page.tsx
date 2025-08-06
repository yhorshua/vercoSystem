'use client';

import { useState, useEffect } from 'react';
import styles from './registerPedido.module.css';
import ClienteModal from './ClienteModal';

const stockMock: Record<string, {
  descripcion: string;
  serie: string;
  precio: number;
  stock: Record<number, number>;
}> = {
  A3024JF: {
    descripcion: "Zapatilla Importada Evolution Jade/Fucsia",
    serie: "A",
    precio: 89,
    stock: { 38: 12, 39: 5, 40: 9, 41: 6, 42: 10, 43: 7 },
  },
  M4013PL: {
    descripcion: "Zapatilla Escolar Clásica Negra",
    serie: "M",
    precio: 75,
    stock: { 33: 8, 34: 4, 35: 6, 36: 7, 37: 3 },
  },
};

const clientesMock = [
  'Supermercado Central',
  'Zapatería El Paso',
  'Cliente VIP',
  'Distribuidora Norte',
  'Retail Express',
  'Calzado Estilo',
];

export default function RegisterPedidoPage() {
  const [cliente, setCliente] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [serie, setSerie] = useState('');
  const [precio, setPrecio] = useState(0);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]);
  const [stockPorTalla, setStockPorTalla] = useState<Record<number, number>>({});
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (stockMock[codigoArticulo]) {
      const producto = stockMock[codigoArticulo];
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
    setCantidades((prev) => ({ ...prev, [talla]: parseInt(value) || 0 }));
  };

  const agregarItem = () => {
    const total = Object.values(cantidades).reduce((sum, val) => sum + val, 0);
    const nuevoItem = {
      codigo: codigoArticulo,
      descripcion,
      serie,
      precio,
      cantidades,
      total,
    };
    setItems([...items, nuevoItem]);
    setCodigoArticulo('');
    setDescripcion('');
    setSerie('');
    setPrecio(0);
    setCantidades({});
    setTallasDisponibles([]);
    setStockPorTalla({});
  };

  const totalUnidades = items.reduce((sum, item) => sum + item.total, 0);
  const totalPrecio = items.reduce((sum, item) => sum + item.total * item.precio, 0);

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Registrar Pedido</h1>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Cliente:</label>
        <input
          className={styles.input}
          type="text"
          value={cliente}
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
          onChange={(e) => setCodigoArticulo(e.target.value)}
        />

        <label className={styles.label}>Descripción:</label>
        <input
          className={styles.input}
          type="text"
          value={descripcion}
          readOnly
        />

        <label className={styles.label}>Serie:</label>
        <input
          className={styles.input}
          type="text"
          value={serie}
          readOnly
        />

        <label className={styles.label}>Precio Unitario:</label>
        <input
          className={styles.input}
          type="number"
          value={precio}
          onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
        />
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
        <div className={styles.stockGrid}>
          {tallasDisponibles.map((talla) => (
            <div key={talla} className={styles.tallaInput}>
              <label className={styles.tallaLabel}>Stock {talla}</label>
              <input
                className={styles.tallaField}
                type="number"
                value={stockPorTalla[talla]}
                readOnly
              />
            </div>
          ))}
        </div>
      </div>

      <button className={styles.addButton} onClick={agregarItem}>Agregar al Pedido</button>

      {items.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Serie</th>
                <th>Precio</th>
                {tallasDisponibles.map((t) => (
                  <th key={t}>{t}</th>
                ))}
                <th>Total</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.codigo}</td>
                  <td>{item.descripcion}</td>
                  <td>{item.serie}</td>
                  <td>{item.precio}</td>
                  {tallasDisponibles.map((t) => (
                    <td key={t}>{item.cantidades[t] || 0}</td>
                  ))}
                  <td>{item.total}</td>
                  <td>{(item.total * item.precio).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={tallasDisponibles.length + 4}><strong>Total Pedido:</strong></td>
                <td>{totalUnidades}</td>
                <td>{totalPrecio.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {showClienteModal && (
        <ClienteModal
          clientes={clientesMock}
          onClose={() => setShowClienteModal(false)}
          onSelect={(nombre) => {
            setCliente(nombre);
            setShowClienteModal(false);
          }}
        />
      )}
    </div>
  );
}
