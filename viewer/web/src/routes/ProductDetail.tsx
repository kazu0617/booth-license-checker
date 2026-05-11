import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink, FileSearch, History, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { api, type AnalysisRow } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Card, PageHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConditionTable } from '@/components/ConditionTable';
import { formatDateTime, formatRelative, shortenUrl } from '@/lib/format';

const SOURCE_LABEL: Record<string, string> = {
  extension: '拡張機能',
  manual_pdf: '手動 PDF',
  manual_form: '手動入力',
};

function parseConditions(json: string): Record<string, number> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function parseStringArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function parseAcceptedMap(json: string | null): Record<string, string[]> {
  if (!json) return {};
  try {
    const v = JSON.parse(json);
    return typeof v === 'object' && v !== null ? v : {};
  } catch {
    return {};
  }
}

export function ProductDetail() {
  const { id } = useParams();
  const productId = Number(id);

  const detailQuery = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.productDetail(productId),
    enabled: Number.isFinite(productId),
  });

  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);

  const detail = detailQuery.data;
  const analyses = detail?.analyses ?? [];
  const selected: AnalysisRow | null = useMemo(() => {
    if (!analyses.length) return null;
    if (selectedAnalysisId == null) return analyses[0]; // latest
    return analyses.find((a) => a.id === selectedAnalysisId) ?? analyses[0];
  }, [analyses, selectedAnalysisId]);

  const previousForSelected: AnalysisRow | null = useMemo(() => {
    if (!selected) return null;
    const idx = analyses.findIndex((a) => a.id === selected.id);
    return idx >= 0 && idx + 1 < analyses.length ? analyses[idx + 1] : null;
  }, [analyses, selected]);

  if (detailQuery.isLoading) {
    return <div className="surface flex items-center justify-center py-12 text-sm text-muted">読み込み中…</div>;
  }
  if (detailQuery.isError) {
    return <div className="surface flex items-center justify-center py-12 text-sm text-bad">読み込み失敗: {(detailQuery.error as Error).message}</div>;
  }
  if (!detail) return null;

  const { product } = detail;
  const conditions = selected ? parseConditions(selected.conditions_json) : {};
  const enabledSnapshot = selected ? parseStringArray(selected.enabled_conditions_snapshot) : [];
  const acceptedSnapshot = selected ? parseAcceptedMap(selected.accepted_choices_snapshot) : {};
  const previousConditions = previousForSelected ? parseConditions(previousForSelected.conditions_json) : null;

  const licenseTextChanged =
    !!previousForSelected && previousForSelected.license_text_id !== selected?.license_text_id;

  return (
    <div>
      <Link
        to="/products"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-[var(--fg)]"
      >
        <ChevronLeft size={13} /> 商品一覧へ戻る
      </Link>

      <PageHeader
        title={product.product_name || '(名称不明)'}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {product.shop_name && <span>ショップ: {product.shop_name}</span>}
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              {shortenUrl(product.product_url)} <ExternalLink size={12} />
            </a>
          </span>
        }
        action={
          selected && (
            <>
              {selected.is_compliant ? (
                <Badge tone="ok"><CheckCircle2 size={11} /> 適合</Badge>
              ) : (
                <Badge tone="bad"><AlertCircle size={11} /> 不適合</Badge>
              )}
              <Badge tone="muted">解析履歴 {analyses.length} 件</Badge>
            </>
          )
        }
      />

      {analyses.length === 0 ? (
        <Card>
          <div className="text-center text-sm text-muted">
            この商品の解析データがまだありません。
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Timeline sidebar */}
          <aside className="surface h-fit overflow-hidden p-0">
            <div className="border-b border-soft px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
              <History size={13} /> 解析履歴
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {analyses.map((a, i) => {
                const isActive = selected?.id === a.id;
                const isLatest = i === 0;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAnalysisId(a.id)}
                    className={`block w-full border-b border-soft px-4 py-3 text-left transition-colors last:border-b-0 ${
                      isActive ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{formatDateTime(a.analyzed_at)}</span>
                      {a.is_compliant ? (
                        <Badge tone="ok">適合</Badge>
                      ) : (
                        <Badge tone="bad">不適合</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                      <span>{SOURCE_LABEL[a.source] ?? a.source}</span>
                      <span>・</span>
                      <span>{formatRelative(a.analyzed_at)}</span>
                      {isLatest && <Badge tone="accent" className="ml-auto">最新</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Detail panel */}
          {selected && (
            <div className="space-y-5">
              <Card>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted">解析日時</div>
                    <div className="mt-1 text-sm font-medium">{formatDateTime(selected.analyzed_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted">取得元</div>
                    <div className="mt-1 text-sm font-medium">{SOURCE_LABEL[selected.source] ?? selected.source}</div>
                  </div>
                  {selected.license_url && (
                    <div className="md:col-span-2">
                      <div className="text-xs uppercase tracking-wider text-muted">規約 URL</div>
                      <a
                        href={selected.license_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm text-accent hover:underline break-all"
                      >
                        {shortenUrl(selected.license_url, 80)} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {selected.special_notes && (
                    <div className="md:col-span-2">
                      <div className="text-xs uppercase tracking-wider text-muted">特記事項</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{selected.special_notes}</p>
                    </div>
                  )}
                </div>
                {licenseTextChanged && (
                  <div className="mt-4 flex items-center gap-2 rounded-md border border-warn/40 bg-warn/5 px-3 py-2 text-xs text-warn-strong dark:text-warn">
                    <FileText size={13} /> 前回の解析と比べて規約文書の本文が変わっています
                  </div>
                )}
              </Card>

              <div>
                <h2 className="mb-3 text-sm font-semibold tracking-tight">23 条項の判定</h2>
                <ConditionTable
                  conditions={conditions}
                  enabledConditions={enabledSnapshot}
                  acceptedChoices={acceptedSnapshot}
                  highlightChangedFrom={previousConditions}
                />
              </div>

              <LicenseTextSection analysisId={selected.id} hasText={!!selected.license_text_id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LicenseTextSection({ analysisId, hasText }: { analysisId: number; hasText: boolean }) {
  const [show, setShow] = useState(false);
  const textQuery = useQuery({
    queryKey: ['analysis-text', analysisId],
    queryFn: async () => {
      const res = await api.analysisDetail(analysisId);
      return res.license_text?.body ?? null;
    },
    enabled: show && hasText,
  });

  if (!hasText) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">規約本文</h2>
        <Button size="sm" variant="subtle" onClick={() => setShow((s) => !s)}>
          <FileSearch size={13} /> {show ? '隠す' : '表示する'}
        </Button>
      </div>
      {show && (
        <div className="surface mt-3 max-h-[60vh] overflow-y-auto p-4">
          {textQuery.isLoading ? (
            <div className="text-sm text-muted">読み込み中…</div>
          ) : textQuery.isError ? (
            <div className="text-sm text-bad">読み込み失敗: {(textQuery.error as Error).message}</div>
          ) : textQuery.data ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{textQuery.data}</pre>
          ) : (
            <div className="text-sm text-muted">本文がありません</div>
          )}
        </div>
      )}
    </div>
  );
}
