'use client';

import { useEffect, useState } from 'react';
import styles from './registerPedido.module.css';
import ClienteModal from './ClienteModal';
import PedidoTabla from './PedidoTabla';
import { getProductoByCodigo } from './mockData';
import type { ItemUI } from '../components/types';

import { useUser } from '../context/UserContext';

type ClienteUI = {
  id: number;
  codigo: string;
  ruc: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
};

export default function RegisterPedidoPage() {
  const { user } = useUser();              // ✅ aquí está token/rol/etc
  const token = user?.token ?? '';

  const [cliente, setCliente] = useState<ClienteUI | null>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);

  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [serie, setSerie] = useState('');
  const [precio, setPrecio] = useState(0);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]);
  const [stockPorTalla, setStockPorTalla] = useState<Record<number, number>>({});
  const [items, setItems] = useState<ItemUI[]>([]);
  const [productoActual, setProductoActual] = useState<any>(null);

  useEffect(() => {
    const producto = getProductoByCodigo(codigoArticulo);

    if (producto) {
      setProductoActual(producto);
      setDescripcion(producto.descripcion);
      setSerie(producto.serie);
      setPrecio(producto.precio);
      setTallasDisponibles(Object.keys(producto.stock).map(Number));
      setStockPorTalla(producto.stock);
    } else {
      setProductoActual(null);
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
      setCantidades((prev) => ({ ...prev, [talla]: disponible }));
      return;
    }
    setCantidades((prev) => ({ ...prev, [talla]: cantidad }));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Registrar Pedido</h1>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Cliente:</label>
        <input
          className={`${styles.input} ${styles.inputClient}`}
          type="text"
          value={cliente?.razonSocial || ''}
          onClick={() => setShowClienteModal(true)}   // ✅ abre modal
          readOnly
          placeholder="Selecciona un cliente"
        />
      </div>

      {/* ... tu bloque de productos/tallas ... */}
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
        <input
          className={`${styles.input} ${styles.inputPrecio}`}
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

        <div className={styles.tallasGrid}>
          {tallasDisponibles.map((talla) => (
            <div key={talla} className={styles.tallaInput}>
              <label className={styles.tallaLabel}>Stock {talla}</label>
              <input className={styles.tallaField} type="number" value={stockPorTalla[talla]} readOnly />
            </div>
          ))}
        </div>
      </div>

      {/* ✅ Modal consume /clients/mine al abrir */}
      <ClienteModal
        open={showClienteModal}
        token={token}
        onClose={() => setShowClienteModal(false)}
        onSelect={(clienteSeleccionado) => {
          setCliente(clienteSeleccionado);
          setShowClienteModal(false);
        }}
      />

      {/* ✅ luego aquí sí puedes pasar cliente a PedidoTabla */}
      {/* <PedidoTabla items={items} onDelete={handleDeleteItem} cliente={cliente} user={user} /> */}
    </div>
  );
}
