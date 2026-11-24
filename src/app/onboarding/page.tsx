'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INTERESTS_LIST, GENDER_OPTIONS, LANGUAGE_OPTIONS, MAX_BIO_LENGTH } from '@/lib/constants';
import { calculateAge } from '@/lib/auth/age-utils';
import {
  Loader2,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  Shield,
  Fingerprint,
  Smile,
  Compass,
  Tag,
  MapPin,
  Calendar,
} from 'lucide-react';

interface AvatarOption {
  id: string;
  name: string;
  glyph: string;
}

const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'fox', name: 'Fox', glyph: '🦊' },
  { id: 'wolf', name: 'Wolf', glyph: '🐺' },
  { id: 'cat', name: 'Cat', glyph: '🐱' },
  { id: 'panda', name: 'Panda', glyph: '🐼' },
  { id: 'owl', name: 'Owl', glyph: '🦉' },
  { id: 'dragon', name: 'Dragon', glyph: '🐉' },
  { id: 'unicorn', name: 'Unicorn', glyph: '🦄' },
  { id: 'alien', name: 'Alien', glyph: '👽' },
  { id: 'robot', name: 'Robot', glyph: '🤖' },
  { id: 'ghost', name: 'Ghost', glyph: '👻' },
  { id: 'ninja', name: 'Ninja', glyph: '🥷' },
  { id: 'astronaut', name: 'Astronaut', glyph: '🧑‍🚀' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].id);

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
    if (name.length < 3) {
      setNameAvailable(null);
      return;
    }
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
    }, 450);
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
        return true;
      case 3:
        return gender !== '' && selectedLanguages.length > 0;
      case 4:
        return selectedInterests.length >= 1 && selectedInterests.length <= 10;
      case 5:
        return true;
      default:
        return false;
    }
  }

  async function handleDobSubmit() {
    const dobStr = getDobString();
    if (!dobStr) {
      setDobError('Please specify year, month, and day');
      return;
    }
    const age = calculateAge(new Date(dobStr));
    if (age < 18) {
      setDobError('Access restricted: members must be 18 years or older');
      return;
    }
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
      setDobError('Verification connection failed. Please retry.');
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Session expired. Please sign in again.');
        return;
      }

      const dobStr = getDobString();
      const profileData: Record<string, unknown> = {
        display_name: displayName,
        avatar_url: selectedAvatar || AVATAR_OPTIONS[0].id,
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

      toast.success('Anon profile created. Welcome to the broadsheet.');
      router.push('/dashboard');
    } catch {
      toast.error('Network error while completing profile');
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (step === 0) {
      handleDobSubmit();
      return;
    }
    if (step === (needsDob ? 5 : 4) + stepOffset) {
      handleComplete();
      return;
    }
    setStep(step + 1);
  }

  const stepLabels = needsDob
    ? ['Age Gate', 'Handle', 'Mask', 'Profile', 'Interests', 'Region']
    : ['Handle', 'Mask', 'Profile', 'Interests', 'Region'];

  const displayStep = step - (needsDob ? 0 : 1) + 1;
  const currentLabel = stepLabels[displayStep - 1] || stepLabels[0];

  const CURRENT_YEAR = 2026;
  const years = Array.from({ length: 83 }, (_, i) => CURRENT_YEAR - 18 - i);
  const days = dobMonth && dobYear
    ? Array.from({ length: new Date(Number(dobYear), Number(dobMonth), 0).getDate() }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col items-center justify-center p-4 sm:p-6 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      <div className="w-full max-w-lg space-y-6">
        {/* Header telemetry / step meter */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1.5 uppercase tracking-wider text-[var(--color-text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
              Stage {String(displayStep).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
            </span>
            <span className="uppercase tracking-widest text-[var(--color-primary)] font-medium">
              // {currentLabel}
            </span>
          </div>

          {/* Segmented meter */}
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1 w-full" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-sm transition-colors duration-300 ${idx < displayStep
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)]'
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Main card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 sm:p-8 shadow-sm">
          {/* Step 0: Age Gate (Google OAuth) */}
          {step === 0 && needsDob && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] font-mono text-xs text-[var(--color-primary)]">
                  <Shield className="w-3.5 h-3.5" />
                  <span>MANDATORY 18+ REQUIREMENT</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
                  Confirm your birth date
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Anon Connect is restricted strictly to legal adults. Your birth date is kept private and never exposed on your public handle.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--color-muted)] mb-1.5">Month</label>
                  <select
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                    className="w-full h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={String(i + 1)}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--color-muted)] mb-1.5">Day</label>
                  <select
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}
                    className="w-full h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="">Day</option>
                    {days.map((d) => (
                      <option key={d} value={String(d)}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--color-muted)] mb-1.5">Year</label>
                  <select
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}
                    className="w-full h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="">Year</option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {dobError && (
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-500">
                  {dobError}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Display Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-primary)]">
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>CAMPUS CALLSIGN</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
                  Choose your pseudonym
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  This is the sole handle other students see. Never use your real name, student ID, or personal contact.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Input
                    placeholder="e.g. shadow_rover"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="pr-10 font-mono"
                    maxLength={30}
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {nameChecking && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted)]" />}
                    {!nameChecking && nameAvailable === true && (
                      <span className="flex items-center gap-1 text-xs font-mono text-emerald-500">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {!nameChecking && nameAvailable === false && (
                      <span className="flex items-center gap-1 text-xs font-mono text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-[var(--color-muted)]">
                  <span>3-30 chars: a-z, 0-9, underscore</span>
                  {nameAvailable === true && (
                    <span className="text-emerald-500 font-medium">Available</span>
                  )}
                  {nameAvailable === false && (
                    <span className="text-red-500 font-medium">Handle taken</span>
                  )}
                </div>

                {/* Identity preview */}
                <div className="p-3 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--color-muted)]">Signal tag preview:</span>
                  <span className="font-mono text-xs font-medium text-[var(--color-text)]">
                    [ anon // {displayName || 'callsign'} ]
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Mask / Avatar */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-primary)]">
                  <Smile className="w-3.5 h-3.5" />
                  <span>IDENTITY MASK</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
                  Select your mask
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Your broadcast identifier across discover, nearby radio bands, and anonymous audio channels.
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {AVATAR_OPTIONS.map((avatar) => {
                  const isSelected = selectedAvatar === avatar.id;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`group relative flex flex-col items-center justify-center p-3 rounded-lg border text-left transition-colors duration-150 ${isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-accent-subtle)] ring-1 ring-[var(--color-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border)]/80 hover:bg-[var(--color-surface-raised)]/80'
                        }`}
                    >
                      <span className="text-2xl mb-1 transition-transform group-hover:scale-105">
                        {avatar.glyph}
                      </span>
                      <span className="text-xs font-mono font-medium text-[var(--color-text)] tracking-tight">
                        {avatar.name}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: About You */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-primary)]">
                  <Compass className="w-3.5 h-3.5" />
                  <span>BROADCAST NOTES</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
                  About your frequency
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Basic context so matching algorithms and nearby peers know who is transmitting.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
                    Gender Identity
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="">Select gender option</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)]">
                      Bio statement (candid & concise)
                    </label>
                    <span className="text-xs font-mono text-[var(--color-muted)]">
                      {bio.length}/{MAX_BIO_LENGTH}
                    </span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={MAX_BIO_LENGTH}
                    rows={3}
                    placeholder="Late-night audio editor, coffee addict, studying architecture. Up for talk about films."
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] resize-none focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-2">
                    Languages Spoken
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const isSelected = selectedLanguages.includes(lang.value);
                      return (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => {
                            setSelectedLanguages((prev) =>
                              prev.includes(lang.value)
                                ? prev.filter((l) => l !== lang.value)
                                : [...prev, lang.value]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors duration-150 ${isSelected
                            ? 'bg-[var(--color-primary)] text-white font-medium'
                            : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-text-secondary)]'
                            }`}
                        >
                          {lang.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Interests */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-primary)]">
                  <Tag className="w-3.5 h-3.5" />
                  <span>INTEREST TAGS</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
                  Choose 1–10 topics
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Used by the Discover algorithm to match overlapping campus hobbies, clubs, and talk tracks.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
                {INTERESTS_LIST.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => {
                        setSelectedInterests((prev) =>
                          prev.includes(interest)
                            ? prev.filter((i) => i !== interest)
                            : prev.length < 10
                              ? [...prev, interest]
                              : prev
                        );
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors duration-150 ${isSelected
                        ? 'bg-[var(--color-primary)] text-white font-medium'
                        : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                        }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-[var(--color-muted)] pt-2 border-t border-[var(--color-border)]">
                <span>Min 1, Max 10 selections</span>
                <span className={selectedInterests.length >= 1 ? 'text-[var(--color-primary)] font-medium' : ''}>
                  [{selectedInterests.length}/10 selected]
                </span>
              </div>
            </div>
          )}

          {/* Step 5: Location */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-primary)]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>REGIONAL PROXIMITY</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
                  General Location (Optional)
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Optional city or state for broad filter matching. In Nearby Mode, location is fuzzed within ~110m bands for complete privacy.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    Country
                  </label>
                  <Input
                    placeholder="e.g. United States or India"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    State / Province
                  </label>
                  <Input
                    placeholder="e.g. California or Karnataka"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    City / Campus Area
                  </label>
                  <Input
                    placeholder="e.g. Berkeley or North Campus"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions footer */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--color-border)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(step - 1)}
              disabled={step === (needsDob ? 0 : 1)}
              className="font-mono text-xs"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
            </Button>

            {step === (needsDob ? 5 : 5) ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleComplete}
                  disabled={saving}
                  className="font-mono text-xs text-[var(--color-muted)]"
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={saving}
                  className="font-mono text-xs"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Enter broadsheet <Check className="ml-1.5 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!canProceed()}
                className="font-mono text-xs"
              >
                Continue <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Safety footnote */}
        <p className="text-center font-mono text-[11px] text-[var(--color-muted)]">
          Encrypted anon transport // 18+ verified members only
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
