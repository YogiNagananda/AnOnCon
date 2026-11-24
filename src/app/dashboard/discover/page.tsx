'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileCard, AnonymousProfile } from '@/components/discovery/profile-card';
import { RequestsInbox } from '@/components/requests/requests-inbox';
import { INTERESTS_LIST, GENDER_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/constants';
import {
  Filter,
  Shuffle,
  Radio,
  Bookmark,
  RotateCcw,
  Loader2,
  Users,
  Inbox,
  Trash2,
} from 'lucide-react';

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    gender?: string;
    language?: string;
    country?: string;
    interests?: string[];
  };
}

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<'discover' | 'inbox'>('discover');
  const [profiles, setProfiles] = useState<AnonymousProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters state
  const [gender, setGender] = useState('all');
  const [language, setLanguage] = useState('all');
  const [country, setCountry] = useState('all');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [randomMode, setRandomMode] = useState(false);

  // Presets state
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Load Presets
  async function loadPresets() {
    try {
      const res = await fetch('/api/discovery/presets');
      const data = await res.json();
      if (res.ok) setPresets(data.presets || []);
    } catch {
      // silent
    }
  }

  // Fetch Profiles
  async function fetchProfiles(customInterests?: string[]) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (gender !== 'all') params.set('gender', gender);
      if (language !== 'all') params.set('language', language);
      if (country !== 'all') params.set('country', country);

      const interestsToUse = customInterests ?? selectedInterests;
      if (interestsToUse.length > 0) {
        params.set('interests', interestsToUse.join(','));
      }
      if (randomMode) {
        params.set('random_pool', 'true');
      }

      const res = await fetch(`/api/discovery?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setProfiles(data.profiles || []);
      } else {
        toast.error(data.error || 'Failed to fetch profiles');
      }
    } catch {
      toast.error('An error occurred loading profiles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPresets();
    fetchProfiles();
  }, [gender, language, country, randomMode]);

  // Handle Random Mode presence pulse
  useEffect(() => {
    if (!randomMode) return;
    async function pulse() {
      await fetch('/api/discovery/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: true }),
      });
    }
    pulse();
    const interval = setInterval(pulse, 60000);
    return () => clearInterval(interval);
  }, [randomMode]);

  // "Pick Random" matching user
  function handlePickRandom() {
    if (profiles.length === 0) {
      toast.info('No profiles available matching current band filters.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * profiles.length);
    const chosen = profiles[randomIndex];
    toast.success(`Tuned to @${chosen.display_name}`);
    const el = document.getElementById(`profile-${chosen.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Save Filter Preset
  async function handleSavePreset() {
    if (!presetName.trim()) {
      toast.error('Specify a label for this preset');
      return;
    }
    setSavingPreset(true);
    try {
      const res = await fetch('/api/discovery/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: presetName.trim(),
          filters: {
            gender,
            language,
            country,
            interests: selectedInterests,
          },
        }),
      });
      if (res.ok) {
        toast.success(`Preset "${presetName}" saved`);
        setPresetName('');
        loadPresets();
      } else {
        toast.error('Failed to save preset');
      }
    } catch {
      toast.error('Network error saving preset');
    } finally {
      setSavingPreset(false);
    }
  }

  // Apply Preset
  function applyPreset(preset: FilterPreset) {
    if (preset.filters.gender) setGender(preset.filters.gender);
    if (preset.filters.language) setLanguage(preset.filters.language);
    if (preset.filters.country) setCountry(preset.filters.country);
    if (preset.filters.interests) {
      setSelectedInterests(preset.filters.interests);
      fetchProfiles(preset.filters.interests);
    }
    toast.info(`Band filter loaded: ${preset.name}`);
  }

  // Delete Preset
  async function deletePreset(id: string) {
    try {
      await fetch(`/api/discovery/presets?id=${id}`, { method: 'DELETE' });
      setPresets((prev) => prev.filter((p) => p.id !== id));
      toast.success('Preset removed');
    } catch {
      toast.error('Failed to delete preset');
    }
  }

  // Reset Filters
  function resetFilters() {
    setGender('all');
    setLanguage('all');
    setCountry('all');
    setSelectedInterests([]);
    setRandomMode(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Top Header & Channel Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-primary)] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
            <span>Campus Network // 18+ Peer Band</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Broadcast Directory
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Discover anonymized peers on your frequency. Filter by shared topics, language, and region.
          </p>
        </div>

        {/* Tab switch */}
        <div className="inline-flex items-center self-start sm:self-auto p-1 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'discover'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium shadow-sm border border-[var(--color-border)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Users className="h-3.5 w-3.5 inline mr-1.5" />
            Discovery
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors relative ${
              activeTab === 'inbox'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium shadow-sm border border-[var(--color-border)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Inbox className="h-3.5 w-3.5 inline mr-1.5" />
            Requests
            {pendingRequestsCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-[var(--color-primary)] text-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'inbox' ? (
        <RequestsInbox onCountChange={setPendingRequestsCount} />
      ) : (
        <>
          {/* Controls Bar: Filters Toggle, Random Tuner, Random Pool */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="font-mono text-xs"
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filters
                {selectedInterests.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded font-mono text-[10px] bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                    {selectedInterests.length}
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePickRandom}
                disabled={loading || profiles.length === 0}
                className="font-mono text-xs"
              >
                <Shuffle className="h-3.5 w-3.5 mr-1.5 text-[var(--color-primary)]" />
                Random Tune
              </Button>
            </div>

            {/* Random Pool Toggle */}
            <div className="flex items-center gap-3 bg-[var(--color-surface-raised)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Radio
                  className={`h-3.5 w-3.5 ${
                    randomMode ? 'text-emerald-500' : 'text-[var(--color-muted)]'
                  }`}
                />
                <div className="text-left font-mono">
                  <p className="text-xs font-medium text-[var(--color-text)]">
                    Active Pool
                  </p>
                  <p className="text-[10px] text-[var(--color-muted)]">
                    15m presence
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={randomMode}
                onClick={() => setRandomMode(!randomMode)}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  randomMode ? 'bg-emerald-500' : 'bg-[var(--color-border)]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    randomMode ? 'translate-x-4' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Filter Panel Drawer */}
          {showFilters && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text)] font-semibold">
                  Band Parameters
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-mono text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-[var(--color-muted)]">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="all">All Genders</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language */}
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-[var(--color-muted)]">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="all">All Languages</option>
                    {LANGUAGE_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Country Area */}
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-[var(--color-muted)]">
                    Region Scope
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="all">Global</option>
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                  </select>
                </div>
              </div>

              {/* Interests Multi-Select */}
              <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase text-[var(--color-muted)]">
                    Topic Filter
                  </label>
                  {selectedInterests.length > 0 && (
                    <span className="text-[10px] font-mono text-[var(--color-primary)]">
                      [{selectedInterests.length} active]
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {INTERESTS_LIST.map((item) => {
                    const isSelected = selectedInterests.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? selectedInterests.filter((i) => i !== item)
                            : [...selectedInterests, item];
                          setSelectedInterests(updated);
                          fetchProfiles(updated);
                        }}
                        className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
                          isSelected
                            ? 'bg-[var(--color-primary)] text-white font-medium'
                            : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-text-secondary)]'
                        }`}
                      >
                        #{item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saved Presets */}
              <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)]">
                  Saved Configurations
                </span>

                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)]"
                      >
                        <button
                          type="button"
                          onClick={() => applyPreset(p)}
                          className="hover:text-[var(--color-primary)]"
                        >
                          {p.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePreset(p.id)}
                          className="text-[var(--color-muted)] hover:text-red-500 ml-0.5"
                          title="Delete preset"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 max-w-sm pt-1">
                  <Input
                    placeholder="Preset label (e.g. Campus Coders)"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-mono shrink-0"
                    onClick={handleSavePreset}
                    disabled={savingPreset || !presetName.trim()}
                  >
                    <Bookmark className="h-3 w-3 mr-1" /> Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Profiles Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-muted)] font-mono">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)] mb-2" />
              <p className="text-xs">Scanning broadsheet transmissions...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-10 text-center">
              <Users className="h-8 w-8 text-[var(--color-muted)] mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                No active peers in this band
              </h3>
              <p className="text-xs text-[var(--color-muted)] mt-1 mb-4 font-mono">
                Widen topic tags, language filters, or regional scope.
              </p>
              <Button size="sm" variant="outline" onClick={resetFilters} className="font-mono text-xs">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset Band
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <div key={profile.id} id={`profile-${profile.id}`}>
                  <ProfileCard profile={profile} onRefresh={() => fetchProfiles()} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
