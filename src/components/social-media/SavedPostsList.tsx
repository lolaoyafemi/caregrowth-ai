
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { Copy, Trash2 } from 'lucide-react';
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

const SavedPostsList: React.FC = () => {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('date');

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
  }, []);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Post copied to clipboard!");
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
          <div className="space-y-4">
            {sortedPosts.map((post) => (
              <div key={post.id} className="border rounded-md p-4 hover:bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-caregrowth-lightblue text-caregrowth-blue capitalize">
                      {post.platform}
                    </span>
                    {post.prompt_category && (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 capitalize">
                        {post.prompt_category.replace('-', ' ')}
                      </span>
                    )}
                    {post.tone && (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 capitalize">
                        {post.tone}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">{formatDate(post.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopy(post.content)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
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
                </div>
                {post.audience && (
                  <h4 className="font-medium mb-1">Audience: {post.audience}</h4>
                )}
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SavedPostsList;
