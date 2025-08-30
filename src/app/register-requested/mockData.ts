// app/registerPedido/mockBackend.ts
import { getStockData } from '../stock/stockService';
import { clientesMock } from './mockClientes';  // Importa correctamente desde mockClientes.ts

export interface Producto {
  descripcion: string;
  serie: string;
  precio: number;
  stock: Record<number, number>;
}
export interface Cliente {
  codigo: string;
  nombre: string;
  ruc: string;
  razonSocial: string;
  direccion: string;
  direccion2?: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

// Mock de stock
export const stockMock: Record<string, Producto> = {};

const loadStockMock = async () => {
  const data = await getStockData();
  data.forEach(item => {
    stockMock[item.codigo] = {
      descripcion: item.descripcion,
      serie: item.serie,
      precio: item.precio,
      stock: item.tallas, // aquí tomas las tallas con su stock
    };
  });
};
loadStockMock();
// Mock de clientes
/*
export const clientesMock: Cliente[] = [
  { codigo: 'CLI001', nombre: 'Supermercado Central' },
  { codigo: 'CLI002', nombre: 'Zapatería El Paso' },
  { codigo: 'CLI003', nombre: 'Cliente VIP' },
  { codigo: 'CLI004', nombre: 'Distribuidora Norte' },
  { codigo: 'CLI005', nombre: 'Retail Express' },
  { codigo: 'CLI006', nombre: 'Calzado Estilo' },
];
*/

// Función para "simular" obtener un producto por código
export const getClientes = (): Cliente[] => {
  const clientesGuardados = JSON.parse(localStorage.getItem('clientes') || '[]');
  return [...clientesMock, ...clientesGuardados];  // Combina ambos arrays
};

// Función para obtener un cliente por código
export const getClienteByCodigo = (codigo: string): Cliente | null => {
  const key = codigo.toUpperCase();
  const clientesGuardados = JSON.parse(localStorage.getItem('clientes') || '[]');
  return clientesGuardados.find((cliente: Cliente) => cliente.codigo === key) || null;
};

// Función para obtener un producto por código
export const getProductoByCodigo = (codigo: string): Producto | null => {
  const key = codigo.toUpperCase();
  return stockMock[key] || null;
};

export const simularRegistroCliente = async (cliente: Omit<Cliente, 'codigo'>): Promise<Cliente> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const codigoGenerado = 'CLI' + Math.floor(Math.random() * 900 + 100);
      const clienteRegistrado = { codigo: codigoGenerado, ...cliente };

      // Guardamos el cliente en localStorage (simulando base de datos)
      const clientesGuardados = JSON.parse(localStorage.getItem('clientes') || '[]');
      clientesGuardados.push(clienteRegistrado);
      localStorage.setItem('clientes', JSON.stringify(clientesGuardados));

      resolve(clienteRegistrado);
    }, 500);
  });
};
