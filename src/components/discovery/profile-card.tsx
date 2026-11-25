'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SendRequestModal } from '@/components/requests/send-request-modal';
import { BlockModal } from '@/components/safety/block-modal';
import { ReportModal } from '@/components/safety/report-modal';
import { UserPlus, Shield, Flag, Clock, MessageSquare, MapPin } from 'lucide-react';
import Link from 'next/link';

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

export interface AnonymousProfile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  age_range?: string | null;
  gender?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  languages?: string[] | null;
  area?: { country?: string; state?: string; city?: string } | null;
  is_online?: boolean;
  mood_status?: string | null;
  connectionStatus?: {
    status: string; // 'pending' | 'accepted'
    requestId: string;
    isSender: boolean;
  } | null;
}

interface ProfileCardProps {
  profile: AnonymousProfile;
  onRefresh?: () => void;
}

export function ProfileCard({ profile, onRefresh }: ProfileCardProps) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const avatarEmoji = AVATARS[profile.avatar_url || ''] || '👤';

  return (
    <>
      <article className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-border)]/90 transition-colors flex flex-col justify-between shadow-sm relative group">
        <div>
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-2xl select-none">
                  {avatarEmoji}
                </div>
                {profile.is_online && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-surface)]"
                    title="Active on campus network"
                  />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm text-[var(--color-text)] truncate">
                    {profile.display_name}
                  </h3>
                  {profile.age_range && (
                    <span className="font-mono text-[10px] text-[var(--color-muted)] border border-[var(--color-border)] px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)]">
                      {profile.age_range}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-muted)] font-mono">
                  {profile.gender && <span className="capitalize">{profile.gender}</span>}
                  {profile.area?.country && (
                    <>
                      <span>//</span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {profile.area.city ? `${profile.area.city}, ` : ''}{profile.area.country}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions (Report/Block) */}
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                title="Report transmission"
                className="p-1.5 rounded text-[var(--color-muted)] hover:text-amber-500 hover:bg-[var(--color-surface-raised)] transition-colors"
                aria-label="Report"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowBlockModal(true)}
                title="Block peer"
                className="p-1.5 rounded text-[var(--color-muted)] hover:text-red-500 hover:bg-[var(--color-surface-raised)] transition-colors"
                aria-label="Block"
              >
                <Shield className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Bio statement */}
          {profile.mood_status && (
            <p className="mt-2.5 text-[11px] font-mono text-[var(--color-primary)] bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-2.5 py-1 rounded-md truncate">
              Status: {profile.mood_status}
            </p>
          )}
          {profile.bio && (
            <p className="mt-3 text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3 bg-[var(--color-surface-raised)] p-3 rounded-lg border border-[var(--color-border)] font-sans">
              {profile.bio}
            </p>
          )}

          {/* Interest tags */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.interests.slice(0, 5).map((interest) => (
                <span
                  key={interest}
                  className="text-[11px] font-mono bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] px-2 py-0.5 rounded"
                >
                  #{interest}
                </span>
              ))}
              {profile.interests.length > 5 && (
                <span className="text-[10px] font-mono text-[var(--color-muted)] px-1 py-0.5">
                  +{profile.interests.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          {profile.connectionStatus?.status === 'accepted' ? (
            <Link href="/dashboard/chat" className="block">
              <Button
                size="sm"
                variant="outline"
                className="w-full font-mono text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
              >
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Open Chat Channel
              </Button>
            </Link>
          ) : profile.connectionStatus?.status === 'pending' ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full font-mono text-xs text-amber-500 border-amber-500/30 cursor-not-allowed"
              disabled
            >
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              {profile.connectionStatus.isSender ? 'Signal Pending' : 'Incoming Signal'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full font-mono text-xs"
              onClick={() => setShowRequestModal(true)}
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Connect [ + ]
            </Button>
          )}
        </div>
      </article>

      <SendRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        targetUser={{
          id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        }}
        onSuccess={onRefresh}
      />

      <BlockModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        targetUserId={profile.id}
        targetUserName={profile.display_name}
        onSuccess={onRefresh}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetUserId={profile.id}
        targetUserName={profile.display_name}
        onSuccess={onRefresh}
      />
    </>
  );
}
