"use client";
import { useState } from 'react';
import { Scan } from 'lucide-react';

export default function WarehouseScanner() {
  const [code, setCode] = useState("");

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-blue-600">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-50 p-6 rounded-full mb-4">
            <Scan size={48} className="text-blue-600 animate-pulse" />
          </div>
          <h1 className="text-xl font-black text-center">INGRESO A ALMACÉN</h1>
          <p className="text-gray-400 text-sm">Escanee el código de la tarjeta de producción</p>
        </div>

        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full text-center text-3xl font-mono p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:outline-none mb-6"
          placeholder="000000"
        />

        <div className="space-y-4">
          <div className="flex justify-between text-sm border-b pb-2">
            <span className="text-gray-500">Producto detectado:</span>
            <span className="font-bold text-gray-800">AirMax Retro</span>
          </div>
          <div className="flex justify-between text-sm border-b pb-2">
            <span className="text-gray-500">Talla:</span>
            <span className="font-bold text-gray-800">40</span>
          </div>
        </div>

        <button className="w-full mt-8 bg-black text-white py-5 rounded-2xl font-black text-lg active:scale-95 transition-transform">
          CONFIRMAR INGRESO
        </button>
      </div>
    </div>
  );
}