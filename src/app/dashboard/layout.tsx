'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, MessageCircle, User, Settings, Bell, LogOut, Users, Compass } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, Suspense } from 'react';
import type { Profile } from '@/lib/supabase/types';
import Link from 'next/link';
import { CallProvider } from '@/components/calls/call-provider';

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/discover', icon: Search, label: 'Discover' },
  { href: '/dashboard/nearby', icon: Compass, label: 'Nearby' },
  { href: '/dashboard/groups', icon: Users, label: 'Groups' },
  { href: '/dashboard/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data as Profile);

      // Load notification counts
      try {
        const res = await fetch('/api/notifications/counts');
        const countData = await res.json();
        if (res.ok) setUnreadCounts(countData);
      } catch { }
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
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] h-screen sticky top-0">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">🔮 Anon Connect</h1>
        </div>

        {/* User info */}
        {profile && (
          <div className="p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xl">
                {AVATARS[profile.avatar_url || ''] || '👤'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">{profile.display_name}</p>
                <p className="text-xs text-[var(--color-muted)]">Online</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(item => {
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
                className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors
                  ${pathname === item.href
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-r-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
                {badgeCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-primary)] text-white">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
              ${pathname === '/settings'
                ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
              }`}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]">
          <button onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-xl transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-16 md:pb-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-10 bg-[var(--color-bg)]/80 backdrop-blur-lg border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-lg font-bold text-[var(--color-primary)]">🔮 Anon Connect</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-[var(--color-surface)] text-[var(--color-muted)]">
                <Bell className="h-5 w-5" />
              </button>
              <Link href="/settings" className="p-2 rounded-full hover:bg-[var(--color-surface)] text-[var(--color-muted)]">
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </header>

        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-10 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map(item => {
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
                className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors
                  ${pathname === item.href
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
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
