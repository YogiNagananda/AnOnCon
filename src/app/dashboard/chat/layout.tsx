'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  MessageCircle,
  Plus,
  Radio,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  Inbox,
  UserCheck,
  Check,
  CheckCheck,
} from 'lucide-react';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

interface ChatItem {
  id: string;
  otherUser: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    is_online?: boolean;
    last_seen_at?: string | null;
  };
  lastMessage: {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    read_at?: string | null;
    is_deleted?: boolean;
  } | null;
  unreadCount: number;
  updated_at: string;
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');

  const isDetailPage = pathname.startsWith('/dashboard/chat/') && pathname !== '/dashboard/chat';

  async function loadChats() {
    try {
      const res = await fetch('/api/chats');
      const data = await res.json();
      if (res.ok) {
        setChats(data.chats || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      const matchesSearch = c.otherUser?.display_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === 'unread') return c.unreadCount > 0;
      return true;
    });
  }, [chats, searchQuery, filterType]);

  const pinnedChats = filteredChats.slice(0, 2);
  const regularChats = filteredChats.slice(2);

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Middle Pane: Conversations List */}
      <aside
        className={`${
          isDetailPage ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-80 lg:w-88 border-r border-[var(--color-border)] bg-[var(--color-surface)] h-full shrink-0 select-none`}
      >
        {/* Header matching Image 2 */}
        <div className="p-4 border-b border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setFilterType((prev) => (prev === 'all' ? 'unread' : 'all'))}
              className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <span>{filterType === 'all' ? 'ALL CHATS' : 'UNREAD ONLY'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <Link
              href="/dashboard/discover"
              className="p-1 rounded-md text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors"
              title="Tune into Directory"
            >
              <Plus className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
              Messages <span className="text-[var(--color-muted)] text-base font-normal">({chats.length})</span>
            </h1>
          </div>

          {/* Search Pill */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text)]"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 font-mono text-xs text-[var(--color-muted)]">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)] mb-2" />
              <p>Scanning channels...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3 font-mono">
              <Radio className="w-8 h-8 text-[var(--color-muted)] mx-auto opacity-40" />
              <p className="text-xs text-[var(--color-text)] font-semibold">
                {searchQuery ? 'No matching peers' : 'No active messages'}
              </p>
              <p className="text-[11px] text-[var(--color-muted)]">
                Connect with anonymous peers in Discover or Squads.
              </p>
              <Link
                href="/dashboard/discover"
                className="inline-block px-3 py-1.5 text-xs font-mono rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              >
                Find Peers
              </Link>
            </div>
          ) : (
            <>
              {/* PINNED SECTION */}
              {pinnedChats.length > 0 && (
                <div>
                  <p className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)] font-semibold">
                    Pinned
                  </p>
                  <div className="space-y-1">
                    {pinnedChats.map((chat) => (
                      <ConversationCard
                        key={chat.id}
                        chat={chat}
                        isActive={pathname === `/dashboard/chat/${chat.id}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ALL MESSAGES SECTION */}
              {regularChats.length > 0 && (
                <div>
                  <p className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)] font-semibold">
                    All Messages
                  </p>
                  <div className="space-y-1">
                    {regularChats.map((chat) => (
                      <ConversationCard
                        key={chat.id}
                        chat={chat}
                        isActive={pathname === `/dashboard/chat/${chat.id}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Right Stream / Detail */}
      <main
        className={`${
          isDetailPage ? 'flex' : 'hidden md:flex'
        } flex-1 min-w-0 h-full overflow-hidden flex-col`}
      >
        {children}
      </main>
    </div>
  );
}

function ConversationCard({
  chat,
  isActive,
}: {
  chat: ChatItem;
  isActive: boolean;
}) {
  const emoji = AVATARS[chat.otherUser?.avatar_url || ''] || '👤';
  const hasUnread = chat.unreadCount > 0;
  const timeStr = chat.lastMessage?.created_at
    ? new Date(chat.lastMessage.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Link
      href={`/dashboard/chat/${chat.id}`}
      className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
        isActive
          ? 'bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-xs'
          : 'hover:bg-[var(--color-surface-raised)]/60'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Squircle Avatar with Online Dot */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-lg select-none shadow-xs">
            {emoji}
          </div>
          {chat.otherUser?.is_online && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-surface)]" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-xs truncate ${
                hasUnread || isActive
                  ? 'font-bold text-[var(--color-text)]'
                  : 'font-semibold text-[var(--color-text)]'
              }`}
            >
              {chat.otherUser?.display_name || 'Anonymous Peer'}
            </p>
          </div>
          <p className="text-[11px] text-[var(--color-muted)] truncate mt-0.5">
            {chat.lastMessage?.is_deleted ? (
              <span className="italic opacity-70">Message deleted</span>
            ) : chat.lastMessage?.content ? (
              chat.lastMessage.content
            ) : (
              <span className="italic opacity-60">Connected handshake</span>
            )}
          </p>
        </div>
      </div>

      {/* Meta (Time & Unread Badge) */}
      <div className="flex flex-col items-end gap-1 shrink-0 pl-2">
        {timeStr && (
          <span className="text-[10px] font-mono text-[var(--color-muted)]">
            {timeStr}
          </span>
        )}
        {hasUnread && (
          <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
            +{chat.unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
}
