'use client';

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

import { useUser } from '../context/UserContext';

import {
    getStockMovementReport,
    StockMovementReportParams,
} from '../services/stockServices';

import {
    getWarehouses,
    WarehouseRow,
} from '../services/warehouseServices';

const MySwal = Swal;

type StockMovementRow = {
    id: number;
    created_at: string;

    warehouse?: {
        id: number;
        name: string;
        location?: string;
    };

    user?: {
        id: number | null;
        full_name: string;
        email?: string;
    };

    product?: {
        id: number;
        article_code: string;
        article_description: string;
        brand_name?: string;
        model_code?: string;
        color?: string;
    };

    size?: {
        product_size_id: number | null;
        value: string | null;
    };

    movement?: {
        type: string;
        direction: string;
        quantity: number;
        absolute_quantity: number;
        unit_of_measure: string;
        previous_quantity: number;
        new_quantity: number;
    };

    reference?: {
        reference_id: number | null;
        reference_type: string | null;
        reference: string | null;
        notes: string | null;
    };
};

type StockReportResponse = {
    filters?: any;
    warehouse?: any;
    summary?: {
        total_movements: number;
        total_entries: number;
        total_exits: number;
        total_adjustments: number;
        quantity_entered: number;
        quantity_exited: number;
        net_movement: number;
    };
    summary_by_type?: any[];
    summary_by_user?: any[];
    summary_by_product?: any[];
    movements?: StockMovementRow[];
};

