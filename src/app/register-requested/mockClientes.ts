// app/registerPedido/mockClientes.ts

export interface Cliente {
  codigo: string;
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

// Mock de clientes
export const clientesMock: Cliente[] = [
  {
    codigo: 'CLI001',
    ruc: '20123456789',
    razonSocial: 'Supermercado Central S.A.',
    direccion: 'Av. Principal 123',
    direccion2: 'Piso 3',
    telefono: '987654321',
    correo: 'contacto@supermercadocentral.com',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'Miraflores',
  },
  {
    codigo: 'CLI002',
    ruc: '20456789012',
    razonSocial: 'Zapatería El Paso SAC',
    direccion: 'Jr. Comercio 456',
    telefono: '996587654',
    correo: 'ventas@zapateriaelpaso.com',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'San Isidro',
  },
  {
    codigo: 'CLI003',
    ruc: '20678901234',
    razonSocial: 'Cliente VIP EIRL',
    direccion: 'Calle VIP 789',
    telefono: '998765432',
    correo: 'vip@cliente.com',
    departamento: 'Arequipa',
    provincia: 'Arequipa',
    distrito: 'Cayma',
  },
  {
    codigo: 'CLI004',
    ruc: '20345678901',
    razonSocial: 'Distribuidora Norte SRL',
    direccion: 'Av. Norte 112',
    telefono: '984123678',
    correo: 'contacto@distribuidorannorte.com',
    departamento: 'Lima',
    provincia: 'Callao',
    distrito: 'Bellavista',
  },
  {
    codigo: 'CLI005',
    ruc: '20789012345',
    razonSocial: 'Retail Express SAC',
    direccion: 'Calle Retail 501',
    telefono: '977654321',
    correo: 'info@retailexpress.com',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'San Borja',
  },
  {
    codigo: 'CLI006',
    ruc: '20890123456',
    razonSocial: 'Calzado Estilo EIRL',
    direccion: 'Av. Estilo 203',
    telefono: '933876540',
    correo: 'ventas@calzadoestilo.com',
    departamento: 'Cusco',
    provincia: 'Cusco',
    distrito: 'Wanchaq',
  },
];
