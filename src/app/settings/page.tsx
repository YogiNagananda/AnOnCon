'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  INTERESTS_LIST,
  DISPLAY_NAME_COOLDOWN_DAYS,
  MAX_BIO_LENGTH,
} from '@/lib/constants';
import {
  ArrowLeft,
  User,
  Shield,
  Palette,
  Trash2,
  Loader2,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import type { Profile } from '@/lib/supabase/types';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Edit mode
  const [editSection, setEditSection] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: dataRaw, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      const data = dataRaw as Profile | null;

      if (error || !data) {
        router.push('/onboarding');
        return;
      }

      setProfile(data);
      setDisplayName(data.display_name);
      setBio(data.bio || '');
      setGender(data.gender || '');
      setInterests(data.interests || []);
      setLanguages(data.languages || []);
      setIsVisible(data.is_visible);
      setLoading(false);
    }
    loadProfile();
  }, [supabase, router]);

  function canChangeName(): boolean {
    if (!profile?.display_name_changed_at) return true;
    const lastChange = new Date(profile.display_name_changed_at);
    const cooldownEnd = new Date(
      lastChange.getTime() + DISPLAY_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    );
    return new Date() >= cooldownEnd;
  }

  function getNameCooldownDate(): string {
    if (!profile?.display_name_changed_at) return '';
    const lastChange = new Date(profile.display_name_changed_at);
    const cooldownEnd = new Date(
      lastChange.getTime() + DISPLAY_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    );
    return cooldownEnd.toLocaleDateString();
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          gender,
          interests,
          languages,
          is_visible: isVisible,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
        return;
      }

      toast.success('Settings synchronized');
      setEditSection(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: refreshRaw } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        const refreshed = refreshRaw as Profile | null;
        if (refreshed) setProfile(refreshed);
      }
    } catch {
      toast.error('Network failure updating settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch('/api/settings/delete-account', { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Failed to delete account');
        return;
      }
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      toast.error('Error occurred while deleting account');
    } finally {
      setDeleting(false);
    }
  }

  async function handleVisibilityToggle() {
    const newValue = !isVisible;
    setIsVisible(newValue);
    const { error } = await supabase
      .from('profiles')
      .update({ is_visible: newValue })
      .eq('id', profile!.id);
    if (error) {
      setIsVisible(!newValue);
      toast.error('Failed to update visibility');
    } else {
      toast.success(
        newValue ? 'Callsign visible on discovery frequency' : 'Callsign hidden from discovery'
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center font-mono text-xs text-[var(--color-muted)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)] mr-2" />
        <span>Loading parameters...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
            <h1 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--color-text)]">
              System Parameters // Settings
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Section */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2 font-mono text-xs text-[var(--color-text)] font-semibold uppercase tracking-wider">
            <User className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span>Callsign & Identity</span>
          </div>

          <div className="divide-y divide-[var(--color-border)] text-xs">
            {/* Display Name */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Display Pseudonym</p>
                <p className="font-mono text-[11px] text-[var(--color-muted)] mt-0.5">
                  [ anon // {profile?.display_name} ]
                </p>
              </div>
              {canChangeName() ? (
                <button
                  type="button"
                  onClick={() => setEditSection(editSection === 'name' ? null : 'name')}
                  className="font-mono text-xs text-[var(--color-primary)] hover:underline"
                >
                  Edit
                </button>
              ) : (
                <p className="font-mono text-[10px] text-[var(--color-muted)]">
                  Cooldown until {getNameCooldownDate()}
                </p>
              )}
            </div>
            {editSection === 'name' && (
              <div className="px-4 py-3 space-y-3 bg-[var(--color-surface-raised)] font-mono">
                <Input
                  value={displayName}
                  onChange={(e) =>
                    setDisplayName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  placeholder="New display name"
                  maxLength={30}
                  className="text-xs"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDisplayName(profile!.display_name);
                      setEditSection(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            {/* Bio */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <p className="font-medium text-[var(--color-text)]">Broadcast Bio</p>
                <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
                  {profile?.bio || 'No bio configured'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditSection(editSection === 'bio' ? null : 'bio')}
                className="font-mono text-xs text-[var(--color-primary)] hover:underline shrink-0"
              >
                Edit
              </button>
            </div>
            {editSection === 'bio' && (
              <div className="px-4 py-3 space-y-3 bg-[var(--color-surface-raised)]">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={MAX_BIO_LENGTH}
                  rows={3}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] resize-none focus:outline-none"
                />
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--color-muted)]">
                  <span>
                    {bio.length}/{MAX_BIO_LENGTH}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBio(profile!.bio || '');
                        setEditSection(null);
                      }}
                      className="font-mono text-xs"
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="font-mono text-xs">
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Interests */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Topic Tags</p>
                <div className="flex flex-wrap gap-1 mt-1 font-mono">
                  {(profile?.interests || []).slice(0, 4).map((i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded"
                    >
                      #{i}
                    </span>
                  ))}
                  {(profile?.interests?.length || 0) > 4 && (
                    <span className="text-[10px] text-[var(--color-muted)] px-1">
                      +{(profile?.interests?.length || 0) - 4} more
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditSection(editSection === 'interests' ? null : 'interests')}
                className="font-mono text-xs text-[var(--color-primary)] hover:underline shrink-0"
              >
                Edit
              </button>
            </div>
            {editSection === 'interests' && (
              <div className="px-4 py-3 space-y-3 bg-[var(--color-surface-raised)]">
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto font-mono text-xs">
                  {INTERESTS_LIST.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() =>
                        setInterests((prev) =>
                          prev.includes(interest)
                            ? prev.filter((i) => i !== interest)
                            : prev.length < 10
                            ? [...prev, interest]
                            : prev
                        )
                      }
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        interests.includes(interest)
                          ? 'bg-[var(--color-primary)] text-white font-medium'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-text-secondary)]'
                      }`}
                    >
                      #{interest}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-2 font-mono text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setInterests(profile!.interests || []);
                      setEditSection(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Privacy Section */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2 font-mono text-xs text-[var(--color-text)] font-semibold uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span>Broadcast Discovery</span>
          </div>
          <div className="px-4 py-3.5 flex items-center justify-between text-xs">
            <div>
              <p className="font-medium text-[var(--color-text)]">Active in Directory Pool</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                When disabled, peers cannot find your callsign through broad discovery
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isVisible}
              onClick={handleVisibilityToggle}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                isVisible ? 'bg-emerald-500' : 'bg-[var(--color-border)]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isVisible ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2 font-mono text-xs text-[var(--color-text)] font-semibold uppercase tracking-wider">
            <Palette className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span>Visual Theme</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border transition-colors ${
                    theme === opt.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-surface-raised)] text-[var(--color-text)] font-medium ring-1 ring-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-[var(--color-surface)] border border-red-500/20 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-red-500/20 flex items-center gap-2 font-mono text-xs text-red-500 font-semibold uppercase tracking-wider">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Danger Zone // Purge Account</span>
          </div>
          <div className="p-4">
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                size="sm"
                className="w-full font-mono text-xs h-8"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account & Purge Identity
              </Button>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                <p className="text-red-500 font-medium">
                  Irreversible operation: all messages, contacts, and presence data will be purged.
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Type <strong>DELETE</strong> to confirm purge:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="text-xs font-mono h-8"
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || deleting}
                  >
                    {deleting ? 'Purging...' : 'Confirm Purge'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* About & Guidelines */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm font-mono text-xs">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2 text-[var(--color-text)] font-semibold uppercase tracking-wider">
            <Info className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            <span>Network Architecture</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[var(--color-text)]">Network Build</span>
              <span className="text-[var(--color-muted)]">2.0.0 broadsheet</span>
            </div>
            <Link
              href="/safety"
              className="px-4 py-3 flex items-center justify-between hover:bg-[var(--color-surface-raised)] transition-colors"
            >
              <span className="text-[var(--color-text)]">Safety Center</span>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
