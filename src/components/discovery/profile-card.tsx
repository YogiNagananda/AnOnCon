'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SendRequestModal } from '@/components/requests/send-request-modal';
import { BlockModal } from '@/components/safety/block-modal';
import { ReportModal } from '@/components/safety/report-modal';
import { UserPlus, Shield, Flag, Check, Clock, MessageSquare, MapPin } from 'lucide-react';
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
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-primary)]/40 transition-all flex flex-col justify-between shadow-sm relative group">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-3xl select-none">
                  {avatarEmoji}
                </div>
                {profile.is_online && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--color-surface)]" title="Online now" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base text-[var(--color-text)]">
                    {profile.display_name}
                  </h3>
                  {profile.age_range && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {profile.age_range}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-muted)]">
                  {profile.gender && <span className="capitalize">{profile.gender}</span>}
                  {profile.area?.country && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {profile.area.city ? `${profile.area.city}, ` : ''}{profile.area.country}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions (Report/Block) */}
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setShowReportModal(true)}
                title="Report user"
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition-colors"
              >
                <Flag className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowBlockModal(true)}
                title="Block user"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition-colors"
              >
                <Shield className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-3 text-xs text-slate-300 leading-relaxed line-clamp-3 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/50">
              {profile.bio}
            </p>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.interests.slice(0, 5).map((interest) => (
                <span
                  key={interest}
                  className="text-[11px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2.5 py-0.5 rounded-full font-medium"
                >
                  {interest}
                </span>
              ))}
              {profile.interests.length > 5 && (
                <span className="text-[11px] text-[var(--color-muted)] px-1 py-0.5">
                  +{profile.interests.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          {profile.connectionStatus?.status === 'accepted' ? (
            <Link href="/dashboard/chat">
              <Button size="sm" variant="outline" className="w-full text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                <MessageSquare className="mr-1.5 h-4 w-4" /> Message (Connected)
              </Button>
            </Link>
          ) : profile.connectionStatus?.status === 'pending' ? (
            <Button size="sm" variant="outline" className="w-full text-amber-400 border-amber-500/30" disabled>
              <Clock className="mr-1.5 h-4 w-4" />
              {profile.connectionStatus.isSender ? 'Request Sent' : 'Incoming Request'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full"
              onClick={() => setShowRequestModal(true)}
            >
              <UserPlus className="mr-1.5 h-4 w-4" /> Connect
            </Button>
          )}
        </div>
      </div>

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
