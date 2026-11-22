'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { INTERESTS_LIST, GENDER_OPTIONS, LANGUAGE_OPTIONS, MAX_BIO_LENGTH } from '@/lib/constants';
import { calculateAge } from '@/lib/auth/age-utils';
import { Loader2, Check, X, ArrowLeft, ArrowRight, User, Palette, Heart, Globe, MapPin, Calendar } from 'lucide-react';

const AVATARS = [
  { id: 'fox', emoji: '🦊', bg: 'bg-orange-500/20' },
  { id: 'wolf', emoji: '🐺', bg: 'bg-gray-500/20' },
  { id: 'cat', emoji: '🐱', bg: 'bg-yellow-500/20' },
  { id: 'panda', emoji: '🐼', bg: 'bg-green-500/20' },
  { id: 'owl', emoji: '🦉', bg: 'bg-amber-500/20' },
  { id: 'dragon', emoji: '🐉', bg: 'bg-red-500/20' },
  { id: 'unicorn', emoji: '🦄', bg: 'bg-pink-500/20' },
  { id: 'alien', emoji: '👽', bg: 'bg-emerald-500/20' },
  { id: 'robot', emoji: '🤖', bg: 'bg-blue-500/20' },
  { id: 'ghost', emoji: '👻', bg: 'bg-purple-500/20' },
  { id: 'ninja', emoji: '🥷', bg: 'bg-slate-500/20' },
  { id: 'astronaut', emoji: '🧑‍🚀', bg: 'bg-indigo-500/20' },
];

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const needsDob = searchParams.get('needs_dob') === 'true';
  const supabase = createClient();

  const [step, setStep] = useState(needsDob ? 0 : 1);
  const totalSteps = needsDob ? 6 : 5;
  const stepOffset = needsDob ? 0 : 1;

  // Step 0: DOB (Google OAuth only)
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [dobError, setDobError] = useState('');

  // Step 1: Display name
  const [displayName, setDisplayName] = useState('');
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [nameChecking, setNameChecking] = useState(false);

  // Step 2: Avatar
  const [selectedAvatar, setSelectedAvatar] = useState('');

  // Step 3: About
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);

  // Step 4: Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Step 5: Location
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  const [saving, setSaving] = useState(false);

  // Debounced display name check
  const checkDisplayName = useCallback(async (name: string) => {
    if (name.length < 3) { setNameAvailable(null); return; }
    setNameChecking(true);
    try {
      const res = await fetch(`/api/onboarding/check-display-name?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      setNameAvailable(data.available);
    } catch {
      setNameAvailable(null);
    } finally {
      setNameChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayName.length >= 3 && /^[a-zA-Z0-9_]+$/.test(displayName)) {
        checkDisplayName(displayName);
      } else {
        setNameAvailable(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [displayName, checkDisplayName]);

  function getDobString(): string {
    if (!dobYear || !dobMonth || !dobDay) return '';
    return `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: {
        const dob = getDobString();
        if (!dob) return false;
        const age = calculateAge(new Date(dob));
        return age >= 18;
      }
      case 1:
        return displayName.length >= 3 && displayName.length <= 30 && /^[a-zA-Z0-9_]+$/.test(displayName) && nameAvailable === true;
      case 2:
        return true; // avatar is optional
      case 3:
        return gender !== '' && selectedLanguages.length > 0;
      case 4:
        return selectedInterests.length >= 1 && selectedInterests.length <= 10;
      case 5:
        return true; // location is optional
      default:
        return false;
    }
  }

  async function handleDobSubmit() {
    const dobStr = getDobString();
    if (!dobStr) { setDobError('Please fill in all fields'); return; }
    const age = calculateAge(new Date(dobStr));
    if (age < 18) { setDobError('You must be 18 or older to use Anon Connect'); return; }
    // Server-side check
    try {
      const res = await fetch('/api/auth/check-age', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dob: dobStr }),
      });
      if (!res.ok) {
        const data = await res.json();
        setDobError(data.error || 'Age verification failed');
        return;
      }
      setDobError('');
      setStep(1);
    } catch {
      setDobError('Server error');
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }

      const dobStr = getDobString();
      const profileData: Record<string, unknown> = {
        display_name: displayName,
        avatar_url: selectedAvatar || AVATARS[0].id,
        gender,
        bio: bio || null,
        interests: selectedInterests,
        languages: selectedLanguages,
        area: country ? { country, state: state || undefined, city: city || undefined } : null,
      };
      if (needsDob && dobStr) {
        profileData.dob = dobStr;
      }

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save profile');
        return;
      }

      toast.success('Profile created! Welcome to Anon Connect 🎉');
      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (step === 0) { handleDobSubmit(); return; }
    if (step === (needsDob ? 5 : 4) + stepOffset) { handleComplete(); return; }
    setStep(step + 1);
  }

  const stepLabels = needsDob
    ? ['Verify Age', 'Display Name', 'Avatar', 'About You', 'Interests', 'Location']
    : ['Display Name', 'Avatar', 'About You', 'Interests', 'Location'];

  const stepIcons = needsDob
    ? [Calendar, User, Palette, Globe, Heart, MapPin]
    : [User, Palette, Globe, Heart, MapPin];

  const currentLabel = stepLabels[step - (needsDob ? 0 : 1)] || stepLabels[0];
  const displayStep = step - (needsDob ? 0 : 1) + 1;

  const CURRENT_YEAR = 2026;
  const years = Array.from({ length: 83 }, (_, i) => CURRENT_YEAR - 18 - i);
  const days = dobMonth && dobYear
    ? Array.from({ length: new Date(Number(dobYear), Number(dobMonth), 0).getDate() }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--color-muted)]">Step {displayStep} of {totalSteps}</span>
            <span className="text-sm font-medium text-[var(--color-primary)]">{currentLabel}</span>
          </div>
          <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
            <div
              className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-500"
              style={{ width: `${(displayStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 md:p-8">
          {/* Step 0: DOB */}
          {step === 0 && needsDob && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold mb-4">
                  <span>18+</span>
                </div>
                <h2 className="text-xl font-semibold text-[var(--color-text)]">Verify Your Age</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Anon Connect is for adults only</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={dobMonth} onChange={e => setDobMonth(e.target.value)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)]">
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                </select>
                <select value={dobDay} onChange={e => setDobDay(e.target.value)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)]">
                  <option value="">Day</option>
                  {days.map(d => <option key={d} value={String(d)}>{d}</option>)}
                </select>
                <select value={dobYear} onChange={e => setDobYear(e.target.value)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)]">
                  <option value="">Year</option>
                  {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
              {dobError && <p className="text-sm text-red-400 text-center">{dobError}</p>}
            </div>
          )}

          {/* Step 1: Display Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">Choose Your Identity</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Pick a unique display name</p>
              </div>
              <div>
                <div className="relative">
                  <Input
                    placeholder="e.g. ShadowFox_42"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="pr-10"
                    maxLength={30}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {nameChecking && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted)]" />}
                    {!nameChecking && nameAvailable === true && <Check className="h-4 w-4 text-green-400" />}
                    {!nameChecking && nameAvailable === false && <X className="h-4 w-4 text-red-400" />}
                  </div>
                </div>
                <p className="mt-2 text-xs text-[var(--color-muted)]">3-30 characters. Letters, numbers, underscores only.</p>
                {nameAvailable === false && <p className="mt-1 text-xs text-red-400">This name is already taken</p>}
              </div>
            </div>
          )}

          {/* Step 2: Avatar */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">Pick Your Avatar</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Choose your anonymous identity</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {AVATARS.map(avatar => (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`flex items-center justify-center h-16 w-full rounded-xl text-3xl transition-all ${avatar.bg}
                      ${selectedAvatar === avatar.id ? 'ring-2 ring-[var(--color-primary)] scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                  >
                    {avatar.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: About You */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">About You</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Help others get to know you</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[var(--color-text)] mb-1.5 block">Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)]">
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--color-text)] mb-1.5 block">Bio</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    maxLength={MAX_BIO_LENGTH}
                    rows={3}
                    placeholder="Tell people something about you..."
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] resize-none focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                  <p className="text-xs text-[var(--color-muted)] text-right">{bio.length}/{MAX_BIO_LENGTH}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--color-text)] mb-1.5 block">Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map(lang => (
                      <button
                        key={lang.value}
                        onClick={() => {
                          setSelectedLanguages(prev =>
                            prev.includes(lang.value) ? prev.filter(l => l !== lang.value) : [...prev, lang.value]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                          ${selectedLanguages.includes(lang.value) ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Interests */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">Your Interests</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Select 1-10 topics you enjoy</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {INTERESTS_LIST.map(interest => (
                  <button
                    key={interest}
                    onClick={() => {
                      setSelectedInterests(prev =>
                        prev.includes(interest) ? prev.filter(i => i !== interest) :
                          prev.length < 10 ? [...prev, interest] : prev
                      );
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${selectedInterests.includes(interest)
                        ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                        : 'bg-[var(--color-bg)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]'
                      }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-muted)] text-center">{selectedInterests.length}/10 selected</p>
            </div>
          )}

          {/* Step 5: Location */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">Location (Optional)</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Helps connect you with people nearby</p>
              </div>
              <div className="space-y-4">
                <Input label="Country" placeholder="e.g. India" value={country} onChange={e => setCountry(e.target.value)} />
                <Input label="State / Province" placeholder="e.g. Maharashtra" value={state} onChange={e => setState(e.target.value)} />
                <Input label="City" placeholder="e.g. Mumbai" value={city} onChange={e => setCity(e.target.value)} />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-border)]">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === (needsDob ? 0 : 1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            {step === 5 ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleComplete} disabled={saving}>
                  Skip
                </Button>
                <Button onClick={handleComplete} disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <>Complete <Check className="ml-2 h-4 w-4" /></>}
                </Button>
              </div>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
