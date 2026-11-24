'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReportModal } from '@/components/safety/report-modal';
import {
  ArrowLeft,
  Send,
  Users,
  Shield,
  Flag,
  Trash2,
  Settings,
  Lock,
  Globe,
  Copy,
  Check,
  Loader2,
  MoreVertical,
  AlertCircle,
  X,
  UserMinus,
  VolumeX,
  Volume2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  sender: { id: string; display_name: string; avatar_url: string | null } | null;
}

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  is_muted: boolean;
  profile: { id: string; display_name: string; avatar_url: string | null; is_online: boolean } | null;
}

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  tags: string[];
  is_public: boolean;
  max_members: number;
  owner_id: string;
}

interface Membership {
  role: 'owner' | 'admin' | 'member';
  status: string;
  is_muted: boolean;
}

export default function GroupChatPage() {
  const params = useParams();
  const groupId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    memberId: string;
    userId: string;
    name: string;
    action: string;
  } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const loadGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      router.push('/dashboard/groups');
      return;
    }
    setGroup(data.group);
    setMembership(data.membership);
    setMemberCount(data.member_count);
  }, [groupId, router]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/messages`);
    const data = await res.json();
    if (res.ok) {
      setMessages(data.messages ?? []);
      setTimeout(scrollToBottom, 100);
    }
  }, [groupId]);

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/members`);
    const data = await res.json();
    if (res.ok) setMembers(data.members ?? []);
  }, [groupId]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setCurrentUserId(user.id);

      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      setBlockedIds(new Set((blocks ?? []).map((b: { blocked_id: string }) => b.blocked_id)));

      await Promise.all([loadGroup(), loadMessages(), loadMembers()]);
      setLoading(false);
    }
    init();
  }, [groupId]);

  // Realtime subscription
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase.channel(`group_${groupId}`);
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const msg = payload.new as GroupMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, { ...msg, sender: null }];
          });
          setTimeout(scrollToBottom, 50);
          loadMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const updated = payload.new as GroupMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          loadMembers();
          loadGroup();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        setText(content);
      }
    } catch {
      toast.error('Network failure sending message');
      setText(content);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(msgId: string) {
    const res = await fetch(`/api/groups/${groupId}/messages/${msgId}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to delete transmission');
      return;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, is_deleted: true, content: '[deleted]' } : m
      )
    );
    toast.success('Message deleted');
  }

  async function handleModerate(action: string, targetUserId: string) {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: targetUserId, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success(`Action "${action}" registered`);
    loadMembers();
    loadGroup();
    setPendingAction(null);
  }

  async function handleLeave() {
    if (!confirm('Leave this collective?')) return;
    const res = await fetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    router.push('/dashboard/groups');
  }

  async function generateInvite() {
    const res = await fetch(`/api/groups/${groupId}/invite`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    setInviteUrl(data.invite_url);
  }

  function copyInvite() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';
  const isOwner = membership?.role === 'owner';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] font-mono text-xs text-[var(--color-muted)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)] mb-2" />
        <p>Connecting to hub frequency...</p>
      </div>
    );
  }

  if (!group || !membership || membership.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-[var(--color-muted)] font-mono">
        <AlertCircle className="h-8 w-8 text-amber-500" />
        <p className="text-xs uppercase tracking-wider">
          You are not an active member of this squad
        </p>
        <Button
          onClick={() => router.push('/dashboard/groups')}
          size="sm"
          className="font-mono text-xs"
        >
          Return to Hub Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] my-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/dashboard/groups')}
            className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Back to groups"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xl shrink-0 select-none">
            {group.icon_url || '💬'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-[var(--color-text)] truncate">
                {group.name}
              </h2>
              {group.is_public ? (
                <span title="Public Hub">
                  <Globe className="h-3 w-3 text-emerald-500 shrink-0" />
                </span>
              ) : (
                <span title="Private Hub">
                  <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-[var(--color-muted)]">
              [{memberCount} active members]
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowMembers(!showMembers)}
            className="p-1.5 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            title="Toggle Roster"
            aria-label="Members"
          >
            <Users className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
              title="Hub Config"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages Stream */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Safety banner */}
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-mono flex items-center gap-2 justify-center text-center">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Campus collective rules apply. Never share private contacts or money.</span>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-16 text-[var(--color-muted)] font-mono">
                <p className="text-xs uppercase tracking-wider">
                  Squad frequency established. Transmit the first message.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === currentUserId;
                const isBlocked = blockedIds.has(m.sender_id);
                if (isBlocked && !isMe) return null;

                const senderName = m.sender?.display_name ?? 'Anonymous';
                const avatarEmoji = AVATARS[m.sender?.avatar_url ?? ''] ?? '👤';
                const timeStr = new Date(m.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 group ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="w-7 h-7 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-xs shrink-0 mt-0.5 select-none">
                      {avatarEmoji}
                    </div>

                    <div
                      className={`max-w-[78%] space-y-0.5 ${
                        isMe ? 'items-end' : 'items-start'
                      } flex flex-col`}
                    >
                      {!isMe && (
                        <span className="text-[10px] font-mono text-[var(--color-muted)] px-1">
                          [ {senderName} ]
                        </span>
                      )}

                      <div
                        className={`relative rounded-lg px-3.5 py-2 text-sm shadow-none ${
                          isMe
                            ? 'bg-[var(--color-primary)] text-white rounded-tr-none'
                            : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] rounded-tl-none'
                        }`}
                      >
                        {m.is_deleted ? (
                          <span className="italic opacity-60 text-xs font-mono">
                            Transmission deleted
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {m.content}
                          </p>
                        )}

                        <div
                          className={`flex items-center gap-2 mt-1 text-[10px] font-mono ${
                            isMe ? 'text-white/80 justify-end' : 'text-[var(--color-muted)]'
                          }`}
                        >
                          <span>{timeStr}</span>
                          {!m.is_deleted && (isMe || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(m.id)}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity"
                              title="Delete message"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() =>
                                setReportTarget({ id: m.sender_id, name: senderName })
                              }
                              className="opacity-0 group-hover:opacity-100 hover:text-amber-400 transition-opacity"
                              title="Report peer"
                              aria-label="Report"
                            >
                              <Flag className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          {membership.is_muted ? (
            <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] text-center text-xs font-mono text-amber-500 flex items-center justify-center gap-2">
              <VolumeX className="h-3.5 w-3.5" /> Muted by moderator clearance. Message privileges suspended.
            </div>
          ) : (
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] flex items-center gap-2"
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Broadcast to hub..."
                className="flex-1 bg-[var(--color-bg)] font-mono text-xs"
                disabled={sending}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!text.trim() || sending}
                className="font-mono text-xs px-3.5 shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-[var(--color-border)] bg-[var(--color-surface-raised)] flex flex-col font-mono">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)]">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Roster ({memberCount})
              </h3>
              <button
                type="button"
                onClick={() => setShowMembers(false)}
                className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
                aria-label="Close roster"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Invite link (admin/owner) */}
            {!group.is_public && isAdmin && (
              <div className="p-2 border-b border-[var(--color-border)]">
                {inviteUrl ? (
                  <div className="flex gap-1">
                    <input
                      readOnly
                      value={inviteUrl}
                      className="flex-1 text-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-muted)] truncate"
                    />
                    <button
                      type="button"
                      onClick={copyInvite}
                      className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-text)]"
                      aria-label="Copy invite"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={generateInvite}
                    className="w-full text-xs py-1.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
                  >
                    Generate Invite Token
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {members
                .filter((m) => m.status === 'active')
                .map((m) => {
                  const avatarEmoji = AVATARS[m.profile?.avatar_url ?? ''] ?? '👤';
                  const isMe = m.user_id === currentUserId;
                  const canModerate =
                    isAdmin && !isMe && m.role !== 'owner' && (m.role !== 'admin' || isOwner);

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-[var(--color-surface)] group/member transition-colors"
                    >
                      <div className="relative shrink-0">
                        <div className="w-6 h-6 rounded bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xs">
                          {avatarEmoji}
                        </div>
                        {m.profile?.is_online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--color-text)] truncate font-sans">
                          {m.profile?.display_name ?? 'Anonymous'}
                        </p>
                        <p
                          className={`text-[9px] uppercase tracking-wider ${
                            m.role === 'owner'
                              ? 'text-amber-500'
                              : m.role === 'admin'
                              ? 'text-[var(--color-primary)]'
                              : 'text-[var(--color-muted)]'
                          }`}
                        >
                          [{m.role}] {m.is_muted && '· muted'}
                        </p>
                      </div>

                      {canModerate && (
                        <div className="relative">
                          <button
                            type="button"
                            className="opacity-0 group-hover/member:opacity-100 p-0.5 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] transition-opacity"
                            onClick={() =>
                              setPendingAction({
                                memberId: m.id,
                                userId: m.user_id,
                                name: m.profile?.display_name ?? 'User',
                                action: '',
                              })
                            }
                            aria-label="Moderate member"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Pending clearance */}
              {isAdmin && members.some((m) => m.status === 'pending') && (
                <>
                  <div className="pt-2 pb-1 px-1">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      Pending Clearance ({members.filter((m) => m.status === 'pending').length})
                    </span>
                  </div>
                  {members
                    .filter((m) => m.status === 'pending')
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-1.5 p-1.5 rounded bg-amber-500/10 border border-amber-500/20"
                      >
                        <span className="text-xs text-[var(--color-text)] flex-1 truncate font-sans">
                          {m.profile?.display_name ?? 'Unknown'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleModerate('approve', m.user_id)}
                          className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-mono"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerate('ban', m.user_id)}
                          className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 font-mono"
                        >
                          Deny
                        </button>
                      </div>
                    ))}
                </>
              )}
            </div>

            {/* Leave squad */}
            {membership.role !== 'owner' && (
              <div className="p-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={handleLeave}
                  className="w-full text-xs py-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <UserMinus className="h-3.5 w-3.5" /> Leave Collective
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Moderation Action Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-xl space-y-3 font-mono">
            <h3 className="font-semibold text-xs text-[var(--color-text)] uppercase tracking-wider">
              Moderate: {pendingAction.name}
            </h3>
            <div className="space-y-1.5">
              {[
                { action: 'mute', label: 'Mute broadcast', icon: VolumeX, color: 'text-amber-500' },
                { action: 'unmute', label: 'Restore transmission', icon: Volume2, color: 'text-emerald-500' },
                { action: 'remove', label: 'Eject from Squad', icon: UserMinus, color: 'text-orange-500' },
                { action: 'ban', label: 'Permanent Squad Ban', icon: Shield, color: 'text-red-500' },
                ...(isOwner
                  ? [
                      { action: 'promote', label: 'Promote to Admin', icon: ChevronRight, color: 'text-[var(--color-primary)]' },
                      { action: 'demote', label: 'Demote to Member', icon: ChevronRight, color: 'text-[var(--color-muted)]' },
                    ]
                  : []),
              ].map(({ action, label, icon: Icon, color }) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleModerate(action, pendingAction.userId)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] text-xs ${color} transition-colors`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPendingAction(null)}
              className="w-full text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] pt-1 text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportTarget(null)}
          targetUserId={reportTarget.id}
          targetUserName={reportTarget.name}
        />
      )}

      {/* Group Settings Modal */}
      {showSettings && group && (
        <GroupSettingsModal
          group={group}
          isOwner={isOwner}
          onClose={() => setShowSettings(false)}
          onUpdated={() => {
            loadGroup();
            setShowSettings(false);
          }}
          onDelete={() => {
            router.push('/dashboard/groups');
          }}
          groupId={groupId}
        />
      )}
    </div>
  );
}

