import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Authentication — Anon Connect',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)] px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <span className="font-semibold text-base tracking-tight text-[var(--color-text)]">
              Anon Connect
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[11px] font-mono text-[var(--color-muted)]">
            <ShieldCheck className="h-3 w-3 text-[var(--color-accent)]" />
            <span>18+ verified campus network</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7 shadow-xs">
          {children}
        </div>

        {/* Footer Meta */}
        <div className="text-center text-xs text-[var(--color-muted)] space-y-1">
          <p>
            By continuing, you confirm you are 18 or older and agree to our{' '}
            <Link href="/terms" className="text-[var(--color-text)] underline underline-offset-2 hover:opacity-80">
              Terms
            </Link>{' '}
            &{' '}
            <Link href="/privacy" className="text-[var(--color-text)] underline underline-offset-2 hover:opacity-80">
              Privacy
            </Link>
            .
          </p>
          <p>
            Questions on trust? Visit the{' '}
            <Link href="/safety" className="text-[var(--color-accent)] hover:underline font-medium">
              Safety Center
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
