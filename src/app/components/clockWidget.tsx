import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getCurrentPeruTimeFormatted } from '../utils/dateUtils';

export const ClockWidget: React.FC = () => {
  const [time, setTime] = useState<string>(getCurrentPeruTimeFormatted());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getCurrentPeruTimeFormatted());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-800 to-blue-800 text-white p-6 rounded-xl shadow-lg flex items-center justify-between w-full sm:max-w-md lg:max-w-lg mx-auto">
      <div className="flex-1 text-center">
        {/* Centrado del título */}
        <h2 className="text-sm font-medium opacity-80 uppercase tracking-wider sm:text-base">Hora en Lima, Perú</h2>
        <div className="text-4xl font-bold mt-1 tabular-nums tracking-tight sm:text-5xl md:text-6xl">
          {time}
        </div>
        <p className="text-xs mt-2 opacity-75 sm:text-sm">
          Zona Horaria: America/Lima (GMT-5)
        </p>
      </div>
      <div className="bg-white/20 p-3 rounded-full sm:p-4">
        <Clock size={32} className="text-white" />
      </div>
    </div>
  );
};
