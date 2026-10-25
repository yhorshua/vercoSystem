export type StockMovementRow = {
  id: number;
  created_at: string;
  warehouse?: { id: number; name: string; location?: string };
  user?: { id: number | null; full_name: string; email?: string };
  product?: {
    id: number;
    article_code: string;
    article_description: string;
    brand_name?: string;
    model_code?: string;
    color?: string;
  };
  size?: { product_size_id: number | null; value: string | null };
  movement?: {
    type: string;
    direction: string;
    quantity: number;
    absolute_quantity: number;
    unit_of_measure: string;
    previous_quantity: number;
    new_quantity: number;
  };
  reference?: {
    reference_id: number | null;
    reference_type: string | null;
    reference: string | null;
    notes: string | null;
  };
};

export type StockReportResponse = {
  filters?: unknown;
  warehouse?: unknown;
  summary?: {
    total_movements: number;
    total_entries: number;
    total_exits: number;
    total_adjustments: number;
    quantity_entered: number;
    quantity_exited: number;
    net_movement: number;
  };
  summary_by_type?: unknown[];
  summary_by_user?: unknown[];
  summary_by_product?: unknown[];
  movements?: StockMovementRow[];
};
