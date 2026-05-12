import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ExternalLink, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { api, type ListQuery } from '@/lib/api';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/Card';
import { Empty } from '@/components/ui/Empty';
import { formatRelative, shortenUrl } from '@/lib/format';

export function ProductList() {
  const [q, setQ] = useState('');
  const [shop, setShop] = useState('');
  const [compliant, setCompliant] = useState<'' | 'yes' | 'no'>('');

  const query: ListQuery = useMemo(() => ({ q, shop, compliant }), [q, shop, compliant]);

  const productsQuery = useQuery({
    queryKey: ['products', query],
    queryFn: () => api.listProducts(query),
  });

  const shopsQuery = useQuery({ queryKey: ['shops'], queryFn: api.listShops });

  return (
    <div>
      <PageHeader
        title="商品一覧"
        description="拡張機能および手動登録から保存された VN3 ライセンス解析結果"
      />

      <div className="surface mb-4 p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="商品名・ショップ名・URL を検索"
              className="pl-9"
            />
          </div>
          <Select value={shop} onChange={(e) => setShop(e.target.value)}>
            <option value="">すべてのショップ</option>
            {shopsQuery.data?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select value={compliant} onChange={(e) => setCompliant(e.target.value as '' | 'yes' | 'no')}>
            <option value="">適合状態 すべて</option>
            <option value="yes">適合のみ</option>
            <option value="no">不適合のみ</option>
          </Select>
        </div>
      </div>

      {productsQuery.isLoading ? (
        <div className="surface flex items-center justify-center py-12 text-sm text-muted">読み込み中…</div>
      ) : productsQuery.isError ? (
        <div className="surface flex items-center justify-center py-12 text-sm text-bad">
          読み込みに失敗しました: {(productsQuery.error as Error).message}
        </div>
      ) : !productsQuery.data || productsQuery.data.length === 0 ? (
        <Empty
          icon={<FileText size={20} />}
          title="まだ商品が保存されていません"
          description="拡張機能のオプションで「Viewer に保存する」を有効化してから BOOTH 商品ページを開いてください。"
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="surface hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-medium uppercase tracking-wider text-faint">
                  <th className="px-4 py-2.5">商品</th>
                  <th className="px-4 py-2.5">ショップ</th>
                  <th className="px-4 py-2.5">最終解析</th>
                  <th className="px-4 py-2.5">履歴</th>
                  <th className="px-4 py-2.5">状態</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {productsQuery.data.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-soft transition-colors last:border-b-0 hover:bg-[var(--bg-subtle)]"
                  >
                    <td className="px-4 py-3">
                      <Link to={`/products/${p.id}`} className="font-medium hover:underline">
                        {p.product_name || <span className="text-faint">(名称不明)</span>}
                      </Link>
                      <div className="mt-0.5 text-xs text-faint">{shortenUrl(p.product_url)}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">{p.shop_name || <span className="text-faint">—</span>}</td>
                    <td className="px-4 py-3 text-muted">
                      {p.latest_analyzed_at ? formatRelative(p.latest_analyzed_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">{p.analysis_count} 件</td>
                    <td className="px-4 py-3">
                      {p.latest_is_compliant === true ? (
                        <Badge tone="ok"><CheckCircle2 size={11} /> 適合</Badge>
                      ) : p.latest_is_compliant === false ? (
                        <Badge tone="bad"><AlertCircle size={11} /> 不適合</Badge>
                      ) : (
                        <Badge tone="muted">—</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={p.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted hover:text-[var(--fg)]"
                        aria-label="BOOTH で開く"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {productsQuery.data.map((p) => (
              <Link
                key={p.id}
                to={`/products/${p.id}`}
                className="surface block transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.product_name || '(名称不明)'}</div>
                    <div className="mt-0.5 text-xs text-faint truncate">{shortenUrl(p.product_url)}</div>
                  </div>
                  {p.latest_is_compliant === true ? (
                    <Badge tone="ok">適合</Badge>
                  ) : p.latest_is_compliant === false ? (
                    <Badge tone="bad">不適合</Badge>
                  ) : (
                    <Badge tone="muted">—</Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>{p.shop_name || '—'}</span>
                  <span>{p.latest_analyzed_at ? formatRelative(p.latest_analyzed_at) : '—'} ・ {p.analysis_count} 件</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
