import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-[var(--color-border)] bg-[var(--color-surface)] py-8 px-4 text-xs text-[var(--color-muted)] font-mono antialiased">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Badge */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <span className="font-bold text-sm tracking-tight text-[var(--color-text)]">
            anon // connect
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-primary)] font-medium">
            18+ Verified Band
          </span>
          <p className="text-[11px] text-[var(--color-muted)] font-sans">
            Encrypted anonymous broadsheet network.
          </p>
        </div>

        {/* Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs">
          <Link href="/terms" className="hover:text-[var(--color-text)] transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-text)] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/guidelines" className="hover:text-[var(--color-text)] transition-colors">
            Community Guidelines
          </Link>
          <Link
            href="/safety"
            className="hover:text-[var(--color-text)] transition-colors flex items-center gap-1 text-emerald-500 font-medium"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Safety Center
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-[11px] text-[var(--color-muted)] text-center sm:text-right">
          &copy; {new Date().getFullYear()} Anon Connect. Peer network.
        </p>
      </div>
    </footer>
  );
}
