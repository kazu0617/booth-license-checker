import { VN3_CATEGORIES, VN3_OPTIONS } from '@/parsing/vn3-options';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

const TYPE_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'accent' | 'neutral' | 'muted'> = {
  permitted: 'ok',
  conditional: 'warn',
  'not-permitted': 'bad',
  contact: 'accent',
  'not-applicable': 'neutral',
};

const TYPE_LABEL: Record<string, string> = {
  permitted: '許可',
  conditional: '条件付',
  'not-permitted': '不許可',
  contact: '要確認',
  'not-applicable': '該当なし',
};

interface Props {
  conditions: Map<string, number> | Record<string, number>;
  enabledConditions?: string[];
  acceptedChoices?: Record<string, string[]>;
  highlightChangedFrom?: Record<string, number> | null;
  /** Only show the conditions enabled by the user. Defaults to false (show all). */
  onlyEnabled?: boolean;
}

function getCond(map: Props['conditions'], id: string): number | undefined {
  if (map instanceof Map) return map.get(id);
  return map[id];
}

export function ConditionTable({
  conditions,
  enabledConditions,
  acceptedChoices,
  highlightChangedFrom,
  onlyEnabled = false,
}: Props) {
  const enabledSet = new Set(enabledConditions ?? []);

  return (
    <div className="space-y-4">
      {VN3_CATEGORIES.map((cat) => {
        const opts = VN3_OPTIONS.filter((o) => {
          if (o.category !== cat.id) return false;
          if (onlyEnabled && !enabledSet.has(o.id)) return false;
          return true;
        });
        if (opts.length === 0) return null;

        return (
          <div key={cat.id} className="surface overflow-hidden p-0">
            <div className="border-b border-soft bg-[var(--bg-subtle)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {cat.label}
            </div>
            <div className="divide-y divide-[var(--border)]">
              {opts.map((opt) => {
                const idx = getCond(conditions, opt.id);
                const choice = idx !== undefined && idx >= 0 ? opt.choices[idx] : null;
                const accepted = acceptedChoices?.[opt.id] ?? [];
                const isCheckTarget = enabledSet.has(opt.id);
                const isOk = isCheckTarget && choice && accepted.includes(choice.matchText);
                const isProblem = isCheckTarget && (!choice || (choice && !accepted.includes(choice.matchText)));

                const changed =
                  highlightChangedFrom != null && highlightChangedFrom[opt.id] !== idx;

                return (
                  <div
                    key={opt.id}
                    className={cn(
                      'grid grid-cols-[2.5rem_1fr_auto] items-start gap-3 px-4 py-2.5 text-sm transition-colors',
                      changed && 'bg-warn/5',
                      isProblem && 'bg-bad/5',
                    )}
                  >
                    <div className="font-mono text-xs font-semibold text-faint">{opt.id}</div>
                    <div className="min-w-0">
                      <div className={cn('font-medium leading-tight', !isCheckTarget && 'text-muted')}>{opt.label}</div>
                      <div className="mt-0.5 text-xs text-faint leading-snug">{opt.en}</div>
                      {choice ? (
                        <div className={cn('mt-1.5 text-xs', isOk ? 'text-ok-strong dark:text-ok' : isProblem ? 'text-bad-strong dark:text-bad' : 'text-muted')}>
                          {choice.label}
                        </div>
                      ) : (
                        <div className="mt-1.5 text-xs text-faint italic">確認できませんでした</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {choice && (
                        <Badge tone={TYPE_TONE[choice.type] ?? 'neutral'}>{TYPE_LABEL[choice.type] ?? choice.type}</Badge>
                      )}
                      {isCheckTarget && (
                        <Badge tone={isOk ? 'ok' : 'bad'}>{isOk ? '適合' : '不適合'}</Badge>
                      )}
                      {changed && <Badge tone="warn">変更</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
