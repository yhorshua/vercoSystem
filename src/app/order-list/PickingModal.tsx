import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import styles from './pickingModal.module.css';

interface Pedido {
    id: string;
    cliente: { nombre: string };
    items: {
        codigo: string;
        descripcion: string;
        serie: string;
        cantidades: Record<number, number>; // Talla => cantidad solicitada
    }[];
}

interface Faltante {
    codigo: string;
    talla: number;
    solicitado: number;
    leido: number;
}

interface Props {
    pedido: Pedido;
    onClose: () => void;
    onFinalizar: (pedido: Pedido & { status?: string; faltantes?: Faltante[] }) => void;
    onGuardarBorrador?: (pedido: Pedido, estado: Record<string, Record<number, number>>) => void;
}

export default function PickingModal({ pedido, onClose, onFinalizar, onGuardarBorrador }: Props) {
    const [pickingStatus, setPickingStatus] = useState<Record<string, Record<number, number>>>({});
    const inputRef = useRef<HTMLInputElement>(null);
    const scanTimeout = useRef<NodeJS.Timeout | null>(null);

    // Inicializa contadores
    useEffect(() => {
        const initStatus: Record<string, Record<number, number>> = {};
        pedido.items.forEach((item) => {
            initStatus[item.codigo] = {};
            Object.keys(item.cantidades).forEach((talla) => {
                initStatus[item.codigo][Number(talla)] = 0;
            });
        });
        setPickingStatus(initStatus);
    }, [pedido]);

    // Mantener el input enfocado siempre
    useEffect(() => {
        const focusInterval = setInterval(() => {
            inputRef.current?.focus();
        }, 500);
        return () => clearInterval(focusInterval);
    }, []);

    // Detecta cambios en el input y procesa automáticamente después de un delay
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.trim().toUpperCase();

        if (scanTimeout.current) clearTimeout(scanTimeout.current);

        scanTimeout.current = setTimeout(() => {
            if (value) {
                marcarPorCodigo(value);
                e.target.value = ''; // limpiar para siguiente lectura
            }
        }, 80); // Delay corto para detectar fin del escaneo
    };

    const marcarPorCodigo = (codigoBarras: string) => {
        if (codigoBarras.length < 9) return;

        const codigo = codigoBarras.substring(0, 7); // primeros 7 chars
        const talla = Number(codigoBarras.substring(7, 9)); // chars 8-9

        if (pickingStatus[codigo] && pickingStatus[codigo][talla] !== undefined) {
            const cantidadSolicitada =
                pedido.items.find(i => i.codigo === codigo)?.cantidades[talla] || 0;
            const cantidadActual = pickingStatus[codigo][talla];

            if (cantidadActual < cantidadSolicitada) {
                setPickingStatus((prev) => ({
                    ...prev,
                    [codigo]: {
                        ...prev[codigo],
                        [talla]: cantidadActual + 1
                    }
                }));
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Artículo completo',
                    text: `El artículo ${codigo}, talla ${talla}, ya está completado con las ${cantidadSolicitada} unidades solicitadas.`,
                    timer: 4000,
                    showConfirmButton: false,
                    target: document.body,
                    customClass: { popup: 'swal-highest-z' }
                });
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Código no encontrado',
                text: `El código ${codigoBarras} no pertenece a este pedido.`,
                timer: 2000,
                showConfirmButton: false
            });
        }
    };

    const totalItems = Object.values(pedido.items).reduce(
        (acc, item) => acc + Object.values(item.cantidades).reduce((a, b) => a + b, 0),
        0
    );

    const totalPicked = Object.entries(pickingStatus).reduce(
        (acc, [, tallas]) => acc + Object.values(tallas).reduce((a, b) => a + b, 0),
        0
    );

    const pickingCompleto = pedido.items.every(item =>
        Object.entries(item.cantidades).every(([talla, cantidadSolicitada]) =>
            pickingStatus[item.codigo]?.[Number(talla)] === cantidadSolicitada
        )
    );

    // Calcular faltantes
    const calcularFaltantes = (): Faltante[] => {
        return pedido.items.flatMap(item =>
            Object.entries(item.cantidades)
                .filter(([talla, solicitada]) =>
                    (pickingStatus[item.codigo]?.[Number(talla)] || 0) < solicitada
                )
                .map(([talla, solicitada]) => ({
                    codigo: item.codigo,
                    talla: Number(talla),
                    solicitado: solicitada,
                    leido: pickingStatus[item.codigo]?.[Number(talla)] || 0
                }))
        );
    };

    const confirmarParcial = () => {
        const faltantes = calcularFaltantes();

        Swal.fire({
            icon: 'warning',
            title: 'Finalizar Picking Parcial',
            html: `Se detectaron productos faltantes:<ul>${faltantes.map(f => `<li>${f.codigo} T${f.talla}: ${f.leido}/${f.solicitado}</li>`).join('')}</ul><p>¿Desea finalizar con lo disponible?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Sí, finalizar parcial',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                onFinalizar({
                    ...pedido,
                    status: 'PARCIAL',
                    faltantes
                });
            }
        });
    };

    const guardarBorrador = () => {
        if (onGuardarBorrador) {
            onGuardarBorrador(pedido, pickingStatus);
            Swal.fire({
                icon: 'success',
                title: 'Borrador guardado',
                text: 'El picking se ha guardado para continuar más tarde.',
                timer: 2000,
                showConfirmButton: false
            });
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h2>Picking - Pedido #{pedido.id}</h2>
                <p><strong>Cliente:</strong> {pedido.cliente.nombre}</p>
                <p>Progreso total: {totalPicked}/{totalItems}</p>

                {/* Input para escaneo */}
                <div style={{ marginBottom: '1rem' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Escanea el código aquí..."
                        onChange={handleInputChange}
                        className={styles.scanInput}
                    />
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Artículo</th>
                            <th>Descripción</th>
                            <th>Serie</th>
                            <th>Talla</th>
                            <th>Solicitado</th>
                            <th>Leído</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pedido.items.map((item) =>
                            Object.keys(item.cantidades).map((t) => {
                                const talla = Number(t);
                                const solicitado = item.cantidades[talla];
                                const leido = pickingStatus[item.codigo]?.[talla] || 0;
                                const completo = leido === solicitado;

                                return (
                                    <tr
                                        key={`${item.codigo}-${talla}`}
                                        style={{
                                            backgroundColor: completo ? '#d4edda' : '#f8d7da'
                                        }}
                                    >
                                        <td>{item.codigo}</td>
                                        <td>{item.descripcion}</td>
                                        <td>{item.serie}</td>
                                        <td>{talla}</td>
                                        <td>{solicitado}</td>
                                        <td style={{ fontWeight: 'bold', color: completo ? 'green' : 'red' }}>
                                            {leido}/{solicitado}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                <div className={styles.actions}>
                    <button className={styles.closeButton} onClick={onClose}>Cancelar</button>
                    <button
                        className={styles.partialButton}
                        disabled={totalPicked === 0}
                        onClick={confirmarParcial}
                    >
                        Finalizar Parcial
                    </button>
                    <button
                        className={styles.draftButton}
                        onClick={guardarBorrador}
                    >
                        Guardar
                    </button>
                    <button
                        className={styles.finalButton}
                        disabled={!pickingCompleto}
                        onClick={() => onFinalizar({ ...pedido, status: 'COMPLETO' })}
                    >
                        Finalizar Picking
                    </button>
                </div>
            </div>
        </div>
    );
}
