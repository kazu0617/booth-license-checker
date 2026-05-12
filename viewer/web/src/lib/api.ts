import { z } from 'zod';

const ProductRowSchema = z.object({
  id: z.number(),
  product_url: z.string(),
  product_name: z.string().nullable(),
  shop_name: z.string().nullable(),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
});

const ProductListItemSchema = ProductRowSchema.extend({
  latest_analysis_id: z.number().nullable(),
  latest_analyzed_at: z.string().nullable(),
  latest_is_compliant: z.boolean().nullable(),
  analysis_count: z.number(),
});

const AnalysisRowSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  analyzed_at: z.string(),
  source: z.string(),
  license_url: z.string().nullable(),
  license_text_id: z.number().nullable(),
  conditions_json: z.string(),
  special_notes: z.string().nullable(),
  is_generator_doc: z.number(),
  enabled_conditions_snapshot: z.string().nullable(),
  accepted_choices_snapshot: z.string().nullable(),
  is_compliant: z.number(),
});

const ProductDetailSchema = z.object({
  product: ProductRowSchema,
  analyses: z.array(AnalysisRowSchema),
});

export type ProductRow = z.infer<typeof ProductRowSchema>;
export type ProductListItem = z.infer<typeof ProductListItemSchema>;
export type AnalysisRow = z.infer<typeof AnalysisRowSchema>;
export type ProductDetail = z.infer<typeof ProductDetailSchema>;

export interface ListQuery {
  q?: string;
  shop?: string;
  compliant?: 'yes' | 'no' | '';
  limit?: number;
  offset?: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const api = {
  async health() {
    return request<{ ok: boolean; service: string; version: string }>('/api/health');
  },

  async listProducts(query: ListQuery = {}): Promise<ProductListItem[]> {
    const sp = new URLSearchParams();
    if (query.q) sp.set('q', query.q);
    if (query.shop) sp.set('shop', query.shop);
    if (query.compliant) sp.set('compliant', query.compliant);
    if (typeof query.limit === 'number') sp.set('limit', String(query.limit));
    if (typeof query.offset === 'number') sp.set('offset', String(query.offset));
    const qs = sp.toString();
    const data = await request<unknown[]>(`/api/products${qs ? '?' + qs : ''}`);
    return z.array(ProductListItemSchema).parse(data);
  },

  async productDetail(id: number): Promise<ProductDetail> {
    const data = await request<unknown>(`/api/products/${id}`);
    return ProductDetailSchema.parse(data);
  },

  async listShops(): Promise<string[]> {
    return request<string[]>('/api/shops');
  },

  async analysisDetail(id: number): Promise<{
    license_text: { body: string; spec_version: string | null; gen_version: string | null } | null;
  }> {
    return request(`/api/analyses/${id}`);
  },

  async submitManual(payload: unknown, apiKey: string) {
    return request<{ stored: boolean; reason: string | null; product_id: number; analysis_id: number }>(
      '/api/analyses/manual',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
    );
  },

  exportJsonUrl: '/api/export.json',
  exportCsvUrl: '/api/export.csv',
};
