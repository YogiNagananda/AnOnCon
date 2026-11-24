'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-[var(--color-primary)] hover:opacity-90 text-[var(--color-primary-foreground)] shadow-xs active:scale-[0.98]',
  secondary:
    'bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] active:scale-[0.98]',
  outline:
    'border border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] active:scale-[0.98]',
  ghost:
    'hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] active:scale-[0.98]',
  destructive:
    'bg-[#dc2626] dark:bg-[#e5484d] hover:opacity-90 text-white active:scale-[0.98]',
  accent:
    'bg-[var(--color-accent)] hover:opacity-90 text-white font-medium shadow-xs active:scale-[0.98]',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-3.5 text-sm rounded-lg',
  lg: 'h-11 px-5 text-sm rounded-xl',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
