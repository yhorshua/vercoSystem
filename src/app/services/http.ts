const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getApiUrl() {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL no está definido');
  return API_URL;
}

export async function parseError(res: Response) {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    if (typeof j?.message === 'string') return j.message;
    if (Array.isArray(j?.message)) return j.message.join('\n');
    if (j?.message && typeof j.message === 'object') {
      const detail = j.message;
      const conflictLines = Array.isArray(detail.conflicts)
        ? detail.conflicts.slice(0, 5).map((item: any) => {
          const sku = item?.sku ? ` ${item.sku}` : '';
          const quantities = item?.current_quantity !== undefined
            ? ` (observado ${item.observed_quantity}, actual ${item.current_quantity}, solicitado ${item.requested_quantity})`
            : '';
          return `Stock ${item?.stock_id ?? '?'}${sku}${quantities}`;
        })
        : [];
      return [detail.message || 'La solicitud no pudo completarse', ...conflictLines].join('\n');
    }
  } catch {}
  return text || `Error HTTP ${res.status}`;
}
