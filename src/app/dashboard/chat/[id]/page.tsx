'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] font-mono text-xs text-[var(--color-muted)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)] mb-2" />
        <p>Connecting to secure channel...</p>
      </div>
    );
  }

  const avatarEmoji = AVATARS[otherUser?.avatar_url || ''] || '👤';

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] my-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/dashboard/chat')}
            className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xl select-none">
              {avatarEmoji}
            </div>
            {otherUser?.is_online && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[var(--color-surface)]"
                title="Online"
              />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--color-text)] truncate">
              {otherUser?.display_name || 'Anonymous Peer'}
            </h2>
            <p className="text-[11px] font-mono text-[var(--color-muted)]">
              {isOtherTyping ? (
                <span className="text-[var(--color-primary)] font-medium">
                  [ transmitting... ]
                </span>
              ) : otherUser?.is_online ? (
                <span className="text-emerald-500 font-medium">// active</span>
              ) : (
                '// offline'
              )}
            </p>
          </div>
        </div>

        {/* Action Menu & Call Buttons */}
        <div className="flex items-center gap-1">
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
                className="p-1.5 rounded text-[var(--color-muted)] hover:text-emerald-500 hover:bg-[var(--color-surface)] transition-colors"
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
                className="p-1.5 rounded text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
                title="Video Call (Voice first, video requires mutual opt-in)"
                aria-label="Video Call"
              >
                <Video className="h-4 w-4" />
              </button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
              aria-label="Channel Options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg z-30 py-1 text-xs font-mono">
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
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Safety Warning Banner */}
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-mono flex items-center gap-2 justify-center text-center">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Keep it anonymous. Never share real identity, passwords, or send money.</span>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-muted)] font-mono">
            <p className="text-xs uppercase tracking-wider">Secure channel open. Send an intro message.</p>
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
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                <div
                  className={`max-w-[78%] rounded-lg px-3.5 py-2.5 text-sm shadow-none relative ${
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

                  {/* Footer: timestamp + receipts + delete */}
                  <div
                    className={`flex items-center gap-1.5 mt-1 text-[10px] font-mono ${
                      isMe ? 'text-white/80 justify-end' : 'text-[var(--color-muted)] justify-start'
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isMe && !m.is_deleted && (
                      <span>
                        {m.read_at ? (
                          <span title="Read">
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-300 inline" />
                          </span>
                        ) : m.delivered_at ? (
                          <span title="Delivered">
                            <CheckCheck className="h-3.5 w-3.5 text-white/70 inline" />
                          </span>
                        ) : (
                          <span title="Sent">
                            <Check className="h-3.5 w-3.5 text-white/70 inline" />
                          </span>
                        )}
                      </span>
                    )}

                    {isMe && !m.is_deleted && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(m.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-200 ml-1 transition-opacity"
                        title="Delete message"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] flex items-center gap-2"
      >
        <Input
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Transmit anonymous message..."
          className="flex-1 bg-[var(--color-bg)] text-xs font-mono"
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
