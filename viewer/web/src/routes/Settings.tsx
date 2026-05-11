import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, KeyRound, Eye, EyeOff, Sun, Moon, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, PageHeader, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { getSettings, setSettings } from '@/lib/local-settings';
import { getTheme, setTheme, type Theme } from '@/lib/theme';

export function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [theme, setLocalTheme] = useState<Theme>('dark');

  useEffect(() => {
    setApiKey(getSettings().apiKey);
    setLocalTheme(getTheme());
  }, []);

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 10_000,
  });

  function save() {
    setSettings({ apiKey });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 3_000);
  }

  function applyTheme(next: Theme) {
    setTheme(next);
    setLocalTheme(next);
  }

  return (
    <div>
      <PageHeader title="設定" description="ローカル設定とサーバー情報" />

      <div className="grid gap-5">
        <Card>
          <CardHeader
            title="サーバー接続"
            description="Rust サーバー (booth-license-viewer) への疎通を確認します"
            action={
              healthQuery.isSuccess ? (
                <Badge tone="ok"><CheckCircle2 size={11} /> 接続中</Badge>
              ) : healthQuery.isError ? (
                <Badge tone="bad"><AlertCircle size={11} /> 接続失敗</Badge>
              ) : (
                <Badge tone="muted">確認中…</Badge>
              )
            }
          />
          {healthQuery.data && (
            <div className="text-xs text-muted">
              <div>サービス: {healthQuery.data.service}</div>
              <div>バージョン: v{healthQuery.data.version}</div>
            </div>
          )}
          {healthQuery.error && (
            <div className="text-xs text-bad-strong dark:text-bad">{(healthQuery.error as Error).message}</div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="API キー (手動登録用)"
            description="手動登録機能で /api/analyses/manual を呼び出すために使用します。viewer/data/api-key.txt の内容と一致させてください。"
            action={
              savedAt && <Badge tone="ok">保存しました</Badge>
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <KeyRound size={14} className="text-faint" />
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="UUID"
              className="max-w-md"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKey((s) => !s)}
              aria-label={showKey ? '隠す' : '表示'}
            >
              {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </Button>
            <Button variant="primary" size="sm" onClick={save}>保存</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="テーマ" description="ブラウザに保存されます" />
          <div className="inline-flex rounded-md border border-soft p-1">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => applyTheme(t)}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
                  theme === t ? 'bg-[var(--bg-hover)] font-medium' : 'text-muted hover:text-[var(--fg)]'
                }`}
              >
                {t === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
                {t === 'dark' ? 'ダーク' : 'ライト'}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="エクスポート" description="保存済みデータを書き出します" />
          <div className="flex flex-wrap items-center gap-3">
            <a href={api.exportJsonUrl} download>
              <Button variant="subtle" size="sm"><Download size={13} /> JSON でダウンロード</Button>
            </a>
            <a href={api.exportCsvUrl} download>
              <Button variant="subtle" size="sm"><Download size={13} /> CSV でダウンロード</Button>
            </a>
          </div>
          <p className="mt-3 text-xs text-muted">
            CSV は商品 × 23 条項のマトリクスです（条項の値は -1=不明、0+ は選択肢インデックス）。
          </p>
        </Card>
      </div>
    </div>
  );
}
