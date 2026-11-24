'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Settings, MapPin, Globe, Hash } from 'lucide-react';
import type { Profile } from '@/lib/supabase/types';
import { GENDER_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/constants';
import { getAgeRange } from '@/lib/auth/age-utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data as Profile);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 font-mono text-xs text-[var(--color-muted)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)] mb-2" />
        <p>Retrieving callsign data...</p>
      </div>
    );
  }

  if (!profile) return null;

  const genderLabel =
    GENDER_OPTIONS.find((g) => g.value === profile.gender)?.label || profile.gender;
  const langLabels = (profile.languages || []).map(
    (l) => LANGUAGE_OPTIONS.find((lo) => lo.value === l)?.label || l
  );
  const ageRange = profile.dob ? getAgeRange(new Date(profile.dob)) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <span className="font-mono text-xs text-[var(--color-primary)] uppercase tracking-wider">
            // IDENTITY CARD
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Active Callsign
          </h1>
        </div>

        <Link href="/settings">
          <Button size="sm" variant="outline" className="font-mono text-xs h-8">
            <Settings className="h-3.5 w-3.5 mr-1.5" /> Configure
          </Button>
        </Link>
      </div>

      {/* Profile Header */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-4xl shrink-0 select-none shadow-sm">
            {AVATARS[profile.avatar_url || ''] || '👤'}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-[var(--color-text)]">
                {profile.display_name}
              </h2>
              {ageRange && (
                <span className="font-mono text-[10px] text-[var(--color-muted)] border border-[var(--color-border)] px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)]">
                  {ageRange}
                </span>
              )}
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 font-mono text-xs text-[var(--color-muted)]">
              {genderLabel && <span>{genderLabel}</span>}
              <span>//</span>
              <span className="text-emerald-500 font-medium">active identity</span>
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-surface-raised)] p-3 rounded-lg border border-[var(--color-border)] font-sans">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm space-y-3 font-mono">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-muted)] font-semibold">
            <Hash className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span>Topic Frequencies ({profile.interests.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.map((i) => (
              <span
                key={i}
                className="text-[11px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] px-2.5 py-0.5 rounded"
              >
                #{i}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {langLabels.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm space-y-3 font-mono">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-muted)] font-semibold">
            <Globe className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span>Transmission Languages</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {langLabels.map((l) => (
              <span
                key={l}
                className="text-[11px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] px-2.5 py-0.5 rounded"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      {profile.area && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm space-y-2 font-mono">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-muted)] font-semibold">
            <MapPin className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span>Regional Zone</span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {[profile.area.city, profile.area.state, profile.area.country]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
