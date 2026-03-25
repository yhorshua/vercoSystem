'use client';

import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}

export default function SelectTailwind({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  disabled
}: Props) {
  return (
    <div className="relative w-full group"> 
      {/* 
        1. "w-full" asegura que ocupe todo el ancho de su contenedor.
        2. "text-[16px]" es CLAVE: evita que el iPhone haga zoom automático al abrirlo.
      */}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full appearance-none
          bg-white/80 backdrop-blur-md
          border border-slate-200
          hover:border-indigo-400
          focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50
          
          /* Ajuste de Bordes y Padding Responsivo */
          rounded-xl md:rounded-2xl 
          px-3 py-3 md:px-4 md:py-4 pr-10
          
          /* Tipografía Responsiva */
          text-[16px] md:text-base 
          font-medium text-slate-700
          
          /* Efectos */
          shadow-sm hover:shadow-md
          transition-all duration-200
          outline-none cursor-pointer
          
          /* Estado Deshabilitado */
          disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
        "
      >
        <option value="" className="text-slate-400">
          {placeholder}
        </option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="py-2 text-slate-800">
            {opt.label}
          </option>
        ))}
      </select>

      {/* Icono Ajustado */}
      <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
        <ChevronDown size={18} strokeWidth={2.5} />
      </div>
    </div>
  );
}