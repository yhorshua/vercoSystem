// components/ui/SelectTailwind.tsx

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
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full appearance-none
          bg-white/80 backdrop-blur
          border border-slate-200
          hover:border-indigo-400
          focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100
          rounded-2xl px-4 py-4 pr-10
          font-semibold text-slate-700
          shadow-sm hover:shadow-md
          transition-all duration-200
          outline-none cursor-pointer
          disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
        "
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Icono */}
      <ChevronDown
        size={18}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  );
}