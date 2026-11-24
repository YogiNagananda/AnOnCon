'use client';

import Link from 'next/link';
import { Search, Radio, Shield, Users, Compass, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatEmptyPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--color-bg)] bg-topo-pattern relative select-none">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Decorative Radar Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shadow-sm">
          <Radio className="w-8 h-8 text-[var(--color-primary)] opacity-80" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-pulse border-2 border-[var(--color-surface)]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Encrypted Frequency Logs
          </h2>
          <p className="text-xs text-[var(--color-muted)] font-mono leading-relaxed max-w-sm mx-auto">
            Select an active conversation on the left to transmit messages, or tune into new signals in the directory.
          </p>
        </div>

        {/* Quick discovery shortcuts */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/dashboard/discover"
            className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all text-left group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text)] mb-1">
              <span>Directory</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--color-muted)] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[var(--color-muted)] font-mono">
              Find peers by topic
            </p>
          </Link>

          <Link
            href="/dashboard/nearby"
            className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all text-left group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text)] mb-1">
              <span>Nearby</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--color-muted)] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[var(--color-muted)] font-mono">
              College fest zone
            </p>
          </Link>
        </div>

        {/* Security badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-muted)]">
          <Shield className="w-3 h-3 text-emerald-500" />
          <span>18+ verified • E2E encrypted anonymous transport</span>
        </div>
      </div>
    </div>
  );
}
