import Link from 'next/link';
import { Shield, MessageSquare, Radio, Phone, Users, Lock, Compass } from 'lucide-react';
import { Footer } from '@/components/layout/footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <span className="font-semibold text-sm tracking-tight">Anon Connect</span>
            <span className="hidden sm:inline-block text-[11px] font-mono text-[var(--color-muted)] px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
              18+ verified
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
            >
              Create profile
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-12 gap-10 items-center">
          {/* Left Column: Copy */}
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
              <span>no real names • zero tracking • 18+ only</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.12]">
              Anonymous campus conversations.
            </h1>

            <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
              Find peers by mutual interest, exchange connection requests, and speak freely over voice calls or geofenced event zones without exposing phone numbers, real names, or exact locations.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/auth/signup"
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
              >
                Join with anonymous handle
              </Link>
              <Link
                href="/safety"
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] transition-colors"
              >
                Safety & trust standards
              </Link>
            </div>
          </div>

          {/* Right Column: Tactile Product Preview Moment */}
          <div className="md:col-span-5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] text-xs font-mono text-[var(--color-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>active node</span>
                </span>
                <span>band // 100m–500m</span>
              </div>

              {/* Sample Profile Card */}
              <div className="p-4 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center font-mono text-xs font-medium text-[var(--color-text)]">
                      #8F4B
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--color-text)]">nocturne_99</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)]">
                          21–24
                        </span>
                      </div>
                      <span className="text-xs text-[var(--color-muted)]">Architecture & late-night radio</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Working on campus studio models. Up for quiet coffee runs or discussion on spatial acoustics.
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)]">
                    #design
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)]">
                    #ambient
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)]">
                    #night-owl
                  </span>
                </div>
              </div>

              {/* Security indicators */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[var(--color-muted)]">
                <div className="p-2 rounded-lg bg-[var(--color-surface-raised)]/60 border border-[var(--color-border)] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                  <span>24h link shield active</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--color-surface-raised)]/60 border border-[var(--color-border)] flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-emerald-500" />
                  <span>fuzzed ~110m grid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-16 md:py-20 border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="max-w-xl mb-10 space-y-2">
            <h2 className="text-xl sm:text-2xl font-medium tracking-tight">Built for anonymity from day one</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Every interaction is engineered around zero-leakage identity and mutual consent.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text)]">
                <Shield className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-medium">Double-blind requests</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Send a 140-character note. You can only chat after the recipient explicitly accepts your invitation.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text)]">
                <Phone className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-medium">Audio first, mutual video</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Calls begin as voice only. Cameras remain completely disabled until both members independently opt in.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text)]">
                <Compass className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-medium">Fuzzed campus zones</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Raw coordinates are snapped to a ~110m grid. Proximity displays as distance bands only and auto-clears.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Callout */}
      <section className="py-12 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-base font-medium">Ready to join the campus network?</h3>
            <p className="text-xs text-[var(--color-muted)]">
              Sign up takes 30 seconds. Requires date-of-birth confirmation for 18+ verification.
            </p>
          </div>
          <Link
            href="/auth/signup"
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity shrink-0"
          >
            Create account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
