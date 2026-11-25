'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UnreadCounts {
  pendingRequests: number;
  unreadMessages: number;
}

/**
 * Subscribes to Supabase Realtime changes for connection requests and messages
 * so sidebar notification badges stay live without interval polling.
 */
export function useRealtimeCounts(userId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState<UnreadCounts>({
    pendingRequests: 0,
    unreadMessages: 0,
  });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/notifications/counts', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setCounts({
        pendingRequests: Number(data.pendingRequests) || 0,
        unreadMessages: Number(data.unreadMessages) || 0,
      });
    } catch {
      // Non-fatal: keep previous counts if transient network failure occurs
    }
  }, [userId]);

  const scheduleRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchCounts();
    }, 250);
  }, [fetchCounts]);

  useEffect(() => {
    if (!userId) return;

    fetchCounts();

    const channel = supabase
      .channel(`realtime_counts_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${userId}`,
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        scheduleRefresh
      )
      .subscribe();

    const handleFocus = () => {
      fetchCounts();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, fetchCounts, scheduleRefresh]);

  return { counts, refreshCounts: fetchCounts };
}
