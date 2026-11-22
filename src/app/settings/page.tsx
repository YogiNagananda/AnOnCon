'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { INTERESTS_LIST, GENDER_OPTIONS, LANGUAGE_OPTIONS, DISPLAY_NAME_COOLDOWN_DAYS, MAX_BIO_LENGTH } from '@/lib/constants';
import { ArrowLeft, User, Shield, Palette, Trash2, Loader2, Sun, Moon, Monitor, Eye, EyeOff, Check, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { Profile } from '@/lib/supabase/types';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data: dataRaw, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      const data = dataRaw as Profile | null;

      if (error || !data) { router.push('/onboarding'); return; }

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
    const cooldownEnd = new Date(lastChange.getTime() + DISPLAY_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    return new Date() >= cooldownEnd;
  }

  function getNameCooldownDate(): string {
    if (!profile?.display_name_changed_at) return '';
    const lastChange = new Date(profile.display_name_changed_at);
    const cooldownEnd = new Date(lastChange.getTime() + DISPLAY_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
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

      toast.success('Settings saved!');
      setEditSection(null);
      // Refresh profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: refreshRaw } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const refreshed = refreshRaw as Profile | null;
        if (refreshed) setProfile(refreshed);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch('/api/settings/delete-account', { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to delete account'); return; }
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setDeleting(false);
    }
  }

  async function handleVisibilityToggle() {
    const newValue = !isVisible;
    setIsVisible(newValue);
    const { error } = await supabase.from('profiles').update({ is_visible: newValue }).eq('id', profile!.id);
    if (error) {
      setIsVisible(!newValue);
      toast.error('Failed to update visibility');
    } else {
      toast.success(newValue ? 'You are now visible in discovery' : 'You are now hidden from discovery');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)]/80 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-[var(--color-muted)] hover:text-[var(--color-text)]">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Section */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2"><User className="h-4 w-4" /> Profile</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {/* Display Name */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Display Name</p>
                <p className="text-xs text-[var(--color-muted)]">{profile?.display_name}</p>
              </div>
              {canChangeName() ? (
                <button onClick={() => setEditSection(editSection === 'name' ? null : 'name')} className="text-xs text-[var(--color-primary)]">Edit</button>
              ) : (
                <p className="text-xs text-[var(--color-muted)]">Can change on {getNameCooldownDate()}</p>
              )}
            </div>
            {editSection === 'name' && (
              <div className="px-4 py-3 space-y-3 bg-[var(--color-bg)]">
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="New display name" maxLength={30} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setDisplayName(profile!.display_name); setEditSection(null); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
              </div>
            )}

            {/* Bio */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Bio</p>
                <p className="text-xs text-[var(--color-muted)] line-clamp-1">{profile?.bio || 'No bio set'}</p>
              </div>
              <button onClick={() => setEditSection(editSection === 'bio' ? null : 'bio')} className="text-xs text-[var(--color-primary)]">Edit</button>
            </div>
            {editSection === 'bio' && (
              <div className="px-4 py-3 space-y-3 bg-[var(--color-bg)]">
                <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={MAX_BIO_LENGTH} rows={3}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] resize-none focus:border-[var(--color-primary)] focus:outline-none" />
                <p className="text-xs text-[var(--color-muted)] text-right">{bio.length}/{MAX_BIO_LENGTH}</p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setBio(profile!.bio || ''); setEditSection(null); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
              </div>
            )}

            {/* Interests */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Interests</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(profile?.interests || []).slice(0, 3).map(i => (
                    <span key={i} className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">{i}</span>
                  ))}
                  {(profile?.interests?.length || 0) > 3 && <span className="text-xs text-[var(--color-muted)]">+{(profile?.interests?.length || 0) - 3} more</span>}
                </div>
              </div>
              <button onClick={() => setEditSection(editSection === 'interests' ? null : 'interests')} className="text-xs text-[var(--color-primary)]">Edit</button>
            </div>
            {editSection === 'interests' && (
              <div className="px-4 py-3 space-y-3 bg-[var(--color-bg)]">
                <div className="flex flex-wrap gap-2">
                  {INTERESTS_LIST.map(interest => (
                    <button key={interest}
                      onClick={() => setInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : prev.length < 10 ? [...prev, interest] : prev)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                        ${interests.includes(interest) ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]'}`}
                    >{interest}</button>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setInterests(profile!.interests || []); setEditSection(null); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Privacy Section */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy</h2>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Appear in Discovery</p>
              <p className="text-xs text-[var(--color-muted)]">When off, others won&apos;t see you in search results</p>
            </div>
            <button onClick={handleVisibilityToggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${isVisible ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isVisible ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2"><Palette className="h-4 w-4" /> Appearance</h2>
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all
                    ${theme === opt.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'}`}>
                  <opt.icon className={`h-5 w-5 ${theme === opt.value ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}`} />
                  <span className={`text-xs font-medium ${theme === opt.value ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className="bg-[var(--color-surface)] border border-red-500/20 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2"><Trash2 className="h-4 w-4" /> Danger Zone</h2>
          </div>
          <div className="px-4 py-3">
            {!showDeleteConfirm ? (
              <Button variant="destructive" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
                Delete Account
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-400">⚠️ This action is permanent. All your data will be deleted.</p>
                <p className="text-xs text-[var(--color-muted)]">Type <strong>DELETE</strong> to confirm:</p>
                <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" />
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>Cancel</Button>
                  <Button variant="destructive" className="flex-1" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleting}>
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">About</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-[var(--color-text)]">Version</span>
              <span className="text-sm text-[var(--color-muted)]">1.0.0</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-[var(--color-text)]">Safety Tips</span>
              <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
