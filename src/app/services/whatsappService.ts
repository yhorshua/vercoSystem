import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const LEAD_STATUSES = [
  'NUEVO',
  'ASIGNADO',
  'CONTACTADO',
  'COTIZADO',
  'VENDIDO',
  'DESCARTADO',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type MessageStatus =
  | 'pending'
  | 'received'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface WhatsAppLead {
  id: number;
  nombre: string;
  telefono: string;
  estado: LeadStatus;
  origen: 'FACEBOOK_ADS_WHATSAPP' | 'WHATSAPP_ORGANICO';
  asesorId: number | null;
  asesor: string | null;
  ultimoMensaje: string | null;
  fechaUltimoMensaje: string | null;
  mensajesNoLeidos: number;
  fechaRegistro: string;
  proximaAccion: string | null;
  fechaProximoSeguimiento: string | null;
  fechaCierre: string | null;
  motivoCierre: string | null;
}

export interface WhatsAppMessage {
  id: number;
  leadId: number;
  direccion: 'ENTRANTE' | 'SALIENTE';
  tipo: string;
  contenido: string;
  fecha: string;
  estado: MessageStatus;
}

export interface LeadHistoryItem {
  id: string;
  estadoAnterior: LeadStatus;
  estadoNuevo: LeadStatus;
  observacion: string | null;
  usuarioId: number;
  usuario: string | null;
  fecha: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

interface LeadFilters {
  page?: number;
  limit?: number;
  search?: string;
  estado?: LeadStatus | '';
}

export interface UpdateLeadStatusPayload {
  estado: LeadStatus;
  observacion?: string;
  proximaAccion?: string;
  fechaProximoSeguimiento?: string;
}

function apiUrl(path: string) {
  if (!API_URL) throw new Error('La URL del backend no está configurada');
  return `${API_URL}${path}`;
}

async function readError(response: Response, fallback: string) {
  const error = await response.json().catch(() => null);
  if (Array.isArray(error?.message)) return error.message.join(', ');
  return error?.message || fallback;
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Ocurrió un error en el CRM'));
  }
  return response.json();
}

export function getAssignedWhatsAppLeads(
  token: string,
  filters: LeadFilters = {},
) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.estado) params.set('estado', filters.estado);
  const query = params.toString();
  return request<PaginatedResponse<WhatsAppLead>>(
    `/whatsapp/leads${query ? `?${query}` : ''}`,
    token,
  );
}

export function getWhatsAppMessages(leadId: number, token: string) {
  return request<PaginatedResponse<WhatsAppMessage>>(
    `/whatsapp/leads/${leadId}/messages?limit=100`,
    token,
  );
}

export function getLeadHistory(leadId: number, token: string) {
  return request<PaginatedResponse<LeadHistoryItem>>(
    `/whatsapp/leads/${leadId}/history?limit=100`,
    token,
  );
}

export function markWhatsAppLeadRead(leadId: number, token: string) {
  return request<{ ok: true; leadId: number; mensajesNoLeidos: number }>(
    `/whatsapp/leads/${leadId}/read`,
    token,
    { method: 'PATCH' },
  );
}

export function updateWhatsAppLeadStatus(
  leadId: number,
  payload: UpdateLeadStatusPayload,
  token: string,
) {
  return request<{ ok: true; data: WhatsAppLead }>(
    `/whatsapp/leads/${leadId}/status`,
    token,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export function sendWhatsAppMessage(
  leadId: number,
  mensaje: string,
  token: string,
) {
  return request<{ ok: true; data: WhatsAppMessage }>(
    '/whatsapp/send',
    token,
    { method: 'POST', body: JSON.stringify({ leadId, mensaje }) },
  );
}

export function connectCrmSocket(token: string): Socket | null {
  if (!API_URL || !token) return null;
  return io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}
