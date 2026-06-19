'use client';

import { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { Search, RefreshCw } from 'lucide-react';

import { useUser } from '../context/UserContext';
import { getSellersByWarehouse, SellerOption } from '../services/userServices';
import { getWebSalesReport } from '../services/webSaleService';
import { exportWebSalesReportExcel } from '../utils/exportexcelweb';
import { exportWebSalesReportPDF } from '../utils/exportpdfweb';

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReporteVentasWebPage() {
  const { user } = useUser();

  const token = user?.token || '';
  const warehouseId = user?.warehouse_id || 0;
  const warehouseName = user?.warehouse?.warehouse_name || '';

  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [sellerId, setSellerId] = useState('');

  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔥 IMPORTANTE: guardamos OBJETO COMPLETO
  const [report, setReport] = useState<any>(null);

  // ----------------------------
  // LOAD SELLERS
  // ----------------------------
  const loadSellers = async () => {
    try {
      const data = await getSellersByWarehouse(warehouseId, token);
      setSellers(data || []);
    } catch {
      setSellers([]);
    }
  };

  // ----------------------------
  // SEARCH REPORT
  // ----------------------------
  const handleSearch = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const params = {
        startDate: from,
        endDate: to,
        userId: sellerId ? Number(sellerId) : undefined,
      };

      const data = await getWebSalesReport(params, token);

      // 🔥 GUARDAR OBJETO COMPLETO
      setReport(data);
    } catch (error: any) {
      Swal.fire('Error', 'No se pudo cargar el reporte', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // KPIS PROTEGIDOS
  // ----------------------------
  const stats = useMemo(() => {
    const ventas = report?.detalle_ventas || [];

    const totalSales = ventas.length;

    const totalAmount = ventas.reduce(
      (acc: number, r: any) => acc + Number(r.total_amount || 0),
      0
    );

    const avgTicket = totalSales > 0 ? totalAmount / totalSales : 0;

    return {
      totalSales,
      totalAmount,
      avgTicket,
    };
  }, [report]);

  useEffect(() => {
    loadSellers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-800">
          📊 Reporte Ventas Web
        </h1>
        <p className="text-slate-500">
          Tienda: {warehouseName}
        </p>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-6 rounded-2xl shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="p-3 border rounded-xl"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="p-3 border rounded-xl"
        />

        <select
          value={sellerId}
          onChange={(e) => setSellerId(e.target.value)}
          className="p-3 border rounded-xl"
        >
          <option value="">Todos</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-indigo-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw className="animate-spin" size={18} />
          ) : (
            <Search size={18} />
          )}
          Buscar
        </button>

        <button
          onClick={() => exportWebSalesReportExcel(report)}
          className="bg-green-600 text-white p-3 rounded-xl font-bold"
        >
          Exportar Excel
        </button>

        <button
          onClick={() => exportWebSalesReportPDF(report)}
          className="bg-red-600 text-white p-3 rounded-xl font-bold"
        >
          Exportar PDF
        </button>

      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-white p-5 rounded-2xl shadow">
          <p className="text-sm text-slate-500">Total Ventas</p>
          <h2 className="text-2xl font-black">{stats.totalSales}</h2>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <p className="text-sm text-slate-500">Monto Total</p>
          <h2 className="text-2xl font-black">
            S/ {stats.totalAmount.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <p className="text-sm text-slate-500">Ticket Promedio</p>
          <h2 className="text-2xl font-black">
            S/ {stats.avgTicket.toFixed(2)}
          </h2>
        </div>

      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">

        <div className="p-4 border-b font-bold text-slate-700">
          Detalle de Ventas Web
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-3 text-left">Ticket</th>
                <th className="text-left">Cliente</th>
                <th className="text-left">Vendedor</th>
                <th className="text-left">Total</th>
                <th className="text-left">Fecha</th>
              </tr>
            </thead>

            <tbody>
              {(report?.detalle_ventas || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-slate-400">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                report.detalle_ventas.map((r: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-3 font-bold">#{r.ticket}</td>
                    <td>{r.customer_name}</td>
                    <td>{r.user_name}</td>
                    <td>S/ {Number(r.total_amount).toFixed(2)}</td>
                    <td>{r.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}