import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PostHistoryTable from '@/components/social-media/PostHistoryTable';
import { PostHistoryItem } from '@/types/social-media';

const NoraPostHistory = () => {
  const [postHistory, setPostHistory] = useState<PostHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPostHistory = async (page: number = 1) => {
    setIsLoadingHistory(true);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) return;

      const itemsPerPage = 10;
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data: posts, error, count } = await supabase
        .from('post_history')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        console.error('Error fetching post history:', error);
        return;
      }

      setPostHistory(posts || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching post history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchPostHistory(currentPage);
  }, [currentPage]);

  const handleCopyHistoryPost = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Post copied to clipboard!");
  };

  const handleViewPost = (content: string) => {
    toast.info(content);
  };

  return (
    <div className="p-6">
      <PostHistoryTable
        postHistory={postHistory}
        isLoadingHistory={isLoadingHistory}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onCopyHistoryPost={handleCopyHistoryPost}
        onViewPost={handleViewPost}
      />
    </div>
  );
};

export default NoraPostHistory;
