import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[#5b50f6] text-white shadow-[0_4px_12px_rgba(79,70,229,0.22)] ' +
    'hover:bg-[#4f46e5] hover:shadow-[0_5px_14px_rgba(79,70,229,0.28)] ' +
    'focus-visible:ring-2 focus-visible:ring-[#5b50f6] focus-visible:ring-offset-2 ' +
    'disabled:bg-[#c7c3fb] disabled:shadow-none',

  secondary:
    'border border-black/[0.08] bg-white text-[#4b5563] shadow-sm ' +
    'hover:bg-[#f7f7f8] hover:text-[#111827] ' +
    'focus-visible:ring-2 focus-visible:ring-[#d8d4fe] focus-visible:ring-offset-2 ' +
    'disabled:text-[#9ca3af] disabled:bg-[#f9fafb]',

  danger:
    'bg-[#dc2626] text-white shadow-sm ' +
    'hover:bg-[#b91c1c] ' +
    'focus-visible:ring-2 focus-visible:ring-[#ef4444] focus-visible:ring-offset-2 ' +
    'disabled:bg-[#fca5a5] disabled:shadow-none',

  ghost:
    'bg-transparent text-[#6b7280] ' +
    'hover:bg-[#f4f4f5] hover:text-[#111827] ' +
    'focus-visible:ring-2 focus-visible:ring-[#d8d4fe] focus-visible:ring-offset-2 ' +
    'disabled:text-[#b6bdc8]',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type="button"
      {...props}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
        'transition-all duration-200',
        'focus-visible:outline-none',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />

      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}