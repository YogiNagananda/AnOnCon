'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendRequestModal } from '@/components/requests/send-request-modal';
import {
  MapPin, Shield, ShieldAlert, AlertTriangle, RefreshCw,
  Users, Plus, Key, Calendar, Clock, Loader2, Sparkles,
  CheckCircle2, Compass, ArrowRight, EyeOff, Radio
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

  // Request browser location
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
        toast.error('Location permission denied. Please allow location access to use Nearby Mode.');
        setIsNearbyActive(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  // Enable Nearby Mode with safety check
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
        toast.success('Nearby Mode activated! Your coordinates are fuzzed for privacy.');
        fetchNearbyUsers(lat, lon, radiusPref);
      } catch {
        toast.error('Failed to enable Nearby Mode');
      } finally {
        setLoadingNearby(false);
      }
    });
  }

  // Disable Nearby Mode
  async function handleDisableNearby() {
    try {
      await fetch('/api/nearby/presence', { method: 'DELETE' });
      setIsNearbyActive(false);
      setNearbyUsers([]);
      toast.info('Nearby Mode turned off. Presence deleted.');
    } catch {
      toast.error('Failed to turn off Nearby Mode');
    }
  }

  // Change Radius preference
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

  // Fetch nearby users with distance bands
  const fetchNearbyUsers = useCallback(async (lat?: number, lon?: number, rad?: number) => {
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
      toast.error('Failed to refresh nearby users');
    } finally {
      setLoadingNearby(false);
    }
  }, [userCoords, radiusPref]);

  // Auto-refresh every 30 seconds when Nearby Mode is active
  useEffect(() => {
    if (!isNearbyActive || !userCoords) return;

    fetchNearbyUsers();
    const interval = setInterval(() => {
      fetchNearbyUsers();
    }, 30000);

    return () => clearInterval(interval);
  }, [isNearbyActive, userCoords, fetchNearbyUsers]);

  // Load Event Zones
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

  // Join Zone by Code
  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setJoiningZone(true);
    try {
      // Find zone with matching code
      const targetZone = zones.find((z) => z.join_code.toUpperCase() === joinCodeInput.trim().toUpperCase());
      if (!targetZone) {
        toast.error('No active event zone found with this code');
        return;
      }

      const res = await fetch(`/api/nearby/zones/${targetZone.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: joinCodeInput.trim().toUpperCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to join event zone');
        return;
      }

      toast.success('Joined event zone!');
      router.push(`/dashboard/nearby/zones/${targetZone.id}`);
    } catch {
      toast.error('Error joining event zone');
    } finally {
      setJoiningZone(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
            <Compass className="h-6 w-6 text-[var(--color-primary)]" />
            Nearby & Events
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Discover anonymous peers in your vicinity with zero exact location tracking.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 border border-[var(--color-border)] p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('nearby')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'nearby'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-muted)] hover:text-white'
            }`}
          >
            Nearby Mode
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'zones'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-muted)] hover:text-white'
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
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto text-3xl">
                <MapPin className="h-8 w-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-xl font-bold text-[var(--color-text)]">
                  Connect with People Nearby
                </h2>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  Nearby Mode lets you discover other anonymous users in your area.
                  For your safety and privacy, <strong className="text-[var(--color-text)]">your exact coordinates are never shared or stored</strong>.
                </p>
              </div>

              {/* Privacy highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
                <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                    <EyeOff className="h-4 w-4" />
                    <span>Location Fuzzing</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    GPS coordinates are snapped to a ~110m grid cell before saving. Nobody can triangulate you.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <Radio className="h-4 w-4" />
                    <span>Distance Bands</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Others only see broad ranges (&ldquo;within 100 m&rdquo;, &ldquo;within 500 m&rdquo;), never exact meters.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                    <Clock className="h-4 w-4" />
                    <span>Auto-Expires</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Presence is automatically deleted after 30 minutes of inactivity or when you turn it off.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleEnableNearby}
                  disabled={loadingNearby}
                  className="px-8 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all text-sm font-semibold"
                >
                  {loadingNearby ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Acquiring Location...
                    </>
                  ) : (
                    'Enable Nearby Mode'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Active Nearby Mode Dashboard */
            <div className="space-y-5">
              {/* Active Control Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Radio className="h-5 w-5 animate-pulse" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Nearby Mode Active</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                        Live (30m Auto-Timeout)
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/70">
                      Coordinates snapped & fuzzed. Auto-refreshing every 30s.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => fetchNearbyUsers()}
                    disabled={loadingNearby}
                    className="text-xs text-indigo-300 hover:text-white"
                    title="Refresh nearby users"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingNearby ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDisableNearby}
                    className="text-xs rounded-xl"
                  >
                    Turn Off
                  </Button>
                </div>
              </div>

              {/* Radius Preference Selector */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Search Radius:
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[100, 500, 1000].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRadiusChange(r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        radiusPref === r
                          ? 'bg-[var(--color-primary)] text-white shadow-sm'
                          : 'bg-[var(--color-bg)] text-[var(--color-muted)] hover:text-white'
                      }`}
                    >
                      {r >= 1000 ? '1 km' : `${r} m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nearby Users List */}
              {loadingNearby && nearbyUsers.length === 0 ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                </div>
              ) : nearbyUsers.length === 0 ? (
                <div className="text-center py-16 rounded-3xl border border-dashed border-[var(--color-border)] p-6 space-y-3">
                  <Users className="h-10 w-10 mx-auto text-[var(--color-muted)] opacity-30" />
                  <p className="text-sm text-[var(--color-muted)]">
                    No anonymous users nearby within your selected radius ({radiusPref >= 1000 ? '1 km' : `${radiusPref} m`}).
                  </p>
                  <p className="text-xs text-slate-500">
                    Try expanding your search radius to 500 m or 1 km, or check back shortly!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearbyUsers.map((u) => {
                    const avatar = AVATARS[u.avatar_url || ''] || '👤';

                    return (
                      <div
                        key={u.user_id}
                        className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all space-y-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-2xl shrink-0">
                              {avatar}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm text-[var(--color-text)] truncate">
                                {u.display_name}
                              </h3>
                              <p className="text-xs text-[var(--color-muted)]">
                                {u.age_range} {u.gender ? `· ${u.gender}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Distance Band Pill */}
                          <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {u.distance_band}
                          </span>
                        </div>

                        {u.bio && (
                          <p className="text-xs text-[var(--color-text)] line-clamp-2">
                            {u.bio}
                          </p>
                        )}

                        {u.interests && u.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {u.interests.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700/50"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => setTargetUser(u)}
                            className="text-xs rounded-xl"
                          >
                            Send Request
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
          {/* Join with code box & Create button */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <form
              onSubmit={handleJoinByCode}
              className="sm:col-span-2 flex items-center gap-2 p-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="pl-2 text-[var(--color-muted)]">
                <Key className="h-4 w-4" />
              </div>
              <Input
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter 6-character Join Code (e.g. FEST26)..."
                maxLength={10}
                className="border-0 bg-transparent focus-visible:ring-0 shadow-none font-mono uppercase text-sm"
              />
              <Button type="submit" size="sm" disabled={!joinCodeInput.trim() || joiningZone} className="rounded-xl px-4">
                {joiningZone ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Zone'}
              </Button>
            </form>

            <Button
              onClick={() => setShowCreateZone(true)}
              className="rounded-2xl flex items-center justify-center gap-2 h-auto py-3"
            >
              <Plus className="h-4 w-4" />
              <span>Create Event Zone</span>
            </Button>
          </div>

          {/* Zones list */}
          {loadingZones ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border border-dashed border-[var(--color-border)] p-6 space-y-3">
              <Calendar className="h-10 w-10 mx-auto text-[var(--color-muted)] opacity-30" />
              <p className="text-sm text-[var(--color-muted)]">No active event zones right now.</p>
              <p className="text-xs text-slate-500">
                Hosting a college fest, hackathon, or meetup? Create an event zone with a geofence!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {zones.map((z) => (
                <div
                  key={z.id}
                  className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base text-[var(--color-text)]">
                        {z.name}
                      </h3>
                      {z.description && (
                        <p className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-2">
                          {z.description}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 font-mono text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {z.join_code}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {z.member_count} present
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {z.radius_meters >= 1000 ? `${z.radius_meters / 1000} km` : `${z.radius_meters} m`} radius
                    </span>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-[var(--color-border)]">
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>

                    <Link href={`/dashboard/nearby/zones/${z.id}`}>
                      <Button size="sm" variant={z.is_joined ? 'primary' : 'ghost'} className="text-xs rounded-xl">
                        {z.is_joined ? 'Enter Zone' : 'View Zone'}
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

      {/* Safety Tips Modal (Shown the first time user enables Nearby Mode) */}
      {showSafetyTips && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h2 className="text-lg font-bold text-white">Nearby Mode Safety Tips</h2>
            </div>

            <div className="space-y-3 text-xs text-[var(--color-muted)] leading-relaxed">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Never share your real name, phone number, address, or payment details.</span>
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-2 text-slate-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  Your exact location is mathematically fuzzed before storing.
                </p>
                <p className="flex items-center gap-2 text-slate-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  Users only see distance bands (&ldquo;within 100 m&rdquo;, &ldquo;within 500 m&rdquo;).
                </p>
                <p className="flex items-center gap-2 text-slate-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  Nearby presence automatically turns off after 30 minutes.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowSafetyTips(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSafetyTipsAccepted(true);
                  setShowSafetyTips(false);
                  handleEnableNearby();
                }}
              >
                I Understand, Enable
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

    // Get current location for event center geofence
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Create Event Zone</h2>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-white text-xl">
            ×
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
              Event / Fest Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Campus Tech Fest 2026"
              maxLength={80}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Event activities, hall numbers, details..."
              rows={2}
              maxLength={300}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
                Geofence Radius
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
              >
                <option value={200}>200 m (Auditorium)</option>
                <option value={500}>500 m (Building)</option>
                <option value={1000}>1 km (Campus)</option>
                <option value={2000}>2 km (Max area)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
                Auto-Closes In
              </label>
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
              >
                <option value={2}>2 Hours</option>
                <option value={6}>6 Hours</option>
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
              Custom Join Code (Optional)
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Leave empty for auto-generated 6-char code"
              maxLength={8}
              className="font-mono uppercase text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Zone
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
