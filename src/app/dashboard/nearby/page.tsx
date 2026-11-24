'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendRequestModal } from '@/components/requests/send-request-modal';
import {
  MapPin,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Users,
  Plus,
  Key,
  Calendar,
  Clock,
  Loader2,
  CheckCircle2,
  Compass,
  ArrowRight,
  EyeOff,
  Radio,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

interface NearbyUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  age_range: string;
  gender: string | null;
  bio: string | null;
  interests: string[] | null;
  languages: string[] | null;
  distance_band: 'within 100 m' | 'within 500 m' | 'within 1 km';
  last_seen_at: string;
}

interface EventZone {
  id: string;
  name: string;
  description: string | null;
  radius_meters: number;
  join_code: string;
  organizer_id: string;
  is_active: boolean;
  member_count: number;
  is_joined: boolean;
  is_organizer: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export default function NearbyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'nearby' | 'zones'>('nearby');

  // Nearby Mode State
  const [isNearbyActive, setIsNearbyActive] = useState(false);
  const [radiusPref, setRadiusPref] = useState<number>(500);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [showSafetyTips, setShowSafetyTips] = useState(false);
  const [safetyTipsAccepted, setSafetyTipsAccepted] = useState(false);
  const [targetUser, setTargetUser] = useState<NearbyUser | null>(null);

