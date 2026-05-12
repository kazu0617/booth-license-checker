import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Upload, FileText, Check, AlertCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, PageHeader } from '@/components/ui/Card';
import { PdfDropzone } from '@/components/PdfDropzone';
import { extractTextFromPdf } from '@/lib/pdf';
import { parseLicenseText, computeIsCompliant, type ParseResult } from '@/parsing/vn3-parser';
import { VN3_CATEGORIES, VN3_OPTIONS } from '@/parsing/vn3-options';
import { api } from '@/lib/api';
import { getSettings, setSettings } from '@/lib/local-settings';
import { cn } from '@/lib/cn';

type Tab = 'pdf' | 'form';

interface FormState {
  productUrl: string;
  productName: string;
  shopName: string;
  licenseUrl: string;
  specialNotes: string;
  conditions: Record<string, number>; // -1 = unknown
}

const EMPTY_CONDITIONS: Record<string, number> = Object.fromEntries(
  VN3_OPTIONS.map((o) => [o.id, -1]),
);

const EMPTY_FORM: FormState = {
  productUrl: '',
  productName: '',
  shopName: '',
  licenseUrl: '',
  specialNotes: '',
  conditions: { ...EMPTY_CONDITIONS },
};

export function ManualRegister() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('pdf');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseInfo, setParseInfo] = useState<{ specVersion: string | null; isGenerator: boolean; pdfFileName: string } | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(getSettings().apiKey);
  }, []);

  // 拡張機能のバナーから product_url 等を引き継いで起動された場合、
  // フォームを事前入力する。引き継ぎ後は URL から params を消す。
  useEffect(() => {
    const productUrl = searchParams.get('product_url');
    if (!productUrl) return;
    const productName = searchParams.get('product_name') || '';
    const shopName = searchParams.get('shop_name') || '';
    const licenseUrl = searchParams.get('license_url') || '';

    setForm((prev) => ({
      ...prev,
      productUrl,
      productName: productName || prev.productName,
      shopName: shopName || prev.shopName,
      licenseUrl: licenseUrl || prev.licenseUrl,
    }));
    setPrefillNotice(`拡張機能から「${productName || productUrl}」の情報を引き継ぎました`);

    // URL を綺麗にしておく（再リロードで再上書きしないため）
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCompliant = useMemo(() => {
    return computeIsCompliant(
      new Map(Object.entries(form.conditions)),
      // For manual entry we don't have user-configured constraints; treat all as accepted by default
      // (the manual-mode user can still see the choice they selected per-condition)
      VN3_OPTIONS.map((o) => o.id),
      Object.fromEntries(
        VN3_OPTIONS.map((o) => [
          o.id,
          o.choices.map((c) => c.matchText),
        ]),
      ),
    );
  }, [form.conditions]);

  async function handleFile(file: File) {
    setParsing(true);
    setParseError(null);
    setExtractedText(null);
    setParseInfo(null);
    try {
      const text = await extractTextFromPdf(file);
      if (!text || text.trim().length < 50) {
        setParseError(
          'PDF からテキストを抽出できませんでした（画像形式の可能性があります）。「フォーム入力」タブで手動入力してください。',
        );
        setExtractedText(text || null);
        return;
      }
      setExtractedText(text);
      const result: ParseResult = parseLicenseText(text);
      const conditions: Record<string, number> = {};
      for (const [k, v] of result.conditions) conditions[k] = v;

      setForm((prev) => ({
        ...prev,
        conditions: { ...EMPTY_CONDITIONS, ...conditions },
        specialNotes: result.specialNotes ?? prev.specialNotes,
        licenseUrl: prev.licenseUrl,
      }));
      setParseInfo({
        specVersion: result.specVersion,
        isGenerator: result.isGeneratorDoc,
        pdfFileName: file.name,
      });
    } catch (e) {
      setParseError(`PDF 解析中にエラー: ${(e as Error).message}`);
    } finally {
      setParsing(false);
    }
  }

  async function submit() {
    setSubmitError(null);
    if (!form.productUrl.trim()) {
      setSubmitError('商品 URL は必須です');
      return;
    }
    if (!apiKey.trim()) {
      setSubmitError('API キーが未設定です。「設定」ページで入力してください。');
      return;
    }

    setSubmitting(true);
    try {
      const source = tab === 'pdf' && extractedText ? 'manual_pdf' : 'manual_form';
      const payload = {
        product: {
          url: form.productUrl.trim(),
          name: form.productName.trim() || null,
          shop_name: form.shopName.trim() || null,
        },
        source,
        license_url: form.licenseUrl.trim() || null,
        license_text: tab === 'pdf' ? extractedText : null,
        spec_version: parseInfo?.specVersion ?? null,
        gen_version: null,
        is_generator_doc: parseInfo?.isGenerator ?? false,
        conditions: form.conditions,
        special_notes: form.specialNotes.trim() || null,
        enabled_conditions_snapshot: VN3_OPTIONS.map((o) => o.id),
        accepted_choices_snapshot: Object.fromEntries(
          VN3_OPTIONS.map((o) => [o.id, o.choices.map((c) => c.matchText)]),
        ),
        is_compliant: isCompliant,
      };
      const result = await api.submitManual(payload, apiKey);
      navigate(`/products/${result.product_id}`);
    } catch (e) {
      setSubmitError(`登録に失敗しました: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="手動登録"
        description="拡張機能で取得できなかった商品の規約を、PDF アップロードまたは手入力で登録します"
      />

      {prefillNotice && (
        <div className="surface mb-4 flex items-start gap-3 border-accent/40 bg-accent/5 p-4">
          <Check size={16} className="mt-0.5 text-accent" />
          <div className="flex-1">
            <div className="text-sm font-medium">{prefillNotice}</div>
            <p className="mt-1 text-xs text-muted">
              下のフォームに事前入力されました。ライセンス PDF をドロップするか、各条項をフォームから手動で入力してください。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPrefillNotice(null)}
            className="text-faint hover:text-[var(--fg)] text-xs"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      )}

      {!apiKey && (
        <div className="surface mb-4 flex items-start gap-3 border-warn/40 bg-warn/5 p-4">
          <AlertCircle size={16} className="mt-0.5 text-warn-strong dark:text-warn" />
          <div>
            <div className="text-sm font-medium">API キーが未設定です</div>
            <p className="mt-1 text-xs text-muted">
              手動登録には API キーが必要です。
              <a href="/settings" className="text-accent hover:underline mx-1">設定ページ</a>
              で設定するか、下のフォームに直接入力してください。
            </p>
            <div className="mt-3 flex items-center gap-2">
              <KeyRound size={14} className="text-faint" />
              <Input
                type="password"
                placeholder="API キー (viewer/data/api-key.txt の内容)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="max-w-md"
              />
              <Button
                size="sm"
                variant="subtle"
                onClick={() => setSettings({ apiKey })}
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 inline-flex rounded-md border border-soft bg-[var(--bg-elevated)] p-1">
        {(['pdf', 'form'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded px-3 py-1.5 text-sm transition-colors',
              tab === t
                ? 'bg-[var(--bg-hover)] text-[var(--fg)] font-medium'
                : 'text-muted hover:text-[var(--fg)]',
            )}
          >
            {t === 'pdf' ? 'PDF アップロード' : 'フォーム入力'}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {tab === 'pdf' ? (
            <>
              <Card className="p-4">
                <PdfDropzone onFile={handleFile} disabled={parsing} />
                {parsing && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <Loader2 size={13} className="animate-spin" /> PDF を解析中…
                  </div>
                )}
                {parseError && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-bad-strong dark:text-bad">
                    <AlertCircle size={13} className="mt-0.5" /> {parseError}
                  </div>
                )}
                {parseInfo && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone="ok"><Check size={11} /> 解析完了</Badge>
                    <span className="text-muted">{parseInfo.pdfFileName}</span>
                    {parseInfo.isGenerator ? (
                      <Badge tone="ok">VN3 ジェネレータ文書</Badge>
                    ) : (
                      <Badge tone="warn">VN3 フッター未検出</Badge>
                    )}
                    {parseInfo.specVersion && <Badge tone="muted">Ver {parseInfo.specVersion}</Badge>}
                  </div>
                )}
              </Card>
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-semibold">商品情報</h3>
                <ProductFields form={form} setForm={setForm} />
              </Card>
            </>
          ) : (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">商品情報</h3>
              <ProductFields form={form} setForm={setForm} />
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center justify-between text-sm font-semibold">
            <span className="flex items-center gap-2">
              <FileText size={14} /> 23 条項
            </span>
            <Badge tone={isCompliant ? 'ok' : 'bad'}>
              {isCompliant ? '全条項判定済み' : '未判定あり'}
            </Badge>
          </h3>
          <ConditionsForm conditions={form.conditions} setConditions={(c) => setForm((p) => ({ ...p, conditions: c }))} />

          <Card className="p-4">
            <label className="mb-2 block text-xs font-semibold">特記事項</label>
            <textarea
              rows={4}
              value={form.specialNotes}
              onChange={(e) => setForm({ ...form, specialNotes: e.target.value })}
              className="focus-ring w-full rounded-md border border-soft bg-[var(--bg-elevated)] px-3 py-2 text-sm"
            />
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-soft bg-[var(--bg)]/95 py-4 backdrop-blur">
        {submitError && (
          <span className="mr-auto text-xs text-bad-strong dark:text-bad">{submitError}</span>
        )}
        <Button variant="subtle" onClick={() => { setForm(EMPTY_FORM); setExtractedText(null); setParseInfo(null); setParseError(null); }}>
          リセット
        </Button>
        <Button variant="primary" onClick={submit} disabled={submitting || !form.productUrl}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          <Upload size={14} /> 登録する
        </Button>
      </div>
    </div>
  );
}

function ProductFields({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  return (
    <div className="space-y-3">
      <Field label="商品 URL" required>
        <Input
          value={form.productUrl}
          onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
          placeholder="https://example.booth.pm/items/12345"
        />
      </Field>
      <Field label="商品名">
        <Input
          value={form.productName}
          onChange={(e) => setForm({ ...form, productName: e.target.value })}
        />
      </Field>
      <Field label="ショップ名">
        <Input
          value={form.shopName}
          onChange={(e) => setForm({ ...form, shopName: e.target.value })}
        />
      </Field>
      <Field label="規約 URL">
        <Input
          value={form.licenseUrl}
          onChange={(e) => setForm({ ...form, licenseUrl: e.target.value })}
          placeholder="（任意）"
        />
      </Field>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold">
        {label}
        {required && <span className="ml-1 text-bad">*</span>}
      </label>
      {children}
    </div>
  );
}

function ConditionsForm({
  conditions,
  setConditions,
}: {
  conditions: Record<string, number>;
  setConditions: (c: Record<string, number>) => void;
}) {
  return (
    <div className="space-y-3">
      {VN3_CATEGORIES.map((cat) => {
        const opts = VN3_OPTIONS.filter((o) => o.category === cat.id);
        if (opts.length === 0) return null;
        return (
          <Card key={cat.id} className="p-0 overflow-hidden">
            <div className="border-b border-soft bg-[var(--bg-subtle)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {cat.label}
            </div>
            <div className="divide-y divide-[var(--border)]">
              {opts.map((opt) => {
                const value = conditions[opt.id] ?? -1;
                return (
                  <div key={opt.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,200px)] gap-2.5 px-4 py-2 text-sm">
                    <span className="font-mono text-xs font-semibold text-faint">{opt.id}</span>
                    <span className="leading-tight">{opt.label}</span>
                    <Select
                      value={String(value)}
                      onChange={(e) => setConditions({ ...conditions, [opt.id]: Number(e.target.value) })}
                    >
                      <option value="-1">未判定</option>
                      {opt.choices.map((c, i) => (
                        <option key={i} value={i}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
