'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
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
      toast.info('No answer');
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
            setLivekitError('LiveKit credentials not configured in .env.local yet.');
          } else {
            setLivekitError(tokenData.error || 'Failed to authenticate call');
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
        setLivekitError(err.message || 'WebRTC connection failed');
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
        // Both users opted in: enable camera
        await roomRef.current.localParticipant.setCameraEnabled(true);
        const camPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
        if (camPub?.videoTrack && localVideoRef.current) {
          camPub.videoTrack.attach(localVideoRef.current);
        }
      } else {
        // Disable camera if not both opted in
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl text-center space-y-6">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 animate-pulse">
              Incoming {call.type === 'video' ? 'Video' : 'Voice'} Call
            </span>
            <h2 className="text-xl font-bold text-white">{call.otherUserName}</h2>
          </div>

          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/20 animate-ping opacity-60" />
            <div className="w-24 h-24 rounded-full bg-[var(--color-primary)]/20 border-2 border-[var(--color-primary)] flex items-center justify-center text-4xl select-none z-10 shadow-lg">
              {avatarEmoji}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Voice call is enabled. Video is off by default for anonymity.
          </p>

          <div className="flex items-center justify-center gap-6 pt-2">
            <button
              onClick={onDecline}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95">
                <PhoneOff className="h-6 w-6" />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-red-400">Decline</span>
            </button>

            <button
              onClick={() => {
                if (!localStorage.getItem('anon_has_seen_call_safety_tips')) {
                  setShowCallSafetyPrompt(true);
                } else {
                  onAccept();
                }
              }}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-bounce">
                <Phone className="h-6 w-6" />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-emerald-400">Accept</span>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl text-center space-y-6">
          <div className="space-y-1">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 animate-pulse">
              Calling...
            </span>
            <h2 className="text-xl font-bold text-white">{call.otherUserName}</h2>
          </div>

          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping opacity-60" />
            <div className="w-24 h-24 rounded-full bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center text-4xl select-none z-10 shadow-lg">
              {avatarEmoji}
            </div>
          </div>

          <p className="text-xs text-slate-400">Waiting for response (30s timeout)...</p>

          <div className="flex justify-center pt-2">
            <button
              onClick={onEnd}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95">
                <PhoneOff className="h-6 w-6" />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-red-400">Cancel</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Call Screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4">
      {/* Hidden audio element container for LiveKit remote audio */}
      <div ref={audioContainerRef} className="hidden" />

      <div className="w-full max-w-xl h-[85vh] sm:h-[80vh] flex flex-col rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden relative">
        {/* Safety Warning Banner */}
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-center text-xs text-amber-300 font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Never share personal info, real identity, location, or send money.</span>
        </div>

        {/* LiveKit configuration notification (if free tier keys not yet supplied) */}
        {livekitError && (
          <div className="bg-indigo-900/40 border-b border-indigo-700/50 px-4 py-2 text-center text-xs text-indigo-200">
            {livekitError}
          </div>
        )}

        {/* Top Header: Partner info & Call Duration */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-lg">
              {avatarEmoji}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{call.otherUserName}</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                In Call · Anonymous
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Main Center Video / Avatar Area */}
        <div className="flex-1 relative flex items-center justify-center bg-slate-900/30 overflow-hidden">
          {bothVideoEnabled ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video Stream (Picture-in-Picture) */}
              <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
                <span className="absolute bottom-1 left-2 text-[10px] bg-black/60 px-1.5 rounded text-white font-medium">
                  You
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 p-6 text-center">
              <div className="w-28 h-28 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center text-5xl shadow-2xl">
                {avatarEmoji}
              </div>

              <div className="space-y-1 max-w-xs">
                <p className="text-base font-semibold text-white">Voice Call Active</p>
                <p className="text-xs text-slate-400">
                  {myVideoOptIn && !partnerVideoOptIn
                    ? 'Your camera is ready. Waiting for partner to also enable camera to show video.'
                    : !myVideoOptIn && partnerVideoOptIn
                    ? 'Partner requested video. Turn on your camera to start mutual video.'
                    : 'Video is off by default for privacy. Both participants must opt in to enable video.'}
                </p>
              </div>

              {myVideoOptIn && !partnerVideoOptIn && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Waiting for partner camera opt-in...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
          {/* Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-amber-400 hover:bg-amber-500/10 transition-colors"
            title="Report this user"
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Report</span>
          </button>

          {/* Central Media Controls */}
          <div className="flex items-center gap-4">
            {/* Mic Toggle */}
            <button
              onClick={handleToggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* Video Opt-In Toggle */}
            <button
              onClick={() => onToggleVideo(!myVideoOptIn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                myVideoOptIn
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={
                myVideoOptIn
                  ? 'Turn camera off'
                  : 'Turn camera on (both users must opt in)'
              }
            >
              {myVideoOptIn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={onEnd}
              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-all active:scale-95"
              title="End call"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>

          <div className="w-12 sm:w-16" />
        </div>
      </div>

      {/* Safety Report Modal */}
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
