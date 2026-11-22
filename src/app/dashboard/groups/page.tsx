'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Users, Lock, Globe, Plus, Hash, Loader2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const GROUP_ICONS = ['🌟', '🔥', '💬', '🎮', '🎵', '📚', '🏃', '🎨', '🌍', '💡', '🤝', '😂'];

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  tags: string[];
  is_public: boolean;
  max_members: number;
  owner_id: string;
  member_count: number;
  is_joined: boolean;
  created_at: string;
}

export default function GroupsPage() {
  const supabase = createClient();
  const [groups, setGroups]       = useState<GroupItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/groups?${params}`);
      const data = await res.json();
      if (res.ok) setGroups(data.groups ?? []);
    } catch {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // Also show my groups
  const [myGroups, setMyGroups] = useState<GroupItem[]>([]);
  useEffect(() => {
    async function loadMine() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!memberships?.length) return;
      const ids = memberships.map((m: { group_id: string }) => m.group_id);
      const { data: gs } = await supabase.from('groups').select('*').in('id', ids);
      setMyGroups((gs ?? []).map((g) => ({
        ...g,
        tags: g.tags ?? [],
        member_count: 0,
        is_joined: true,
      })));
    }
    loadMine();
  }, [supabase]);

  async function handleJoin(groupId: string) {
    setJoiningId(groupId);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      if (data.status === 'pending') {
        toast.success('Join request sent — waiting for admin approval');
      } else {
        toast.success('Joined group!');
      }
      fetchGroups();
    } catch {
      toast.error('Failed to join');
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Groups</h1>
          <p className="text-sm text-[var(--color-muted)]">Discover anonymous communities</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create
        </Button>
      </div>

      {/* My Groups */}
      {myGroups.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-3">My Groups</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myGroups.map(g => (
              <Link key={g.id} href={`/dashboard/groups/${g.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xl shrink-0">
                  {g.icon_url || '💬'}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-[var(--color-text)] truncate">{g.name}</p>
                  <p className="text-[11px] text-[var(--color-muted)] flex items-center gap-1">
                    <Users className="h-3 w-3" />{g.max_members} max
                    {g.is_public ? <Globe className="h-3 w-3 ml-1" /> : <Lock className="h-3 w-3 ml-1" />}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search groups by name or description..."
          className="pl-9"
        />
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-muted)]">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{debouncedSearch ? 'No groups match your search' : 'No public groups yet — be the first!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map(g => (
            <div key={g.id}
              className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-2xl shrink-0">
                  {g.icon_url || '💬'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--color-text)] truncate">{g.name}</h3>
                    {g.is_public ? (
                      <span title="Public">
                        <Globe className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      </span>
                    ) : (
                      <span title="Private">
                        <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  {g.description && (
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-2">{g.description}</p>
                  )}
                </div>
              </div>

              {g.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {g.tags.slice(0, 5).map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <Hash className="h-2.5 w-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[var(--color-muted)] flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {g.member_count ?? 0}/{g.max_members} members
                </span>
                {g.is_joined ? (
                  <Link href={`/dashboard/groups/${g.id}`}>
                    <Button size="sm" variant="ghost" className="text-xs">Open</Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleJoin(g.id)}
                    disabled={joiningId === g.id}
                    className="text-xs"
                  >
                    {joiningId === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (g.is_public ? 'Join' : 'Request')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); window.location.href = `/dashboard/groups/${id}`; }}
        />
      )}
    </div>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [tags, setTags]         = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [icon, setIcon]         = useState('💬');
  const [loading, setLoading]   = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.length < 2) { toast.error('Name must be at least 2 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim() || null,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10),
          is_public: isPublic,
          icon_url: icon,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Group created!');
      onCreated(data.group.id);
    } catch {
      toast.error('Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Create a Group</h2>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl">×</button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Icon picker */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_ICONS.map(em => (
                <button
                  key={em} type="button"
                  onClick={() => setIcon(em)}
                  className={`w-9 h-9 rounded-full text-lg flex items-center justify-center transition-all ${icon === em ? 'bg-[var(--color-primary)]/30 ring-2 ring-[var(--color-primary)]' : 'bg-[var(--color-bg)] hover:bg-[var(--color-border)]'}`}
                >{em}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Night Owls Club" maxLength={60} required />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">Description</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What is this group about?"
              maxLength={500} rows={3}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">Tags (comma-separated)</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. music, gaming, chill" />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-[var(--color-primary)]' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-[var(--color-text)]">
              {isPublic ? (
                <span className="flex items-center gap-1"><Globe className="h-4 w-4 text-emerald-400" /> Public — anyone can join</span>
              ) : (
                <span className="flex items-center gap-1"><Lock className="h-4 w-4 text-amber-400" /> Private — join via invite or request</span>
              )}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
