'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Search,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Users,
  Compass,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  Box,
  Layers,
  Inbox,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import type { Profile } from '@/lib/supabase/types';
import Link from 'next/link';
import { CallProvider } from '@/components/calls/call-provider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useRealtimeCounts } from '@/hooks/use-realtime-counts';

const CORE_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Feed' },
  { href: '/dashboard/discover', icon: Search, label: 'Discover' },
  { href: '/dashboard/nearby', icon: Compass, label: 'Nearby' },
];

const CHANNEL_ITEMS = [
  { href: '/dashboard/chat', icon: MessageCircle, label: 'Messages', badgeKey: 'unreadMessages' as const },
  { href: '/dashboard/groups', icon: Users, label: 'Squads' },
  { href: '/dashboard/discover?tab=requests', icon: Inbox, label: 'Requests', badgeKey: 'pendingRequests' as const },
];

const ACCOUNT_ITEMS = [
  { href: '/dashboard/profile', icon: User, label: 'Callsign' },
  { href: '/dashboard/safety', icon: ShieldCheck, label: 'Safety Center' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { counts: unreadCounts } = useRealtimeCounts(profile?.id ?? null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    // Check local storage for preference
    try {
      const saved = localStorage.getItem('ac_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  function toggleSidebar() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ac_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data as Profile);
    }
    loadProfile();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col md:flex-row antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Desktop Untitled UI Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] h-screen sticky top-0 shrink-0 select-none transition-[width] duration-200 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Window controls / Traffic dots header */}
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80 border border-[#e0443e]/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80 border border-[#dea123]/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80 border border-[#1aab29]/40" />
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] p-1 rounded-md hover:bg-[var(--color-surface-raised)] transition-colors"
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Brand Squircle & App Info */}
        <div className={`px-3 py-2 border-b border-[var(--color-border)] ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group"
              title="Anon Connect"
            >
              {/* Modern geometric squircle logo */}
              <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm shadow-sm shrink-0 group-hover:scale-[1.02] transition-transform">
                <Box className="w-5 h-5" strokeWidth={2.2} />
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold tracking-tight text-[var(--color-text)] truncate">
                      Anon Connect
                    </p>
                  </div>
                  <p className="text-[11px] font-mono text-[var(--color-muted)] truncate flex items-center gap-1">
                    <span>anon-grid.live</span>
                    <span className="inline-block w-1 h-1 rounded-full bg-emerald-500" />
                  </p>
                </div>
              )}
            </Link>

            {!isCollapsed && (
              <button
                type="button"
                className="text-[var(--color-muted)] hover:text-[var(--color-text)] p-1"
                aria-label="Workspace actions"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {/* CORE SECTION */}
          <div>
            {!isCollapsed && (
              <p className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)] font-medium">
                Workspace
              </p>
            )}
            <div className="space-y-0.5">
              {CORE_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center ${
                      isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'justify-between px-3 py-2'
                    } rounded-lg text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] font-semibold shadow-xs'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* CHANNELS SECTION */}
          <div>
            {!isCollapsed && (
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)] font-medium">
                  Channels
                </span>
                <Link
                  href="/dashboard/groups"
                  className="text-[var(--color-muted)] hover:text-[var(--color-text)] p-0.5 rounded"
                  title="Create Squad"
                >
                  <Plus className="h-3 w-3" />
                </Link>
              </div>
            )}
            <div className="space-y-0.5">
              {CHANNEL_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href === '/dashboard/chat' && pathname.startsWith('/dashboard/chat'));
                const badgeCount = item.badgeKey ? unreadCounts[item.badgeKey] : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`relative flex items-center ${
                      isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'justify-between px-3 py-2'
                    } rounded-lg text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] font-semibold shadow-xs'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </div>

                    {badgeCount > 0 && (
                      isCollapsed ? (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] font-semibold">
                          {badgeCount}
                        </span>
                      )
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* IDENTITY & SYSTEM SECTION */}
          <div>
            {!isCollapsed && (
              <p className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)] font-medium">
                System
              </p>
            )}
            <div className="space-y-0.5">
              {ACCOUNT_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center ${
                      isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'justify-between px-3 py-2'
                    } rounded-lg text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] font-semibold shadow-xs'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </div>
                  </Link>
                );
              })}

              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  title={isCollapsed ? 'Admin Console' : undefined}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'justify-between px-3 py-2'
                  } rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                    {!isCollapsed && <span className="font-medium">Admin Console</span>}
                  </div>
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* User Card & Footer */}
        <div className="p-3 border-t border-[var(--color-border)] space-y-2">
          {profile && (
            <div
              className={`flex items-center ${
                isCollapsed ? 'justify-center' : 'gap-2.5 px-2 py-1.5'
              } rounded-lg bg-[var(--color-surface-raised)]/70 border border-[var(--color-border)]`}
            >
              <div className="w-7 h-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xs shrink-0 select-none">
                {AVATARS[profile.avatar_url || ''] || '👤'}
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--color-text)] truncate">
                    {profile.display_name}
                  </p>
                  <p className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>active handshake</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`flex items-center ${
              isCollapsed ? 'justify-center w-10 h-8 mx-auto' : 'gap-2 w-full px-2.5 py-1.5'
            } text-xs font-mono text-[var(--color-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors`}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 pb-16 md:pb-0 overflow-y-auto">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-2.5">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-xs">
                <Box className="w-4 h-4" strokeWidth={2.2} />
              </div>
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

        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-20 safe-area-bottom font-mono">
        <div className="flex items-center justify-around py-1.5">
          {[
            { href: '/dashboard', icon: Home, label: 'Feed' },
            { href: '/dashboard/discover', icon: Search, label: 'Discover' },
            { href: '/dashboard/nearby', icon: Compass, label: 'Nearby' },
            { href: '/dashboard/groups', icon: Users, label: 'Squads' },
            { href: '/dashboard/chat', icon: MessageCircle, label: 'Messages', badgeKey: 'unreadMessages' as const },
            { href: '/dashboard/profile', icon: User, label: 'Callsign' },
          ].map((item) => {
            const isActive = pathname === item.href || (item.href === '/dashboard/chat' && pathname.startsWith('/dashboard/chat'));
            const badgeCount = item.badgeKey ? unreadCounts[item.badgeKey] : 0;

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
                  <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
