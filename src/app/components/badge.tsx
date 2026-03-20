import { EstadoPedido } from '../utils/types/pedidos';

export const PedidoStatusBadge = ({ estado }: { estado: EstadoPedido }) => {
    const styles: Record<EstadoPedido, string> = {
        pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        confirmado: 'bg-blue-100 text-blue-700 border-blue-200',
        despachado: 'bg-purple-100 text-purple-700 border-purple-200',
        entregado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        cancelado: 'bg-red-100 text-red-700 border-red-200',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[estado]}`}>
            {estado}
        </span>
    );
};