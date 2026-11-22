import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Email Verified - Anon Connect',
};

export default function VerifyPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle2 className="h-8 w-8 text-green-400" />
      </div>

      <h2 className="text-xl font-semibold text-white">Email verified!</h2>

      <p className="text-sm text-slate-400">
        Your email has been successfully verified. You can now sign in to your
        account and start connecting.
      </p>

      <Link
        href="/auth/login"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Sign in
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
