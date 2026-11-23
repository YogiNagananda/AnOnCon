import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-[var(--color-border)] bg-[var(--color-surface)] py-8 px-4 text-xs text-[var(--color-muted)]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Badge */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <span className="font-bold text-sm text-[var(--color-primary)]">🔮 Anon Connect</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-[10px]">
            18+ Adults Only
          </span>
          <p className="text-[11px] text-[var(--color-muted)]">
            Privacy-first anonymous connections.
          </p>
        </div>

        {/* Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/terms" className="hover:text-[var(--color-text)] transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-text)] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/guidelines" className="hover:text-[var(--color-text)] transition-colors">
            Community Guidelines
          </Link>
          <Link href="/safety" className="hover:text-[var(--color-text)] transition-colors flex items-center gap-1 text-emerald-400/90 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Safety Center
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-[11px] text-[var(--color-muted)] text-center sm:text-right">
          &copy; {new Date().getFullYear()} Anon Connect. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
