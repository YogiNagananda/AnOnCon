import Link from 'next/link';
import { Shield, MessageCircle, Users, MapPin, Phone, Eye } from 'lucide-react';
import { Footer } from '@/components/layout/footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]" />
            </span>
            18+ Anonymous Social Platform
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-[var(--color-text)] leading-tight">
            Connect{' '}
            <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
              Anonymously
            </span>
          </h1>

          <p className="mt-4 text-lg md:text-xl text-[var(--color-muted)] max-w-2xl mx-auto">
            Chat, call, and connect with people around the world — without revealing who you are.
            Your privacy is our priority.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-medium rounded-xl text-base transition-colors"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center px-8 py-3 border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text)] font-medium rounded-xl text-base transition-colors"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text)] text-center mb-12">
          Everything you need to connect safely
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Eye,
              title: 'Anonymous Profiles',
              desc: 'Pick a fun display name and avatar. Your real identity stays hidden.',
            },
            {
              icon: MessageCircle,
              title: 'Real-time Chat',
              desc: 'Send messages instantly with typing indicators and read receipts.',
            },
            {
              icon: Phone,
              title: 'Voice & Video Calls',
              desc: 'Talk face-to-face or voice-only. Every call needs consent from both sides.',
            },
            {
              icon: Users,
              title: 'Group Chats',
              desc: 'Create or join groups around shared interests. Up to 200 members.',
            },
            {
              icon: MapPin,
              title: 'Nearby Mode',
              desc: 'Find people around you at events or on campus. Location is always fuzzy.',
            },
            {
              icon: Shield,
              title: 'Safety First',
              desc: 'Block, report, and content filters keep the community safe.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-primary)]/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-5xl mx-auto px-4 pb-16 md:pb-24">
        <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 border border-[var(--color-primary)]/20 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">Ready to connect?</h2>
          <p className="mt-2 text-[var(--color-muted)]">Join thousands of anonymous users today.</p>
          <Link
            href="/auth/signup"
            className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-medium rounded-xl text-base transition-colors"
          >
            Create Your Anonymous Profile
          </Link>
        </div>
      </div>

      {/* Universal Footer */}
      <Footer />
    </div>
  );
}
