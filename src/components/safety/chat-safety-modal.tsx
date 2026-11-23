'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ShieldCheck, EyeOff, AlertTriangle, Lock, Shield } from 'lucide-react';

interface ChatSafetyModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = 'anon_has_seen_chat_safety_tips';

export function ChatSafetyModal({ forceOpen, onClose }: ChatSafetyModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    onClose?.();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} title="Safety First: Anonymous Chat Tips">
      <div className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-indigo-400" />
          <p>
            Welcome to anonymous chatting. To protect your identity and have the best experience, keep these safety principles in mind:
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <EyeOff className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Protect Your Identity</p>
              <p className="text-slate-400 mt-0.5">
                Never share your real name, personal social media handles, phone number, address, or workplace.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">24-Hour Safety Shield</p>
              <p className="text-slate-400 mt-0.5">
                External links, phone numbers, and email addresses are automatically blocked during the first 24 hours of every new connection.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Zero Tolerance Policy</p>
              <p className="text-slate-400 mt-0.5">
                Harassment, hate speech, financial scams, and anyone appearing under 18 will be permanently banned.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">You Are Always in Control</p>
              <p className="text-slate-400 mt-0.5">
                You can block or report any conversation at any time from the chat menu (top-right).
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={handleDismiss} variant="primary" className="w-full rounded-xl">
            I Understand — Start Chatting
          </Button>
        </div>
      </div>
    </Modal>
  );
}
