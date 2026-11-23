import Link from 'next/link';
import { Ban, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccountBannedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-red-500/30 text-center shadow-xl shadow-red-950/20">
        <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 mb-6">
          <Ban className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-bold text-white">Account Restricted</h1>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          Your account has been suspended or permanently banned due to violations of our{' '}
          <Link href="/guidelines" className="text-indigo-400 hover:underline">
            Community Guidelines
          </Link>{' '}
          or Terms of Service.
        </p>

        <div className="my-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs text-slate-400 space-y-2">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              We have a zero-tolerance policy for underage accounts, harassment, exploitation, and scamming.
            </span>
          </div>
          <p>Active sessions have been terminated. Future registration attempts from flagged devices may be prevented.</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/safety"
            className="block w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            Visit Safety Center
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
