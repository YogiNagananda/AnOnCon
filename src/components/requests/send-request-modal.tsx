'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface SendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  };
  onSuccess?: () => void;
}

export function SendRequestModal({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}: SendRequestModalProps) {
  const [intro, setIntro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: targetUser.id,
          intro: intro.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send request');
        return;
      }

      toast.success(`Connection request sent to ${targetUser.display_name}!`);
      setIntro('');
      onSuccess?.();
      onClose();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Connect with ${targetUser.display_name}`}>
      <form onSubmit={handleSend} className="space-y-4">
        <p className="text-xs text-[var(--color-muted)]">
          They will need to accept your request before 1:1 chat unlocks. You can include an optional icebreaker message (max 140 chars).
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Intro Message (Optional)
          </label>
          <textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            maxLength={140}
            rows={3}
            placeholder="Hey! Saw that you like sci-fi and gaming..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:border-[var(--color-primary)] focus:outline-none"
          />
          <div className="flex justify-between text-xs text-[var(--color-muted)]">
            <span>Rate limit: 20 per hour</span>
            <span>{intro.length}/140</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Send Request
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
