'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, ArrowDownLeft, ArrowUpRight, MessageSquare, Loader2, Inbox } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

interface RequestItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  intro?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  created_at: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    bio?: string | null;
    interests?: string[] | null;
  };
  receiver?: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    bio?: string | null;
    interests?: string[] | null;
  };
}

export function RequestsInbox({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incoming, setIncoming] = useState<RequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadRequests() {
    try {
      const res = await fetch('/api/requests');
      const data = await res.json();
      if (res.ok) {
        setIncoming(data.incoming || []);
        setOutgoing(data.outgoing || []);
        const pendingCount = (data.incoming || []).filter((r: RequestItem) => r.status === 'pending').length;
        onCountChange?.(pendingCount);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleAction(requestId: string, action: 'accept' | 'reject') {
    setActionLoading(requestId);
    try {
      const res = await fetch('/api/requests/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Failed to ${action} request`);
        return;
      }

      if (action === 'accept') {
        toast.success('Connection request accepted! 1:1 chat unlocked.');
        if (data.chat_id) {
          router.push(`/dashboard/chat/${data.chat_id}`);
          return;
        }
      } else {
        toast.info('Connection request rejected.');
      }

      loadRequests();
    } catch {
      toast.error('An error occurred');
    } finally {
      setActionLoading(null);
    }
  }

  const pendingIncoming = incoming.filter((r) => r.status === 'pending');
  const pendingOutgoing = outgoing.filter((r) => r.status === 'pending');
  const activeList = tab === 'incoming' ? incoming : outgoing;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] bg-slate-900/40">
        <button
          onClick={() => setTab('incoming')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
            tab === 'incoming'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-transparent text-[var(--color-muted)] hover:text-white'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          <span>Incoming</span>
          {pendingIncoming.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--color-primary)] text-white font-bold">
              {pendingIncoming.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('outgoing')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
            tab === 'outgoing'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-transparent text-[var(--color-muted)] hover:text-white'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Sent</span>
          {pendingOutgoing.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-300 font-bold">
              {pendingOutgoing.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 divide-y divide-[var(--color-border)]">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : activeList.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-muted)]">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No {tab} requests</p>
          </div>
        ) : (
          activeList.map((req) => {
            const userProfile = tab === 'incoming' ? req.sender : req.receiver;
            const emoji = AVATARS[userProfile?.avatar_url || ''] || '👤';
            const isPending = req.status === 'pending';

            return (
              <div key={req.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xl shrink-0">
                      {emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                        {userProfile?.display_name || 'Anonymous User'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                        <span className="capitalize">{req.status}</span>
                        <span>•</span>
                        <span>{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {tab === 'incoming' && isPending && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-500/10 h-8 px-2.5"
                        onClick={() => handleAction(req.id, 'reject')}
                        disabled={actionLoading === req.id}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-2.5"
                        onClick={() => handleAction(req.id, 'accept')}
                        disabled={actionLoading === req.id}
                      >
                        {actionLoading === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" /> Accept
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <Link href="/dashboard/chat">
                      <Button size="sm" variant="outline" className="h-8 text-emerald-400 border-emerald-500/30">
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> Chat
                      </Button>
                    </Link>
                  )}
                </div>

                {req.intro && (
                  <div className="ml-13 text-xs bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 text-slate-300 italic">
                    &ldquo;{req.intro}&rdquo;
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