  // Event Zones State
  const [zones, setZones] = useState<EventZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joiningZone, setJoiningZone] = useState(false);
  const [showCreateZone, setShowCreateZone] = useState(false);

  // Check initial presence status
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/nearby/presence');
        const data = await res.json();
        if (data.is_active) {
          setIsNearbyActive(true);
          setRadiusPref(data.radius_preference || 500);
          setSafetyTipsAccepted(true);
          requestBrowserLocation();
        }
      } catch {}
    }
    checkStatus();
  }, []);

  function requestBrowserLocation(onSuccess?: (lat: number, lon: number) => void) {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        onSuccess?.(coords.lat, coords.lon);
      },
      (err) => {
        console.error('Location error:', err);
        toast.error('Location permission denied. Nearby mode requires location access.');
        setIsNearbyActive(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function handleEnableNearby() {
    if (!safetyTipsAccepted) {
      setShowSafetyTips(true);
      return;
    }

    requestBrowserLocation(async (lat, lon) => {
      setLoadingNearby(true);
      try {
        const res = await fetch('/api/nearby/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: lat,
            longitude: lon,
            radius_preference: radiusPref,
            is_active: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to activate Nearby Mode');
          return;
        }

        setIsNearbyActive(true);
        toast.success('Nearby Mode armed. Coordinates snapped to ~110m cell.');
        fetchNearbyUsers(lat, lon, radiusPref);
      } catch {
        toast.error('Failed to enable Nearby Mode');
      } finally {
        setLoadingNearby(false);
      }
    });
  }

  async function handleDisableNearby() {
    try {
      await fetch('/api/nearby/presence', { method: 'DELETE' });
      setIsNearbyActive(false);
      setNearbyUsers([]);
      toast.info('Nearby presence cleared');
    } catch {
      toast.error('Failed to disable Nearby Mode');
    }
  }

  async function handleRadiusChange(newRadius: number) {
    setRadiusPref(newRadius);
    if (!isNearbyActive || !userCoords) return;

    try {
      await fetch('/api/nearby/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userCoords.lat,
          longitude: userCoords.lon,
          radius_preference: newRadius,
          is_active: true,
        }),
      });
      fetchNearbyUsers(userCoords.lat, userCoords.lon, newRadius);
    } catch {}
  }

  const fetchNearbyUsers = useCallback(
    async (lat?: number, lon?: number, rad?: number) => {
      const cLat = lat ?? userCoords?.lat;
      const cLon = lon ?? userCoords?.lon;
      const cRad = rad ?? radiusPref;

      if (!cLat || !cLon) return;

      setLoadingNearby(true);
      try {
        const res = await fetch(`/api/nearby?lat=${cLat}&lon=${cLon}&radius=${cRad}`);
        const data = await res.json();
        if (res.ok) {
          setNearbyUsers(data.users || []);
        }
      } catch {
        toast.error('Failed to refresh vicinity');
      } finally {
        setLoadingNearby(false);
      }
    },
    [userCoords, radiusPref]
  );

  useEffect(() => {
    if (!isNearbyActive || !userCoords) return;

    fetchNearbyUsers();
    const interval = setInterval(() => {
      fetchNearbyUsers();
    }, 30000);

    return () => clearInterval(interval);
  }, [isNearbyActive, userCoords, fetchNearbyUsers]);

  const fetchZones = useCallback(async () => {
    setLoadingZones(true);
    try {
      const res = await fetch('/api/nearby/zones');
      const data = await res.json();
      if (res.ok) setZones(data.zones || []);
    } catch {
      toast.error('Failed to load event zones');
    } finally {
      setLoadingZones(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'zones') fetchZones();
  }, [activeTab, fetchZones]);

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setJoiningZone(true);
    try {
      const targetZone = zones.find(
        (z) => z.join_code.toUpperCase() === joinCodeInput.trim().toUpperCase()
      );
      if (!targetZone) {
        toast.error('No active event zone located with this join code');
        return;
      }

      const res = await fetch(`/api/nearby/zones/${targetZone.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: joinCodeInput.trim().toUpperCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to enter event zone');
        return;
      }

      toast.success('Geofence clearance verified. Welcome.');
      router.push(`/dashboard/nearby/zones/${targetZone.id}`);
    } catch {
      toast.error('Error connecting to event zone');
    } finally {
      setJoiningZone(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-primary)] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
            <span>Vicinity Radar // Fuzzed Local Bands</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Nearby & Campus Events
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Discover anonymous peers in physical proximity. Exact coordinates are mathematically fuzzed before storing.
          </p>
        </div>

        <div className="inline-flex items-center self-start sm:self-auto p-1 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('nearby')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'nearby'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium shadow-sm border border-[var(--color-border)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Nearby Mode
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'zones'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium shadow-sm border border-[var(--color-border)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Event Zones
          </button>
        </div>
      </div>

      {/* ──────────────── TAB 1: NEARBY MODE ──────────────── */}
      {activeTab === 'nearby' && (
        <div className="space-y-6">
          {!isNearbyActive ? (
            /* Opt-in Screen when Nearby Mode is OFF */
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-1">
                <span className="font-mono text-xs text-[var(--color-primary)] uppercase">
                  ZERO EXACT TRACKING GUARANTEE
                </span>
                <h2 className="text-lg font-bold text-[var(--color-text)]">
                  Discover Peers in Your Physical Radius
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                  Nearby Mode detects anonymous students in your vicinity. Your exact location is never stored, tracked, or broadcast to other devices.
                </p>
              </div>

              {/* 3 Privacy Pillar Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-[var(--color-primary)] font-medium">
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>~110m Grid Snapping</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    PostGIS snaps coordinates to an obfuscated regional grid cell. Triangulation is mathematically impossible.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-500 font-medium">
                    <Radio className="h-3.5 w-3.5" />
                    <span>Calm Distance Bands</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    Users only see broad frequency tiers: &ldquo;within 100 m&rdquo;, &ldquo;within 500 m&rdquo;, or &ldquo;within 1 km&rdquo;.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-amber-500 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    <span>30m Auto-Purge</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    Your presence automatically expires and purges from database memory after 30 minutes of inactivity.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleEnableNearby}
                  disabled={loadingNearby}
                  className="font-mono text-xs px-6 py-2"
                >
                  {loadingNearby ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Acquiring Fuzzed Coordinates...
                    </>
                  ) : (
                    'Arm Nearby Mode [ + ]'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Active Nearby Mode Dashboard */
            <div className="space-y-4">
              {/* Active Control Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] gap-4 shadow-sm font-mono">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-emerald-500">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider">
                        Vicinity Radar Active
                      </h3>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-500">
                        Live // 30m Auto-Purge
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                      Coordinates snapped to ~110m cell. Auto-refreshing every 30s.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => fetchNearbyUsers()}
                    disabled={loadingNearby}
                    className="text-xs font-mono h-8"
                    title="Refresh vicinity"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1.5 ${loadingNearby ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDisableNearby}
                    className="text-xs font-mono h-8"
                  >
                    Turn Off
                  </Button>
                </div>
              </div>

              {/* Radius Preference Selector */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] font-mono text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  <span className="uppercase tracking-wider text-[var(--color-muted)]">
                    Scan Frequency Band:
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[100, 500, 1000].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRadiusChange(r)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        radiusPref === r
                          ? 'bg-[var(--color-primary)] text-white font-medium shadow-sm'
                          : 'bg-[var(--color-surface-raised)] text-[var(--color-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                      }`}
                    >
                      {r >= 1000 ? '1 km' : `${r} m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nearby Users List */}
              {loadingNearby && nearbyUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 font-mono text-xs text-[var(--color-muted)]">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)] mb-2" />
                  <p>Scanning vicinity coordinates...</p>
                </div>
              ) : nearbyUsers.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed border-[var(--color-border)] p-6 space-y-2 font-mono text-[var(--color-muted)]">
                  <Users className="h-8 w-8 mx-auto opacity-40" />
                  <p className="text-xs uppercase tracking-wider">
                    No anonymous peers detected within {radiusPref >= 1000 ? '1 km' : `${radiusPref} m`}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Try expanding search radius to 500m or 1km, or check back during campus fests.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearbyUsers.map((u) => {
                    const avatar = AVATARS[u.avatar_url || ''] || '👤';

                    return (
                      <div
                        key={u.user_id}
                        className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border)]/90 transition-colors space-y-3 shadow-sm flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-xl shrink-0 select-none">
                                {avatar}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-sm text-[var(--color-text)] truncate">
                                  {u.display_name}
                                </h3>
                                <p className="text-[11px] font-mono text-[var(--color-muted)]">
                                  {u.age_range} {u.gender ? `// ${u.gender}` : ''}
                                </p>
                              </div>
                            </div>

                            {/* Distance Band Pill */}
                            <span className="shrink-0 px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-medium">
                              {u.distance_band}
                            </span>
                          </div>

                          {u.bio && (
                            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed font-sans">
                              {u.bio}
                            </p>
                          )}

                          {u.interests && u.interests.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {u.interests.slice(0, 4).map((tag) => (
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

                        <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => setTargetUser(u)}
                            className="font-mono text-xs h-7 px-3"
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
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: EVENT ZONES ──────────────── */}
      {activeTab === 'zones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <form
              onSubmit={handleJoinByCode}
              className="sm:col-span-2 flex items-center gap-2 p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="pl-2 text-[var(--color-muted)]">
                <Key className="h-3.5 w-3.5" />
              </div>
              <Input
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter 6-char zone code (e.g. FEST26)..."
                maxLength={10}
                className="border-0 bg-transparent focus-visible:ring-0 shadow-none font-mono uppercase text-xs h-8"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!joinCodeInput.trim() || joiningZone}
                className="font-mono text-xs px-3 h-8 shrink-0"
              >
                {joiningZone ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Enter Zone'}
              </Button>
            </form>

            <Button
              onClick={() => setShowCreateZone(true)}
              className="font-mono text-xs flex items-center justify-center gap-2 h-auto py-2.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Event Zone</span>
            </Button>
          </div>

          {loadingZones ? (
            <div className="flex flex-col items-center justify-center py-16 font-mono text-xs text-[var(--color-muted)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)] mb-2" />
              <p>Scanning campus event zones...</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-[var(--color-border)] p-6 space-y-2 font-mono text-[var(--color-muted)]">
              <Calendar className="h-8 w-8 mx-auto opacity-40" />
              <p className="text-xs uppercase tracking-wider">No active event zones in session</p>
              <p className="text-[11px] text-[var(--color-muted)]">
                Hosting a college fest or meetup? Create an event zone with a geofence.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {zones.map((z) => (
                <div
                  key={z.id}
                  className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border)]/90 transition-colors space-y-3 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-sm text-[var(--color-text)]">
                          {z.name}
                        </h3>
                        {z.description && (
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                            {z.description}
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 font-mono text-xs px-2 py-0.5 rounded bg-[var(--color-surface-raised)] text-[var(--color-primary)] border border-[var(--color-border)] font-medium">
                        {z.join_code}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-[var(--color-muted)]">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        [{z.member_count} present]
                      </span>
                      <span>//</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {z.radius_meters >= 1000
                          ? `${z.radius_meters / 1000} km`
                          : `${z.radius_meters} m`}{' '}
                        geofence
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-[var(--color-border)] font-mono">
                    <span className="text-[11px] text-emerald-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      active
                    </span>

                    <Link href={`/dashboard/nearby/zones/${z.id}`}>
                      <Button
                        size="sm"
                        variant={z.is_joined ? 'primary' : 'outline'}
                        className="text-xs h-7 px-3 font-mono"
                      >
                        {z.is_joined ? 'Enter Zone' : 'View Hub'}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Safety Tips Modal */}
      {showSafetyTips && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl space-y-4 antialiased">
            <div className="flex items-center gap-2.5 text-amber-500 font-mono text-xs uppercase">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span className="font-semibold">Vicinity Safety Parameters</span>
            </div>

            <div className="space-y-3 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Never share your real name, phone number, address, or payment details.</span>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                <p className="flex items-center gap-2 text-[var(--color-text)]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Exact GPS is snapped to ~110m cells before storing.
                </p>
                <p className="flex items-center gap-2 text-[var(--color-text)]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Peers only see distance bands (&ldquo;within 100 m&rdquo;, &ldquo;within 500 m&rdquo;).
                </p>
                <p className="flex items-center gap-2 text-[var(--color-text)]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Radar presence automatically expires after 30 minutes.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)] font-mono text-xs">
              <Button variant="ghost" size="sm" onClick={() => setShowSafetyTips(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSafetyTipsAccepted(true);
                  setShowSafetyTips(false);
                  handleEnableNearby();
                }}
              >
                I Understand, Arm Radar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Zone Modal */}
      {showCreateZone && (
        <CreateZoneModal
          onClose={() => setShowCreateZone(false)}
          onCreated={(newZone) => {
            setShowCreateZone(false);
            router.push(`/dashboard/nearby/zones/${newZone.id}`);
          }}
        />
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

function CreateZoneModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (zone: any) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [radius, setRadius] = useState(500);
  const [code, setCode] = useState('');
  const [hours, setHours] = useState(6);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Event zone name required');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

          const res = await fetch('/api/nearby/zones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              description: desc.trim() || null,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              radius_meters: radius,
              join_code: code.trim().toUpperCase() || undefined,
              ends_at: endsAt,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || 'Failed to create zone');
            return;
          }

          toast.success('Event zone created!');
          onCreated(data.zone);
        } catch {
          toast.error('Failed to create zone');
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.error('Location is required to anchor event zone geofence');
        setLoading(false);
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl space-y-4 antialiased">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            Create Event Zone
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] font-mono text-xs"
          >
            [ esc ]
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1">
              Event / Fest Moniker *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Campus Tech Fest 2026"
              maxLength={80}
              required
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Event activities, hall numbers, details..."
              rows={2}
              maxLength={300}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text)] resize-none focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="text-xs uppercase text-[var(--color-muted)] block mb-1">
                Geofence Radius
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text)]"
              >
                <option value={200}>200 m (Auditorium)</option>
                <option value={500}>500 m (Building)</option>
                <option value={1000}>1 km (Campus)</option>
                <option value={2000}>2 km (Max area)</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase text-[var(--color-muted)] block mb-1">
                Active Duration
              </label>
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text)]"
              >
                <option value={2}>2 Hours</option>
                <option value={6}>6 Hours</option>
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-[var(--color-muted)] block mb-1">
              Custom Join Code (Optional)
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Leave empty for auto-generated 6-char code"
              maxLength={8}
              className="font-mono uppercase text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)] font-mono text-xs">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Anchor Event Geofence
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
