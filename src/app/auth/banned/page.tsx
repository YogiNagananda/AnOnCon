import Link from 'next/link';
import { Ban, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccountBannedPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-xl bg-[var(--color-surface)] border border-red-500/30 text-center shadow-xl space-y-5 font-mono">
        <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
          <Ban className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-red-500 font-semibold">
            ACCESS TERMINATED
          </span>
          <h1 className="text-lg font-bold text-[var(--color-text)] font-sans">
            Callsign Suspended or Banned
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] font-sans leading-relaxed">
            Your access has been terminated due to serious violation of our{' '}
            <Link href="/guidelines" className="text-[var(--color-primary)] hover:underline">
              Community Guidelines
            </Link>{' '}
            or 18+ Terms of Service.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-left text-xs text-[var(--color-text-secondary)] space-y-1.5 font-sans">
          <div className="flex items-start gap-2 text-amber-500 font-mono text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-semibold">Zero-Tolerance Mandate</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Minor accounts, harassment, dtxing, and scam operations are permanently barred. Device signatures have been logged.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Link href="/safety" className="block">
            <Button size="sm" variant="outline" className="w-full text-xs font-mono h-8">
              Review Safety Center
            </Button>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-mono text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
