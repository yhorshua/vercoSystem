'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

import { useUser } from '../context/UserContext';
import { registerIncoming, CreateIncomingPayload } from '../services/incomingServices';
import { getProductByCodeForIncoming, ProductIncomingResponse } from '../services/productIncomingLookup';

type IncomingItemUI = {
  codigo: string;
  descripcion: string;
  serie: string;

  product_id: number;
  unit_of_measure: string;

  cantidades: Record<number, number>;
  sizeIdBySizeNumber: Record<number, number>;
};

export default function StockIncomingPage() {
  const { user } = useUser();

  const [reference, setReference] = useState('Reposición');
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [serie, setSerie] = useState('');

  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]);
  const [sizeIdBySizeNumber, setSizeIdBySizeNumber] = useState<Record<number, number>>({});
  const [currentProductId, setCurrentProductId] = useState<number | null>(null);
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>('PAR');

  const [items, setItems] = useState<IncomingItemUI[]>([]);

  const toSizeNumber = (sizeStr: string): number | null => {
    const n = Number(sizeStr);
    return Number.isFinite(n) ? n : null;
  };

  // ✅ ahora consultamos Product + ProductSizes (no Stock)
  useEffect(() => {
    if (!user?.token) return;

    const code = codigoArticulo.trim().toUpperCase();
    if (code.length < 7) {
      setDescripcion('');
      setSerie('');
      setTallasDisponibles([]);
      setSizeIdBySizeNumber({});
      setCurrentProductId(null);
      setUnitOfMeasure('PAR');
      setCantidades({});
      return;
    }

    const t = setTimeout(async () => {
      try {
        const data: ProductIncomingResponse = await getProductByCodeForIncoming(code.substring(0, 7), user.token);

        setDescripcion(data.article_description ?? '');
        setSerie(data.article_series ?? '');
        setCurrentProductId(Number(data.product_id));
        setUnitOfMeasure(data.unit_of_measure ?? 'PAR');

        const sizes: number[] = [];
        const map: Record<number, number> = {};

        for (const s of data.sizes ?? []) {
          const tallaNum = toSizeNumber(s.size);
          if (tallaNum === null) continue;
          sizes.push(tallaNum);
          map[tallaNum] = s.product_size_id;
        }

        sizes.sort((a, b) => a - b);
        setTallasDisponibles([...new Set(sizes)]);
        setSizeIdBySizeNumber(map);
      } catch (e: any) {
        setDescripcion('');
        setSerie('');
        setTallasDisponibles([]);
        setSizeIdBySizeNumber({});
        setCurrentProductId(null);
        setCantidades({});
        // opcional: mostrar error
        // console.error(e?.message || e);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [codigoArticulo, user?.token]);

  const handleCantidadChange = (talla: number, value: string) => {
    const q = Number.parseInt(value, 10);
    setCantidades((prev) => ({ ...prev, [talla]: Number.isFinite(q) ? Math.max(0, q) : 0 }));
  };

  const agregarAlIngreso = async () => {
    if (!currentProductId) {
      Swal.fire({ icon: 'warning', title: 'Producto no encontrado', text: 'Ese código no existe.' });
      return;
    }

    const tieneCantidad = Object.values(cantidades).some((q) => Number(q) > 0);
    if (!tieneCantidad) {
      Swal.fire({ icon: 'warning', title: 'Sin cantidades', text: 'Coloca al menos 1 cantidad.' });
      return;
    }

    // validar product_size_id
    for (const tallaStr of Object.keys(cantidades)) {
      const talla = Number(tallaStr);
      const qty = Number(cantidades[talla] || 0);
      if (qty <= 0) continue;

      const psid = sizeIdBySizeNumber[talla];
      if (!psid) {
        await Swal.fire({
          icon: 'warning',
          title: 'Talla inválida',
          text: `No existe product_size_id para talla ${talla}.`,
        });
        return;
      }
    }

    const code7 = codigoArticulo.substring(0, 7).toUpperCase();

    // ✅ si ya está agregado, en vez de duplicar, sumamos cantidades
    const idxExist = items.findIndex((x) => x.codigo === code7);
    if (idxExist >= 0) {
      setItems((prev) => {
        const copy = [...prev];
        const old = copy[idxExist];

        const merged: Record<number, number> = { ...old.cantidades };
        for (const t of Object.keys(cantidades).map(Number)) {
          const add = Number(cantidades[t] || 0);
          if (add > 0) merged[t] = Number(merged[t] || 0) + add;
        }

        copy[idxExist] = { ...old, cantidades: merged };
        return copy;
      });
    } else {
      const item: IncomingItemUI = {
        codigo: code7,
        descripcion,
        serie,
        product_id: currentProductId,
        unit_of_measure: unitOfMeasure || 'PAR',
        cantidades: { ...cantidades },
        sizeIdBySizeNumber: { ...sizeIdBySizeNumber },
      };
      setItems((prev) => [...prev, item]);
    }

    // limpiar
    setCodigoArticulo('');
    setDescripcion('');
    setSerie('');
    setCantidades({});
    setTallasDisponibles([]);
    setSizeIdBySizeNumber({});
    setCurrentProductId(null);
    setUnitOfMeasure('PAR');
  };

  const eliminarItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const registrarIngreso = async () => {
    if (!user?.token || !user?.warehouse_id || !user?.id) {
      Swal.fire({ icon: 'warning', title: 'Sesión', text: 'Falta token/warehouseId/userId.' });
      return;
    }
    if (!items.length) {
      Swal.fire({ icon: 'warning', title: 'Vacío', text: 'Agrega productos antes de registrar.' });
      return;
    }

    const payloadItems: CreateIncomingPayload['items'] = [];

    for (const it of items) {
      for (const tallaStr of Object.keys(it.cantidades)) {
        const talla = Number(tallaStr);
        const qty = Number(it.cantidades[talla] || 0);
        if (qty <= 0) continue;

        const product_size_id = it.sizeIdBySizeNumber[talla];
        if (!product_size_id) continue;

        payloadItems.push({
          product_id: it.product_id,
          product_size_id,
          quantity: qty,
          unit_of_measure: it.unit_of_measure || 'PAR',
        });
      }
    }

    const payload: CreateIncomingPayload = {
      warehouse_id: user.warehouse_id,
      user_id: user.id,
      reference: reference?.trim() || 'Ingreso de mercadería',
      items: payloadItems,
    };

    try {
      const res = await registerIncoming(payload, user.token);
      Swal.fire({
        icon: 'success',
        title: 'Ingreso registrado',
        text: `Movimientos: ${res?.movements?.length ?? 0}`,
      });
      setItems([]);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo registrar' });
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <h1>Ingreso de mercadería</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Referencia: Reposición OC-123 / Nuevo modelo..."
        />
        <button
          onClick={registrarIngreso}
          disabled={!items.length}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #ccc' }}
        >
          Registrar ingreso
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <input
          style={{ width: 240, padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          value={codigoArticulo}
          onChange={(e) => setCodigoArticulo(e.target.value)}
          placeholder="Código (7 chars)"
        />
        <input
          style={{ flex: 1, padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          value={descripcion}
          readOnly
          placeholder="Descripción"
        />
        <input
          style={{ width: 160, padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          value={serie}
          readOnly
          placeholder="Serie"
        />
      </div>

      {!!tallasDisponibles.length && (
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <b>Cantidades por talla</b>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginTop: 10 }}>
            {tallasDisponibles.map((t) => (
              <div key={t}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Talla {t}</div>
                <input
                  type="number"
                  value={cantidades[t] ?? ''}
                  onChange={(e) => handleCantidadChange(t, e.target.value)}
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={agregarAlIngreso}
            style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid #ccc' }}
          >
            Agregar a la lista
          </button>
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
        <b>Lista de ingreso</b>

        {!items.length && <div style={{ marginTop: 10, opacity: 0.7 }}>No hay items agregados.</div>}

        {!!items.length && (
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {items.map((it, idx) => {
              const tallas = Object.keys(it.cantidades)
                .map(Number)
                .filter((t) => it.cantidades[t] > 0)
                .sort((a, b) => a - b);

              return (
                <div key={idx} style={{ padding: 10, border: '1px solid #eee', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <b>{it.codigo}</b> — {it.descripcion} ({it.serie})
                      <div style={{ marginTop: 6, fontSize: 13 }}>
                        {tallas.map((t) => `${t}/${it.cantidades[t]}`).join('  ')}
                      </div>
                    </div>
                    <button
                      onClick={() => eliminarItem(idx)}
                      style={{ border: '1px solid #ccc', borderRadius: 8, padding: '8px 10px' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
