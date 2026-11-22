'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CallModal } from './call-modal';
import { toast } from 'sonner';

export interface ActiveCallState {
  callId: string;
  chatId: string;
  type: 'voice' | 'video';
  status: 'ringing_outgoing' | 'ringing_incoming' | 'active';
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  videoEnabledCaller: boolean;
  videoEnabledReceiver: boolean;
  isCaller: boolean;
}

interface CallContextType {
  activeCall: ActiveCallState | null;
  startCall: (chatId: string, otherUserId: string, otherUserName: string, otherUserAvatar: string | null, type: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleVideoOptIn: (enabled: boolean) => Promise<void>;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const activeCallRef = useRef<ActiveCallState | null>(null);
  activeCallRef.current = activeCall;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, [supabase]);

  // Listen for calls in Supabase Realtime
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel(`user_calls_${currentUserId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
        },
        async (payload) => {
          const callData = payload.new as any;
          if (!callData) return;

          // 1. Incoming call for this user
          if (
            payload.eventType === 'INSERT' &&
            callData.receiver_id === currentUserId &&
            callData.status === 'ringing'
          ) {
            // Fetch caller profile
            const { data: callerProfile } = await supabase
              .from('public_profiles')
              .select('display_name, avatar_url')
              .eq('id', callData.caller_id)
              .single();

            setActiveCall({
              callId: callData.id,
              chatId: callData.chat_id,
              type: callData.type,
              status: 'ringing_incoming',
              otherUserId: callData.caller_id,
              otherUserName: callerProfile?.display_name || 'Anonymous User',
              otherUserAvatar: callerProfile?.avatar_url || null,
              videoEnabledCaller: callData.video_enabled_caller || false,
              videoEnabledReceiver: callData.video_enabled_receiver || false,
              isCaller: false,
            });
          }

          // 2. Call status updates for the currently active call
          if (activeCallRef.current && activeCallRef.current.callId === callData.id) {
            if (callData.status === 'declined') {
              toast.info('Call declined');
              setActiveCall(null);
            } else if (callData.status === 'missed') {
              toast.info('Call missed');
              setActiveCall(null);
            } else if (callData.status === 'ended') {
              toast.info('Call ended');
              setActiveCall(null);
            } else if (callData.status === 'active') {
              setActiveCall((prev) =>
                prev
                  ? {
                      ...prev,
                      status: 'active',
                      videoEnabledCaller: callData.video_enabled_caller || false,
                      videoEnabledReceiver: callData.video_enabled_receiver || false,
                    }
                  : null
              );
            } else if (payload.eventType === 'UPDATE') {
              // Video opt-in sync
              setActiveCall((prev) =>
                prev
                  ? {
                      ...prev,
                      videoEnabledCaller: callData.video_enabled_caller || false,
                      videoEnabledReceiver: callData.video_enabled_receiver || false,
                    }
                  : null
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  // Start outgoing call
  const startCall = useCallback(
    async (
      chatId: string,
      otherUserId: string,
      otherUserName: string,
      otherUserAvatar: string | null,
      type: 'voice' | 'video'
    ) => {
      try {
        const res = await fetch('/api/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, type }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Could not place call');
          return;
        }

        setActiveCall({
          callId: data.call.id,
          chatId,
          type,
          status: 'ringing_outgoing',
          otherUserId,
          otherUserName,
          otherUserAvatar,
          videoEnabledCaller: false,
          videoEnabledReceiver: false,
          isCaller: true,
        });
      } catch {
        toast.error('Failed to initiate call');
      }
    },
    []
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!activeCallRef.current) return;
    try {
      const res = await fetch(`/api/calls/${activeCallRef.current.callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to accept call');
        setActiveCall(null);
        return;
      }
      setActiveCall((prev) => (prev ? { ...prev, status: 'active' } : null));
    } catch {
      toast.error('Failed to accept call');
      setActiveCall(null);
    }
  }, []);

  // Decline incoming call
  const declineCall = useCallback(async () => {
    if (!activeCallRef.current) return;
    try {
      await fetch(`/api/calls/${activeCallRef.current.callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
    } catch {}
    setActiveCall(null);
  }, []);

  // End active call
  const endCall = useCallback(async () => {
    if (!activeCallRef.current) return;
    try {
      await fetch(`/api/calls/${activeCallRef.current.callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      });
    } catch {}
    setActiveCall(null);
  }, []);

  // Toggle video opt-in
  const toggleVideoOptIn = useCallback(async (enabled: boolean) => {
    if (!activeCallRef.current) return;
    try {
      await fetch(`/api/calls/${activeCallRef.current.callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_video', video_enabled: enabled }),
      });
    } catch {
      toast.error('Failed to update video settings');
    }
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleVideoOptIn,
      }}
    >
      {children}
      {activeCall && (
        <CallModal
          call={activeCall}
          onAccept={acceptCall}
          onDecline={declineCall}
          onEnd={endCall}
          onToggleVideo={toggleVideoOptIn}
        />
      )}
    </CallContext.Provider>
  );
}
