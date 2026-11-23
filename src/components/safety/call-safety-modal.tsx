'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { PhoneCall, Video, ShieldCheck, Eye, PhoneOff } from 'lucide-react';

interface CallSafetyModalProps {
  forceOpen?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const STORAGE_KEY = 'anon_has_seen_call_safety_tips';

export function CallSafetyModal({ forceOpen, onConfirm, onCancel }: CallSafetyModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setIsOpen(true);
    } else {
      // If already seen and not forced open, directly proceed
      onConfirm();
    }
  }, [forceOpen, onConfirm]);

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    onConfirm();
  }

  function handleClose() {
    setIsOpen(false);
    onCancel();
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Safety First: Voice & Video Calling">
      <div className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-purple-400" />
          <p>
            Anon Connect calls are end-to-end encrypted and completely anonymous. Review these tips before joining:
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <Video className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Discreet Video & Backgrounds</p>
              <p className="text-slate-400 mt-0.5">
                Ensure personal documents, diplomas, family photos, or identifiable landmarks outside your window are not visible in your camera feed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <Eye className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Video is Always Optional</p>
              <p className="text-slate-400 mt-0.5">
                You can turn your video on or off at any moment during the call without ending the audio connection.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <PhoneOff className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Instant Disconnect</p>
              <p className="text-slate-400 mt-0.5">
                You can disconnect immediately at any time if you feel uncomfortable. Report and block controls remain accessible.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <Button onClick={handleClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button onClick={handleAccept} variant="primary" size="sm">
            I Understand — Continue Call
          </Button>
        </div>
      </div>
    </Modal>
  );
}
