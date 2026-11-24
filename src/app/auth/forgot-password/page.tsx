'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center antialiased">
        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
          <Mail className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[var(--color-text)]">Check your inbox</h2>
          <p className="text-xs text-[var(--color-text-secondary)] font-mono">
            Password reset link transmitted to <strong className="text-[var(--color-text)]">{email}</strong>
          </p>
        </div>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 antialiased">
      <div className="space-y-1">
        <span className="font-mono text-xs text-[var(--color-primary)] uppercase tracking-wider block">
          ACCOUNT RECOVERY
        </span>
        <h2 className="text-lg font-bold text-[var(--color-text)]">Reset password</h2>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Enter your registered email to receive an authentication recovery link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 font-mono">
        <div className="space-y-1">
          <label htmlFor="email" className="text-xs uppercase text-[var(--color-muted)]">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted)]" />
            <Input
              id="email"
              type="email"
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 text-xs"
              disabled={loading}
              required
            />
          </div>
        </div>

        <Button type="submit" size="sm" className="w-full text-xs h-9" disabled={loading || !email}>
          {loading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Transmitting...
            </>
          ) : (
            'Transmit Reset Link'
          )}
        </Button>
      </form>

      <p className="text-center font-mono text-xs text-[var(--color-muted)]">
        Remember callsign key?{' '}
        <Link href="/auth/login" className="text-[var(--color-primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
