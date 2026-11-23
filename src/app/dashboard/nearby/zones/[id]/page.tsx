'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SendRequestModal } from '@/components/requests/send-request-modal';
import {
  ArrowLeft, Users, MapPin, Key, Clock, ShieldAlert,
  UserMinus, LogOut, Loader2, Copy, Check, MoreVertical,
  CheckCircle2, AlertTriangle, Flag
} from 'lucide-react';
import { toast } from 'sonner';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

interface ZoneMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  age_range: string;
  gender: string | null;
  bio: string | null;
  interests: string[] | null;
  is_banned: boolean;
  joined_at: string;
}

interface ZoneDetails {
  id: string;
  name: string;
  description: string | null;
  radius_meters: number;
  join_code: string;
  organizer_id: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export default function EventZoneDetailPage() {
  const params = useParams();
  const zoneId = params.id as string;
  const router = useRouter();

  const [zone, setZone] = useState<ZoneDetails | null>(null);
  const [members, setMembers] = useState<ZoneMember[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [targetUser, setTargetUser] = useState<ZoneMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<ZoneMember | null>(null);

  const loadZone = useCallback(async () => {
    try {
      const res = await fetch(`/api/nearby/zones/${zoneId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to open event zone');
        router.push('/dashboard/nearby');
        return;
      }
      setZone(data.zone);
      setMembers(data.members || []);
      setIsOrganizer(data.is_organizer);
      setIsMember(data.is_member);
    } catch {
      toast.error('Error loading event zone');
    } finally {
      setLoading(false);
    }
  }, [zoneId, router]);

  useEffect(() => {
    loadZone();
    const interval = setInterval(loadZone, 20000); // 20s auto-refresh
    return () => clearInterval(interval);
  }, [loadZone]);

  function copyCode() {
    if (!zone?.join_code) return;
    navigator.clipboard.writeText(zone.join_code);
    setCopiedCode(true);
    toast.success('Join code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // Join zone if not member yet
  async function handleJoinZone() {
    try {
      const res = await fetch(`/api/nearby/zones/${zoneId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: zone?.join_code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to join');
        return;
      }
      toast.success('Joined event zone!');
      loadZone();
    } catch {
      toast.error('Error joining zone');
    }
  }

  // Leave zone
  async function handleLeaveZone() {
    if (!confirm('Leave this event zone?')) return;
    try {
      const res = await fetch(`/api/nearby/zones/${zoneId}/leave`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to leave zone');
        return;
      }
      toast.info('Left event zone');
      router.push('/dashboard/nearby');
    } catch {
      toast.error('Error leaving zone');
    }
  }

  // Close zone (organizer only)
  async function handleCloseZone() {
    if (!confirm('Close this event zone permanently?')) return;
    try {
      const res = await fetch(`/api/nearby/zones/${zoneId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to close zone');
        return;
      }
      toast.success('Event zone concluded');
      router.push('/dashboard/nearby');
    } catch {
      toast.error('Error closing zone');
    }
  }

  // Moderate member (remove / ban)
  async function handleModerate(action: 'remove' | 'ban', userId: string) {
    try {
      const res = await fetch(`/api/nearby/zones/${zoneId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: userId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        return;
      }
      toast.success(`User ${action === 'ban' ? 'banned' : 'removed'}`);
      setSelectedMember(null);
      loadZone();
    } catch {
      toast.error('Moderation action failed');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mb-2" />
        <p className="text-sm text-[var(--color-muted)]">Entering event zone...</p>
      </div>
    );
  }

  if (!zone) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Zone Header */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/nearby')}
              className="p-2 rounded-xl text-[var(--color-muted)] hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--color-text)]">{zone.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-medium">
                  Live Zone
                </span>
              </div>
              {zone.description && (
                <p className="text-xs text-[var(--color-muted)] mt-1">{zone.description}</p>
              )}
            </div>
          </div>

          {/* Join Code Box */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono hover:bg-indigo-500/20 transition-colors"
              title="Click to copy join code"
            >
              <Key className="h-3.5 w-3.5" />
              <span>CODE: {zone.join_code}</span>
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>

            {isOrganizer ? (
              <Button size="sm" variant="destructive" onClick={handleCloseZone} className="text-xs rounded-xl">
                Close Zone
              </Button>
            ) : isMember ? (
              <Button size="sm" variant="ghost" onClick={handleLeaveZone} className="text-xs rounded-xl text-red-400 hover:bg-red-500/10">
                <LogOut className="h-3.5 w-3.5 mr-1" /> Leave
              </Button>
            ) : (
              <Button size="sm" onClick={handleJoinZone} className="text-xs rounded-xl">
                Join Zone
              </Button>
            )}
          </div>
        </div>

        {/* Zone metadata pills */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted)] pt-2 border-t border-[var(--color-border)]">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[var(--color-primary)]" />
            <strong className="text-[var(--color-text)]">{members.length}</strong> present
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
            {zone.radius_meters >= 1000 ? `${zone.radius_meters / 1000} km` : `${zone.radius_meters} m`} Geofence
          </span>
          {zone.ends_at && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Clock className="h-4 w-4" />
              Closes {new Date(zone.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* "Who's Here" List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Who&rsquo;s Here ({members.length})
          </h2>
          <span className="text-[11px] text-[var(--color-muted)]">
            Auto-refreshes every 20s
          </span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed border-[var(--color-border)] p-6 space-y-2">
            <Users className="h-10 w-10 mx-auto text-[var(--color-muted)] opacity-30" />
            <p className="text-sm text-[var(--color-muted)]">Nobody else is in this zone yet.</p>
            <p className="text-xs text-slate-500">Share code <strong className="text-indigo-400">{zone.join_code}</strong> with fellow attendees!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map((m) => {
              const avatar = AVATARS[m.avatar_url || ''] || '👤';

              return (
                <div
                  key={m.user_id}
                  className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all space-y-3 shadow-sm relative group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-2xl shrink-0">
                        {avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm text-[var(--color-text)] truncate">
                            {m.display_name}
                          </h3>
                          {m.user_id === zone.organizer_id && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                              Host
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-muted)]">
                          {m.age_range} {m.gender ? `· ${m.gender}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Organizer moderation menu */}
                    {isOrganizer && m.user_id !== zone.organizer_id && (
                      <button
                        onClick={() => setSelectedMember(m)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Moderate member"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {m.bio && (
                    <p className="text-xs text-[var(--color-text)] line-clamp-2">
                      {m.bio}
                    </p>
                  )}

                  {m.interests && m.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.interests.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setTargetUser(m)}
                      className="text-xs rounded-xl"
                    >
                      Connect
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Organizer Moderation Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">
              Moderate: {selectedMember.display_name}
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleModerate('remove', selectedMember.user_id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--color-bg)] hover:bg-slate-800 text-amber-400 text-xs font-semibold transition-colors"
              >
                <UserMinus className="h-4 w-4" />
                <span>Remove from Zone</span>
              </button>
              <button
                onClick={() => handleModerate('ban', selectedMember.user_id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--color-bg)] hover:bg-red-500/10 text-red-400 text-xs font-semibold transition-colors"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Ban from Zone</span>
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)} className="w-full text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Send Connection Request Modal */}
      {targetUser && (
        <SendRequestModal
          isOpen={Boolean(targetUser)}
          onClose={() => setTargetUser(null)}
          targetUser={{
            id: targetUser.user_id,
            display_name: targetUser.display_name,
            avatar_url: targetUser.avatar_url,
          }}
        />
      )}
    </div>
  );
}
