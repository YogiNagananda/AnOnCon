'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SendRequestModal } from '@/components/requests/send-request-modal';
import {
  ArrowLeft,
  Users,
  MapPin,
  Key,
  Clock,
  ShieldAlert,
  UserMinus,
  LogOut,
  Loader2,
  Copy,
  Check,
  MoreVertical,
  UserPlus,
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
        toast.error(data.error || 'Failed to enter event zone');
        router.push('/dashboard/nearby');
        return;
      }
      setZone(data.zone);
      setMembers(data.members || []);
      setIsOrganizer(data.is_organizer);
      setIsMember(data.is_member);
    } catch {
      toast.error('Network failure loading event zone');
    } finally {
      setLoading(false);
    }
  }, [zoneId, router]);

  useEffect(() => {
    loadZone();
    const interval = setInterval(loadZone, 20000);
    return () => clearInterval(interval);
  }, [loadZone]);

  function copyCode() {
    if (!zone?.join_code) return;
    navigator.clipboard.writeText(zone.join_code);
    setCopiedCode(true);
    toast.success('Join code copied');
    setTimeout(() => setCopiedCode(false), 2000);
  }

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
      toast.success('Cleared into event zone!');
      loadZone();
    } catch {
      toast.error('Error joining zone');
    }
  }

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

  async function handleCloseZone() {
    if (!confirm('Conclude and delete this event zone permanently?')) return;
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] font-mono text-xs text-[var(--color-muted)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)] mb-2" />
        <p>Verifying geofence clearance...</p>
      </div>
    );
  }

  if (!zone) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Zone Header */}
      <div className="p-5 sm:p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard/nearby')}
              className="p-1.5 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors"
              aria-label="Back to nearby"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[var(--color-text)]">
                  {zone.name}
                </h1>
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-medium">
                  active
                </span>
              </div>
              {zone.description && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                  {zone.description}
                </p>
              )}
            </div>
          </div>

          {/* Join Code Box */}
          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
              title="Click to copy join code"
            >
              <Key className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              <span>CODE: {zone.join_code}</span>
              {copiedCode ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-[var(--color-muted)]" />
              )}
            </button>

            {isOrganizer ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCloseZone}
                className="text-xs font-mono h-8"
              >
                Close Zone
              </Button>
            ) : isMember ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLeaveZone}
                className="text-xs font-mono h-8 text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" /> Leave
              </Button>
            ) : (
              <Button size="sm" onClick={handleJoinZone} className="text-xs font-mono h-8">
                Join Zone
              </Button>
            )}
          </div>
        </div>

        {/* Zone metadata pills */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--color-muted)] pt-3 border-t border-[var(--color-border)]">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <strong className="text-[var(--color-text)]">{members.length}</strong> present
          </span>
          <span>//</span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            {zone.radius_meters >= 1000 ? `${zone.radius_meters / 1000} km` : `${zone.radius_meters} m`} Geofence
          </span>
          {zone.ends_at && (
            <>
              <span>//</span>
              <span className="flex items-center gap-1.5 text-amber-500">
                <Clock className="h-3.5 w-3.5" />
                Closes {new Date(zone.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* "Who's Here" List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between font-mono">
          <h2 className="text-xs uppercase tracking-wider text-[var(--color-muted)] font-semibold">
            Who&rsquo;s Present in Zone ({members.length})
          </h2>
          <span className="text-[10px] text-[var(--color-muted)]">
            Auto-refreshing 20s
          </span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-[var(--color-border)] p-6 space-y-2 font-mono text-[var(--color-muted)]">
            <Users className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-xs uppercase tracking-wider">No other attendees in this geofence yet</p>
            <p className="text-[11px]">
              Share code <strong className="text-[var(--color-primary)]">{zone.join_code}</strong> with fellow attendees.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map((m) => {
              const avatar = AVATARS[m.avatar_url || ''] || '👤';

              return (
                <div
                  key={m.user_id}
                  className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border)]/90 transition-colors space-y-3 shadow-sm flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-xl shrink-0 select-none">
                          {avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-sm text-[var(--color-text)] truncate">
                              {m.display_name}
                            </h3>
                            {m.user_id === zone.organizer_id && (
                              <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 font-semibold uppercase">
                                Host
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-[var(--color-muted)]">
                            {m.age_range} {m.gender ? `// ${m.gender}` : ''}
                          </p>
                        </div>
                      </div>

                      {isOrganizer && m.user_id !== zone.organizer_id && (
                        <button
                          type="button"
                          onClick={() => setSelectedMember(m)}
                          className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors"
                          title="Moderate member"
                          aria-label="Moderate"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {m.bio && (
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed font-sans">
                        {m.bio}
                      </p>
                    )}

                    {m.interests && m.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {m.interests.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded font-mono text-[10px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)] flex justify-end font-mono">
                    <Button
                      size="sm"
                      onClick={() => setTargetUser(m)}
                      className="text-xs h-7 px-3 font-mono"
                    >
                      <UserPlus className="h-3 w-3 mr-1" /> Connect
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-2xl space-y-3 font-mono text-xs">
            <h3 className="font-semibold text-xs text-[var(--color-text)] uppercase tracking-wider">
              Moderate: {selectedMember.display_name}
            </h3>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleModerate('remove', selectedMember.user_id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] text-amber-500 transition-colors"
              >
                <UserMinus className="h-3.5 w-3.5" />
                <span>Remove from Zone</span>
              </button>
              <button
                type="button"
                onClick={() => handleModerate('ban', selectedMember.user_id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded bg-[var(--color-surface-raised)] hover:bg-red-500/10 text-red-500 transition-colors"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Ban from Zone</span>
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMember(null)}
              className="w-full text-xs font-mono"
            >
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
