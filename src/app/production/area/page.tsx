"use client";
import { Play, CheckCircle } from 'lucide-react';

export default function AreaControlPage({ params }: { params: { slug: string } }) {
  const areaName = params.slug.toUpperCase();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black text-gray-800">ÁREA: {areaName}</h1>
        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">5 PENDIENTES</span>
      </div>

      {/* Tarjeta de Orden Individual optimizada para móvil */}
      <div className="space-y-4">
        {[1, 2, 3].map((order) => (
          <div key={order} className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between mb-3">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">OP-8823</span>
              <span className="text-xs text-gray-400 font-mono">20/05/2024</span>
            </div>
            <h3 className="text-lg font-bold">Zapatilla Urbana - Blanca</h3>
            <p className="text-sm text-gray-500 mb-4">Talla: 42 | Cantidad: 50 pares</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-blue-50 hover:text-blue-600 transition-all">
                <Play size={18} /> INICIAR
              </button>
              <button className="flex items-center justify-center gap-2 bg-green-100 text-green-700 py-3 rounded-xl font-bold hover:bg-green-600 hover:text-white transition-all">
                <CheckCircle size={18} /> TERMINAR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}