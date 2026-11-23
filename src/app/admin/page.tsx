'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ShieldAlert,
  Users,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  MessageSquare,
  UserX,
  ExternalLink,
  Loader2,
  XCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface AdminStats {
  total_users: number;
  active_users_today: number;
  open_reports: number;
  bans_this_week: number;
  urgent_underage: number;
}

interface ReportItem {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'normal' | 'high' | 'urgent';
  report_type: 'user' | 'message' | 'group' | null;
  target_message_id: string | null;
  target_group_id: string | null;
  admin_notes: string | null;
  created_at: string;
  reporter: { id: string; display_name: string; avatar_url: string | null } | null;
  reported: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_suspended: boolean;
    suspended_until: string | null;
    is_banned: boolean;
    role: string;
  } | null;
  target_message: { id: string; content: string; created_at: string; is_deleted: boolean } | null;
  target_group: { id: string; name: string } | null;
  reported_past_actions_count: number;
}

const AVATARS: Record<string, string> = {
  fox: '🦊', wolf: '🐺', cat: '🐱', panda: '🐼',
  owl: '🦉', dragon: '🐉', unicorn: '🦄', alien: '👽',
  robot: '🤖', ghost: '👻', ninja: '🥷', astronaut: '🧑‍🚀',
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Action Modal State
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [actionType, setActionType] = useState<'dismiss' | 'warn' | 'suspend' | 'ban'>('warn');
  const [actionReason, setActionReason] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [actionNotes, setActionNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (reasonFilter !== 'all') params.set('reason', reasonFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      } else {
        toast.error('Failed to load reports');
      }
    } catch {
      toast.error('Error fetching moderation reports');
    }
  }, [statusFilter, reasonFilter, typeFilter]);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchReports()]);
    setRefreshing(false);
    setLoading(false);
  }, [fetchStats, fetchReports]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function handleOpenAction(report: ReportItem, type: 'dismiss' | 'warn' | 'suspend' | 'ban') {
    setSelectedReport(report);
    setActionType(type);
    setActionReason(
      type === 'ban' && report.reason === 'appears under 18'
        ? 'Confirmed underage user violation.'
        : type === 'dismiss'
        ? 'No violation found upon review.'
        : `Violation of Community Guidelines (${report.reason}).`
    );
    setActionNotes('');
  }

  async function handleExecuteAction() {
    if (!selectedReport) return;
    setSubmittingAction(true);

    try {
      const res = await fetch(`/api/admin/reports/${selectedReport.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason,
          durationDays,
          notes: actionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to process action');
        return;
      }

      toast.success(data.message || 'Action completed successfully');
      setSelectedReport(null);
      await loadAll();
    } catch {
      toast.error('Error processing moderation action');
    } finally {
      setSubmittingAction(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reports & Moderation Queue</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time trust, safety, and community guidelines enforcement.
          </p>
        </div>
        <Button
          onClick={loadAll}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Queue
        </Button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Users</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats ? stats.total_users : '—'}</p>
          <span className="text-[11px] text-slate-500">Registered profiles</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Today</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats ? stats.active_users_today : '—'}</p>
          <span className="text-[11px] text-emerald-400/80">Online or seen today</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Open Reports</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats ? stats.open_reports : '—'}</p>
          <span className="text-[11px] text-amber-400/80">Awaiting moderator</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Bans This Week</span>
            <Ban className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats ? stats.bans_this_week : '—'}</p>
          <span className="text-[11px] text-red-400/80">Permanent restrictions</span>
        </div>
      </div>

      {/* Priority Underage Alerts Banner */}
      {stats && stats.urgent_underage > 0 && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 flex items-start gap-3 text-red-200 animate-pulse">
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-300">
              High Priority Underage Queue ({stats.urgent_underage} pending report{stats.urgent_underage > 1 ? 's' : ''})
            </h3>
            <p className="text-xs text-red-300/80 mt-0.5">
              Reports with reason &ldquo;appears under 18&rdquo; have been flagged urgent, and reported users are automatically suspended pending review.
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          <option value="pending">Pending Review</option>
          <option value="reviewing">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All Statuses</option>
        </select>

        {/* Reason */}
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Reasons</option>
          <option value="appears under 18">Appears Under 18 (Urgent)</option>
          <option value="harassment">Harassment</option>
          <option value="sexual content">Sexual Content</option>
          <option value="scam/spam">Scam / Spam</option>
          <option value="other">Other</option>
        </select>

        {/* Type */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Types</option>
          <option value="user">User Report</option>
          <option value="message">Message Context</option>
          <option value="group">Group Context</option>
        </select>

        <span className="ml-auto text-slate-400">
          Showing <span className="font-semibold text-white">{reports.length}</span> reports
        </span>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-400 mb-2" />
          <p className="text-sm">Loading moderation reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <h3 className="text-base font-semibold text-white">Queue is clear!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No reports match the current filter selection. The community is healthy and safe.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isUrgent = report.priority === 'urgent' || report.reason === 'appears under 18';
            const reportedAvatar = AVATARS[report.reported?.avatar_url || ''] || '👤';
            const reporterAvatar = AVATARS[report.reporter?.avatar_url || ''] || '👤';

            return (
              <div
                key={report.id}
                className={`p-4 md:p-5 rounded-2xl border transition-all ${
                  isUrgent
                    ? 'bg-red-950/20 border-red-500/40 shadow-sm shadow-red-950/50'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {/* Header row: badges & timestamps */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {isUrgent && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white animate-pulse">
                        <ShieldAlert className="h-3 w-3" /> Urgent
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                        report.reason === 'appears under 18'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : report.reason === 'harassment'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {report.reason}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      Report #{report.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400">
                    {new Date(report.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Context: Reported vs Reporter */}
                <div className="grid md:grid-cols-2 gap-4 my-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  {/* Reported User */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Reported Subject
                    </span>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-lg">
                        {reportedAvatar}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">
                          {report.reported?.display_name || 'Anonymous User'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {report.reported?.is_banned ? (
                            <span className="text-[10px] text-red-400 font-semibold uppercase">Permanently Banned</span>
                          ) : report.reported?.is_suspended ? (
                            <span className="text-[10px] text-amber-400 font-semibold uppercase">
                              Auto-Suspended Until Review
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-medium">Account Active</span>
                          )}
                          <span className="text-slate-500">
                            • {report.reported_past_actions_count} prior strike(s)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reporter */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Reported By
                    </span>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-lg">
                        {reporterAvatar}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">
                          {report.reporter?.display_name || 'Anonymous Reporter'}
                        </p>
                        <p className="text-[10px] text-slate-400">ID: {report.reporter_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Context Details (Message or Group) */}
                {report.target_message && (
                  <div className="my-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-bold text-amber-400/90 tracking-wider flex items-center gap-1 mb-1">
                      <MessageSquare className="h-3 w-3" /> Flagged Message Content:
                    </span>
                    <p className="text-slate-200 italic font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      &ldquo;{report.target_message.content}&rdquo;
                    </p>
                  </div>
                )}

                {report.target_group && (
                  <div className="my-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                    <span className="text-slate-500 font-medium">Group Context:</span>{' '}
                    <span className="font-semibold text-white">{report.target_group.name}</span>
                  </div>
                )}

                {/* Reporter's statement */}
                {report.description && (
                  <div className="my-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 font-medium">Reporter Description:</span> &ldquo;
                    {report.description}&rdquo;
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    Status:{' '}
                    <span className="font-semibold text-slate-200 uppercase tracking-wide">
                      {report.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleOpenAction(report, 'dismiss')}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
                    >
                      Dismiss
                    </Button>

                    <Button
                      onClick={() => handleOpenAction(report, 'warn')}
                      variant="outline"
                      size="sm"
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                    >
                      Issue Warning
                    </Button>

                    <Button
                      onClick={() => handleOpenAction(report, 'suspend')}
                      variant="outline"
                      size="sm"
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs"
                    >
                      Suspend
                    </Button>

                    <Button
                      onClick={() => handleOpenAction(report, 'ban')}
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      Permanently Ban
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Moderation Action Modal */}
      {selectedReport && (
        <Modal
          isOpen={Boolean(selectedReport)}
          onClose={() => setSelectedReport(null)}
          title={`Enforce Action: ${actionType.toUpperCase()}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-slate-300">
                Target User:{' '}
                <span className="font-bold text-white">
                  {selectedReport.reported?.display_name || selectedReport.reported_id}
                </span>
              </p>
              <p className="text-slate-400 mt-1">
                Reported Reason: <span className="text-amber-400 font-semibold">{selectedReport.reason}</span>
              </p>
            </div>

            {actionType === 'suspend' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Suspension Duration
                </label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-2.5 text-xs"
                >
                  <option value={1}>24 Hours (Cool-down)</option>
                  <option value={7}>7 Days (Standard Suspension)</option>
                  <option value={30}>30 Days (Extended Suspension)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Moderation Reason (Required)
              </label>
              <input
                type="text"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Explain the violation..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-2.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Internal Admin Notes (Optional)
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Notes for other moderators..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-2.5 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReport(null)}
                disabled={submittingAction}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === 'ban' ? 'destructive' : 'primary'}
                size="sm"
                onClick={handleExecuteAction}
                disabled={submittingAction || (!actionReason.trim() && actionType !== 'dismiss')}
              >
                {submittingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm ${actionType.toUpperCase()}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
