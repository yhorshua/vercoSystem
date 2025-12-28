'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import Swal from 'sweetalert2';
import styles from './registerPedido.module.css';
import { useMemo, useState } from 'react';

import { registerSale, CreateSalePayload, PaymentMethod } from '../services/saleServices';
import type { ItemUI } from '../components/types';


interface Cliente {
  codigo: string;
  razonSocial: string;
  ruc: string;
  direccion: string;
  direccion2?: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}
/*
export interface Item {
  codigo: string;
  descripcion: string;
  serie: string;
  precio: number;
  cantidades: Record<number, number>;
  total: number;

  product_id: number;
  unit_of_measure: string;
  sizeIdBySizeNumber: Record<number, number>;
}
*/
interface PedidoTablaProps {
  items: ItemUI[];
  onDelete: (index: number) => void;
  cliente: Cliente | null;

  user: {
    token: string;
    warehouseId: number;
    userId: number;
  } | null;

  onSaleRegistered?: () => void;
}

type MetodoPago =
  | 'efectivo'
  | 'yape'
  | 'plin'
  | 'tarjetaDebito'
  | 'tarjetaCredito'
  | 'yapeEfectivo'
  | 'obsequio';

export default function PedidoTabla({
  items,
  onDelete,
  cliente,
  user,
  onSaleRegistered,
}: PedidoTablaProps) {
  const totalUnidades = items.reduce((sum, item) => sum + item.total, 0);
  const totalPrecio = items.reduce((sum, item) => sum + item.total * item.precio, 0);

  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [tipoDocumentoVenta, setTipoDocumentoVenta] = useState<'boleta' | 'factura'>('boleta');

  // ====== EFECTIVO ======
  const [efectivoEntregado, setEfectivoEntregado] = useState<string>('');

  const efectivoEntregadoNum = useMemo(() => {
    const n = Number(efectivoEntregado);
    return Number.isFinite(n) ? n : 0;
  }, [efectivoEntregado]);

  const vueltoEfectivo = useMemo(() => {
    if (metodoPago !== 'efectivo') return 0;
    const diff = efectivoEntregadoNum - totalPrecio;
    return diff > 0 ? diff : 0;
  }, [metodoPago, efectivoEntregadoNum, totalPrecio]);

  const efectivoInvalido = useMemo(() => {
    if (metodoPago !== 'efectivo') return false;
    if (efectivoEntregado.trim() === '') return true;
    return efectivoEntregadoNum < totalPrecio;
  }, [metodoPago, efectivoEntregado, efectivoEntregadoNum, totalPrecio]);

  // ====== YAPE / PLIN / TARJETA ======
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');

  const requiereOperacion = useMemo(() => {
    return (
      metodoPago === 'yape' ||
      metodoPago === 'plin' ||
      metodoPago === 'tarjetaDebito' ||
      metodoPago === 'tarjetaCredito'
    );
  }, [metodoPago]);

  const operacionInvalida = useMemo(() => {
    if (!requiereOperacion) return false;
    return numeroOperacion.trim().length < 6;
  }, [requiereOperacion, numeroOperacion]);

  // ====== YAPE / EFECTIVO (mixto) ======
  const [montoYape, setMontoYape] = useState<string>('');
  const [operacionYape, setOperacionYape] = useState<string>('');
  const [efectivoEntregadoMixto, setEfectivoEntregadoMixto] = useState<string>('');

  const montoYapeNum = useMemo(() => {
    const n = Number(montoYape);
    return Number.isFinite(n) ? n : 0;
  }, [montoYape]);

  const efectivoEntregadoMixtoNum = useMemo(() => {
    const n = Number(efectivoEntregadoMixto);
    return Number.isFinite(n) ? n : 0;
  }, [efectivoEntregadoMixto]);

  const montoEfectivoMixto = useMemo(() => {
    if (metodoPago !== 'yapeEfectivo') return 0;
    const diff = totalPrecio - montoYapeNum;
    return diff > 0 ? diff : 0;
  }, [metodoPago, totalPrecio, montoYapeNum]);

  const vueltoMixto = useMemo(() => {
    if (metodoPago !== 'yapeEfectivo') return 0;
    const diff = efectivoEntregadoMixtoNum - montoEfectivoMixto;
    return diff > 0 ? diff : 0;
  }, [metodoPago, efectivoEntregadoMixtoNum, montoEfectivoMixto]);

  const mixtoInvalido = useMemo(() => {
    if (metodoPago !== 'yapeEfectivo') return false;

    if (montoYape.trim() === '') return true;
    if (montoYapeNum <= 0) return true;
    if (montoYapeNum >= totalPrecio) return true;
    if (operacionYape.trim().length < 6) return true;

    if (efectivoEntregadoMixto.trim() === '') return true;
    if (efectivoEntregadoMixtoNum < montoEfectivoMixto) return true;

    return false;
  }, [
    metodoPago,
    montoYape,
    montoYapeNum,
    totalPrecio,
    operacionYape,
    efectivoEntregadoMixto,
    efectivoEntregadoMixtoNum,
    montoEfectivoMixto,
  ]);

  // ====== OBSEQUIO ======
  const [motivoObsequio, setMotivoObsequio] = useState<string>('');
  const [autorizadoPor, setAutorizadoPor] = useState<string>('');

  const obsequioInvalido = useMemo(() => {
    if (metodoPago !== 'obsequio') return false;
    return motivoObsequio.trim().length < 5;
  }, [metodoPago, motivoObsequio]);

  // ====== VALIDACIÓN GENERAL ======
  const isPagoValido = useMemo(() => {
    if (metodoPago === 'efectivo') return !efectivoInvalido;
    if (requiereOperacion) return !operacionInvalida;
    if (metodoPago === 'yapeEfectivo') return !mixtoInvalido;
    if (metodoPago === 'obsequio') return !obsequioInvalido;
    return true;
  }, [metodoPago, efectivoInvalido, requiereOperacion, operacionInvalida, mixtoInvalido, obsequioInvalido]);

  const resetPagoStates = () => {
    setEfectivoEntregado('');
    setNumeroOperacion('');
    setMontoYape('');
    setOperacionYape('');
    setEfectivoEntregadoMixto('');
    setMotivoObsequio('');
    setAutorizadoPor('');
  };

  // =======================
  // TABLA
  // =======================
  const columns: ColumnDef<ItemUI>[] = [
    { accessorKey: 'codigo', header: 'Artículo', cell: (info) => info.getValue() as any },
    { accessorKey: 'descripcion', header: 'Descripción', cell: (info) => info.getValue() as any },
    { accessorKey: 'serie', header: 'Serie', cell: (info) => info.getValue() as any },
    {
      id: 'cantidades',
      header: 'Cantidades por talla',
      cell: (info) => {
        const item = info.row.original;
        const tallas = Object.keys(item.cantidades).map(Number).sort((a, b) => a - b);
        return tallas.map((t) => `${t}/${item.cantidades[t]}`).join(' ');
      },
    },
    { accessorKey: 'total', header: 'Pares', cell: (info) => info.getValue() as any },
    { accessorKey: 'precio', header: 'Precio', cell: (info) => Number(info.getValue()).toFixed(2) },
    {
      id: 'valor',
      header: 'Valor',
      cell: (info) => (info.row.original.total * info.row.original.precio).toFixed(2),
    },
    {
      id: 'acciones',
      header: 'Eliminar',
      cell: (info) => (
        <button
          className={styles.deleteButton}
          onClick={() => onDelete(info.row.index)}
          title="Eliminar"
        >
          🗑️
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // =======================
  // ✅ REGISTRAR VENTA BD
  // =======================
  const handleRegistrarVentaBD = async () => {
    if (!user?.token || !user?.warehouseId || !user?.userId) {
      Swal.fire({ icon: 'warning', title: 'Sesión', text: 'Falta token / warehouseId / userId.' });
      return;
    }

    if (!items.length) {
      Swal.fire({ icon: 'warning', title: 'Carrito vacío', text: 'Agrega productos antes de registrar.' });
      return;
    }

    if (!isPagoValido) {
      Swal.fire({
        icon: 'warning',
        title: 'Pago incompleto',
        text: 'Completa correctamente los campos del método de pago seleccionado.',
      });
      return;
    }

    // 1) items payload
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
          product_size_id,
          quantity: qty,
          unit_of_measure: it.unit_of_measure || 'PAR',
        });
      }
    }

    if (!payloadItems.length) {
      Swal.fire({ icon: 'warning', title: 'Sin cantidades', text: 'No hay cantidades válidas para registrar.' });
      return;
    }

    // 2) payment payload (llaves exactas del DTO del back)
    const payment_method = metodoPago as PaymentMethod;

    const payment: CreateSalePayload['payment'] =
      payment_method === 'efectivo'
        ? { efectivoEntregado: efectivoEntregadoNum, vuelto: vueltoEfectivo }
        : payment_method === 'yape' ||
          payment_method === 'plin' ||
          payment_method === 'tarjetaDebito' ||
          payment_method === 'tarjetaCredito'
          ? { numeroOperacion: numeroOperacion.trim() }
          : payment_method === 'yapeEfectivo'
            ? {
              yapeMonto: montoYapeNum,
              yapeOperacion: operacionYape.trim(),
              efectivoEntregadoMixto: efectivoEntregadoMixtoNum,
              vueltoMixto: vueltoMixto,
            }
            : payment_method === 'obsequio'
              ? { motivoObsequio: motivoObsequio.trim(), autorizadoPor: autorizadoPor.trim() || undefined }
              : undefined;

    const payload: CreateSalePayload = {
      warehouse_id: user.warehouseId,
      user_id: user.userId,
      payment_method,
      payment,
      items: payloadItems,

      // ⚠️ si tu back ya tiene document_type en DTO, descomenta:
      // document_type: tipoDocumentoVenta,
    };

    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Confirmar venta',
      text: `Registrar venta por S/ ${totalPrecio.toFixed(2)} ?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await registerSale(payload, user.token);

      await Swal.fire({
        icon: 'success',
        title: 'Venta registrada',
        text: `Código: ${res?.sale?.sale_code ?? ''}`,
      });

      resetPagoStates();
      onSaleRegistered?.();
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e?.message || 'No se pudo registrar la venta',
      });
    }
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.responsiveWrapper}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={4}><strong>Total General</strong></td>
              <td>{totalUnidades}</td>
              <td></td>
              <td><strong>{totalPrecio.toFixed(2)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer pago */}
      <div className={styles.formFooter}>
        {/* Documento */}
     
        {/* Método pago */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Método de Pago:</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as PaymentMethod)}
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

        {/* EFECTIVO */}
        {metodoPago === 'efectivo' && (
          <div className={styles.paymentPanel}>
            <h4 className={styles.panelTitle}>Pago en efectivo</h4>
            <div className={styles.paymentGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Total (S/)</label>
                <input className={styles.input} value={totalPrecio.toFixed(2)} readOnly />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Efectivo entregado (S/)</label>
                <input
                  className={`${styles.input} ${efectivoInvalido ? styles.inputError : ''}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={efectivoEntregado}
                  onChange={(e) => setEfectivoEntregado(e.target.value)}
                  placeholder="Ej: 100.00"
                />
                {efectivoInvalido && (
                  <small className={styles.helperError}>
                    El efectivo entregado debe ser mayor o igual al total.
                  </small>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Vuelto (S/)</label>
                <input className={styles.input} value={vueltoEfectivo.toFixed(2)} readOnly />
              </div>
            </div>
          </div>
        )}

        {/* YAPE/PLIN/TARJETAS */}
        {(metodoPago === 'yape' ||
          metodoPago === 'plin' ||
          metodoPago === 'tarjetaDebito' ||
          metodoPago === 'tarjetaCredito') && (
            <div className={styles.paymentPanel}>
              <h4 className={styles.panelTitle}>
                {metodoPago === 'yape' && 'Pago con Yape'}
                {metodoPago === 'plin' && 'Pago con Plin'}
                {metodoPago === 'tarjetaDebito' && 'Pago con Tarjeta Débito'}
                {metodoPago === 'tarjetaCredito' && 'Pago con Tarjeta Crédito'}
              </h4>

              <div className={styles.paymentGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Total (S/)</label>
                  <input className={styles.input} value={totalPrecio.toFixed(2)} readOnly />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>N° Operación / Voucher</label>
                  <input
                    className={`${styles.input} ${operacionInvalida ? styles.inputError : ''}`}
                    value={numeroOperacion}
                    onChange={(e) => setNumeroOperacion(e.target.value)}
                    placeholder="Ej: 000123456"
                  />
                  {operacionInvalida && (
                    <small className={styles.helperError}>
                      Ingresa un número de operación válido (mín. 6 caracteres).
                    </small>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Monto (S/)</label>
                  <input className={styles.input} value={totalPrecio.toFixed(2)} readOnly />
                </div>
              </div>
            </div>
          )}

        {/* MIXTO */}
        {metodoPago === 'yapeEfectivo' && (
          <div className={styles.paymentPanel}>
            <h4 className={styles.panelTitle}>Pago mixto (Yape + Efectivo)</h4>

            <div className={styles.paymentGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Total (S/)</label>
                <input className={styles.input} value={totalPrecio.toFixed(2)} readOnly />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Monto Yape (S/)</label>
                <input
                  className={`${styles.input} ${mixtoInvalido ? styles.inputError : ''}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={montoYape}
                  onChange={(e) => setMontoYape(e.target.value)}
                  placeholder="Ej: 50.00"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>N° Operación Yape</label>
                <input
                  className={`${styles.input} ${mixtoInvalido ? styles.inputError : ''}`}
                  value={operacionYape}
                  onChange={(e) => setOperacionYape(e.target.value)}
                  placeholder="Ej: 000123456"
                />
              </div>
            </div>

            <div className={styles.paymentGrid} style={{ marginTop: 12 }}>
              <div className={styles.field}>
                <label className={styles.label}>Monto en efectivo (S/)</label>
                <input className={styles.input} value={montoEfectivoMixto.toFixed(2)} readOnly />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Efectivo entregado (S/)</label>
                <input
                  className={`${styles.input} ${mixtoInvalido ? styles.inputError : ''}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={efectivoEntregadoMixto}
                  onChange={(e) => setEfectivoEntregadoMixto(e.target.value)}
                  placeholder="Ej: 60.00"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Vuelto (S/)</label>
                <input className={styles.input} value={vueltoMixto.toFixed(2)} readOnly />
              </div>

              {mixtoInvalido && (
                <small className={styles.helperError}>
                  Verifica: monto Yape (0 &lt; yape &lt; total), operación válida y efectivo entregado ≥ monto efectivo.
                </small>
              )}
            </div>
          </div>
        )}

        {/* OBSEQUIO */}
        {metodoPago === 'obsequio' && (
          <div className={styles.paymentPanel}>
            <h4 className={styles.panelTitle}>Obsequio</h4>

            <div className={styles.paymentGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Total (S/)</label>
                <input className={styles.input} value={totalPrecio.toFixed(2)} readOnly />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Motivo (obligatorio)</label>
                <input
                  className={`${styles.input} ${obsequioInvalido ? styles.inputError : ''}`}
                  value={motivoObsequio}
                  onChange={(e) => setMotivoObsequio(e.target.value)}
                  placeholder="Ej: Promoción / compensación"
                />
                {obsequioInvalido && (
                  <small className={styles.helperError}>
                    Ingresa un motivo válido (mín. 5 caracteres).
                  </small>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Autorizado por (opcional)</label>
                <input
                  className={styles.input}
                  value={autorizadoPor}
                  onChange={(e) => setAutorizadoPor(e.target.value)}
                  placeholder="Ej: Administrador"
                />
              </div>
            </div>
          </div>
        )}

        {/* ✅ BOTÓN BD */}
        <button
          className={styles.registrarButton}
          onClick={handleRegistrarVentaBD}
          disabled={items.length === 0 || !isPagoValido || !user?.token}
          title={!user?.token ? 'Inicia sesión' : ''}
        >
          Registrar Venta (BD)
        </button>
      </div>
    </div>
  );
}
