
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Eye } from 'lucide-react';
import { toast } from "sonner";

interface PostHistoryItem {
  id: string;
  content: string;
  prompt_category: string;
  tone: string;
  platform: string;
  created_at: string;
}

interface PostHistoryTableProps {
  postHistory: PostHistoryItem[];
  isLoadingHistory: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onCopyHistoryPost: (content: string) => void;
  onViewPost: (content: string) => void;
}

const PostHistoryTable: React.FC<PostHistoryTableProps> = ({
  postHistory,
  isLoadingHistory,
  currentPage,
  totalPages,
  onPageChange,
  onCopyHistoryPost,
  onViewPost
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied!");
  };

  const handlePreview = (content: string) => {
    setPreviewContent(content);
    setPreviewOpen(true);
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Post History</h2>
      <Card className="p-6">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading post history...</div>
          </div>
        ) : postHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No posts generated yet. Generate your first post above!
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tone</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postHistory.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="text-sm">
                      {formatDate(post.created_at)}
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
                    <TableCell>
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 capitalize">
                        {post.platform || 'All'}
                      </span>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => onPageChange(currentPage - 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => onPageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => onPageChange(currentPage + 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Content Preview</DialogTitle>
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

export default PostHistoryTable;
