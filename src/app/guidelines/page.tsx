import Link from 'next/link';
import { ArrowLeft, AlertTriangle, ShieldCheck, HeartHandshake, EyeOff, Ban } from 'lucide-react';
import { Footer } from '@/components/layout/footer';

export const metadata = {
  title: 'Community Guidelines — Anon Connect',
  description: 'Anon Connect Community Guidelines, code of conduct, and safety standards.',
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-4 py-12 w-full space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        {/* Legal Review Warning Banner */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 text-xs leading-relaxed">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider text-amber-400">
              Draft Template — Needs Legal Review
            </p>
            <p className="mt-0.5 text-amber-300/80">
              These guidelines represent our platform values and moderation policies. Ensure formal review alongside legal terms.
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Community Guidelines</h1>
          <p className="text-xs text-[var(--color-muted)] mt-1">Our standard for a respectful, safe, and positive community.</p>
        </div>

        <div className="space-y-6 text-sm text-[var(--color-muted)] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-indigo-400" />
              1. Mutual Respect & Affirmative Consent
            </h2>
            <p>
              Anonymity is a privilege that fosters genuine connection, not a shield for abusive behavior. All interactions must be consensual:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Accept &ldquo;no&rdquo; gracefully. If another user declines your connection request or leaves a chat, do not evade or create alt accounts.</li>
              <li>Camera sharing is 100% voluntary. Never pressure anyone into enabling their video.</li>
              <li>Respect boundaries, diversity, and individual perspectives.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-emerald-400" />
              2. Protect Anonymity — No Doxxing
            </h2>
            <p>
              Do not solicit or post personal identifiable information (PII). Sharing another person&apos;s real name, private contact details, location, employer, or school without their explicit permission is strictly prohibited and results in an immediate permanent ban.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              3. Zero Tolerance Violations
            </h2>
            <p>The following will result in immediate permanent account termination and device restriction:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Minors & Underage Content:</strong> The platform is 18+ only. Any underage accounts or content involving minors will be reported to appropriate law enforcement authorities (including NCMEC).</li>
              <li><strong>Harassment & Hate Speech:</strong> Threats of violence, severe harassment, hate speech, racism, or discriminatory attacks.</li>
              <li><strong>Scams & Fraud:</strong> Financial solicitations, gift card requests, crypto promotions, or phishing links.</li>
              <li><strong>Non-consensual Sexual Media:</strong> Unsolicited explicit media, extortion, or &ldquo;sextortion&rdquo; schemes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
              4. Enforcement & Strikes
            </h2>
            <p>
              Our moderation team actively reviews flagged reports. Depending on severity, actions include:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Formal Warning:</strong> First-time minor infraction reminder.</li>
              <li><strong>Temporary Suspension:</strong> Account cool-down (24 hours to 30 days).</li>
              <li><strong>Permanent Ban:</strong> Permanent account termination and network fingerprint restriction.</li>
            </ul>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
