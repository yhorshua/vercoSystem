import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { scanItem, closePacking } from '../services/packingService'; // Asegúrate de importar correctamente
import styles from './pickingModal.module.css';
import { useUser } from '../context/UserContext';

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

interface Props {
    pedido: Pedido;
    onClose: () => void;
    onFinalizar: (pedido: Pedido & { status?: string }) => void;
}

export default function PickingModal({ pedido, onClose, onFinalizar }: Props) {
    const [pickingStatus, setPickingStatus] = useState<Record<string, Record<number, number>>>({});
    const inputRef = useRef<HTMLInputElement>(null);
    const scanTimeout = useRef<NodeJS.Timeout | null>(null);
    const { user } = useUser();  // Aquí estamos obteniendo el user desde el contexto

    // Verificamos si `user` es null o no
    if (!user) {
        return <div>Loading...</div>;  // O alguna UI que indique que el usuario no está disponible
    }

    // Inicializa contadores de escaneo
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

    // Función para marcar el producto escaneado
    const marcarPorCodigo = async (codigoBarras: string) => {
        if (codigoBarras.length < 9) return;

        const codigo = codigoBarras.substring(0, 7); // Primeros 7 caracteres
        const talla = Number(codigoBarras.substring(7, 9)); // Últimos 2 caracteres

        const cantidadSolicitada = pedido.items.find(i => i.codigo === codigo)?.cantidades[talla] || 0;
        const cantidadActual = pickingStatus[codigo]?.[talla] || 0;

        if (cantidadActual < cantidadSolicitada) {
            // Llamar al servicio para registrar el escaneo
            try {
                await scanItem({
                    order_id: Number(pedido.id),
                    codigo_producto: codigo,
                    talla: talla.toString(),
                    cantidad: 1,
                }, user.token); // Pasa el token del usuario para la autenticación

                // Actualiza el estado del picking
                setPickingStatus((prev) => ({
                    ...prev,
                    [codigo]: {
                        ...prev[codigo],
                        [talla]: cantidadActual + 1
                    }
                }));
            } catch (error : any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al registrar el escaneo',
                    text: error?.message || 'Hubo un problema al registrar el escaneo',
                });
            }
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Artículo completo',
                text: `El artículo ${codigo}, talla ${talla}, ya está completado con las ${cantidadSolicitada} unidades solicitadas.`,
                timer: 4000,
                showConfirmButton: false,
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
    const calcularFaltantes = () => {
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

    // Función para finalizar el picking
    const finalizarPicking = async () => {
        if (pickingCompleto) {
            try {
                const result = await closePacking({
                    order_id: Number(pedido.id),
                    user_id: user.userId,
                }, user.token); // Pasa el token del usuario para la autenticación

                Swal.fire({
                    icon: 'success',
                    title: 'Picking finalizado',
                    text: result.message,
                    showConfirmButton: false,
                    timer: 2000,
                });

                onFinalizar({ ...pedido, status: 'COMPLETO' }); // Notifica al componente padre que el picking está completo
            } catch (error : any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al finalizar el picking',
                    text: error?.message || 'Hubo un problema al finalizar el picking',
                });
            }
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Picking incompleto',
                text: 'Aún quedan productos por escanear.',
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
                        onClick={finalizarPicking}
                    >
                        Finalizar Picking
                    </button>
                </div>
            </div>
        </div>
    );
}
