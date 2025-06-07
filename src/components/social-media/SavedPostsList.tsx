
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SavedPost {
  id: number;
  platform: string;
  audience: string;
  content: string;
  date: string;
}

interface SavedPostsListProps {
  savedPosts: SavedPost[];
}

const SavedPostsList: React.FC<SavedPostsListProps> = ({ savedPosts }) => {
  if (savedPosts.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Saved Posts</h2>
      <Card className="p-6">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="font-medium">Recent Drafts</h3>
          <Select defaultValue="date">
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
        
        <div className="space-y-4">
          {savedPosts.map((post) => (
            <div key={post.id} className="border rounded-md p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-caregrowth-lightblue text-caregrowth-blue capitalize mr-2">
                    {post.platform}
                  </span>
                  <span className="text-sm text-gray-500">{post.date}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">Edit</Button>
                  <Button variant="ghost" size="sm">Delete</Button>
                </div>
              </div>
              <h4 className="font-medium mb-1">{post.audience}</h4>
              <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SavedPostsList;
