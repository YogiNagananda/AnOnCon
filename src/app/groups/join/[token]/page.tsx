'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function JoinGroupPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function joinViaToken() {
      try {
        const res = await fetch(`/api/groups/join/${token}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Failed to join'); return; }
        toast.success('Joined group!');
        router.replace(`/dashboard/groups/${data.group_id}`);
      } catch {
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    }
    joinViaToken();
  }, [token]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      <p className="text-sm text-[var(--color-muted)]">Joining group via invite link...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center p-4">
      <Users className="h-12 w-12 text-[var(--color-muted)]" />
      <h1 className="text-xl font-bold text-[var(--color-text)]">Cannot Join Group</h1>
      <p className="text-sm text-[var(--color-muted)]">{error}</p>
      <Button onClick={() => router.push('/dashboard/groups')}>Browse Groups</Button>
    </div>
  );

  return null;
}
