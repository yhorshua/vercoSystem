import type { QuotationDetail } from '../services/quotationService';

export type QuotationSizeSummary = {
  size: string;
  quantity: number;
};

export type QuotationProductGroup = {
  key: string;
  productId: number | null;
  sku: string;
  description: string;
  sizes: QuotationSizeSummary[];
  unitPrices: number[];
  subtotal: number;
};

type MutableProductGroup = Omit<QuotationProductGroup, 'sizes' | 'unitPrices'> & {
  sizes: Map<string, QuotationSizeSummary>;
  unitPrices: Set<number>;
};

const asNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeKeyPart = (value: string | null | undefined) =>
  String(value ?? '').trim().toLocaleUpperCase();

const getProductKey = (line: QuotationDetail) => {
  const productId = asNumber(line.product_id);
  const sku = normalizeKeyPart(line.sku_snapshot);

  // El SKU forma parte de la clave para no mezclar colores o modelos distintos
  // si la API llegara a devolver un product_id inconsistente.
  if (productId > 0) return `product:${productId}|sku:${sku}`;

  return `sku:${sku}|description:${normalizeKeyPart(line.description_snapshot)}`;
};

const compareSizes = (a: QuotationSizeSummary, b: QuotationSizeSummary) =>
  a.size.localeCompare(b.size, 'es', { numeric: true, sensitivity: 'base' });

export function groupQuotationDetails(
  details: QuotationDetail[],
): QuotationProductGroup[] {
  const groups = new Map<string, MutableProductGroup>();

  for (const line of details) {
    const key = getProductKey(line);
    const quantity = asNumber(line.quantity);
    const unitPrice = asNumber(line.unit_price);
    const lineTotal = asNumber(line.line_total);
    const size = String(line.size_snapshot ?? '').trim() || 'Sin talla';
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        productId: asNumber(line.product_id) > 0 ? asNumber(line.product_id) : null,
        sku: String(line.sku_snapshot ?? ''),
        description: String(line.description_snapshot ?? ''),
        unitPrices: new Set([unitPrice]),
        subtotal: lineTotal,
        sizes: new Map([
          [
            size,
            {
              size,
              quantity,
            },
          ],
        ]),
      });
      continue;
    }

    const existingSize = existing.sizes.get(size);

    if (existingSize) {
      existingSize.quantity += quantity;
    } else {
      existing.sizes.set(size, {
        size,
        quantity,
      });
    }

    existing.unitPrices.add(unitPrice);
    existing.subtotal += lineTotal;
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    sizes: Array.from(group.sizes.values()).sort(compareSizes),
    unitPrices: Array.from(group.unitPrices.values()).sort((a, b) => a - b),
  }));
}
