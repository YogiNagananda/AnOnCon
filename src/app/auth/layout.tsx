import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Anon Connect - Authentication',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-950 to-black px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / App Name */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Anon<span className="text-indigo-400">Connect</span>
          </h1>
          <p className="text-sm text-slate-400">
            Connect anonymously. Stay safe.
          </p>
          {/* 18+ Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            18+ Only
          </span>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-indigo-500/5 backdrop-blur-sm sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By using Anon Connect you agree to our{' '}
          <a href="/terms" className="text-indigo-400 hover:underline">
            Terms of Service
          </a>
          ,{' '}
          <a href="/privacy" className="text-indigo-400 hover:underline">
            Privacy Policy
          </a>
          , and{' '}
          <a href="/guidelines" className="text-indigo-400 hover:underline">
            Community Guidelines
          </a>
          . Visit our{' '}
          <a href="/safety" className="text-emerald-400 hover:underline font-medium">
            Safety Center
          </a>
          .
        </p>
      </div>
    </div>
  );
}
