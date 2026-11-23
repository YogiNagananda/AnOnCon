import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Footer } from '@/components/layout/footer';

export const metadata = {
  title: 'Privacy Policy — Anon Connect',
  description: 'Anon Connect Privacy Policy and data protection overview.',
};

export default function PrivacyPolicyPage() {
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
              This privacy policy outline is designed for technical data flow transparency and must be reviewed by privacy counsel before full public deployment.
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-[var(--color-muted)] mt-1">Last Updated: November 2026</p>
        </div>

        <div className="space-y-6 text-sm text-[var(--color-muted)] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">1. Data Minimization by Design</h2>
            <p>
              Anon Connect is built on the principle of data minimization. We only collect the minimal information necessary to deliver the service and verify adult age eligibility. We do not sell your personal data or sell targeted advertising based on your private conversations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">2. Ephemeral Location Fuzzing & Nearby Privacy</h2>
            <p>
              When you opt in to Nearby Mode, your real coordinates are never stored in raw form and never revealed to other users. Coordinates are snapped server-side to a coarse regional grid block and jittered with pseudo-random hourly shifts to prevent triangulation.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Other users only see coarse distance bands (&ldquo;within 100 m&rdquo;, &ldquo;within 500 m&rdquo;, &ldquo;within 1 km&rdquo;). Exact meters and GPS points are stripped before transmission.</li>
              <li>We store zero location history: only the latest presence record is kept.</li>
              <li>Your presence record is permanently purged when you turn Nearby Mode off, sign out, or after 30 minutes of inactivity.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">3. Audio & Video Calls</h2>
            <p>
              Calls are powered via WebRTC (LiveKit). Media streams flow in encrypted peer-to-peer or selective forwarding media tracks and are not recorded or persisted on our servers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">4. Security & Bot Prevention</h2>
            <p>
              We protect our signup and login endpoints against automated credential stuffing and malicious bots using Cloudflare Turnstile, cryptographic IP hashing, and rate limiting. Flagged violation fingerprints are stored as hashes to prevent re-registration by permanently banned malicious entities.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">5. Your Data Rights & Deletion</h2>
            <p>
              You may clear your chat history or delete your account at any time from your Account Settings. Upon account deletion, your profile, active presences, and credentials are permanently purged from our primary database.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
