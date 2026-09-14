'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, Send, UserCircle } from 'lucide-react';

import MessageBubble from './MessageBubble';
import {
  getLeadHistory,
  getWhatsAppMessages,
  LeadHistoryItem,
  LeadStatus,
  markWhatsAppLeadRead,
  sendWhatsAppMessage,
  updateWhatsAppLeadStatus,
  WhatsAppLead,
  WhatsAppMessage,
} from '../services/whatsappService';

interface ChatWindowProps {
  client: WhatsAppLead | null;
  token: string;
  refreshKey: number;
  onBack: () => void;
  onRead: (leadId: number) => void;
  onLeadUpdated: (lead: WhatsAppLead) => void;
}

const OPEN_STATES = new Set<LeadStatus>(['NUEVO', 'ASIGNADO', 'CONTACTADO', 'COTIZADO']);
const NEXT_STATES: Record<LeadStatus, LeadStatus[]> = {
  NUEVO: ['ASIGNADO', 'CONTACTADO', 'DESCARTADO'],
  ASIGNADO: ['CONTACTADO', 'DESCARTADO'],
  CONTACTADO: ['COTIZADO', 'DESCARTADO'],
  COTIZADO: ['CONTACTADO', 'VENDIDO', 'DESCARTADO'],
  VENDIDO: [],
  DESCARTADO: [],
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  NUEVO: 'Nuevo',
  ASIGNADO: 'Asignado',
  CONTACTADO: 'Contactado',
  COTIZADO: 'Cotizado',
  VENDIDO: 'Vendido',
  DESCARTADO: 'Descartado',
};