function GroupSettingsModal({
  group,
  isOwner,
  onClose,
  onUpdated,
  onDelete,
  groupId,
}: {
  group: GroupInfo;
  isOwner: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDelete: () => void;
  groupId: string;
}) {
  const [name, setName] = useState(group.name);
  const [desc, setDesc] = useState(group.description ?? '');
  const [tags, setTags] = useState((group.tags ?? []).join(', '));
  const [isPublic, setIsPublic] = useState(group.is_public);
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim() || null,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          is_public: isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success('Hub settings updated!');
      onUpdated();
    } catch {
      toast.error('Failed to update hub');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Disband this collective permanently? All message archives will be purged.'))
      return;
    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success('Collective disbanded');
    onDelete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-xl space-y-4 antialiased">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            Hub Parameters
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] font-mono text-xs"
          >
            [ esc ]
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1">
              Hub Moniker
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1">
              Mission Statement
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text)] resize-none focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1">
              Tags
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. music, gaming"
              className="font-mono text-xs"
            />
          </div>

          {isOwner && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic(!isPublic)}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  isPublic ? 'bg-emerald-500' : 'bg-[var(--color-border)]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-4' : ''
                  }`}
                />
              </button>
              <span className="text-xs font-mono text-[var(--color-text)]">
                {isPublic ? 'Public Hub' : 'Private Hub'}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={loading}
              className="font-mono text-xs"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save Config
            </Button>
          </div>
        </form>

        {isOwner && (
          <div className="border-t border-[var(--color-border)] pt-3">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full py-2 rounded text-xs font-mono text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Disband Collective Permanently
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
