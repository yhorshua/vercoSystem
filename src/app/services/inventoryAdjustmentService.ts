import { getApiUrl, parseError } from './http';

export type AdjustmentReason =
  | 'PHYSICAL_COUNT'
  | 'DATA_ENTRY_CORRECTION'
  | 'DAMAGED_PRODUCT'
  | 'LOSS_SHRINKAGE'
  | 'RETURN'
  | 'UNREGISTERED_TRANSFER'
  | 'INVENTORY_REGULARIZATION'
  | 'OTHER';

export type AllowedWarehouse = {
  id: number;
  warehouse_name: string;
  type: string | null;
  location: string | null;
};

export type InventoryAdjustmentRow = {
  stock_id: number;
  warehouse_id: number;
  product_id: number;
  product_size_id: number | null;
  sku: string;
  barcode: string | null;
  description: string;
  brand_name: string | null;
  model_code: string | null;
  color: string | null;
  category_id: number | null;
  category_name: string | null;
  size: string | null;
  stock_current: number;
  stock_reserved: number;
  stock_available: number;
  unit_of_measure: string;
  product_active: boolean;
  version: number;
  last_modified_utc: string | null;
};

export type InventorySnapshotResponse = {
  warehouse: AllowedWarehouse;
  items: InventoryAdjustmentRow[];
  snapshot: {
    captured_at_utc: string;
    captured_at_lima: string;
    item_count: number;
  };
};

export type InventoryAdjustmentResult = {
  duplicate: boolean;
  operation: {
    id: number;
    operation_code: string;
    warehouse_id: number;
    warehouse_name: string;
    warehouse_type: string | null;
    warehouse_location: string | null;
    user_id: number;
    user_name_snapshot: string;
    role_snapshot: string;
    reason_code: AdjustmentReason;
    observation: string | null;
    correlation_id: string;
    status: 'APPLIED';
    item_count: number;
    occurred_at_utc: string;
    occurred_at_lima: string;
    business_date: string;
  };
  items: Array<{
    id: number;
    stock_id: number;
    product_id: number;
    product_size_id: number | null;
    sku: string;
    description: string;
    size: string | null;
    previous_quantity: number;
    new_quantity: number;
    difference: number;
    stock_version_before: number;
    stock_version_after: number;
    result: 'APPLIED';
  }>;
  summary: {
    item_count: number;
    total_increase: number;
    total_decrease: number;
    net_difference: number;
  };
};

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export function getAllowedAdjustmentWarehouses(token: string) {
  return request<AllowedWarehouse[]>('/inventory-adjustments/warehouses', token);
}

export function getInventorySnapshot(warehouseId: number, token: string) {
  return request<InventorySnapshotResponse>(
    `/inventory-adjustments/warehouses/${warehouseId}/inventory`,
    token,
  );
}

export function registerInventoryAdjustment(
  payload: {
    warehouse_id: number;
    reason: AdjustmentReason;
    observation?: string;
    idempotency_key: string;
    items: Array<{
      stock_id: number;
      product_id: number;
      product_size_id: number | null;
      observed_quantity: number;
      new_quantity: number;
      observed_version: number;
    }>;
  },
  token: string,
) {
  const correlationId = crypto.randomUUID();
  return request<InventoryAdjustmentResult>('/inventory-adjustments', token, {
    method: 'POST',
    headers: { 'x-correlation-id': correlationId },
    body: JSON.stringify(payload),
  });
}

export function getInventoryAdjustment(operationId: number, token: string) {
  return request<InventoryAdjustmentResult>(`/inventory-adjustments/${operationId}`, token);
}
