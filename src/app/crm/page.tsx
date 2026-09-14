'use client';

import { useCallback, useEffect, useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import Sidebar from '../components/Sidebar';
import { useUser } from '../context/UserContext';
import {
  connectCrmSocket,
  getAssignedWhatsAppLeads,
  LeadStatus,
  PaginationMeta,
  WhatsAppLead,
} from '../services/whatsappService';

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
};

export default function WhatsAppCRM() {
  const { user, loading: userLoading } = useUser();
  const [clients, setClients] = useState<WhatsAppLead[]>([]);
  const [selectedClient, setSelectedClient] = useState<WhatsAppLead | null>(null);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadClients = useCallback(async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await getAssignedWhatsAppLeads(user.token, {
        page,
        limit: 25,
        search: debouncedSearch,
        estado: status,
      });
      setClients(response.data);
      setPagination(response.meta);
      setSelectedClient((current) => {
        if (!current) return null;
        return response.data.find((client) => client.id === current.id) ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los prospectos');
    } finally {
      setLoading(false);
    }
  }, [user?.token, page, debouncedSearch, status]);

  useEffect(() => {
    if (userLoading) return;
    void loadClients();
  }, [userLoading, loadClients]);

  useEffect(() => {
    if (!user?.token) return;
    const socket = connectCrmSocket(user.token);
    if (!socket) return;

    const refresh = (event: { leadId?: number }) => {
      void loadClients();
      if (event?.leadId && event.leadId === selectedClient?.id) {
        setRefreshKey((current) => current + 1);
      }
    };
    socket.on('nuevo_mensaje', refresh);
    socket.on('estado_mensaje', refresh);
    return () => {
      socket.off('nuevo_mensaje', refresh);
      socket.off('estado_mensaje', refresh);
      socket.disconnect();
    };
  }, [user?.token, loadClients, selectedClient?.id]);

  const handleRead = useCallback((leadId: number) => {
    setClients((current) =>
      current.map((lead) =>
        lead.id === leadId && lead.mensajesNoLeidos !== 0
          ? { ...lead, mensajesNoLeidos: 0 }
          : lead,
      ),
    );
    setSelectedClient((current) =>
      current?.id === leadId && current.mensajesNoLeidos !== 0
        ? { ...current, mensajesNoLeidos: 0 }
        : current,
    );
  }, []);

  const handleLeadUpdated = useCallback((updated: WhatsAppLead) => {
    setClients((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
    setSelectedClient(updated);
  }, []);

  const handleStatusChange = (value: LeadStatus | '') => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[480px] min-w-0 bg-gray-100 p-0 md:p-4">
      <div className="mx-auto flex min-w-0 w-full max-w-7xl overflow-hidden bg-white shadow-xl md:rounded-xl md:border md:border-gray-200">
        <Sidebar
          clients={clients}
          selectedId={selectedClient?.id ?? null}
          onSelect={setSelectedClient}
          loading={loading}
          error={error}
          sellerName={user?.full_name ?? 'Asesor'}
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={handleStatusChange}
          pagination={pagination}
          onPageChange={setPage}
          onRetry={() => void loadClients()}
        />
        <ChatWindow
          client={selectedClient}
          token={user?.token ?? ''}
          refreshKey={refreshKey}
          onBack={() => setSelectedClient(null)}
          onRead={handleRead}
          onLeadUpdated={handleLeadUpdated}
        />
      </div>
    </div>
  );
}
