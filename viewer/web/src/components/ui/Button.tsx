import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'primary' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  default:
    'border border-soft bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--fg)]',
  primary:
    'border border-accent/40 bg-accent text-white hover:opacity-90',
  ghost:
    'text-[var(--fg)] hover:bg-[var(--bg-hover)]',
  subtle:
    'border border-soft bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--fg)]',
  danger:
    'border border-bad/40 bg-bad text-white hover:opacity-90',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'focus-ring inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
