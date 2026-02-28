// types.ts

// Tipo para los pasos de la aplicación (SEARCH, SELECTION, DETAILS, CONFIRMATION)
export type AppStep = 'SEARCH' | 'SELECTION' | 'DETAILS' | 'CONFIRMATION';

// Tipo para la solicitud de cambio/devolución (devolución o cambio)
export enum RequestType {
  RETURN = 'RETURN',
  EXCHANGE = 'EXCHANGE',
}

// Tipo para el producto
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrl: string;
}

// Tipo para la venta
export interface Sale {
  saleCode: string;
  customerName: string;
  items: Product[];
}

// DTO para el cambio de producto
export interface ChangeProductDto {
  sale_id: number;
  product_id: number;
  new_product_id: number;
  quantity: number;
}

// DTO para la devolución de producto
export interface ReturnProductDto {
  sale_id: number;
  product_id: number;
  quantity: number;
  reason?: string;
}


