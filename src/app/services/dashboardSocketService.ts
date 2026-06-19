import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL;

export type DashboardCounters = {
  webSalesNew: number;
  ordersNew: number;
  totalNew: number;
};

export type WebSaleNotification = {
  message: string;
  ticket: string;
  customerName: string;
};

export type OrderNotification = {
  message: string;
  proforma: number;
  customerName: string;
};

let dashboardSocket: Socket | null = null;

export function getDashboardSocket(params: {
  token?: string;
  roleName?: string;
}) {
  if (!SOCKET_URL) {
    throw new Error('NEXT_PUBLIC_API_URL no está configurado');
  }

  if (!dashboardSocket) {
    dashboardSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
      auth: {
        token: params.token,
        roleName: params.roleName,
      },
    });
  } else {
    dashboardSocket.auth = {
      token: params.token,
      roleName: params.roleName,
    };
  }

  return dashboardSocket;
}

export function disconnectDashboardSocket() {
  if (dashboardSocket) {
    dashboardSocket.disconnect();
    dashboardSocket = null;
  }
}