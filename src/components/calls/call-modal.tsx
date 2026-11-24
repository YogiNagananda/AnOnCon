'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';
import { ActiveCallState } from './call-provider';
import { ReportModal } from '@/components/safety/report-modal';
import { CallSafetyModal } from '@/components/safety/call-safety-modal';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Clock,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

interface CallModalProps {
  call: ActiveCallState;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  onEnd: () => Promise<void>;
  onToggleVideo: (enabled: boolean) => Promise<void>;
}

export function CallModal({
  call,
  onAccept,
  onDecline,
  onEnd,
  onToggleVideo,
}: CallModalProps) {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCallSafetyPrompt, setShowCallSafetyPrompt] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [livekitError, setLivekitError] = useState<string | null>(null);

  // Video opt-in
  const myVideoOptIn = call.isCaller ? call.videoEnabledCaller : call.videoEnabledReceiver;
  const partnerVideoOptIn = call.isCaller ? call.videoEnabledReceiver : call.videoEnabledCaller;
  const bothVideoEnabled = call.videoEnabledCaller && call.videoEnabledReceiver;

  // LiveKit refs
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);

  // 30s Ringing Timeout for Outgoing Calls
  useEffect(() => {
    if (call.status !== 'ringing_outgoing') return;

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/calls/${call.callId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'missed' }),
        });
      } catch {}
      toast.info('Signal timed out — no answer');
      onEnd();
    }, 30000);

    return () => clearTimeout(timer);
  }, [call.status, call.callId, onEnd]);

  // Duration Timer for Active Calls
  useEffect(() => {
    if (call.status !== 'active') return;
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [call.status]);

  // Connect to LiveKit Room once Call becomes Active
  useEffect(() => {
    if (call.status !== 'active') return;

    let active = true;

    async function connectRoom() {
      setConnecting(true);
      setLivekitError(null);

      try {
        const tokenRes = await fetch('/api/calls/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: call.chatId, call_id: call.callId }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
          if (tokenRes.status === 503) {
            setLivekitError('LiveKit WebRTC gateway pending setup.');
          } else {
            setLivekitError(tokenData.error || 'Failed to authenticate audio link');
          }
          setConnecting(false);
          return;
        }

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (!active) return;
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            audioContainerRef.current?.appendChild(el);
          } else if (track.kind === Track.Kind.Video) {
            if (remoteVideoRef.current) {
              track.attach(remoteVideoRef.current);
            }
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach();
        });

        room.on(RoomEvent.Disconnected, () => {
          if (active) onEnd();
        });

        await room.connect(tokenData.livekit_url || 'wss://demo.livekit.cloud', tokenData.token);

        // Turn on microphone by default
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (err: any) {
        console.error('LiveKit connection error:', err);
        setLivekitError(err.message || 'WebRTC transmission failed');
      } finally {
        if (active) setConnecting(false);
      }
    }

    connectRoom();

    return () => {
      active = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [call.status, call.chatId, call.callId, onEnd]);

  // Microphone mute toggle
  async function handleToggleMic() {
    if (!roomRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    await roomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
  }

  // Handle Video Opt-In and Attachment
  useEffect(() => {
    if (call.status !== 'active' || !roomRef.current) return;

    async function syncVideo() {
      if (!roomRef.current) return;

      if (bothVideoEnabled) {
        await roomRef.current.localParticipant.setCameraEnabled(true);
        const camPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
        if (camPub?.videoTrack && localVideoRef.current) {
          camPub.videoTrack.attach(localVideoRef.current);
        }
      } else {
        await roomRef.current.localParticipant.setCameraEnabled(false);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }
    }

    syncVideo();
  }, [bothVideoEnabled, call.status]);

  function formatDuration(sec: number) {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const avatarEmoji = AVATARS[call.otherUserAvatar || ''] || '👤';

  // 1. Ringing Incoming Screen
  if (call.status === 'ringing_incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 antialiased selection:bg-[var(--color-primary)] selection:text-white">
        <div className="w-full max-w-sm rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8 shadow-2xl text-center space-y-6">
          <div className="space-y-1.5 font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-medium">
              <Radio className="w-3 h-3 text-emerald-500" />
              Incoming {call.type === 'video' ? 'Video' : 'Voice'} Signal
            </span>
            <h2 className="text-lg font-bold text-[var(--color-text)] font-sans">
              {call.otherUserName}
            </h2>
          </div>

          <div className="mx-auto w-20 h-20 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-4xl select-none shadow-sm">
            {avatarEmoji}
          </div>

          <p className="text-xs font-mono text-[var(--color-muted)] leading-relaxed">
            Encrypted audio frequency ready. Video feed stays masked until both peers explicitly opt in.
          </p>

          <div className="flex items-center justify-center gap-6 pt-2 font-mono">
            <button
              type="button"
              onClick={onDecline}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-12 h-12 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-colors active:scale-95">
                <PhoneOff className="h-5 w-5" />
              </div>
              <span className="text-[11px] text-[var(--color-muted)] group-hover:text-red-500">
                Decline
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!localStorage.getItem('anon_has_seen_call_safety_tips')) {
                  setShowCallSafetyPrompt(true);
                } else {
                  onAccept();
                }
              }}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-12 h-12 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md transition-colors active:scale-95">
                <Phone className="h-5 w-5" />
              </div>
              <span className="text-[11px] text-[var(--color-muted)] group-hover:text-emerald-500">
                Connect
              </span>
            </button>
          </div>

          {showCallSafetyPrompt && (
            <CallSafetyModal
              forceOpen={showCallSafetyPrompt}
              onConfirm={() => {
                setShowCallSafetyPrompt(false);
                onAccept();
              }}
              onCancel={() => setShowCallSafetyPrompt(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // 2. Ringing Outgoing Screen
  if (call.status === 'ringing_outgoing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 antialiased selection:bg-[var(--color-primary)] selection:text-white">
        <div className="w-full max-w-sm rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8 shadow-2xl text-center space-y-6">
          <div className="space-y-1.5 font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-primary)] font-medium">
              <Radio className="w-3 h-3 text-[var(--color-primary)]" />
              Transmitting Signal...
            </span>
            <h2 className="text-lg font-bold text-[var(--color-text)] font-sans">
              {call.otherUserName}
            </h2>
          </div>

          <div className="mx-auto w-20 h-20 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-4xl select-none shadow-sm">
            {avatarEmoji}
          </div>

          <p className="text-xs font-mono text-[var(--color-muted)]">
            Awaiting peer answer // 30s auto-cancel
          </p>

          <div className="flex justify-center pt-2 font-mono">
            <button
              type="button"
              onClick={onEnd}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-12 h-12 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-colors active:scale-95">
                <PhoneOff className="h-5 w-5" />
              </div>
              <span className="text-[11px] text-[var(--color-muted)] group-hover:text-red-500">
                Cancel Signal
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Call Screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xs p-2 sm:p-4 antialiased selection:bg-[var(--color-primary)] selection:text-white">
      <div ref={audioContainerRef} className="hidden" />

      <div className="w-full max-w-xl h-[85vh] sm:h-[80vh] flex flex-col rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden relative">
        {/* Safety Warning Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs font-mono text-amber-500 flex items-center justify-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Keep it anonymous. Never share personal identity, contacts, or money.</span>
        </div>

        {livekitError && (
          <div className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)] px-4 py-2 text-center text-xs font-mono text-[var(--color-muted)]">
            {livekitError}
          </div>
        )}

        {/* Top Header: Partner info & Call Duration */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-base select-none">
              {avatarEmoji}
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text)]">
                {call.otherUserName}
              </p>
              <p className="text-[10px] font-mono text-emerald-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>active link // anonymous</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-muted)] bg-[var(--color-surface)] px-2.5 py-1 rounded border border-[var(--color-border)]">
            <Clock className="h-3 w-3 text-[var(--color-muted)]" />
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Main Center Video / Avatar Area */}
        <div className="flex-1 relative flex items-center justify-center bg-[var(--color-bg)] overflow-hidden">
          {bothVideoEnabled ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video Stream PIP */}
              <div className="absolute top-4 right-4 w-28 h-40 rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
                <span className="absolute bottom-1 left-2 text-[9px] font-mono bg-black/70 px-1 rounded text-white">
                  You
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 p-6 text-center">
              <div className="w-24 h-24 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-5xl shadow-sm select-none">
                {avatarEmoji}
              </div>

              <div className="space-y-1 max-w-xs font-mono">
                <p className="text-sm font-semibold text-[var(--color-text)] font-sans">
                  Voice Channel Transmitting
                </p>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  {myVideoOptIn && !partnerVideoOptIn
                    ? 'Your camera is armed. Waiting for partner camera opt-in.'
                    : !myVideoOptIn && partnerVideoOptIn
                    ? 'Peer requested mutual camera feed. Enable camera to accept.'
                    : 'Audio link active. Mutual video requires opt-in from both participants.'}
                </p>
              </div>

              {myVideoOptIn && !partnerVideoOptIn && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-primary)] font-mono text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Awaiting peer video handshake...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 bg-[var(--color-surface-raised)] border-t border-[var(--color-border)] flex items-center justify-between">
          {/* Report Button */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs text-amber-500 hover:bg-amber-500/10 transition-colors"
            title="Report this user"
            aria-label="Report"
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Report Peer</span>
          </button>

          {/* Central Media Controls */}
          <div className="flex items-center gap-3">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleMic}
              className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                isMuted
                  ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg)]'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              aria-label="Toggle Microphone"
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Video Toggle */}
            <button
              type="button"
              onClick={() => onToggleVideo(!myVideoOptIn)}
              className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                myVideoOptIn
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
              }`}
              title={
                myVideoOptIn
                  ? 'Turn camera off'
                  : 'Turn camera on (both users must opt in)'
              }
              aria-label="Toggle Video"
            >
              {myVideoOptIn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={onEnd}
              className="w-11 h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-sm transition-colors active:scale-95"
              title="Terminate call"
              aria-label="End Call"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>

          <div className="w-16 hidden sm:block" />
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetUserId={call.otherUserId}
          targetUserName={call.otherUserName}
        />
      )}
    </div>
  );
}
