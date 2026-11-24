'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowDownLeft, ArrowUpRight, MessageSquare, Loader2, Inbox } from 'lucide-react';
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
        toast.success('Connection handshake complete. Channel open.');
        if (data.chat_id) {
          router.push(`/dashboard/chat/${data.chat_id}`);
          return;
        }
      } else {
        toast.info('Signal rejected.');
      }

      loadRequests();
    } catch {
      toast.error('Handshake request failed');
    } finally {
      setActionLoading(null);
    }
  }

  const pendingIncoming = incoming.filter((r) => r.status === 'pending');
  const pendingOutgoing = outgoing.filter((r) => r.status === 'pending');
  const activeList = tab === 'incoming' ? incoming : outgoing;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
      {/* Tab Switcher */}
      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
        <button
          type="button"
          onClick={() => setTab('incoming')}
          className={`flex-1 py-3 px-4 text-xs font-mono font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
            tab === 'incoming'
              ? 'border-[var(--color-primary)] text-[var(--color-text)] bg-[var(--color-surface)]'
              : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <ArrowDownLeft className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          <span>INCOMING BAND</span>
          {pendingIncoming.length > 0 && (
            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[var(--color-primary)] text-white">
              {pendingIncoming.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab('outgoing')}
          className={`flex-1 py-3 px-4 text-xs font-mono font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
            tab === 'outgoing'
              ? 'border-[var(--color-primary)] text-[var(--color-text)] bg-[var(--color-surface)]'
              : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-muted)]" />
          <span>OUTGOING TRANSMISSIONS</span>
          {pendingOutgoing.length > 0 && (
            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-muted)]">
              {pendingOutgoing.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Stream */}
      <div className="p-4 divide-y divide-[var(--color-border)]">
        {loading ? (
          <div className="flex justify-center py-10 font-mono text-xs text-[var(--color-muted)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)] mr-2" />
            <span>Scanning inbox signals...</span>
          </div>
        ) : activeList.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-muted)] font-mono">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs uppercase tracking-wider">No {tab} requests in this queue</p>
          </div>
        ) : (
          activeList.map((req) => {
            const userProfile = tab === 'incoming' ? req.sender : req.receiver;
            const emoji = AVATARS[userProfile?.avatar_url || ''] || '👤';
            const isPending = req.status === 'pending';

            return (
              <div key={req.id} className="py-4 first:pt-1 last:pb-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-xl shrink-0 select-none">
                      {emoji}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                        {userProfile?.display_name || 'Anonymous Peer'}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-muted)] mt-0.5">
                        <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                          {req.status}
                        </span>
                        <span>//</span>
                        <span>{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {tab === 'incoming' && isPending && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-500/10 h-8 px-2.5 font-mono text-xs"
                        onClick={() => handleAction(req.id, 'reject')}
                        disabled={actionLoading === req.id}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 font-mono text-xs"
                        onClick={() => handleAction(req.id, 'accept')}
                        disabled={actionLoading === req.id}
                      >
                        {actionLoading === req.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" /> Accept
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <Link href="/dashboard/chat">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 font-mono text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> Enter Chat
                      </Button>
                    </Link>
                  )}
                </div>

                {req.intro && (
                  <div className="text-xs bg-[var(--color-surface-raised)] p-3 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-mono leading-relaxed">
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
