"use client";
import { useState } from 'react';
import { productionService } from '../../services/productionService';

export default function CreateProductionPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // Lógica para capturar FormData y llamar al servicio
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Nueva Orden de Producción</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Producto / Modelo</label>
          <input name="modelo" className="p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500" placeholder="Ej: Runner 2024" required />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Serie</label>
          <input name="serie" className="p-3 border rounded-lg bg-gray-50" placeholder="A-100" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Talla</label>
          <input name="talla" type="number" className="p-3 border rounded-lg bg-gray-50" required />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Cantidad a Producir</label>
          <input name="cantidad" type="number" className="p-3 border rounded-lg bg-gray-50 font-bold text-blue-600" required />
        </div>
        
        <button 
          disabled={loading}
          type="submit" 
          className="md:col-span-2 mt-4 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Generando...' : 'GENERAR TARJETA DE PRODUCCIÓN'}
        </button>
      </form>
    </div>
  );
}