import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Store, Database, ArrowRight, FilePlus2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, PageHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';
import { Button } from '@/components/ui/Button';
import { formatRelative, shortenUrl } from '@/lib/format';

export function Dashboard() {
  const productsQuery = useQuery({
    queryKey: ['products', { limit: 200 }],
    queryFn: () => api.listProducts({ limit: 200 }),
  });

  const products = productsQuery.data ?? [];
  const total = products.length;
  const compliant = products.filter((p) => p.latest_is_compliant === true).length;
  const nonCompliant = products.filter((p) => p.latest_is_compliant === false).length;
  const shops = new Set(products.map((p) => p.shop_name).filter(Boolean)).size;

  const recent = [...products]
    .sort((a, b) => (b.latest_analyzed_at ?? '').localeCompare(a.latest_analyzed_at ?? ''))
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="保存された商品ライセンス解析の概況"
        action={
          <Button variant="subtle" onClick={() => (window.location.href = '/manual')}>
            <FilePlus2 size={14} /> 手動登録
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="保存済み商品" value={total} icon={<Database size={16} />} />
        <StatCard label="適合" value={compliant} tone="ok" icon={<CheckCircle2 size={16} />} />
        <StatCard label="不適合" value={nonCompliant} tone="bad" icon={<AlertCircle size={16} />} />
        <StatCard label="ショップ数" value={shops} icon={<Store size={16} />} />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">最近の解析</h2>
          <Link to="/products" className="inline-flex items-center gap-1 text-xs text-muted hover:text-[var(--fg)]">
            すべて見る <ArrowRight size={12} />
          </Link>
        </div>

        {productsQuery.isLoading ? (
          <Card><div className="text-sm text-muted">読み込み中…</div></Card>
        ) : recent.length === 0 ? (
          <Empty
            title="まだ何も保存されていません"
            description="拡張機能の Viewer 連携を有効化するか、手動登録から始めてください。"
            action={
              <Link to="/manual">
                <Button variant="primary"><FilePlus2 size={14} /> 手動で登録する</Button>
              </Link>
            }
          />
        ) : (
          <div className="surface overflow-hidden p-0">
            <div className="divide-y divide-[var(--border)]">
              {recent.map((p) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.product_name || '(名称不明)'}</div>
                    <div className="mt-0.5 truncate text-xs text-faint">
                      {p.shop_name ? `${p.shop_name} ・ ` : ''}{shortenUrl(p.product_url)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
                    {p.latest_analyzed_at && <span>{formatRelative(p.latest_analyzed_at)}</span>}
                    {p.latest_is_compliant === true ? (
                      <Badge tone="ok">適合</Badge>
                    ) : p.latest_is_compliant === false ? (
                      <Badge tone="bad">不適合</Badge>
                    ) : (
                      <Badge tone="muted">—</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'neutral' | 'ok' | 'bad';
}) {
  const accent =
    tone === 'ok' ? 'text-ok-strong dark:text-ok' :
    tone === 'bad' ? 'text-bad-strong dark:text-bad' :
    'text-muted';

  return (
    <Card className="p-4">
      <div className={`mb-1 flex items-center gap-1.5 text-xs ${accent}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
    </Card>
  );
}