export default function ChatWindow({
  client,
  token,
  refreshKey,
  onBack,
  onRead,
  onLeadUpdated,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [history, setHistory] = useState<LeadHistoryItem[]>([]);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState('');
  const [nextStatus, setNextStatus] = useState<LeadStatus | ''>('');
  const [observation, setObservation] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [followUp, setFollowUp] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadConversation = useCallback(async () => {
    if (!client || !token) return;
    try {
      setLoading(true);
      setError('');
      const [messageResponse, historyResponse] = await Promise.all([
        getWhatsAppMessages(client.id, token),
        getLeadHistory(client.id, token),
      ]);
      setMessages(messageResponse.data);
      setHistory(historyResponse.data);
      await markWhatsAppLeadRead(client.id, token);
      onRead(client.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la conversación');
    } finally {
      setLoading(false);
    }
  }, [client, token, onRead]);

  useEffect(() => {
    setMessages([]);
    setHistory([]);
    setMessage('');
    setActiveTab('chat');
    setNextStatus('');
    setObservation('');
    setNextAction(client?.proximaAccion ?? '');
    setFollowUp('');
    void loadConversation();
  }, [client?.id, refreshKey, loadConversation]);

  useEffect(() => {
    if (activeTab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = message.trim();
    if (!client || !token || !content || sending) return;

    try {
      setSending(true);
      setError('');
      const response = await sendWhatsAppMessage(client.id, content, token);
      setMessages((current) => [...current, response.data]);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje');
      await loadConversation();
    } finally {
      setSending(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!client || !token || !nextStatus || savingStatus) return;
    if (OPEN_STATES.has(nextStatus) && !followUp) {
      setError('Selecciona la fecha del próximo seguimiento.');
      return;
    }
    if (nextStatus === 'DESCARTADO' && observation.trim().length < 3) {
      setError('Indica el motivo por el que se descarta la oportunidad.');
      return;
    }

    try {
      setSavingStatus(true);
      setError('');
      const response = await updateWhatsAppLeadStatus(
        client.id,
        {
          estado: nextStatus,
          observacion: observation.trim() || undefined,
          proximaAccion: nextAction.trim() || undefined,
          fechaProximoSeguimiento: followUp
            ? new Date(followUp).toISOString()
            : undefined,
        },
        token,
      );
      onLeadUpdated({
        ...client,
        ...response.data,
        ultimoMensaje: client.ultimoMensaje,
        fechaUltimoMensaje: client.fechaUltimoMensaje,
      });
      setNextStatus('');
      setObservation('');
      const historyResponse = await getLeadHistory(client.id, token);
      setHistory(historyResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado');
    } finally {
      setSavingStatus(false);
    }
  };

  if (!client) {
    return (
      <main className="hidden flex-1 items-center justify-center bg-[#e5ddd5] text-sm text-gray-600 md:flex">
        Selecciona una conversación.
      </main>
    );
  }

  const availableStates = NEXT_STATES[client.estado];

  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-[#e5ddd5]">
      <header className="z-10 border-b bg-white">
        <div className="flex items-center gap-3 p-3 md:p-4">
          <button type="button" onClick={onBack} className="rounded p-1 hover:bg-gray-100 md:hidden" aria-label="Volver a prospectos">
            <ArrowLeft size={22} />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
            <UserCircle size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold">{client.nombre}</h2>
            <span className="text-xs text-gray-500">{client.telefono}</span>
          </div>
          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 sm:text-xs">
            {STATUS_LABELS[client.estado]}
          </span>
        </div>

        <div className="flex border-t text-sm">
          <button type="button" onClick={() => setActiveTab('chat')} className={`flex-1 px-4 py-2 ${activeTab === 'chat' ? 'border-b-2 border-indigo-600 font-semibold text-indigo-700' : 'text-gray-500'}`}>
            Conversación
          </button>
          <button type="button" onClick={() => setActiveTab('history')} className={`flex-1 px-4 py-2 ${activeTab === 'history' ? 'border-b-2 border-indigo-600 font-semibold text-indigo-700' : 'text-gray-500'}`}>
            Seguimiento e historial
          </button>
        </div>
      </header>

      {activeTab === 'chat' ? (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto p-4 md:p-6" aria-live="polite">
            {loading && messages.length === 0 && <p className="text-center text-sm text-gray-500">Cargando conversación...</p>}
            {!loading && messages.length === 0 && <p className="text-center text-sm text-gray-500">Esta conversación no tiene mensajes.</p>}
            {messages.map((item) => (
              <MessageBubble
                key={item.id}
                text={item.contenido}
                time={new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.fecha))}
                isSender={item.direccion === 'SALIENTE'}
                status={item.estado}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t bg-gray-50 p-3 md:p-4">
            {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
            <form onSubmit={handleSend} className="flex min-w-0 items-center gap-2 sm:gap-3">
              <label className="sr-only" htmlFor="crm-message">Mensaje</label>
              <input
                id="crm-message"
                value={message}
                maxLength={4096}
                onChange={(event) => setMessage(event.target.value)}
                disabled={sending}
                type="text"
                placeholder="Escribe un mensaje aquí..."
                className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 sm:text-sm"
              />
              <button type="submit" disabled={sending || !message.trim()} className="rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Enviar mensaje">
                <Send size={20} />
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">Actualizar etapa comercial</h3>
            {availableStates.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">La oportunidad está cerrada. Su historial se conserva.</p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-gray-700">
                  Nueva etapa
                  <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as LeadStatus | '')} className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="">Seleccionar...</option>
                    {availableStates.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                  </select>
                </label>
                {nextStatus && OPEN_STATES.has(nextStatus) && (
                  <label className="text-sm text-gray-700">
                    Próximo seguimiento *
                    <input type="datetime-local" value={followUp} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setFollowUp(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                  </label>
                )}
                {nextStatus && OPEN_STATES.has(nextStatus) && (
                  <label className="text-sm text-gray-700 md:col-span-2">
                    Próxima acción
                    <input value={nextAction} maxLength={255} onChange={(event) => setNextAction(event.target.value)} placeholder="Ej. llamar para confirmar la cotización" className="mt-1 w-full rounded-lg border px-3 py-2" />
                  </label>
                )}
                {nextStatus && (
                  <label className="text-sm text-gray-700 md:col-span-2">
                    {nextStatus === 'DESCARTADO' ? 'Motivo de pérdida *' : 'Observación'}
                    <textarea value={observation} maxLength={500} onChange={(event) => setObservation(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border px-3 py-2" />
                  </label>
                )}
                <div className="md:col-span-2">
                  <button type="button" onClick={handleStatusUpdate} disabled={!nextStatus || savingStatus} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {savingStatus ? 'Guardando...' : 'Guardar cambio'}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900"><CalendarClock size={18} /> Historial de etapas</h3>
            {loading && history.length === 0 && <p className="mt-3 text-sm text-gray-500">Cargando historial...</p>}
            {!loading && history.length === 0 && <p className="mt-3 text-sm text-gray-500">Todavía no hay cambios de etapa registrados.</p>}
            <ol className="mt-3 space-y-3">
              {history.map((item) => (
                <li key={item.id} className="border-l-2 border-indigo-200 pl-3 text-sm">
                  <p className="font-medium text-gray-800">{STATUS_LABELS[item.estadoAnterior]} → {STATUS_LABELS[item.estadoNuevo]}</p>
                  {item.observacion && <p className="mt-1 text-gray-600">{item.observacion}</p>}
                  <p className="mt-1 text-xs text-gray-400">{item.usuario ?? `Usuario ${item.usuarioId}`} · {new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.fecha))}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </main>
  );
}
