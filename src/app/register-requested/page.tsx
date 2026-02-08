'use client';

import { useEffect, useState } from 'react';
import styles from './registerPedido.module.css';
import ClienteModal from './ClienteModal';
import PedidoTabla from './PedidoTabla';
import { getProductStockByWarehouseAndCode } from '../services/stockServices';
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

export default function RegisterPedidoPage() {
  const { user } = useUser(); // Usamos useUser directamente

  const [isClientSide, setIsClientSide] = useState(false); // Este estado asegura que se renderice en el cliente
  const [cliente, setCliente] = useState<ClienteUI | null>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);

  // Otros estados
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [serie, setSerie] = useState('');
  const [precio, setPrecio] = useState(0);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]);
  const [stockPorTalla, setStockPorTalla] = useState<Record<number, number>>({});
  const [items, setItems] = useState<ItemUI[]>([]);
  const [productoActual, setProductoActual] = useState<any>(null);

  const [currentProductId, setCurrentProductId] = useState<number | null>(null);
  const [currentUnitOfMeasure, setCurrentUnitOfMeasure] = useState<string>('PAR');
  const [currentSizeIdBySizeNumber, setCurrentSizeIdBySizeNumber] = useState<Record<number, number>>({});

  // Estado para manejar el token correctamente
  const [token, setToken] = useState<string | null>(null);

  // Establecer isClientSide a true después de que el componente se haya montado
  useEffect(() => {
    setIsClientSide(true); // Solo después del renderizado inicial, se habilita la ejecución de lógica del cliente
  }, []);

  // Verificar y establecer el token solo en el cliente
  useEffect(() => {
    if (isClientSide && user?.token) {
      setToken(user.token); // Establecer token solo si está disponible
    }
  }, [isClientSide, user]);

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

      if (row.product_size_id) {
        sizeIdMap[sizeNum] = row.product_size_id;
      }
    }

    sizes.sort((a, b) => a - b);

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

  useEffect(() => {
    if (token && user?.warehouse_id) {
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
            user.warehouse_id,
            code.substring(0, 7),
            token
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
          console.error(err?.message || err);
        }
      }, 300);

      return () => clearTimeout(t);
    }
  }, [codigoArticulo, token, user?.warehouse_id, isClientSide]); // Dependencias revisadas y asegurado que se ejecute en el cliente


  const handleCantidadChange = (talla: number, value: string) => {
    const cantidad = parseInt(value) || 0;
    const disponible = stockPorTalla[talla] || 0;

    if (cantidad < 0 || cantidad > disponible) {
      setCantidades((prev) => ({ ...prev, [talla]: disponible }));
      return;
    }
    setCantidades((prev) => ({ ...prev, [talla]: cantidad }));
  };

  const agregarItem = () => {
    if (!codigoArticulo || !currentProductId) return;

    const total = Object.values(cantidades).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0
    );

    if (total === 0) return;

    for (const tallaStr of Object.keys(cantidades)) {
      const talla = Number(tallaStr);
      const qty = cantidades[talla] || 0;
      const disponible = stockPorTalla[talla] || 0;

      if (qty > disponible) {
        alert(`Stock insuficiente para la talla ${talla}`);
        return;
      }

      if (!currentSizeIdBySizeNumber[talla] && qty > 0) {
        alert(`No existe product_size_id para la talla ${talla}`);
        return;
      }
    }

    const nuevoItem: ItemUI = {
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

    setItems((prev) => [...prev, nuevoItem]);

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
      <div className={styles.inputGroup}>
        <label className={styles.label}>Código del artículo:</label>
        <input
          className={styles.input}
          type="text"
          value={codigoArticulo}
          onChange={(e) => setCodigoArticulo(e.target.value)}
        />
      </div>

      {/* ... tu bloque de productos/tallas ... */}
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

        <button
          className={styles.addButton}
          onClick={agregarItem}
          disabled={
            !codigoArticulo ||
            Object.values(cantidades).reduce((s, v) => s + (Number(v) || 0), 0) === 0
          }
        >
          Agregar al Pedido
        </button>

      </div>

      {/* ✅ Modal consume /clients/mine al abrir */}
      <ClienteModal
        open={showClienteModal}
        token={user!.token}
        onClose={() => setShowClienteModal(false)}
        onSelect={(clienteSeleccionado) => {
          setCliente(clienteSeleccionado);
          setShowClienteModal(false);
        }}
      />

      {/* ✅ luego aquí sí puedes pasar cliente a PedidoTabla */}
      <PedidoTabla
        items={items}
        cliente={cliente}
        user={{
          token: user!.token,
          id: user!.id,
          warehouseId: user!.warehouse_id,
        }}
        onDeleteItem={(index) =>
          setItems((prev) => prev.filter((_, i) => i !== index))
        }
        onPedidoCreado={() => {
          setItems([]);
          setCliente(null);
        }}
      />
    </div>
  );
}
