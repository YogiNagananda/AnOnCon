'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import type { Profile } from '@/lib/supabase/types';
import { GENDER_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/constants';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" /></div>;
  if (!profile) return null;

  const genderLabel = GENDER_OPTIONS.find(g => g.value === profile.gender)?.label || profile.gender;
  const langLabels = (profile.languages || []).map(l => LANGUAGE_OPTIONS.find(lo => lo.value === l)?.label || l);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-5xl mx-auto mb-4">
          {AVATARS[profile.avatar_url || ''] || '👤'}
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text)]">{profile.display_name}</h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">{genderLabel}</p>
        {profile.bio && <p className="text-sm text-[var(--color-text)] mt-3 max-w-sm mx-auto">{profile.bio}</p>}
      </div>

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map(i => (
              <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">{i}</span>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {langLabels.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {langLabels.map(l => (
              <span key={l} className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)]">{l}</span>
            ))}
          </div>
        </div>
      )}

      {/* Area */}
      {profile.area && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Location</h3>
          <p className="text-sm text-[var(--color-muted)]">
            {[profile.area.city, profile.area.state, profile.area.country].filter(Boolean).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
