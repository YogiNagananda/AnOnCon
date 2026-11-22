'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Search, Users, MessageCircle, Shield, X, Loader2, Sparkles } from 'lucide-react';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

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

      // Get connection stats
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 border border-[var(--color-primary)]/20 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-3xl">
            {AVATARS[profile?.avatar_url || ''] || '👤'}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Welcome, {profile?.display_name}! 👋</h2>
            <p className="text-sm text-[var(--color-muted)]">Ready to meet new people?</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.connections}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Connections</p>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Pending Requests</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/discover"
            className="flex flex-col items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-primary)] transition-all group">
            <Search className="h-6 w-6 text-[var(--color-muted)] group-hover:text-[var(--color-primary)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">Discover</span>
            <span className="text-xs text-[var(--color-muted)]">Find new people</span>
          </Link>
          <Link href="/dashboard/chat"
            className="flex flex-col items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-primary)] transition-all group">
            <MessageCircle className="h-6 w-6 text-[var(--color-muted)] group-hover:text-[var(--color-primary)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">Chats</span>
            <span className="text-xs text-[var(--color-muted)]">Your conversations</span>
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {stats.connections === 0 && (
        <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center">
          <Sparkles className="h-12 w-12 text-[var(--color-primary)] mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-semibold text-[var(--color-text)]">No connections yet</h3>
          <p className="text-sm text-[var(--color-muted)] mt-1 mb-4">Start discovering people and send your first connection request!</p>
          <Button onClick={() => router.push('/dashboard/discover')}>
            <Search className="mr-2 h-4 w-4" /> Start Discovering
          </Button>
        </div>
      )}

      {/* Safety Tips */}
      {showSafetyTips && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 relative">
          <button onClick={() => setShowSafetyTips(false)}
            className="absolute top-3 right-3 text-amber-400/60 hover:text-amber-400">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-400">Safety Tips</h4>
              <ul className="mt-2 space-y-1 text-xs text-[var(--color-muted)]">
                <li>• Never share personal information (real name, address, phone)</li>
                <li>• Don&apos;t send money to people you meet online</li>
                <li>• Report any suspicious or harmful behavior</li>
                <li>• Be cautious about meeting in person</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
