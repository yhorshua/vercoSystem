'use client';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';

type Props = {
  title: string;
  value: string;
  percentage?: number;
  icon: ReactNode;
  children?: ReactNode;
  variant?: 'default' | 'master' | 'ghost';
  trend?: string;
};

export default function KpiCard({ title, value, percentage, icon, children, variant = 'default', trend }: Props) {
  const isMaster = variant === 'master';
  const isGhost = variant === 'ghost';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`relative overflow-hidden p-6 rounded-[24px] border transition-all duration-300
        ${isMaster ? 'bg-slate-900 border-slate-800 text-white shadow-2xl shadow-indigo-500/10' : 
          isGhost ? 'bg-transparent border-slate-200 border-dashed' : 
          'bg-white border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50'}`}
    >
      {/* Fondo decorativo para la card Master (Utilidad) */}
      {isMaster && (
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-600 rounded-full blur-[60px] opacity-40" />
      )}

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className={`p-3 rounded-2xl ${isMaster ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
            {icon}
          </div>
          {percentage !== undefined && (
            <div className={`px-3 py-1 rounded-full text-[11px] font-black tracking-tight border
              ${percentage >= 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              {percentage}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${isMaster ? 'text-slate-400' : 'text-slate-500'}`}>
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className={`text-3xl font-black tracking-tighter ${isMaster ? 'text-white' : 'text-slate-900'}`}>
              {value}
            </h3>
            {trend && <span className="text-[10px] text-emerald-500 font-bold">{trend}</span>}
          </div>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </motion.div>
  );
}