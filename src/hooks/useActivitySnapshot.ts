import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivitySnapshot {
  postsScheduled: number;
  postsPublished: number;
  postsNeedsApproval: number;
  platformsConnected: number;
  documentsUploaded: number;
  loading: boolean;
}

export function useActivitySnapshot() {
  const [snapshot, setSnapshot] = useState<ActivitySnapshot>({
    postsScheduled: 0,
    postsPublished: 0,
    postsNeedsApproval: 0,
    platformsConnected: 0,
    documentsUploaded: 0,
    loading: true,
  });

  const fetch = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      const userId = userData.user.id;

      const [scheduledRes, publishedRes, needsApprovalRes, platformsRes, docsRes] = await Promise.all([
        supabase
          .from('content_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'scheduled'),
        supabase
          .from('content_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'published'),
        supabase
          .from('content_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'needs_approval'),
        supabase
          .from('connected_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_connected', true),
        supabase
          .from('shared_documents')
          .select('id', { count: 'exact', head: true }),
      ]);

      setSnapshot({
        postsScheduled: scheduledRes.count ?? 0,
        postsPublished: publishedRes.count ?? 0,
        postsNeedsApproval: needsApprovalRes.count ?? 0,
        platformsConnected: platformsRes.count ?? 0,
        documentsUploaded: docsRes.count ?? 0,
        loading: false,
      });
    } catch {
      setSnapshot(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...snapshot, refetch: fetch };
}
