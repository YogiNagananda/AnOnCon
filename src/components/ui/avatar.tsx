'use client';

import Image from 'next/image';

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-xl',
} as const;

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
  isOnline?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(/[\s_]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({
  src,
  alt = '',
  name = '?',
  size = 'md',
  className = '',
  isOnline,
}: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt || name}
          fill
          className={`rounded-full object-cover ${sizeClasses[size]}`}
          sizes={size === 'xl' ? '80px' : size === 'lg' ? '56px' : size === 'md' ? '40px' : '32px'}
        />
      ) : (
        <div
          className={`flex items-center justify-center rounded-full bg-[var(--color-primary)] font-semibold text-white ${sizeClasses[size]}`}
        >
          {initials}
        </div>
      )}
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full border-2 border-[var(--color-bg)] ${
            isOnline ? 'bg-green-500' : 'bg-[var(--color-muted)]'
          } ${size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'}`}
        />
      )}
    </div>
  );
}
