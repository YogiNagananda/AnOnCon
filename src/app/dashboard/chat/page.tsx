'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MessageCircle, Search, ArrowRight, Loader2, Radio } from 'lucide-react';
import Link from 'next/link';

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

export default function ChatListPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-primary)] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
            <span>Encrypted Signal Logs // 1:1 Channels</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Active Messages
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            1:1 direct conversations unlocked through confirmed handshake requests.
          </p>
        </div>

        <Link href="/dashboard/discover">
          <Button size="sm" variant="outline" className="font-mono text-xs">
            <Search className="h-3.5 w-3.5 mr-1.5" /> Tune into Directory
          </Button>
        </Link>
      </div>

      {/* Chat list card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 font-mono text-xs text-[var(--color-muted)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)] mb-2" />
            <p>Decoding channel logs...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Radio className="h-8 w-8 text-[var(--color-muted)] mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              No active conversations yet
            </h3>
            <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto mt-1 mb-5 font-mono">
              Channels unlock once a peer accepts your connection signal. Explore the directory and send an icebreaker.
            </p>
            <Link href="/dashboard/discover">
              <Button size="sm" className="font-mono text-xs">
                <Search className="h-3.5 w-3.5 mr-1.5" /> Discover Peers
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {chats.map((chat) => {
              const emoji = AVATARS[chat.otherUser?.avatar_url || ''] || '👤';
              const hasUnread = chat.unreadCount > 0;

              return (
                <Link
                  key={chat.id}
                  href={`/dashboard/chat/${chat.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--color-surface-raised)] transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-xl select-none">
                        {emoji}
                      </div>
                      {chat.otherUser?.is_online && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-surface)]"
                          title="Online"
                        />
                      )}
                    </div>

                    {/* Meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm truncate ${
                            hasUnread
                              ? 'font-bold text-[var(--color-text)]'
                              : 'font-medium text-[var(--color-text)]'
                          }`}
                        >
                          {chat.otherUser?.display_name || 'Anonymous Peer'}
                        </p>
                        {chat.lastMessage?.created_at && (
                          <span className="text-[10px] font-mono text-[var(--color-muted)] shrink-0">
                            {new Date(chat.lastMessage.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-xs truncate mt-0.5 ${
                          hasUnread
                            ? 'text-[var(--color-primary)] font-medium'
                            : 'text-[var(--color-muted)]'
                        }`}
                      >
                        {chat.lastMessage ? (
                          chat.lastMessage.is_deleted ? (
                            <span className="italic opacity-60 font-mono text-[11px]">
                              Transmission deleted
                            </span>
                          ) : (
                            chat.lastMessage.content
                          )
                        ) : (
                          <span className="italic opacity-60 font-mono text-[11px]">
                            Handshake accepted. Say hello.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Unread badge & Arrow */}
                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    {hasUnread && (
                      <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[var(--color-primary)] text-white font-medium">
                        {chat.unreadCount}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-[var(--color-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
