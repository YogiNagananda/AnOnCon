'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ShieldX, Loader2 } from 'lucide-react';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  onSuccess?: () => void;
}

export function BlockModal({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  onSuccess,
}: BlockModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleBlock() {
    setLoading(true);
    try {
      const res = await fetch('/api/safety/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to block user');
        return;
      }

      toast.success(`${targetUserName} has been blocked.`);
      onSuccess?.();
      onClose();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Block ${targetUserName}?`}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <ShieldX className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-200">This action is instant and mutual.</p>
            <p className="text-xs text-red-300/80">
              • Neither of you will see each other in discovery or search.
              <br />
              • Any active conversation will be closed immediately.
              <br />
              • All pending requests will be rejected.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBlock} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Blocking...
              </>
            ) : (
              'Confirm Block'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
