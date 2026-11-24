'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, Shield, X, Loader2, Radio, Compass, Users } from 'lucide-react';
import type { Profile } from '@/lib/supabase/types';
import Link from 'next/link';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSafetyTips, setShowSafetyTips] = useState(true);
  const [stats, setStats] = useState({ connections: 0, pending: 0 });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profileRaw } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      const profileData = profileRaw as Profile | null;

      if (!profileData || !profileData.display_name) {
        router.push('/onboarding');
        return;
      }

      setProfile(profileData);

      const { count: acceptedCount } = await supabase
        .from('connection_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const { count: pendingCount } = await supabase
        .from('connection_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('receiver_id', user.id);

      setStats({
        connections: acceptedCount || 0,
        pending: pendingCount || 0,
      });

      setLoading(false);
    }
    load();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] font-mono text-xs text-[var(--color-muted)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)] mb-2" />
        <p>Tuning receiver...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Callsign banner */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-2xl shrink-0 select-none">
            {AVATARS[profile?.avatar_url || ''] || '👤'}
          </div>
          <div className="min-w-0">
            <span className="font-mono text-[10px] text-[var(--color-primary)] uppercase tracking-wider block">
              // ACTIVE BROADSHEET CALLSIGN
            </span>
            <h2 className="text-base font-bold text-[var(--color-text)] truncate">
              {profile?.display_name}
            </h2>
            <p className="text-xs font-mono text-[var(--color-muted)] mt-0.5">
              18+ verified peer band // Encrypted transport
            </p>
          </div>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 gap-3 font-mono">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-text)]">{stats.connections}</p>
          <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">
            Confirmed Links
          </p>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.pending}</p>
          <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">
            Pending Signals
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="space-y-2.5">
        <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--color-muted)] font-semibold">
          Channels & Bands
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
          <Link
            href="/dashboard/discover"
            className="flex flex-col items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors group text-center"
          >
            <Search className="h-5 w-5 text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
            <span className="font-semibold text-[var(--color-text)]">Discover</span>
            <span className="text-[10px] text-[var(--color-muted)]">Peer directory</span>
          </Link>

          <Link
            href="/dashboard/nearby"
            className="flex flex-col items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors group text-center"
          >
            <Compass className="h-5 w-5 text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
            <span className="font-semibold text-[var(--color-text)]">Nearby</span>
            <span className="text-[10px] text-[var(--color-muted)]">Vicinity radar</span>
          </Link>

          <Link
            href="/dashboard/groups"
            className="flex flex-col items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors group text-center"
          >
            <Users className="h-5 w-5 text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
            <span className="font-semibold text-[var(--color-text)]">Squads</span>
            <span className="text-[10px] text-[var(--color-muted)]">Campus circles</span>
          </Link>

          <Link
            href="/dashboard/chat"
            className="flex flex-col items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors group text-center"
          >
            <MessageCircle className="h-5 w-5 text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
            <span className="font-semibold text-[var(--color-text)]">Messages</span>
            <span className="text-[10px] text-[var(--color-muted)]">1:1 channels</span>
          </Link>
        </div>
      </div>

      {/* Safety Notice Banner */}
      {showSafetyTips && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 relative font-mono text-xs text-amber-500">
          <button
            type="button"
            onClick={() => setShowSafetyTips(false)}
            className="absolute top-3 right-3 text-amber-500/60 hover:text-amber-500"
            aria-label="Dismiss tips"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-semibold uppercase tracking-wider text-xs">
                Campus Safety Protocol
              </h4>
              <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)] font-sans">
                <li>• Never share personal contact info, phone, address, or student IDs.</li>
                <li>• Never transfer money, deposits, or financial details.</li>
                <li>• Report any unsolicited harassment or suspicious behavior immediately.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
