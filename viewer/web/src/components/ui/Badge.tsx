import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'accent' | 'muted';

const TONE: Record<Tone, string> = {
  neutral: 'bg-[var(--bg-subtle)] text-[var(--fg)] border-soft',
  ok: 'bg-ok-soft text-ok-strong border-ok/40 dark:bg-ok/10 dark:text-ok dark:border-ok/30',
  warn: 'bg-warn-soft text-warn-strong border-warn/40 dark:bg-warn/10 dark:text-warn dark:border-warn/30',
  bad: 'bg-bad-soft text-bad-strong border-bad/40 dark:bg-bad/10 dark:text-bad dark:border-bad/30',
  accent: 'bg-accent/10 text-accent dark:text-accent border-accent/30',
  muted: 'bg-transparent text-faint border-soft',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
