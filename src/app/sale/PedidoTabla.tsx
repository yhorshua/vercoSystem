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
import { CreditCard, DollarSign, CheckCircle, Trash2 } from 'lucide-react';


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

  // ====== OPERACIONES (Yape/Plin/Tarjeta) ======
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');

  const requiereOperacion = useMemo(() => {
    return ['yape', 'plin', 'tarjetaDebito', 'tarjetaCredito'].includes(metodoPago);
  }, [metodoPago]);

  const operacionInvalida = useMemo(() => {
    if (!requiereOperacion) return false;
    return numeroOperacion.trim().length < 4; // Reduje a 4 por flexibilidad
  }, [requiereOperacion, numeroOperacion]);

  // ====== MIXTO (Yape + Efectivo) ======
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
    if (montoYapeNum <= 0 || montoYapeNum >= totalPrecio) return true;
    if (operacionYape.trim().length < 4) return true;
    if (efectivoEntregadoMixtoNum < montoEfectivoMixto) return true;
    return false;
  }, [metodoPago, montoYapeNum, totalPrecio, operacionYape, efectivoEntregadoMixtoNum, montoEfectivoMixto]);

  // ====== OBSEQUIO ======
  const [motivoObsequio, setMotivoObsequio] = useState<string>('');
  const [autorizadoPor, setAutorizadoPor] = useState<string>('');

  const obsequioInvalido = useMemo(() => {
    if (metodoPago !== 'obsequio') return false;
    return motivoObsequio.trim().length < 3;
  }, [metodoPago, motivoObsequio]);

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
    { accessorKey: 'codigo', header: 'Cod.', cell: (info) => info.getValue() },
    { accessorKey: 'descripcion', header: 'Desc.', cell: (info) => info.getValue() },
    { 
        id: 'tallas',
        header: 'Tallas',
        cell: (info) => {
            const item = info.row.original;
            return Object.entries(item.cantidades)
                .map(([t, q]) => `[${t}]: ${q}`)
                .join(', ');
        }
    },
    { accessorKey: 'total', header: 'Cant.', cell: (info) => info.getValue() },
    {
      id: 'precio',
      header: 'Precio',
      cell: (info) => `S/ ${Number(info.row.original.precio).toFixed(2)}`,
    },
    {
      id: 'subtotal',
      header: 'Subtotal',
      cell: (info) => `S/ ${(info.row.original.total * info.row.original.precio).toFixed(2)}`,
    },
    {
      id: 'acciones',
      header: '',
      cell: (info) => (
        <button
          className={styles.deleteButton}
          onClick={() => onDelete(info.row.index)}
          title="Eliminar"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRegistrarVentaBD = async () => {
    if (!user?.token || !user?.warehouseId || !user?.userId) {
      Swal.fire({ icon: 'warning', text: 'Sesión no válida.' });
      return;
    }
    if (!isPagoValido) {
      Swal.fire({ icon: 'warning', text: 'Datos de pago incompletos.' });
      return;
    }

    const payloadItems: CreateSalePayload['items'] = [];
    for (const it of items) {
      for (const [talla, qty] of Object.entries(it.cantidades)) {
        if (Number(qty) <= 0) continue;
        const product_size_id = it.sizeIdBySizeNumber[Number(talla) || talla]; 
        // Nota: asumiendo que sizeIdBySizeNumber mapea talla -> id
        
        if (!product_size_id) {
            Swal.fire({ icon: 'error', text: `Error de ID talla ${talla}` });
            return;
        }

        payloadItems.push({
          product_id: it.product_id,
          product_size_id,
          quantity: Number(qty),
          unit_of_measure: it.unit_of_measure || 'PAR',
          unit_price: it.precio,
        });
      }
    }

    const payment_method = metodoPago as PaymentMethod;
    const payment: CreateSalePayload['payment'] =
      payment_method === 'efectivo'
        ? { efectivoEntregado: efectivoEntregadoNum, vuelto: vueltoEfectivo }
        : ['yape', 'plin', 'tarjetaDebito', 'tarjetaCredito'].includes(payment_method)
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
    };

    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Confirmar Venta',
      text: `Total: S/ ${totalPrecio.toFixed(2)}`,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await registerSale(payload, user.token);
      await Swal.fire({
        icon: 'success',
        title: '¡Venta Exitosa!',
        text: `Código: ${res?.sale?.sale_code ?? ''}`,
        timer: 2000,
        showConfirmButton: false
      });
      resetPagoStates();
      onSaleRegistered?.();
    } catch (e: any) {
      Swal.fire({ icon: 'error', text: e?.message || 'Error al registrar' });
    }
  };

  if (items.length === 0) {
      return <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>El carrito está vacío.</div>;
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
        </table>
      </div>

      <div className={styles.paymentSection}>
        <div className={styles.paymentHeader}>
            <div>
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Total Productos: {totalUnidades}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', display: 'block' }}>Total a Pagar</span>
                <span className={styles.totalBig}>S/ {totalPrecio.toFixed(2)}</span>
            </div>
        </div>

        <div className={styles.paymentMethodGrid}>
             <div className={styles.paymentTitle}>
                <CreditCard size={18} /> Método de Pago
             </div>
             
             <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                <select
                    className={styles.select}
                    value={metodoPago}
                    onChange={(e) => {
                        setMetodoPago(e.target.value as PaymentMethod);
                        resetPagoStates();
                    }}
                >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="yape">📱 Yape</option>
                    <option value="plin">📱 Plin</option>
                    <option value="tarjetaDebito">💳 Tarjeta Débito</option>
                    <option value="tarjetaCredito">💳 Tarjeta Crédito</option>
                    <option value="yapeEfectivo">🔀 Mixto (Yape + Efectivo)</option>
                    <option value="obsequio">🎁 Obsequio</option>
                </select>
            </div>

            {/* CAMPOS DINAMICOS SEGUN PAGO */}
            {metodoPago === 'efectivo' && (
                <>
                   <div className={styles.inputGroup}>
                      <label className={styles.label}>Paga con</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={efectivoEntregado} 
                        onChange={e => setEfectivoEntregado(e.target.value)} 
                        placeholder="S/ 0.00"
                      />
                   </div>
                   <div className={styles.inputGroup}>
                      <label className={styles.label}>Vuelto</label>
                      <input className={`${styles.input} ${styles.inputReadOnly}`} value={`S/ ${vueltoEfectivo.toFixed(2)}`} readOnly />
                   </div>
                </>
            )}

            {requiereOperacion && (
                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                     <label className={styles.label}>N° Operación / Voucher</label>
                     <input 
                        className={styles.input} 
                        value={numeroOperacion} 
                        onChange={e => setNumeroOperacion(e.target.value)} 
                        placeholder="Ej: 123456"
                      />
                </div>
            )}

            {metodoPago === 'yapeEfectivo' && (
                <>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Monto Yape</label>
                        <input type="number" className={styles.input} value={montoYape} onChange={e => setMontoYape(e.target.value)} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Operación Yape</label>
                        <input className={styles.input} value={operacionYape} onChange={e => setOperacionYape(e.target.value)} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Restante Efectivo</label>
                        <input className={`${styles.input} ${styles.inputReadOnly}`} value={montoEfectivoMixto.toFixed(2)} readOnly />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Paga Efectivo</label>
                        <input type="number" className={styles.input} value={efectivoEntregadoMixto} onChange={e => setEfectivoEntregadoMixto(e.target.value)} />
                    </div>
                    <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                        <label className={styles.label}>Vuelto</label>
                        <input className={`${styles.input} ${styles.inputReadOnly}`} value={vueltoMixto.toFixed(2)} readOnly />
                    </div>
                </>
            )}

            {metodoPago === 'obsequio' && (
                 <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                     <label className={styles.label}>Motivo</label>
                     <input 
                        className={styles.input} 
                        value={motivoObsequio} 
                        onChange={e => setMotivoObsequio(e.target.value)} 
                        placeholder="Justificación..."
                      />
                </div>
            )}
        </div>

        <button 
            className={styles.registerButton} 
            onClick={handleRegistrarVentaBD}
            disabled={!isPagoValido}
        >
            <CheckCircle size={20} style={{ display: 'inline', marginRight: 8 }}/> 
            Confirmar Venta
        </button>
        {!isPagoValido && <p className={styles.errorText} style={{ textAlign: 'center' }}>* Revisa los montos de pago</p>}
      </div>
    </div>
  );
}