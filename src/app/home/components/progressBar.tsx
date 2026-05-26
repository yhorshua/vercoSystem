'use client';

export default function ProgressBar({ percentage }: { percentage: number }) {
  const getColor = () => {
    if (percentage >= 100) return 'from-emerald-400 to-cyan-500';
    if (percentage >= 70) return 'from-amber-400 to-orange-500';
    return 'from-rose-500 to-red-600';
  };

  return (
    <div className="relative w-full h-[6px] bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-4">
      <div 
        className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out ${getColor()}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      >
        <div className="absolute top-0 right-0 h-full w-8 bg-white/30 blur-sm animate-pulse" />
      </div>
    </div>
  );
}