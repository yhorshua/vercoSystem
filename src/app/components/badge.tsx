export const PedidoStatusBadge = ({ estado }: { estado: string }) => {

    const styles: Record<string, string> = {
        pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200',

        aprobado: 'bg-blue-100 text-blue-700 border-blue-200',

        rechazado: 'bg-red-100 text-red-700 border-red-200',

        alistamiento: 'bg-orange-100 text-orange-700 border-orange-200',

        alistado: 'bg-cyan-100 text-cyan-700 border-cyan-200',

        guia: 'bg-indigo-100 text-indigo-700 border-indigo-200',

        despachado: 'bg-purple-100 text-purple-700 border-purple-200',

        facturado: 'bg-emerald-100 text-emerald-700 border-emerald-200',

        cerrado: 'bg-slate-200 text-slate-700 border-slate-300',
    };

    return (
        <span
            className={`
                px-3 py-1 rounded-full text-[10px]
                font-black uppercase tracking-wider border
                ${styles[estado.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200'}
            `}
        >
            {estado}
        </span>
    );
};