'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Search,
  MessageCircle,
  User,
  Settings,
  Bell,
  LogOut,
  Users,
  Compass,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, Suspense } from 'react';
import type { Profile } from '@/lib/supabase/types';
import Link from 'next/link';
import { CallProvider } from '@/components/calls/call-provider';

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Feed' },
  { href: '/dashboard/discover', icon: Search, label: 'Discover' },
  { href: '/dashboard/nearby', icon: Compass, label: 'Nearby' },
  { href: '/dashboard/groups', icon: Users, label: 'Squads' },
  { href: '/dashboard/chat', icon: MessageCircle, label: 'Messages' },
  { href: '/dashboard/profile', icon: User, label: 'Callsign' },
];

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadCounts, setUnreadCounts] = useState({ pendingRequests: 0, unreadMessages: 0 });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data as Profile);

      try {
        const res = await fetch('/api/notifications/counts');
        const countData = await res.json();
        if (res.ok) setUnreadCounts(countData);
      } catch {}
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col md:flex-row antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-[var(--color-border)] bg-[var(--color-surface)] h-screen sticky top-0 shrink-0 select-none">
        {/* Brand header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            <span className="font-mono text-sm font-bold tracking-tight text-[var(--color-text)]">
              anon // connect
            </span>
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-muted)] px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            18+
          </span>
        </div>

        {/* User Identity card */}
        {profile && (
          <div className="p-3 mx-3 my-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-sm shrink-0">
              {AVATARS[profile.avatar_url || ''] || '👤'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--color-text)] truncate">
                {profile.display_name}
              </p>
              <p className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>active band</span>
              </p>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 font-mono text-xs">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const badgeCount =
              item.href === '/dashboard/discover'
                ? unreadCounts.pendingRequests
                : item.href === '/dashboard/chat'
                ? unreadCounts.unreadMessages
                : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] font-semibold border border-[var(--color-border)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {badgeCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[var(--color-primary)] text-white">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-2 mt-2 border-t border-[var(--color-border)] space-y-0.5">
            <Link
              href="/dashboard/safety"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                pathname === '/dashboard/safety'
                  ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] font-semibold border border-[var(--color-border)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]/60'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Safety Center</span>
            </Link>
            <Link
              href="/settings"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                pathname === '/settings'
                  ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] font-semibold border border-[var(--color-border)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]/60'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
            {profile?.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>
        </nav>

        {/* Footer sign out */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-mono text-[var(--color-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 pb-16 md:pb-0 overflow-y-auto">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-2.5">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
              <span className="font-mono text-sm font-bold tracking-tight text-[var(--color-text)]">
                anon // connect
              </span>
            </Link>

            <div className="flex items-center gap-1 font-mono text-xs">
              <Link
                href="/settings"
                className="p-1.5 rounded text-[var(--color-muted)] hover:text-[var(--color-text)]"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-20 safe-area-bottom font-mono">
        <div className="flex items-center justify-around py-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const badgeCount =
              item.href === '/dashboard/discover'
                ? unreadCounts.pendingRequests
                : item.href === '/dashboard/chat'
                ? unreadCounts.unreadMessages
                : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 py-1 px-2.5 rounded transition-colors ${
                  isActive
                    ? 'text-[var(--color-primary)] font-medium'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
      <CallProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </CallProvider>
    </Suspense>
  );
}
