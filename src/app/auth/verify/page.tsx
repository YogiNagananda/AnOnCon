import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Email Verified - Anon Connect',
};

export default function VerifyPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center antialiased">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
      </div>

      <h2 className="text-lg font-bold text-[var(--color-text)] font-sans">
        Email verified
      </h2>

      <p className="text-xs text-[var(--color-text-secondary)] max-w-xs leading-relaxed">
        Your email has been verified. You can now authenticate your callsign and enter the broadsheet.
      </p>

      <Link href="/auth/login" className="mt-2">
        <Button size="sm" className="font-mono text-xs">
          Proceed to Sign In
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </Link>
    </div>
  );
}
