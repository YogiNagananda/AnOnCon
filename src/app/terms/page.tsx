import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Footer } from '@/components/layout/footer';

export const metadata = {
  title: 'Terms of Service — Anon Connect',
  description: 'Anon Connect Terms of Service and user agreement.',
};

export default function TermsOfServicePage() {
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
              This document is a functional draft prepared for technical compliance and must be reviewed and customized by qualified legal counsel prior to commercial launch.
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="text-xs text-[var(--color-muted)] mt-1">Last Updated: November 2026</p>
        </div>

        <div className="space-y-6 text-sm text-[var(--color-muted)] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">1. Strict 18+ Age Requirement</h2>
            <p>
              Anon Connect is strictly intended for individuals who are at least eighteen (18) years of age. By creating an account or using the service, you represent and warrant that you are 18 or older. Any account suspected of being operated by or involving a minor will be immediately and permanently terminated without notice.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">2. Anonymous Service & Identity Conduct</h2>
            <p>
              Anon Connect is designed to enable anonymous social interactions. You agree not to attempt to de-anonymize, dox, stalk, harass, or triangulate the real-world identity or physical location of other users. You agree not to share another person&apos;s personal identifiable information (PII) without their consent.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">3. Prohibited Content & Behavior</h2>
            <p>You agree not to transmit, post, or solicit:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Any content depicting, describing, or promoting child sexual exploitation or abuse (CSAE/CSAM).</li>
              <li>Hate speech, racism, slurs, or harassment targeting protected groups or individuals.</li>
              <li>Commercial spam, phishing links, malware, cryptocurrency promotions, or financial fraud.</li>
              <li>Unsolicited non-consensual sexual media or extortion schemes.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">4. Automated Moderation & Account Sanctions</h2>
            <p>
              We employ automated server-side content filters, bad-word filtering, connection age restrictions (such as blocking external links and contact numbers during the first 24 hours of connection), and administrative moderation. We reserve the right to suspend, terminate, or ban any account, and revoke active sessions at our sole discretion.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">5. Audio & Video Calling Consent</h2>
            <p>
              Voice and video calling requires mutual affirmative consent. Both parties must independently opt in to camera transmission before video streams become visible. You agree not to record or screenshot private calls without the explicit consent of the other participant.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">6. Disclaimer of Warranties & Limitation of Liability</h2>
            <p>
              The service is provided &ldquo;AS IS&rdquo; without warranties of any kind. To the maximum extent permitted by applicable law, Anon Connect shall not be liable for any indirect, incidental, or punitive damages arising from your use of or inability to use the service.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
