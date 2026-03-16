
export type AppStep = 'SEARCH' | 'SELECTION' | 'DETAILS' | 'CONFIRMATION';

// Tipo para la solicitud de cambio/devolución (devolución o cambio)
export enum RequestType {
  RETURN = 'RETURN',
  EXCHANGE = 'EXCHANGE',
}

export interface ChangeProductParams {
  sale_id: number;
  warehouse_id: number;
  product_id: number;
  old_product_size_id: number;
  new_product_id: number;
  new_product_size_id: number;
  quantity: number;
  old_product_price: number;
  new_product_price: number;
}

export interface ReturnProductDto {
  sale_id: number;
  product_id: number;
  quantity: number;
  price_at_return: number;   // Precio de devolución ajustado
  reason?: string;
}

export interface ProductStatus {
  type: string;
  data: number[];
}

export interface Product {
  id: number;
  article_code: string;
  article_description: string;
  article_series: string;
  type_origin: string;
  manufacturing_cost: string;
  unit_price: string;
  brand_name: string;
  model_code: string;
  material_type: string;
  color: string;
  stock_minimum: number;
  product_image: string;
  status: ProductStatus;
  created_at: string;
}

export interface ProductSize {
  id: number;
  size: string;
  lot_pair: number;
}

export interface Sale {
  id: number;
  sale_code: string;
  warehouse_id: number;
  user_id: number;
  customer_id: number | null;
  sale_date: string;
  total_amount: string;
  payment_method: string;
  details: SaleDetail[];
}

export interface SaleDetail {
  id: number;
  sale_id: number;
  product_id: number;
  product: Product;
  product_size_id: number;
  productSize: ProductSize;
  quantity: string;
  unit_price: string;
}

