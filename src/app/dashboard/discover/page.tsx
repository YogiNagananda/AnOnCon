'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileCard, AnonymousProfile } from '@/components/discovery/profile-card';
import { RequestsInbox } from '@/components/requests/requests-inbox';
import { INTERESTS_LIST, GENDER_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/constants';
import {
  Search,
  Filter,
  Sparkles,
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
    const interval = setInterval(pulse, 60000); // Pulse every minute
    return () => clearInterval(interval);
  }, [randomMode]);

  // "Pick Random" matching user
  function handlePickRandom() {
    if (profiles.length === 0) {
      toast.info('No profiles available matching your current filters.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * profiles.length);
    const chosen = profiles[randomIndex];
    toast.success(`Picked: ${chosen.display_name}! Scrolling to card.`);
    const el = document.getElementById(`profile-${chosen.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Save Filter Preset
  async function handleSavePreset() {
    if (!presetName.trim()) {
      toast.error('Please enter a name for the preset');
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
        toast.success(`Preset "${presetName}" saved!`);
        setPresetName('');
        loadPresets();
      } else {
        toast.error('Failed to save preset');
      }
    } catch {
      toast.error('Something went wrong');
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
    toast.info(`Applied filter preset: ${preset.name}`);
  }

  // Delete Preset
  async function deletePreset(id: string) {
    try {
      await fetch(`/api/discovery/presets?id=${id}`, { method: 'DELETE' });
      setPresets((prev) => prev.filter((p) => p.id !== id));
      toast.success('Preset deleted');
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header / View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[var(--color-primary)]" />
            Discover People
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Connect anonymously with adults sharing your interests & vibe.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/60 p-1 rounded-xl border border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'discover'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-muted)] hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Discovery
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all relative ${
              activeTab === 'inbox'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-muted)] hover:text-white'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" /> Requests
            {pendingRequestsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1" />
            )}
          </button>
        </div>
      </div>

      {activeTab === 'inbox' ? (
        <RequestsInbox onCountChange={setPendingRequestsCount} />
      ) : (
        <>
          {/* Controls Bar: Random Mode, Random Button, Filter Toggle */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1.5" /> Filters
                {selectedInterests.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                    {selectedInterests.length}
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePickRandom}
                disabled={loading || profiles.length === 0}
              >
                <Shuffle className="h-4 w-4 mr-1.5 text-indigo-400" /> Random Pick
              </Button>
            </div>

            {/* Random Mode Toggle */}
            <div className="flex items-center gap-3 bg-slate-900/40 px-3 py-1.5 rounded-xl border border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Radio
                  className={`h-4 w-4 ${
                    randomMode ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
                  }`}
                />
                <div className="text-left">
                  <p className="text-xs font-medium text-[var(--color-text)]">Random Pool</p>
                  <p className="text-[10px] text-[var(--color-muted)]">Active now (15m)</p>
                </div>
              </div>
              <button
                onClick={() => setRandomMode(!randomMode)}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${
                  randomMode ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                    randomMode ? 'translate-x-4.5' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Filter Panel Drawer */}
          {showFilters && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <span className="text-sm font-semibold text-[var(--color-text)]">Filter Settings</span>
                <button
                  onClick={resetFilters}
                  className="text-xs text-[var(--color-muted)] hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset all
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-xs text-[var(--color-muted)]">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
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
                  <label className="text-xs text-[var(--color-muted)]">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
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
                  <label className="text-xs text-[var(--color-muted)]">Area Scope</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
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
                <label className="text-xs font-medium text-[var(--color-text)]">
                  Filter by Interests
                </label>
                <div className="flex flex-wrap gap-1.5">
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
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                          isSelected
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-slate-800/80 text-[var(--color-muted)] hover:text-slate-200 border border-slate-700'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saved Presets */}
              <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                    Saved Filter Presets
                  </span>
                </div>

                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                      >
                        <button
                          onClick={() => applyPreset(p)}
                          className="hover:text-[var(--color-primary)] font-medium"
                        >
                          {p.name}
                        </button>
                        <button
                          onClick={() => deletePreset(p.id)}
                          className="text-slate-500 hover:text-red-400 ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 max-w-sm pt-1">
                  <Input
                    placeholder="Save current filters as..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={handleSavePreset}
                    disabled={savingPreset || !presetName.trim()}
                  >
                    <Bookmark className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Profiles Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mb-2" />
              <p className="text-sm text-[var(--color-muted)]">Searching anonymous profiles...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-2xl p-12 text-center">
              <Users className="h-12 w-12 text-[var(--color-muted)] mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-[var(--color-text)]">No matches found</h3>
              <p className="text-sm text-[var(--color-muted)] mt-1 mb-4">
                Try widening your age, interests, or location filters.
              </p>
              <Button size="sm" variant="outline" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Clear Filters
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
