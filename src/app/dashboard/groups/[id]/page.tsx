'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReportModal } from '@/components/safety/report-modal';
import {
  ArrowLeft, Send, Users, Shield, Flag, Trash2, Settings,
  Lock, Globe, Copy, Check, Loader2, MoreVertical, AlertCircle,
  X, UserMinus, VolumeX, Volume2, ChevronRight,
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
  const [group, setGroup]       = useState<GroupInfo | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers]   = useState<Member[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ memberId: string; userId: string; name: string; action: string } | null>(null);
  const [reportTarget, setReportTarget]   = useState<{ id: string; name: string } | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied]      = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const loadGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`);
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); router.push('/dashboard/groups'); return; }
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }
      setCurrentUserId(user.id);

      // Load blocked users
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
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const msg = payload.new as GroupMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, { ...msg, sender: null }];
        });
        setTimeout(scrollToBottom, 50);
        // Re-fetch to get sender info
        loadMessages();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const updated = payload.new as GroupMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'group_members',
        filter: `group_id=eq.${groupId}`,
      }, () => { loadMembers(); loadGroup(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      if (!res.ok) { toast.error(data.error); setText(content); }
    } catch {
      toast.error('Failed to send'); setText(content);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(msgId: string) {
    const res = await fetch(`/api/groups/${groupId}/messages/${msgId}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed to delete'); return; }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true, content: '[deleted]' } : m));
    toast.success('Message deleted');
  }

  async function handleModerate(action: string, targetUserId: string) {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: targetUserId, action }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(`Action "${action}" applied`);
    loadMembers();
    loadGroup();
    setPendingAction(null);
  }

  async function handleLeave() {
    if (!confirm('Leave this group?')) return;
    const res = await fetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    router.push('/dashboard/groups');
  }

  async function generateInvite() {
    const res = await fetch(`/api/groups/${groupId}/invite`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
    </div>
  );

  if (!group || !membership || membership.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-[var(--color-muted)]">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm">You are not an active member of this group</p>
        <Button onClick={() => router.push('/dashboard/groups')}>Back to Groups</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] my-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard/groups')} className="p-1 rounded-lg text-[var(--color-muted)] hover:text-white hover:bg-slate-800 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xl shrink-0">
            {group.icon_url || '💬'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-[var(--color-text)] truncate">{group.name}</h2>
              {group.is_public ? <Globe className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
            </div>
            <p className="text-[11px] text-[var(--color-muted)]">{memberCount} members</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowMembers(!showMembers)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Members">
            <Users className="h-5 w-5" />
          </button>
          {isAdmin && (
            <button onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Settings">
              <Settings className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Safety banner */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 justify-center">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Keep it anonymous. Never share personal info or money.</span>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-12 text-[var(--color-muted)]">
                <p className="text-sm">No messages yet — say hello! 👋</p>
              </div>
            ) : (
              messages.map(m => {
                const isMe = m.sender_id === currentUserId;
                const isBlocked = blockedIds.has(m.sender_id);
                if (isBlocked && !isMe) return null; // Hide blocked users' messages

                const senderName = m.sender?.display_name ?? 'Anonymous';
                const avatarEmoji = AVATARS[m.sender?.avatar_url ?? ''] ?? '👤';
                const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={m.id} className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-sm shrink-0 mt-1">
                      {avatarEmoji}
                    </div>
                    <div className={`max-w-[75%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!isMe && (
                        <span className="text-[10px] text-[var(--color-muted)] px-1">{senderName}</span>
                      )}
                      <div className={`relative rounded-2xl px-3.5 py-2 text-sm shadow-sm ${isMe
                        ? 'bg-[var(--color-primary)] text-white rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/50'
                      }`}>
                        {m.is_deleted ? (
                          <span className="italic opacity-60 text-xs">Message deleted</span>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        )}
                        <div className={`flex items-center gap-2 mt-1 text-[10px] ${isMe ? 'text-indigo-200 justify-end' : 'text-slate-400'}`}>
                          <span>{timeStr}</span>
                          {!m.is_deleted && (isMe || isAdmin) && (
                            <button onClick={() => handleDeleteMessage(m.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                          {!isMe && (
                            <button onClick={() => setReportTarget({ id: m.sender_id, name: senderName })} className="opacity-0 group-hover:opacity-100 hover:text-amber-400 transition-opacity">
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

          {/* Input */}
          {membership.is_muted ? (
            <div className="p-3 border-t border-[var(--color-border)] bg-slate-900/60 text-center text-sm text-amber-400 flex items-center justify-center gap-2">
              <VolumeX className="h-4 w-4" /> You are muted and cannot send messages
            </div>
          ) : (
            <form onSubmit={handleSend} className="p-3 border-t border-[var(--color-border)] bg-slate-900/60 flex items-center gap-2">
              <Input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Message the group..."
                className="flex-1 rounded-xl bg-[var(--color-bg)]"
                disabled={sending}
              />
              <Button type="submit" size="sm" disabled={!text.trim() || sending} className="rounded-xl px-4">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          )}
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-[var(--color-border)] bg-slate-900/40 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Members ({memberCount})</h3>
              <button onClick={() => setShowMembers(false)} className="text-[var(--color-muted)] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Invite link (admin/owner) */}
            {!group.is_public && isAdmin && (
              <div className="p-2 border-b border-[var(--color-border)]">
                {inviteUrl ? (
                  <div className="flex gap-1">
                    <input readOnly value={inviteUrl} className="flex-1 text-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-muted)] truncate" />
                    <button onClick={copyInvite} className="p-1 rounded text-[var(--color-muted)] hover:text-white">
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <button onClick={generateInvite} className="w-full text-xs py-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors">
                    Generate Invite Link
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {members.filter(m => m.status === 'active').map(m => {
                const avatarEmoji = AVATARS[m.profile?.avatar_url ?? ''] ?? '👤';
                const isMe = m.user_id === currentUserId;
                const canModerate = isAdmin && !isMe && m.role !== 'owner' && (m.role !== 'admin' || isOwner);

                return (
                  <div key={m.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--color-bg)] group/member">
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-sm">{avatarEmoji}</div>
                      {m.profile?.is_online && <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[var(--color-surface)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--color-text)] truncate">{m.profile?.display_name ?? 'Anonymous'}</p>
                      <p className={`text-[10px] ${m.role === 'owner' ? 'text-amber-400' : m.role === 'admin' ? 'text-blue-400' : 'text-[var(--color-muted)]'}`}>
                        {m.role} {m.is_muted && '· muted'}
                      </p>
                    </div>
                    {canModerate && (
                      <div className="relative">
                        <button
                          className="opacity-0 group-hover/member:opacity-100 p-0.5 rounded text-[var(--color-muted)] hover:text-white transition-opacity"
                          onClick={() => setPendingAction({ memberId: m.id, userId: m.user_id, name: m.profile?.display_name ?? 'User', action: '' })}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pending members (admin/owner) */}
              {isAdmin && members.some(m => m.status === 'pending') && (
                <>
                  <div className="pt-2 pb-1 px-1">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Pending ({members.filter(m => m.status === 'pending').length})</span>
                  </div>
                  {members.filter(m => m.status === 'pending').map(m => (
                    <div key={m.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <span className="text-xs text-[var(--color-text)] flex-1 truncate">{m.profile?.display_name ?? 'Unknown'}</span>
                      <button onClick={() => handleModerate('approve', m.user_id)} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">Approve</button>
                      <button onClick={() => handleModerate('ban', m.user_id)} className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">Deny</button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Leave group */}
            {membership.role !== 'owner' && (
              <div className="p-2 border-t border-[var(--color-border)]">
                <button onClick={handleLeave} className="w-full text-xs py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5">
                  <UserMinus className="h-3.5 w-3.5" /> Leave Group
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Moderation Action Menu */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-xl space-y-3">
            <h3 className="font-semibold text-[var(--color-text)]">Moderate: {pendingAction.name}</h3>
            <div className="space-y-2">
              {[
                { action: 'mute', label: 'Mute', icon: VolumeX, color: 'text-amber-400' },
                { action: 'unmute', label: 'Unmute', icon: Volume2, color: 'text-emerald-400' },
                { action: 'remove', label: 'Remove from Group', icon: UserMinus, color: 'text-orange-400' },
                { action: 'ban', label: 'Ban from Group', icon: Shield, color: 'text-red-400' },
                ...(isOwner ? [
                  { action: 'promote', label: 'Promote to Admin', icon: ChevronRight, color: 'text-blue-400' },
                  { action: 'demote',  label: 'Demote to Member', icon: ChevronRight, color: 'text-slate-400' },
                ] : []),
              ].map(({ action, label, icon: Icon, color }) => (
                <button
                  key={action}
                  onClick={() => handleModerate(action, pendingAction.userId)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-border)] text-sm ${color} transition-colors`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            <button onClick={() => setPendingAction(null)} className="w-full text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] mt-2">Cancel</button>
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
          onUpdated={() => { loadGroup(); setShowSettings(false); }}
          onDelete={() => { router.push('/dashboard/groups'); }}
          groupId={groupId}
        />
      )}
    </div>
  );
}

function GroupSettingsModal({
  group, isOwner, onClose, onUpdated, onDelete, groupId,
}: {
  group: GroupInfo;
  isOwner: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDelete: () => void;
  groupId: string;
}) {
  const [name, setName]       = useState(group.name);
  const [desc, setDesc]       = useState(group.description ?? '');
  const [tags, setTags]       = useState((group.tags ?? []).join(', '));
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
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          is_public: isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Group updated!');
      onUpdated();
    } catch {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this group permanently? This cannot be undone.')) return;
    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success('Group deleted');
    onDelete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Group Settings</h2>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl">×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={60} required />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">Description</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              maxLength={500} rows={3}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">Tags</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. music, gaming" />
          </div>
          {isOwner && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setIsPublic(!isPublic)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-[var(--color-primary)]' : 'bg-slate-700'}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-[var(--color-text)]">{isPublic ? 'Public' : 'Private'}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save
            </Button>
          </div>
        </form>
        {isOwner && (
          <div className="border-t border-[var(--color-border)] pt-4">
            <button onClick={handleDelete} className="w-full py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
              Delete Group
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
