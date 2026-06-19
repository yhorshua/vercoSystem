'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
} from '../services/dashboardSocketService';

type DashboardSocketContextValue = {
  counters: DashboardCounters;
  lastWebSale: WebSaleNotification | null;
  lastOrder: OrderNotification | null;
  refreshKey: number;
  isConnected: boolean;
};

const initialCounters: DashboardCounters = {
  webSalesNew: 0,
  ordersNew: 0,
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
  const [lastWebSale, setLastWebSale] = useState<WebSaleNotification | null>(null);
  const [lastOrder, setLastOrder] = useState<OrderNotification | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const canReceiveDashboardNotifications =
    roleName === 'Jefe Ventas' || roleName === 'Administrador';

  useEffect(() => {
    if (!token || !canReceiveDashboardNotifications) {
      disconnectDashboardSocket();
      setIsConnected(false);
      setCounters(initialCounters);
      return;
    }

    const socket = getDashboardSocket({
      token,
      roleName,
    });

    const handleConnect = () => {
      console.log('Socket dashboard conectado:', socket.id);
      setIsConnected(true);

      socket.emit('dashboard:join', { roleName }, (response: any) => {
        console.log('Respuesta dashboard:join:', response);
      });
    };

    const handleDisconnect = () => {
      console.log('Socket dashboard desconectado');
      setIsConnected(false);
    };

    const handleCounters = (data: DashboardCounters) => {
      console.log('Contadores dashboard:', data);
      setCounters(data);
    };

    const handleNewWebSale = (data: WebSaleNotification) => {
      console.log('Nueva venta web recibida:', data);

      setLastWebSale(data);
      setRefreshKey((prev) => prev + 1);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Nueva venta web',
        html: `
          <b>${data.ticket}</b><br/>
          Cliente: ${data.customerName || 'Sin nombre'}
        `,
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
      });
    };

    const handleNewOrder = (data: OrderNotification) => {
      console.log('Nuevo pedido recibido:', data);

      setLastOrder(data);
      setRefreshKey((prev) => prev + 1);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Nuevo pedido',
        html: `
          <b>Proforma: ${data.proforma}</b><br/>
          Cliente: ${data.customerName || 'Sin nombre'}
        `,
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('dashboard:counters', handleCounters);
    socket.on('websale:new', handleNewWebSale);
    socket.on('order:new', handleNewOrder);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('dashboard:counters', handleCounters);
      socket.off('websale:new', handleNewWebSale);
      socket.off('order:new', handleNewOrder);
    };
  }, [token, roleName, canReceiveDashboardNotifications]);

  const value = useMemo(
    () => ({
      counters,
      lastWebSale,
      lastOrder,
      refreshKey,
      isConnected,
    }),
    [counters, lastWebSale, lastOrder, refreshKey, isConnected],
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