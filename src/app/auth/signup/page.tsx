'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,

  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { signupSchema } from '@/lib/validations';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TurnstileWidget } from '@/components/ui/turnstile-widget';
import { calculateAge } from '@/lib/auth/age-utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = 2026;

function generateYears() {
  const years: number[] = [];
  for (let y = CURRENT_YEAR - 18; y >= CURRENT_YEAR - 100; y--) {
    years.push(y);
  }
  return years;
}

function generateDays(month: number, year: number): number[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
}

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // DOB selects
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  function getDobString(): string {
    if (!dobYear || !dobMonth || !dobDay) return '';
    return `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
  }

  function getAgeError(): string | null {
    const dobStr = getDobString();
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const age = calculateAge(dob);
    if (age < 18) return 'You must be 18 or older to use Anon Connect';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const dobStr = getDobString();

    // Client-side validation
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    const result = signupSchema.safeParse({
      email,
      password,
      dob: dobStr,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Client-side 18+ check
    const ageErr = getAgeError();
    if (ageErr) {
      setErrors({ dob: ageErr });
      return;
    }

    if (!confirmAdult) {
      setErrors({ adult: 'You must confirm that you are at least 18 years old.' });
      return;
    }

    if (!agreedToTerms) {
      setErrors({ terms: 'You must agree to the Terms of Service, Privacy Policy, and Community Guidelines.' });
      return;
    }

    setLoading(true);
    try {
      // Call server-side signup API for hard validation
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          dob: dobStr,
          captchaToken,
          confirmAdult: true,
          agreedToTerms: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && typeof data.errors === 'object') {
          setErrors(data.errors);
        } else {
          toast.error(data.error || 'Signup failed');
        }
        return;
      }

      setSuccess(true);
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(error.message);
        setGoogleLoading(false);
      }
    } catch {
      toast.error('Failed to initiate Google sign-in');
      setGoogleLoading(false);
    }
  }

  // Show success screen after signup
  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Check your email</h2>
        <p className="text-sm text-slate-400">
          We&apos;ve sent a verification link to{' '}
          <span className="font-medium text-white">{email}</span>. Click the
          link to verify your account.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  const ageError = getAgeError();
  const years = generateYears();
  const days =
    dobMonth && dobYear
      ? generateDays(Number(dobMonth), Number(dobYear))
      : Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Create an account</h2>
        <p className="mt-1 text-sm text-slate-400">
          Join the anonymous community
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-slate-300"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-slate-300"
          >
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-400">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Date of Birth
            </span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Month */}
            <select
              value={dobMonth}
              onChange={(e) => setDobMonth(e.target.value)}
              disabled={loading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </select>

            {/* Day */}
            <select
              value={dobDay}
              onChange={(e) => setDobDay(e.target.value)}
              disabled={loading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">Day</option>
              {days.map((d) => (
                <option key={d} value={String(d)}>
                  {d}
                </option>
              ))}
            </select>

            {/* Year */}
            <select
              value={dobYear}
              onChange={(e) => setDobYear(e.target.value)}
              disabled={loading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">Year</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {(ageError || errors.dob) && (
            <p className="text-xs text-red-400">{ageError || errors.dob}</p>
          )}
        </div>

        {/* 18+ Confirmation */}
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmAdult}
              onChange={(e) => setConfirmAdult(e.target.checked)}
              disabled={loading}
              className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
            <span>
              I confirm that I am at least <strong>18 years of age</strong>.
            </span>
          </label>
          {errors.adult && <p className="text-xs text-red-400">{errors.adult}</p>}
        </div>

        {/* Terms, Privacy & Community Guidelines */}
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={loading}
              className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
            <span>
              I agree to the{' '}
              <a href="/terms" className="text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>
              ,{' '}
              <a href="/privacy" className="text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              , and{' '}
              <a href="/guidelines" className="text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">
                Community Guidelines
              </a>
              .
            </span>
          </label>
          {errors.terms && <p className="text-xs text-red-400">{errors.terms}</p>}
        </div>

        {/* Cloudflare Turnstile CAPTCHA */}
        <TurnstileWidget onVerify={(token) => setCaptchaToken(token)} />

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !!ageError}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-slate-900 px-2 text-slate-500">
            or continue with
          </span>
        </div>
      </div>

      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        Sign up with Google
      </Button>

      {/* Sign in link */}
      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
