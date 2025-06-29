
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "sonner";
import { Copy, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchSavedPosts, deleteSavedPost } from '@/utils/savedPostsUtils';

interface SavedPost {
  id: string;
  platform: string;
  audience: string;
  content: string;
  prompt_category: string;
  tone: string;
  created_at: string;
}

interface SavedPostsListProps {
  refreshTrigger?: number;
}

const SavedPostsList: React.FC<SavedPostsListProps> = ({ refreshTrigger }) => {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const loadSavedPosts = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;

      if (!userId) {
        console.error("User not logged in");
        setIsLoading(false);
        return;
      }

      const posts = await fetchSavedPosts(userId);
      setSavedPosts(posts);
    } catch (error: any) {
      console.error('Error loading saved posts:', error);
      toast.error('Failed to load saved posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSavedPosts();
  }, [refreshTrigger]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Post copied to clipboard!");
  };

  const handlePreview = (content: string) => {
    setPreviewContent(content);
    setPreviewOpen(true);
  };

  const handleDelete = async (postId: string) => {
    try {
      await deleteSavedPost(postId);
      setSavedPosts(prev => prev.filter(post => post.id !== postId));
      toast.success("Post deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const sortedPosts = [...savedPosts].sort((a, b) => {
    switch (sortBy) {
      case 'platform':
        return a.platform.localeCompare(b.platform);
      case 'audience':
        return (a.audience || '').localeCompare(b.audience || '');
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Saved Posts</h2>
      <Card className="p-6">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="font-medium">Your Saved Drafts ({savedPosts.length})</h3>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="platform">Sort by Platform</SelectItem>
              <SelectItem value="audience">Sort by Audience</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">Loading saved posts...</div>
        ) : savedPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No saved posts yet. Save some posts to see them here!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tone</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="text-sm">
                    {formatDate(post.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-caregrowth-lightblue text-caregrowth-blue capitalize">
                      {post.platform}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 capitalize">
                      {post.prompt_category?.replace('-', ' ') || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 capitalize">
                      {post.tone || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-sm text-gray-700">
                      {post.audience || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-sm text-gray-700">
                      {truncateContent(post.content || '', 80)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(post.content || '')}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(post.content || 'No content')}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(post.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Saved Post Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{previewContent}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedPostsList;
