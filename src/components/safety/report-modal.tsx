'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or Bullying', desc: 'Disrespectful, threatening, or stalking behavior' },
  { value: 'sexual content', label: 'Inappropriate / Sexual Content', desc: 'Unsolicited explicit talk or media requests' },
  { value: 'scam/spam', label: 'Scam or Spam', desc: 'Asking for money, gift cards, or external links' },
  { value: 'appears under 18', label: 'Appears Under 18 (Priority Review)', desc: 'User suspected of being underage' },
  { value: 'other', label: 'Other Safety Concern', desc: 'Any other violation of safety guidelines' },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  onSuccess?: () => void;
}

export function ReportModal({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  onSuccess,
}: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/safety/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_id: targetUserId,
          reason,
          details,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit report');
        return;
      }

      toast.success('Report submitted. Our moderation team will investigate.');
      onSuccess?.();
      onClose();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Report ${targetUserName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>Reports are confidential. We strictly enforce safety and block underage users.</span>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Select Reason
          </label>
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  reason === r.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{r.label}</p>
                  <p className="text-xs text-[var(--color-muted)]">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Additional Details (Optional)
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Tell us what happened..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
