import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  AlertTriangle,
  UserX,
  Flag,
  HelpCircle,
  ExternalLink,
  PhoneCall,
  HeartHandshake,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { Footer } from '@/components/layout/footer';

export const metadata = {
  title: 'Safety Center — Anon Connect',
  description: 'How Anon Connect protects your privacy, identity, and trust across anonymous campus channels.',
};

export default function SafetyCenterPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col justify-between antialiased selection:bg-[var(--color-primary)] selection:text-white">
      <div>
        {/* Hero */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] py-12 px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
            </Link>

            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-primary)] font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Campus Safety & Moderation Protocol</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text)]">
              Safety Architecture & Privacy Rules
            </h1>

            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
              Anon Connect is engineered for candid, adult peer connections. We enforce cryptographic pseudonymity, zero exact location tracking, and strict 18+ boundaries.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">
          {/* Core Principles */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-primary)] uppercase tracking-wider">
              <Lock className="h-4 w-4" />
              <span>Foundational Protections</span>
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              Core Technical Guarantees
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] mb-2">
                  <EyeOff className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--color-text)]">
                  Cryptographic Pseudonymity
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Real names, student IDs, phone numbers, and IP addresses are completely isolated from peer broadcasts. You operate under a chosen callsign.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-amber-500 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--color-text)]">
                  Strict 18+ Verification Gate
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Minors are legally barred from the platform. Any account reported with the trigger &ldquo;appears under 18&rdquo; is automatically frozen immediately.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-emerald-500 mb-2">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--color-text)]">
                  24-Hour Contact Shield
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  To prevent phishing and grooming, external URLs, phone numbers, and email patterns are intercepted and blocked during the initial 24 hours of any handshake.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] mb-2">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--color-text)]">
                  Mutual Camera Opt-In
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Audio calls connect with video completely disabled by default. Both participants must explicitly opt in before camera feeds exchange video packets.
                </p>
              </div>
            </div>
          </section>

          {/* User Controls */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-primary)] uppercase tracking-wider">
              <HelpCircle className="h-4 w-4" />
              <span>Active Safeguards</span>
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              How to Enforce Your Boundaries
            </h2>

            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <UserX className="h-4 w-4" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-sm text-[var(--color-text)]">
                    Blocking a Peer
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    Tap the shield icon or menu dots on any user card or chat header and select &ldquo;Block Peer&rdquo;.
                  </p>
                  <p className="text-[11px] font-mono text-[var(--color-muted)] pt-1">
                    Blocked peers cannot transmit signals to you, view your profile, see your vicinity presence, or initiate calls. They receive no notification of the block.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Flag className="h-4 w-4" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-sm text-[var(--color-text)]">
                    Filing a Moderation Report
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    Select the flag icon from any conversation, profile, or squad message. Choose a reason category (Harassment, Minor Suspicion, Sexual Misconduct, Scam).
                  </p>
                  <p className="text-[11px] font-mono text-[var(--color-muted)] pt-1">
                    Every report logs cryptographic context into the moderation queue for human administrative review.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Crisis Resources */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs text-rose-500 uppercase tracking-wider">
              <HeartHandshake className="h-4 w-4" />
              <span>External Support</span>
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              Crisis & Helpline Resources
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              If you or another student is facing distress, harassment, or crisis, free and confidential support is accessible around the clock:
            </p>

            <div className="grid sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <p className="font-semibold text-[var(--color-text)] font-sans">
                  Crisis Text Line
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Text HOME to 741741 (US / UK / CA)
                </p>
              </div>

              <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <p className="font-semibold text-[var(--color-text)] font-sans">
                  988 Suicide & Crisis Lifeline
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Call or text 988 (Free, 24/7)
                </p>
              </div>

              <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <p className="font-semibold text-[var(--color-text)] font-sans">
                  National Sexual Assault Hotline (RAINN)
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  1-800-656-4673 (rainn.org)
                </p>
              </div>

              <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <p className="font-semibold text-[var(--color-text)] font-sans">
                  iCall Psychological Helpline (India)
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  +91 9152987821 (Mon–Sat, 10am–8pm)
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