export default function StockMovementReportPage() {
    const { user } = useUser();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] =
        useState<number>(0);

    const [loadingWarehouses, setLoadingWarehouses] = useState(false);
    const [loading, setLoading] = useState(false);

    const [reportData, setReportData] = useState<StockMovementRow[]>([]);
    const [reportSummary, setReportSummary] =
        useState<StockReportResponse['summary'] | null>(null);

    const token = user?.token || '';

    useEffect(() => {
        const loadWarehouses = async () => {
            if (!token) return;

            try {
                setLoadingWarehouses(true);

                const data = await getWarehouses(token);

                setWarehouses(data);

                /**
                 * Seleccionar automáticamente el almacén del usuario
                 * si existe dentro de la lista.
                 */
                const userWarehouseId = Number(user?.warehouse_id || 0);

                if (
                    userWarehouseId &&
                    data.some((warehouse) => warehouse.id === userWarehouseId)
                ) {
                    setSelectedWarehouseId(userWarehouseId);
                } else if (data.length > 0) {
                    setSelectedWarehouseId(data[0].id);
                }
            } catch (error: any) {
                console.error('Error cargando almacenes:', error);

                MySwal.fire({
                    icon: 'error',
                    title: 'Error al cargar almacenes',
                    text:
                        error?.message ||
                        'No se pudo obtener la lista de almacenes.',
                    confirmButtonColor: '#ef4444',
                });
            } finally {
                setLoadingWarehouses(false);
            }
        };

        void loadWarehouses();
    }, [token, user?.warehouse_id]);

    const handleGenerateReport = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        if (!selectedWarehouseId) {
            MySwal.fire({
                icon: 'warning',
                title: 'Almacén requerido',
                text: 'Selecciona un almacén.',
                confirmButtonColor: '#3b82f6',
            });

            return;
        }

        if (!startDate || !endDate) {
            MySwal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Selecciona la fecha de inicio y la fecha final.',
                confirmButtonColor: '#3b82f6',
            });

            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            MySwal.fire({
                icon: 'warning',
                title: 'Rango inválido',
                text: 'La fecha inicial no puede ser posterior a la fecha final.',
                confirmButtonColor: '#3b82f6',
            });

            return;
        }

        if (!token) {
            MySwal.fire({
                icon: 'error',
                title: 'Error de sesión',
                text: 'No se encontró el token del usuario.',
            });

            return;
        }

        setLoading(true);

        try {
            const params: StockMovementReportParams = {
                warehouseId: selectedWarehouseId,
                startDate,
                endDate,
            };

            const data: StockReportResponse =
                await getStockMovementReport(params, token);

            const movements = data?.movements || [];

            setReportData(movements);
            setReportSummary(data?.summary || null);

            if (movements.length === 0) {
                MySwal.fire({
                    icon: 'info',
                    title: 'Sin movimientos',
                    text: 'No se encontraron movimientos en el rango seleccionado.',
                    confirmButtonColor: '#3b82f6',
                });
            } else {
                MySwal.fire({
                    icon: 'success',
                    title: 'Reporte generado',
                    toast: true,
                    position: 'top-end',
                    timer: 2500,
                    showConfirmButton: false,
                });
            }
        } catch (error: any) {
            console.error(error);

            setReportData([]);
            setReportSummary(null);

            MySwal.fire({
                icon: 'error',
                title: 'Error al obtener el reporte',
                text:
                    error?.message ||
                    'Ocurrió un error inesperado.',
                confirmButtonColor: '#ef4444',
            });
        } finally {
            setLoading(false);
        }
    };

    const selectedWarehouse = warehouses.find(
        (warehouse) => warehouse.id === selectedWarehouseId
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">
                    Reporte de Movimientos de Stock
                </h1>

                <p className="text-gray-600">
                    Consulta entradas, salidas y ajustes por almacén y rango de fechas.
                </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <form
                    onSubmit={handleGenerateReport}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                >
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Almacén
                        </label>

                        <select
                            value={selectedWarehouseId || ''}
                            onChange={(e) =>
                                setSelectedWarehouseId(Number(e.target.value))
                            }
                            disabled={loadingWarehouses}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 bg-white disabled:bg-gray-100"
                        >
                            <option value="">
                                {loadingWarehouses
                                    ? 'Cargando almacenes...'
                                    : 'Selecciona un almacén'}
                            </option>

                            {warehouses.map((warehouse) => (
                                <option
                                    key={warehouse.id}
                                    value={warehouse.id}
                                >
                                    {warehouse.warehouse_name}
                                </option>
                            ))}
                        </select>

                        {selectedWarehouse?.location && (
                            <p className="mt-1 text-xs text-gray-400">
                                {selectedWarehouse.location}
                            </p>
                        )}
                    </div>

                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Inicio
                        </label>

                        <input
                            type="date"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Fin
                        </label>

                        <input
                            type="date"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={
                            loading ||
                            loadingWarehouses ||
                            !selectedWarehouseId
                        }
                        className={`px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[150px] ${loading ||
                                loadingWarehouses ||
                                !selectedWarehouseId
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                    >
                        {loading ? 'Cargando...' : 'Generar Reporte'}
                    </button>
                </form>
            </div>

            {reportSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase">
                            Movimientos
                        </p>

                        <p className="text-2xl font-bold text-gray-800">
                            {reportSummary.total_movements || 0}
                        </p>
                    </div>

                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-green-600 uppercase">
                            Cantidad ingresada
                        </p>

                        <p className="text-2xl font-bold text-green-700">
                            {reportSummary.quantity_entered || 0}
                        </p>
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-red-600 uppercase">
                            Cantidad retirada
                        </p>

                        <p className="text-2xl font-bold text-red-700">
                            {reportSummary.quantity_exited || 0}
                        </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-blue-600 uppercase">
                            Movimiento neto
                        </p>

                        <p className="text-2xl font-bold text-blue-700">
                            {reportSummary.net_movement || 0}
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-4 text-sm font-semibold text-gray-700">
                                    Fecha
                                </th>

                                <th className="px-4 py-4 text-sm font-semibold text-gray-700">
                                    Producto
                                </th>

                                <th className="px-4 py-4 text-sm font-semibold text-gray-700">
                                    Talla
                                </th>

                                <th className="px-4 py-4 text-sm font-semibold text-gray-700">
                                    Tipo
                                </th>

                                <th className="px-4 py-4 text-sm font-semibold text-gray-700 text-right">
                                    Cantidad
                                </th>

                                <th className="px-4 py-4 text-sm font-semibold text-gray-700 text-right">
                                    Stock anterior
                                </th>

                                <th className="px-4 py-4 text-sm font-semibold text-gray-700 text-right">
                                    Stock nuevo
                                </th>

                                <th className="px-4 py-4 text-sm font-semibold text-gray-700">
                                    Usuario
                                </th>

                                <th className="px-4 py-4 text-sm font-semibold text-gray-700">
                                    Referencia
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                            {reportData.length > 0 ? (
                                reportData.map((item) => {
                                    const isEntry =
                                        item.movement?.direction === 'INGRESO' ||
                                        Number(item.movement?.quantity || 0) > 0;

                                    return (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                {item.created_at
                                                    ? new Date(item.created_at).toLocaleString(
                                                        'es-PE',
                                                        {
                                                            timeZone: 'America/Lima',
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        }
                                                    )
                                                    : '-'}
                                            </td>

                                            <td className="px-4 py-4">
                                                <p className="text-sm font-semibold text-gray-800">
                                                    {item.product?.article_description || 'N/A'}
                                                </p>

                                                <p className="text-xs text-gray-400 font-mono">
                                                    {item.product?.article_code || '-'}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-600">
                                                {item.size?.value || '-'}
                                            </td>

                                            <td className="px-4 py-4 text-sm">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${isEntry
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                        }`}
                                                >
                                                    {item.movement?.type || '-'}
                                                </span>
                                            </td>

                                            <td
                                                className={`px-4 py-4 text-sm font-bold text-right ${isEntry
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                    }`}
                                            >
                                                {isEntry ? '+' : '-'}
                                                {Math.abs(
                                                    Number(
                                                        item.movement?.absolute_quantity ??
                                                        item.movement?.quantity ??
                                                        0
                                                    )
                                                )}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-600 text-right">
                                                {item.movement?.previous_quantity ?? 0}
                                            </td>

                                            <td className="px-4 py-4 text-sm font-semibold text-gray-800 text-right">
                                                {item.movement?.new_quantity ?? 0}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-600">
                                                {item.user?.full_name || 'Sin usuario'}
                                            </td>

                                            <td className="px-4 py-4">
                                                <p className="text-sm text-gray-600">
                                                    {item.reference?.reference || '-'}
                                                </p>

                                                <p className="text-xs text-gray-400">
                                                    {item.reference?.reference_type || ''}
                                                </p>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-6 py-10 text-center text-gray-400 italic"
                                    >
                                        {loading
                                            ? 'Buscando datos...'
                                            : 'No hay datos para mostrar. Selecciona un almacén y rango de fechas.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}