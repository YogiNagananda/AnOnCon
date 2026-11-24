'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Users,
  Lock,
  Globe,
  Plus,
  Hash,
  Loader2,
  Users2,
} from 'lucide-react';
import { toast } from 'sonner';

const GROUP_ICONS = ['💬', '🎮', '🎵', '📚', '🏃', '🎨', '🌍', '💡', '🤝', '⚡', '🔥', '🌟'];

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
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [myGroups, setMyGroups] = useState<GroupItem[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/groups?${params}`);
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups ?? []);
        if (data.my_groups) setMyGroups(data.my_groups);
      }
    } catch {
      toast.error('Failed to load campus hubs');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  async function handleJoin(groupId: string) {
    setJoiningId(groupId);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      if (data.status === 'pending') {
        toast.success('Join signal transmitted — pending moderator clearance');
      } else {
        toast.success('Enrolled in hub!');
      }
      fetchGroups();
    } catch {
      toast.error('Handshake request failed');
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-primary)] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
            <span>Campus Collectives // Hubs</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Campus Circles & Squads
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Interest-based anonymous groups, late-night study guilds, and campus project teams.
          </p>
        </div>

        <Button
          onClick={() => setShowCreate(true)}
          className="font-mono text-xs self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Squad
        </Button>
      </div>

      {/* My Active Squads */}
      {myGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted)]">
              Enrolled Collectives ({myGroups.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myGroups.map((g) => (
              <Link
                key={g.id}
                href={`/dashboard/groups/${g.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border)]/80 transition-colors shadow-sm group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-xl shrink-0 select-none">
                  {g.icon_url || '💬'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                    {g.name}
                  </p>
                  <p className="text-[11px] font-mono text-[var(--color-muted)] flex items-center gap-1.5 mt-0.5">
                    <Users className="h-3 w-3" />
                    <span>{g.max_members} cap</span>
                    <span>//</span>
                    {g.is_public ? (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Globe className="h-3 w-3" /> public
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Lock className="h-3 w-3" /> private
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter circles by moniker, hobby, or tag..."
          className="pl-9 text-xs font-mono bg-[var(--color-surface)]"
        />
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 font-mono text-xs text-[var(--color-muted)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)] mb-2" />
          <p>Scanning directory channels...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-12 text-center text-[var(--color-muted)] font-mono">
          <Users2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs uppercase tracking-wider">
            {debouncedSearch
              ? 'No hubs matched your search'
              : 'No public circles active yet. Establish the first one.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border)]/90 transition-colors space-y-3 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-xl shrink-0 select-none">
                    {g.icon_url || '💬'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-sm text-[var(--color-text)] truncate">
                        {g.name}
                      </h3>
                      {g.is_public ? (
                        <span title="Open hub">
                          <Globe className="h-3 w-3 text-emerald-500 shrink-0" />
                        </span>
                      ) : (
                        <span title="Gated hub">
                          <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                        </span>
                      )}
                    </div>
                    {g.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                        {g.description}
                      </p>
                    )}
                  </div>
                </div>

                {g.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {g.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-0.5 text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                      >
                        <Hash className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                <span className="text-[11px] font-mono text-[var(--color-muted)] flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  [{g.member_count ?? 0}/{g.max_members}]
                </span>

                {g.is_joined ? (
                  <Link href={`/dashboard/groups/${g.id}`}>
                    <Button size="sm" variant="outline" className="font-mono text-xs h-7 px-3">
                      Enter Hub
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleJoin(g.id)}
                    disabled={joiningId === g.id}
                    className="font-mono text-xs h-7 px-3"
                  >
                    {joiningId === g.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : g.is_public ? (
                      'Join [ + ]'
                    ) : (
                      'Request'
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Squad Modal */}
      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            window.location.href = `/dashboard/groups/${id}`;
          }}
        />
      )}
    </div>
  );
}

function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [icon, setIcon] = useState('💬');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.length < 2) {
      toast.error('Hub moniker must be at least 2 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim() || null,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 10),
          is_public: isPublic,
          icon_url: icon,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success('Campus collective established!');
      onCreated(data.group.id);
    } catch {
      toast.error('Network failure establishing collective');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-xl space-y-4 antialiased">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <span className="font-mono text-[10px] text-[var(--color-primary)] uppercase">
              NEW COLLECTIVE
            </span>
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Establish Campus Squad
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] font-mono text-sm"
          >
            [ esc ]
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Glyph picker */}
          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1.5">
              Hub Monogram
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GROUP_ICONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIcon(em)}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
                    icon === em
                      ? 'bg-[var(--color-accent-subtle)] border border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
                      : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1">
              Hub Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Midnight Audio Guild"
              maxLength={60}
              required
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1">
              Mission Statement
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Purpose of this squad, meetup details, or chat guidelines..."
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text)] resize-none focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1">
              Tags (comma-separated)
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. audio, design, chill"
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                isPublic ? 'bg-emerald-500' : 'bg-[var(--color-border)]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-4' : ''
                }`}
              />
            </button>
            <span className="text-xs font-mono text-[var(--color-text)]">
              {isPublic ? (
                <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                  <Globe className="h-3.5 w-3.5" /> Public — open broadcast
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                  <Lock className="h-3.5 w-3.5" /> Private — clearance required
                </span>
              )}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={loading || !name.trim()}
              className="font-mono text-xs"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Initialize Hub
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
