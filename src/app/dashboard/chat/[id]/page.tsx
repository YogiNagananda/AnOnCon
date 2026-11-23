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
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setCurrentUserId(user.id);
      loadChat();
    }
    init();
  }, [chatId]);

  // Supabase Realtime Subscription for Messages & Broadcast Typing
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
              // Avoid duplicates
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(scrollToBottom, 50);

            // If incoming message from other user, mark it read
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

  // Broadcast typing on keystroke
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
        setText(messageText); // restore
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(scrollToBottom, 50);
    } catch {
      toast.error('Failed to send message');
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
          m.id === msgId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m
        )
      );
      toast.success('Message deleted');
    } catch {
      toast.error('An error occurred');
    } finally {
      setDeleteMessageId(null);
    }
  }

  // Clear chat for me
  async function handleClearChat() {
    setShowMenu(false);
    if (!confirm('Clear all messages in this chat for you?')) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/clear`, { method: 'POST' });
      if (!res.ok) {
        toast.error('Failed to clear chat');
        return;
      }
      setMessages([]);
      toast.success('Chat cleared for you');
    } catch {
      toast.error('Something went wrong');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mb-2" />
        <p className="text-sm text-[var(--color-muted)]">Opening chat...</p>
      </div>
    );
  }

  const avatarEmoji = AVATARS[otherUser?.avatar_url || ''] || '👤';

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] my-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/dashboard/chat')}
            className="p-1 rounded-lg text-[var(--color-muted)] hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-xl select-none">
              {avatarEmoji}
            </div>
            {otherUser?.is_online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[var(--color-surface)]" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--color-text)] truncate">
              {otherUser?.display_name || 'Anonymous User'}
            </h2>
            <p className="text-[11px] text-[var(--color-muted)]">
              {isOtherTyping ? (
                <span className="text-[var(--color-primary)] font-medium animate-pulse">Typing...</span>
              ) : otherUser?.is_online ? (
                <span className="text-emerald-400">Online</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        {/* Action Menu & Call Buttons */}
        <div className="flex items-center gap-1">
          {otherUser && (
            <>
              <button
                onClick={() => startCall(chatId, otherUser.id, otherUser.display_name, otherUser.avatar_url, 'voice')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                title="Voice Call"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button
                onClick={() => startCall(chatId, otherUser.id, otherUser.display_name, otherUser.avatar_url, 'video')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                title="Video Call (Voice first, video requires mutual opt-in)"
              >
                <Video className="h-4 w-4" />
              </button>
            </>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-[var(--color-border)] shadow-xl z-20 py-1.5 text-xs">
              <button
                onClick={handleClearChat}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-300 hover:text-white"
              >
                <Eraser className="h-4 w-4" /> Clear Chat for Me
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-amber-400"
              >
                <Flag className="h-4 w-4" /> Report User
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowBlockModal(true); }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-red-500/10 text-red-400"
              >
                <Shield className="h-4 w-4" /> Block User
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Safety Disclaimer Banner */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 text-center justify-center">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Keep it anonymous. Never share real name, address, passwords, or send money.</span>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-muted)]">
            <p className="text-sm">Say hi to start the conversation! 👋</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUserId;
            const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm relative ${
                    isMe
                      ? 'bg-[var(--color-primary)] text-white rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/50'
                  }`}
                >
                  {m.is_deleted ? (
                    <span className="italic opacity-60 text-xs">This message was deleted</span>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  )}

                  {/* Message footer: Time + Read Receipts + Delete Button */}
                  <div className={`flex items-center gap-1.5 mt-1 text-[10px] ${isMe ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
                    <span>{timeStr}</span>
                    {isMe && !m.is_deleted && (
                      <span>
                        {m.read_at ? (
                          <span title="Read"><CheckCheck className="h-3.5 w-3.5 text-emerald-300 inline" /></span>
                        ) : m.delivered_at ? (
                          <span title="Delivered"><CheckCheck className="h-3.5 w-3.5 text-slate-300 inline" /></span>
                        ) : (
                          <span title="Sent"><Check className="h-3.5 w-3.5 text-slate-400 inline" /></span>
                        )}
                      </span>
                    )}

                    {isMe && !m.is_deleted && (
                      <button
                        onClick={() => handleDeleteMessage(m.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-300 ml-1 transition-opacity"
                        title="Delete for everyone"
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
      <form onSubmit={handleSend} className="p-3 border-t border-[var(--color-border)] bg-slate-900/60 flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Type an anonymous message..."
          className="flex-1 rounded-xl bg-[var(--color-bg)]"
          disabled={sending}
        />
        <Button type="submit" size="sm" disabled={!text.trim() || sending} className="rounded-xl px-4">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
