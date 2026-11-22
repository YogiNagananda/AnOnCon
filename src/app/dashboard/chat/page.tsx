'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MessageCircle, Search, Clock, ArrowRight, Loader2, Sparkles } from 'lucide-react';
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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-[var(--color-primary)]" />
            Messages
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Your 1:1 conversations with accepted connections.
          </p>
        </div>

        <Link href="/dashboard/discover">
          <Button size="sm" variant="outline">
            <Search className="h-4 w-4 mr-1.5" /> Find People
          </Button>
        </Link>
      </div>

      {/* Chat list */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mb-2" />
            <p className="text-sm text-[var(--color-muted)]">Loading conversations...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Sparkles className="h-12 w-12 text-[var(--color-primary)] mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-[var(--color-text)]">No conversations yet</h3>
            <p className="text-sm text-[var(--color-muted)] max-w-sm mx-auto mt-1 mb-5">
              1:1 chats unlock after a connection request is accepted. Discover people and send a request with an icebreaker!
            </p>
            <Link href="/dashboard/discover">
              <Button>
                <Search className="h-4 w-4 mr-1.5" /> Discover People
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
                  className="flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-2xl select-none">
                        {emoji}
                      </div>
                      {chat.otherUser?.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-surface)]" />
                      )}
                    </div>

                    {/* Meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${hasUnread ? 'font-bold text-white' : 'font-medium text-[var(--color-text)]'}`}>
                          {chat.otherUser?.display_name || 'Anonymous User'}
                        </p>
                        {chat.lastMessage?.created_at && (
                          <span className="text-[11px] text-[var(--color-muted)] shrink-0">
                            {new Date(chat.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-indigo-200 font-medium' : 'text-[var(--color-muted)]'}`}>
                        {chat.lastMessage ? (
                          chat.lastMessage.is_deleted ? (
                            <span className="italic opacity-60">This message was deleted</span>
                          ) : (
                            chat.lastMessage.content
                          )
                        ) : (
                          <span className="italic opacity-60">No messages yet. Say hi! 👋</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Unread badge & Arrow */}
                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    {hasUnread && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--color-primary)] text-white">
                        {chat.unreadCount}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
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
