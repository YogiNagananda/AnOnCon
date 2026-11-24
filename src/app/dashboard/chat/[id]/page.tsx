'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { BlockModal } from '@/components/safety/block-modal';
import { ReportModal } from '@/components/safety/report-modal';
import { ChatSafetyModal } from '@/components/safety/chat-safety-modal';
import { useCall } from '@/components/calls/call-provider';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Shield,
  Flag,
  Trash2,
  Check,
  CheckCheck,
  Loader2,
  Eraser,
  AlertCircle,
  Phone,
  Video,
  Radio,
  SlidersHorizontal,
  X,
  Sparkles,
  Paperclip,
  Tag,
  ShieldCheck,
  Lock,
} from 'lucide-react';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

interface MessageItem {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_deleted: boolean;
  delivered_at?: string | null;
  read_at?: string | null;
  created_at: string;
}

export default function ChatDetailPage() {
  const params = useParams();
  const chatId = params.id as string;
  const router = useRouter();
  const supabase = createClient();
  const { startCall } = useCall();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showDrawer, setShowDrawer] = useState(true);

  // Typing indicator
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Menu
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // Load chat & messages
  async function loadChat() {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to open conversation');
        router.push('/dashboard/chat');
        return;
      }
      setOtherUser(data.otherUser);
      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 100);
    } catch {
      toast.error('An error occurred loading conversation');
    } finally {
      setLoading(false);
    }
  }

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
      loadChat();
    }
    init();
  }, [chatId]);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const channel = supabase.channel(`chat_${chatId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as MessageItem;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(scrollToBottom, 50);

            if (newMsg.sender_id !== currentUserId) {
              supabase
                .from('messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', newMsg.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as MessageItem;
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            );
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId !== currentUserId) {
          setIsOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 2500);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [chatId, currentUserId, supabase]);

  // Broadcast typing
  function handleTyping(val: string) {
    setText(val);
    if (!chatId || !currentUserId) return;
    const channel = supabase.channel(`chat_${chatId}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId },
    });
  }

  // Send message
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const messageText = text.trim();
    setText('');
    setSending(true);

    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageText }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send message');
        setText(messageText);
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(scrollToBottom, 50);
    } catch {
      toast.error('Network failure sending message');
      setText(messageText);
    } finally {
      setSending(false);
    }
  }

  // Delete message
  async function handleDeleteMessage(msgId: string) {
    try {
      const res = await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Failed to delete message');
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, is_deleted: true, content: 'This message was deleted' }
            : m
        )
      );
      toast.success('Message deleted');
    } catch {
      toast.error('An error occurred');
    }
  }

  // Clear chat for me
  async function handleClearChat() {
    setShowMenu(false);
    if (!confirm('Clear all messages in this channel for your view?')) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/clear`, { method: 'POST' });
      if (!res.ok) {
        toast.error('Failed to clear channel');
        return;
      }
      setMessages([]);
      toast.success('Channel cleared for your view');
    } catch {
      toast.error('Something went wrong');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full font-mono text-xs text-[var(--color-muted)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)] mb-2" />
        <p>Connecting to secure frequency...</p>
      </div>
    );
  }

  const avatarEmoji = AVATARS[otherUser?.avatar_url || ''] || '👤';

  return (
    <div className="flex h-full w-full overflow-hidden select-none bg-[var(--color-bg)]">
      {/* Center Conversation Stream */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[var(--color-bg)] bg-topo-pattern relative">
        {/* Stream Header */}
        <header className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button on mobile */}
            <button
              type="button"
              onClick={() => router.push('/dashboard/chat')}
              className="md:hidden p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* Squircle Avatar with Online Dot */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-xl shadow-xs">
                {avatarEmoji}
              </div>
              {otherUser?.is_online && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[var(--color-surface)]"
                  title="Online"
                />
              )}
            </div>

            {/* Title & Online Status */}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--color-text)] truncate flex items-center gap-1.5">
                <span>{otherUser?.display_name || 'Anonymous Peer'}</span>
                {otherUser?.age && (
                  <span className="text-[10px] font-mono text-[var(--color-muted)] font-normal">
                    {otherUser.age}y
                  </span>
                )}
              </h2>
              <p className="text-[11px] font-mono text-[var(--color-muted)]">
                {isOtherTyping ? (
                  <span className="text-emerald-500 font-medium animate-pulse">
                    [ transmitting signal... ]
                  </span>
                ) : otherUser?.is_online ? (
                  <span className="text-emerald-500 font-medium">active on band</span>
                ) : (
                  'signal idle'
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons & Menu */}
          <div className="flex items-center gap-1.5">
            {otherUser && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    startCall(
                      chatId,
                      otherUser.id,
                      otherUser.display_name,
                      otherUser.avatar_url,
                      'voice'
                    )
                  }
                  className="p-2 rounded-lg text-[var(--color-muted)] hover:text-emerald-500 hover:bg-[var(--color-surface-raised)] transition-colors"
                  title="Voice Call"
                  aria-label="Voice Call"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startCall(
                      chatId,
                      otherUser.id,
                      otherUser.display_name,
                      otherUser.avatar_url,
                      'video'
                    )
                  }
                  className="p-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
                  title="Video Call"
                  aria-label="Video Call"
                >
                  <Video className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Toggle Right Info Drawer */}
            <button
              type="button"
              onClick={() => setShowDrawer(!showDrawer)}
              className={`p-2 rounded-lg transition-colors ${
                showDrawer
                  ? 'text-[var(--color-primary)] bg-[var(--color-surface-raised)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]'
              }`}
              title="Toggle Peer Dossier"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            {/* More Menu Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors"
                aria-label="Channel Options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg z-30 py-1.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  >
                    <Eraser className="h-3.5 w-3.5" /> Clear For Me
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--color-surface-raised)] text-amber-500"
                  >
                    <Flag className="h-3.5 w-3.5" /> Report Peer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowBlockModal(true);
                    }}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-500/10 text-red-500"
                  >
                    <Shield className="h-3.5 w-3.5" /> Block Peer
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {/* Subtle Safety Warning Pill */}
          <div className="max-w-md mx-auto p-2 rounded-lg bg-[var(--color-surface)]/80 backdrop-blur-xs border border-[var(--color-border)] text-xs font-mono text-[var(--color-muted)] flex items-center gap-2 justify-center text-center shadow-xs">
            <Lock className="h-3 w-3 text-emerald-500 shrink-0" />
            <span>Anonymous handshake encrypted • Never share personal info or money.</span>
          </div>

          {/* Handshake Prompt Widget (matches Image 2 poll card) */}
          {otherUser?.interests && otherUser.interests.length > 0 && (
            <div className="max-w-md mx-auto my-3 p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text)] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-500" />
                  Mutual Frequencies
                </span>
                <span className="text-[10px] font-mono text-[var(--color-muted)]">Verified 18+</span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] font-mono mb-2.5">
                Break the ice by exploring your shared interest spectrum:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {otherUser.interests.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages Feed */}
          {messages.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-muted)] font-mono">
              <p className="text-xs uppercase tracking-wider">Channel established. Transmit the first message.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === currentUserId;
              const timeStr = new Date(m.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} group`}
                >
                  {/* Peer Avatar on left */}
                  {!isMe && (
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-sm shrink-0 mb-1 shadow-xs">
                      {avatarEmoji}
                    </div>
                  )}

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    {/* Sender name for peer */}
                    {!isMe && (
                      <span className="text-[10px] font-mono text-[var(--color-muted)] mb-1 ml-1">
                        {otherUser?.display_name || 'Anonymous'} • {timeStr}
                      </span>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs shadow-xs relative transition-all ${
                        isMe
                          ? 'bg-[var(--color-primary)] text-white dark:bg-white dark:text-black rounded-br-sm'
                          : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-bl-sm'
                      }`}
                    >
                      {m.is_deleted ? (
                        <span className="italic opacity-70 text-xs font-mono">
                          Transmission deleted
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap break-words leading-relaxed font-sans">
                          {m.content}
                        </p>
                      )}

                      {/* Footer for my messages */}
                      {isMe && (
                        <div className="flex items-center gap-1 mt-1 justify-end text-[10px] font-mono opacity-80">
                          <span>{timeStr}</span>
                          {!m.is_deleted && (
                            <span>
                              {m.read_at ? (
                                <CheckCheck className="h-3.5 w-3.5 text-emerald-400 inline" />
                              ) : m.delivered_at ? (
                                <CheckCheck className="h-3.5 w-3.5 inline" />
                              ) : (
                                <Check className="h-3.5 w-3.5 inline" />
                              )}
                            </span>
                          )}

                          {!m.is_deleted && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(m.id)}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-300 ml-1 transition-opacity"
                              title="Delete message"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Bottom Input Bar (Matching Image 2) */}
        <div className="p-4 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/80 to-transparent">
          <form
            onSubmit={handleSend}
            className="max-w-2xl mx-auto flex items-center gap-2 p-1.5 pl-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-md"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="Transmit message..."
              className="flex-1 bg-transparent border-0 text-xs font-mono focus:outline-none placeholder:text-[var(--color-muted)] text-[var(--color-text)]"
              disabled={sending}
            />

            <button
              type="button"
              className="p-1.5 rounded-full text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              title="Share icebreaker"
              onClick={() => setText('Hey! Spotted your profile in directory. What music are you listening to lately?')}
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform shrink-0 shadow-xs"
              title="Send message"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Drawer: Peer Dossier (Matching Image 2) */}
      {showDrawer && otherUser && (
        <aside className="hidden lg:flex flex-col w-80 border-l border-[var(--color-border)] bg-[var(--color-surface)] h-full overflow-y-auto shrink-0 select-none">
          {/* Drawer Header */}
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-muted)] font-semibold">
              Peer Dossier
            </span>
            <button
              type="button"
              onClick={() => setShowDrawer(false)}
              className="p-1 rounded-md text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Large Avatar & Name */}
          <div className="p-6 text-center border-b border-[var(--color-border)]">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-4xl mx-auto shadow-sm mb-3">
              {avatarEmoji}
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">
              {otherUser.display_name}
            </h3>
            <p className="text-xs font-mono text-[var(--color-muted)] mt-0.5">
              {otherUser.age ? `${otherUser.age} yrs old • ` : ''}
              {otherUser.is_online ? (
                <span className="text-emerald-500 font-semibold">Online on Band</span>
              ) : (
                <span>Signal Inactive</span>
              )}
            </p>

            {/* Quick Action Pills Row (Voice / Video) */}
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  startCall(
                    chatId,
                    otherUser.id,
                    otherUser.display_name,
                    otherUser.avatar_url,
                    'voice'
                  )
                }
                className="flex-1 rounded-full font-mono text-xs"
              >
                <Phone className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Voice chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  startCall(
                    chatId,
                    otherUser.id,
                    otherUser.display_name,
                    otherUser.avatar_url,
                    'video'
                  )
                }
                className="flex-1 rounded-full font-mono text-xs"
              >
                <Video className="w-3.5 h-3.5 mr-1" /> Video chat
              </Button>
            </div>
          </div>

          {/* Dossier Body */}
          <div className="p-4 space-y-4 font-mono text-xs">
            {/* Bio */}
            {otherUser.bio && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-semibold">
                  Transmitted Bio
                </span>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed font-sans bg-[var(--color-surface-raised)]/60 p-2.5 rounded-lg border border-[var(--color-border)]">
                  {otherUser.bio}
                </p>
              </div>
            )}

            {/* Interests / Frequencies */}
            {otherUser.interests && otherUser.interests.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-semibold">
                  Tuned Topics
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {otherUser.interests.map((interest: string) => (
                    <span
                      key={interest}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]"
                    >
                      #{interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy & Trust Badge */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Verified Handshake</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Both profiles verified 18+. IP addresses and metadata are stripped from message channels.
              </p>
            </div>

            {/* Safety Actions */}
            <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="w-full flex items-center justify-between p-2 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5" /> Report Signal Abuse
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowBlockModal(true)}
                className="w-full flex items-center justify-between p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" /> Block Peer Connection
                </span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Safety Modals */}
      <ChatSafetyModal />
      {otherUser && (
        <>
          <BlockModal
            isOpen={showBlockModal}
            onClose={() => setShowBlockModal(false)}
            targetUserId={otherUser.id}
            targetUserName={otherUser.display_name}
            onSuccess={() => router.push('/dashboard/chat')}
          />
          <ReportModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            targetUserId={otherUser.id}
            targetUserName={otherUser.display_name}
          />
        </>
      )}
    </div>
  );
}
