'use client';

import { ChevronLeft, ChevronRight, RefreshCw, Search, UserCircle } from 'lucide-react';

import {
  LEAD_STATUSES,
  LeadStatus,
  PaginationMeta,
  WhatsAppLead,
} from '../services/whatsappService';

interface SidebarProps {
  clients: WhatsAppLead[];
  selectedId: number | null;
  onSelect: (client: WhatsAppLead) => void;
  loading: boolean;
  error: string;
  sellerName: string;
  search: string;
  onSearchChange: (value: string) => void;
  status: LeadStatus | '';
  onStatusChange: (value: LeadStatus | '') => void;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  NUEVO: 'Nuevo',
  ASIGNADO: 'Asignado',
  CONTACTADO: 'Contactado',
  COTIZADO: 'Cotizado',
  VENDIDO: 'Vendido',
  DESCARTADO: 'Descartado',
};

function formatMessageDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function Sidebar({
  clients,
  selectedId,
  onSelect,
  loading,
  error,
  sellerName,
  search,
  onSearchChange,
  status,
  onStatusChange,
  pagination,
  onPageChange,
  onRetry,
}: SidebarProps) {
  return (
    <aside
      className={`${selectedId ? 'hidden md:flex' : 'flex'} min-w-0 w-full flex-col border-r border-gray-200 bg-slate-50 md:w-[380px] md:flex-shrink-0`}
      aria-label="Conversaciones del CRM"
    >
      <div className="flex items-center gap-3 border-b bg-white p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
          {sellerName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-gray-900">CRM WhatsApp</h1>
          <p className="truncate text-xs text-gray-500">{sellerName}</p>
        </div>
      </div>

      <div className="space-y-2 border-b p-3">
        <label className="relative block">
          <span className="sr-only">Buscar prospectos</span>
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        <label className="block">
          <span className="sr-only">Filtrar por estado</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as LeadStatus | '')}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los estados</option>
            {LEAD_STATUSES.map((item) => (
              <option key={item} value={item}>{STATUS_LABELS[item]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto" aria-live="polite">
        <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <span>Prospectos ({pagination.total})</span>
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="rounded p-1 hover:bg-gray-200 disabled:opacity-50"
            aria-label="Actualizar conversaciones"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && clients.length === 0 && (
          <p className="p-4 text-sm text-gray-500">Cargando prospectos...</p>
        )}
        {error && (
          <div className="p-4 text-sm text-red-700">
            <p>{error}</p>
            <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">
              Reintentar
            </button>
          </div>
        )}
        {!loading && !error && clients.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            <p className="font-medium text-gray-700">No hay prospectos</p>
            <p className="mt-1">Prueba con otros filtros o espera un nuevo mensaje.</p>
          </div>
        )}

        {clients.map((client) => (
          <button
            type="button"
            key={client.id}
            onClick={() => onSelect(client)}
            className={`flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left transition-colors ${
              selectedId === client.id
                ? 'border-r-4 border-r-indigo-500 bg-indigo-50'
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
              <UserCircle className="text-gray-600" size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-sm font-bold text-gray-900">{client.nombre}</h2>
                <span className="whitespace-nowrap text-[10px] text-gray-400">
                  {formatMessageDate(client.fechaUltimoMensaje)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-xs text-gray-500">
                  {client.ultimoMensaje ?? 'Sin mensajes'}
                </p>
                {client.mensajesNoLeidos > 0 && (
                  <span className="min-w-5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                    {client.mensajesNoLeidos > 99 ? '99+' : client.mensajesNoLeidos}
                  </span>
                )}
              </div>
              <span className="mt-1 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                {STATUS_LABELS[client.estado]}
              </span>
            </div>
          </button>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <nav className="flex items-center justify-between border-t bg-white p-3 text-xs" aria-label="Paginación">
          <button
            type="button"
            disabled={pagination.page <= 1 || loading}
            onClick={() => onPageChange(pagination.page - 1)}
            className="rounded p-2 hover:bg-gray-100 disabled:opacity-40"
            aria-label="Página anterior"
          >
            <ChevronLeft size={17} />
          </button>
          <span>Página {pagination.page} de {pagination.totalPages}</span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => onPageChange(pagination.page + 1)}
            className="rounded p-2 hover:bg-gray-100 disabled:opacity-40"
            aria-label="Página siguiente"
          >
            <ChevronRight size={17} />
          </button>
        </nav>
      )}
    </aside>
  );
}
