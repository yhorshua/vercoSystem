'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Swal from 'sweetalert2';
import { useUser } from './UserContext';

import {
  getDashboardSocket,
  disconnectDashboardSocket,
  DashboardCounters,
  WebSaleNotification,
  OrderNotification,
  OrderUpdateNotification,
} from '../services/dashboardSocketService';
import { getPendingPaymentCount } from '../services/pendingPaymentService';

type DashboardSocketContextValue = {
  counters: DashboardCounters;
  lastWebSale: WebSaleNotification | null;
  lastOrder: OrderNotification | null;
  refreshKey: number;
  isConnected: boolean;
  pendingCreditsLoading: boolean;
  pendingCreditsError: string | null;
  refreshPendingCredits: () => Promise<void>;
};

const initialCounters: DashboardCounters = {
  webSalesNew: 0,
  ordersNew: 0,
  pendingCredits: 0,
  totalNew: 0,
};

const DashboardSocketContext =
  createContext<DashboardSocketContextValue | undefined>(undefined);

export function DashboardSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();

  const token = user?.token;

  const roleName =
    user?.role?.name_role ||
    (typeof user?.role === 'string' ? user.role : undefined);

  const [counters, setCounters] = useState<DashboardCounters>(initialCounters);
  const [lastWebSale, setLastWebSale] =
    useState<WebSaleNotification | null>(null);
  const [lastOrder, setLastOrder] =
    useState<OrderNotification | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingCreditsLoading, setPendingCreditsLoading] = useState(false);
  const [pendingCreditsError, setPendingCreditsError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasShownPendingOnLoadRef = useRef(false);

  const canReceiveDashboardNotifications =
    roleName === 'Jefe Ventas' ||
    roleName === 'Administrador' ||
    roleName === 'Vendedor' ||
    roleName === 'Vendedor Web';
  const canReceiveCounters = roleName === 'Jefe Ventas' || roleName === 'Administrador';
  const canReadPendingCredits = roleName === 'Tienda' || roleName === 'Administrador';

  const refreshPendingCredits = useCallback(async () => {
    if (!token || !canReadPendingCredits) {
      setCounters((current) => ({ ...current, pendingCredits: 0 }));
      setPendingCreditsError(null);
      return;
    }
    setPendingCreditsLoading(true);
    try {
      const result = await getPendingPaymentCount(token);
      setCounters((current) => ({
        ...current,
        pendingCredits: Math.max(0, Number(result.pendingCredits || 0)),
      }));
      setPendingCreditsError(null);
    } catch (error) {
      setPendingCreditsError(
        error instanceof Error ? error.message : 'No se pudo actualizar el contador de créditos',
      );
    } finally {
      setPendingCreditsLoading(false);
    }
  }, [canReadPendingCredits, token]);

  useEffect(() => {
    void refreshPendingCredits();
    const refresh = () => { void refreshPendingCredits(); };
    window.addEventListener('pending-credits:refresh', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('pending-credits:refresh', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshPendingCredits]);

  const escapeHtml = (value?: unknown) => {
    return String(value ?? 'Sin nombre')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.85;

    const unlockAudio = () => {
      const audio = audioRef.current;

      if (!audio) return;

      audio.muted = true;

      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;

    audio.play().catch((error) => {
      console.warn(
        'El navegador bloqueó el sonido hasta que el usuario interactúe con la página.',
        error,
      );
    });
  }, []);

  const showToast = useCallback(
    ({
      icon,
      title,
      html,
    }: {
      icon: 'success' | 'info' | 'warning';
      title: string;
      html: string;
    }) => {
      playNotificationSound();

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon,
        title,
        html,

        showCloseButton: true,
        closeButtonHtml: '&times;',

        showConfirmButton: false,

        // Mínimo 15 segundos visible
        timer: 15000,
        timerProgressBar: true,

        // Para que no quede oculto detrás del navbar/drawer
        didOpen: (toast) => {
          toast.style.zIndex = '99999';

          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        },
      });
    },
    [playNotificationSound],
  );

  useEffect(() => {
    hasShownPendingOnLoadRef.current = false;
  }, [token, roleName]);

  useEffect(() => {
    if (!token || !canReceiveDashboardNotifications) {
      disconnectDashboardSocket();
      setIsConnected(false);
      setCounters((current) => ({
        ...initialCounters,
        pendingCredits: canReadPendingCredits ? current.pendingCredits : 0,
      }));
      setLastWebSale(null);
      setLastOrder(null);
      hasShownPendingOnLoadRef.current = false;
      return;
    }

    const socket = getDashboardSocket({
      token,
      roleName,
    });

    const joinDashboardRoom = () => {
      if (!canReceiveCounters) return;
      socket.emit('dashboard:join', { roleName }, (response: any) => {
        console.log('Respuesta dashboard:join:', response);
      });
    };

    const handleConnect = () => {
      console.log('Socket dashboard conectado:', socket.id);
      setIsConnected(true);
      joinDashboardRoom();
    };

    const handleDisconnect = () => {
      console.log('Socket dashboard desconectado');
      setIsConnected(false);
    };

    const handleCounters = (data: DashboardCounters) => {
      console.log('Contadores dashboard:', data);

      const safeCounters: DashboardCounters = {
        webSalesNew: Number(data?.webSalesNew || 0),
        ordersNew: Number(data?.ordersNew || 0),
        pendingCredits: Number(data?.pendingCredits || 0),
        totalNew: Number(data?.totalNew || 0),
      };

      setCounters((current) => ({
        ...safeCounters,
        pendingCredits: current.pendingCredits,
      }));

      const hasPending =
        safeCounters.totalNew > 0 ||
        safeCounters.webSalesNew > 0 ||
        safeCounters.ordersNew > 0;

      // Esto se ejecuta cuando refrescas o entras nuevamente
      // y ya existen pedidos/ventas pendientes por atender.
      if (hasPending && !hasShownPendingOnLoadRef.current) {
        hasShownPendingOnLoadRef.current = true;

        showToast({
          icon: 'warning',
          title: 'Pedidos por atender',
          html: `
            <b>Tienes movimientos pendientes</b><br/>
            Pedidos por mayor: ${safeCounters.ordersNew}<br/>
            Ventas web: ${safeCounters.webSalesNew}<br/>
            Total pendiente: ${safeCounters.totalNew}
          `,
        });
      }
    };

    const handleNewWebSale = (data: WebSaleNotification) => {
      console.log('Nueva venta web recibida:', data);

      hasShownPendingOnLoadRef.current = true;

      setLastWebSale(data);
      setRefreshKey((prev) => prev + 1);

      showToast({
        icon: 'success',
        title: 'Nueva venta web',
        html: `
          <b>${escapeHtml(data.ticket)}</b><br/>
          Cliente: ${escapeHtml(data.customerName)}
        `,
      });
    };

    const handleNewOrder = (data: OrderNotification) => {
      console.log('Nuevo pedido recibido:', data);

      hasShownPendingOnLoadRef.current = true;

      setLastOrder(data);
      setRefreshKey((prev) => prev + 1);

      showToast({
        icon: 'info',
        title: 'Nuevo pedido',
        html: `
          <b>Proforma: ${escapeHtml(data.proforma)}</b><br/>
          Cliente: ${escapeHtml(data.customerName)}
        `,
      });
    };

    const handleOrderUpdated = (data: OrderUpdateNotification) => {
      setRefreshKey((previous) => previous + 1);
      const approved = data.status === 'APROBADO';
      showToast({
        icon: approved ? 'success' : 'warning',
        title: approved ? 'Pedido aprobado' : 'Pedido rechazado',
        html: `<b>Proforma: ${escapeHtml(data.proforma)}</b><br/>${escapeHtml(data.message)}`,
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('dashboard:counters', handleCounters);
    socket.on('websale:new', handleNewWebSale);
    socket.on('order:new', handleNewOrder);
    socket.on('order:updated', handleOrderUpdated);

    if (!socket.connected) {
      socket.connect();
    } else {
      // Esto soluciona cuando el socket ya estaba conectado,
      // pero no volvió a ejecutar el evento connect.
      setIsConnected(true);
      joinDashboardRoom();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('dashboard:counters', handleCounters);
      socket.off('websale:new', handleNewWebSale);
      socket.off('order:new', handleNewOrder);
      socket.off('order:updated', handleOrderUpdated);
    };
  }, [
    token,
    roleName,
    canReceiveDashboardNotifications,
    canReceiveCounters,
    canReadPendingCredits,
    showToast,
  ]);

  const value = useMemo(
    () => ({
      counters,
      lastWebSale,
      lastOrder,
      refreshKey,
      isConnected,
      pendingCreditsLoading,
      pendingCreditsError,
      refreshPendingCredits,
    }),
    [
      counters,
      lastWebSale,
      lastOrder,
      refreshKey,
      isConnected,
      pendingCreditsLoading,
      pendingCreditsError,
      refreshPendingCredits,
    ],
  );

  return (
    <DashboardSocketContext.Provider value={value}>
      {children}
    </DashboardSocketContext.Provider>
  );
}

export function useDashboardSocket() {
  const context = useContext(DashboardSocketContext);

  if (!context) {
    throw new Error(
      'useDashboardSocket debe usarse dentro de DashboardSocketProvider',
    );
  }

  return context;
}
