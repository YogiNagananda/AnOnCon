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
} from 'lucide-react';

export const metadata = {
  title: 'Safety Center — Anon Connect',
  description: 'Learn how Anon Connect protects your privacy and identity, and discover community safety resources.',
};

export default function SafetyCenterPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Hero */}
      <div className="relative border-b border-[var(--color-border)] bg-gradient-to-b from-indigo-950/30 via-slate-900/20 to-transparent py-14 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" /> Safety Center & Trust Guidelines
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Your Privacy & Safety Are Our Top Priority
          </h1>
          <p className="text-base text-[var(--color-muted)] max-w-2xl mx-auto">
            Anon Connect was created to provide a safe, respectful, and anonymous environment for adults to connect. Here is how we protect you.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Core Principles */}
        <section className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Lock className="h-5 w-5 text-[var(--color-primary)]" />
            Core Privacy Principles
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2">
                <EyeOff className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">100% Anonymous Identity</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                We never display your real name, phone number, email address, or exact location. You interact only through your chosen handle and avatar emoji.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">Strict 18+ Verification</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Minors are strictly prohibited. Any account reported with the reason &ldquo;appears under 18&rdquo; is automatically suspended immediately pending moderator review.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">24-Hour Link Shield</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                To prevent scams, phishing, and off-platform grooming, external links, phone numbers, and emails are blocked for the first 24 hours of every new connection.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-2">
                <PhoneCall className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">Mutual Video Consent</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                During calls, video is completely disabled by default. Both participants must independently opt in before cameras become visible.
              </p>
            </div>
          </div>
        </section>

        {/* Step-by-Step Guides */}
        <section className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-400" />
            How to Protect Yourself on Anon Connect
          </h2>

          <div className="space-y-4">
            {/* Blocking */}
            <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
                  <UserX className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">How to Block a User</h3>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                    If someone makes you uncomfortable or violates your boundaries, you can block them instantly:
                  </p>
                  <ol className="list-decimal list-inside text-xs text-[var(--color-text)] space-y-1 pl-1">
                    <li>Open the conversation or user card.</li>
                    <li>Tap the <strong>three dots (&hellip;)</strong> or shield menu at the top right.</li>
                    <li>Select <strong>&ldquo;Block User&rdquo;</strong> and confirm.</li>
                  </ol>
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    When blocked, they cannot send you messages, view your profile, see you nearby, or request calls. They are not notified that they were blocked.
                  </p>
                </div>
              </div>
            </div>

            {/* Reporting */}
            <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                  <Flag className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">How to Report Inappropriate Content</h3>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                    Our moderation team reviews reports 24/7. To report someone:
                  </p>
                  <ol className="list-decimal list-inside text-xs text-[var(--color-text)] space-y-1 pl-1">
                    <li>Click the <strong>Flag / Report</strong> button on the user profile or in chat.</li>
                    <li>Select the violation reason (e.g., Harassment, Appears Under 18, Sexual Content, Scam).</li>
                    <li>Optionally provide details to assist our moderation review team.</li>
                    <li>Click <strong>Submit Report</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Emergency & Crisis Support Helplines */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-rose-400" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Helplines & Crisis Resources</h2>
              <p className="text-xs text-[var(--color-muted)]">
                If you or someone you know is in immediate danger or in crisis, free and confidential support is available:
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href="https://988lifeline.org"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500/40 transition-colors group block"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-[var(--color-text)] group-hover:text-indigo-400">
                  988 Suicide & Crisis Lifeline
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400" />
              </div>
              <p className="text-xs text-[var(--color-muted)]">Call or text 988 (USA/Canada) • Free 24/7 support</p>
            </a>

            <a
              href="https://www.crisistextline.org"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500/40 transition-colors group block"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-[var(--color-text)] group-hover:text-indigo-400">
                  Crisis Text Line
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400" />
              </div>
              <p className="text-xs text-[var(--color-muted)]">Text HOME to 741741 to connect with a crisis counselor</p>
            </a>

            <a
              href="https://www.rainn.org"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500/40 transition-colors group block"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-[var(--color-text)] group-hover:text-indigo-400">
                  RAINN National Sexual Assault Hotline
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400" />
              </div>
              <p className="text-xs text-[var(--color-muted)]">Call 1-800-656-4673 or chat online at rainn.org</p>
            </a>

            <a
              href="https://www.thetrevorproject.org"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500/40 transition-colors group block"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-[var(--color-text)] group-hover:text-indigo-400">
                  The Trevor Project (LGBTQ Crisis Support)
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400" />
              </div>
              <p className="text-xs text-[var(--color-muted)]">Call 1-866-488-7386 or text START to 678-678</p>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
