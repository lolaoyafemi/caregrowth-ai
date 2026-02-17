import React from 'react';
import { Facebook, Instagram, Linkedin, Twitter, Heart, MessageCircle, Share2, ThumbsUp, Repeat2, Bookmark, Send, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PlatformPreviewProps {
  post: {
    id: string;
    platform: string;
    content: string;
    scheduled_at: string;
    status: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

const FacebookPreview = ({ content, scheduledAt }: { content: string; scheduledAt: string }) => (
  <div className="bg-white rounded-lg shadow-sm border max-w-[500px] w-full">
    <div className="flex items-center gap-3 p-3">
      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">B</div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Your Business</p>
        <p className="text-xs text-gray-500">{format(new Date(scheduledAt), 'MMM d')} · 🌐</p>
      </div>
      <MoreHorizontal size={18} className="ml-auto text-gray-400" />
    </div>
    <div className="px-3 pb-3">
      <p className="text-sm text-gray-900 whitespace-pre-wrap">{content}</p>
    </div>
    <div className="border-t mx-3" />
    <div className="flex items-center justify-around py-2 px-3">
      <button className="flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 rounded px-3 py-1.5">
        <ThumbsUp size={16} /> Like
      </button>
      <button className="flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 rounded px-3 py-1.5">
        <MessageCircle size={16} /> Comment
      </button>
      <button className="flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 rounded px-3 py-1.5">
        <Share2 size={16} /> Share
      </button>
    </div>
  </div>
);

const InstagramPreview = ({ content, scheduledAt }: { content: string; scheduledAt: string }) => (
  <div className="bg-white rounded-lg shadow-sm border max-w-[500px] w-full">
    <div className="flex items-center gap-3 p-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">B</div>
      <p className="text-sm font-semibold text-gray-900">your_business</p>
      <MoreHorizontal size={18} className="ml-auto text-gray-400" />
    </div>
    <div className="w-full aspect-square bg-gradient-to-br from-purple-100 via-pink-50 to-orange-100 flex items-center justify-center p-6">
      <p className="text-center text-sm text-gray-700 line-clamp-6 font-medium">{content}</p>
    </div>
    <div className="flex items-center gap-4 px-3 py-2">
      <Heart size={22} className="text-gray-900" />
      <MessageCircle size={22} className="text-gray-900" />
      <Send size={22} className="text-gray-900" />
      <Bookmark size={22} className="ml-auto text-gray-900" />
    </div>
    <div className="px-3 pb-3">
      <p className="text-xs text-gray-500">{format(new Date(scheduledAt), 'MMMM d, yyyy')}</p>
    </div>
  </div>
);

const LinkedInPreview = ({ content, scheduledAt }: { content: string; scheduledAt: string }) => (
  <div className="bg-white rounded-lg shadow-sm border max-w-[500px] w-full">
    <div className="flex items-center gap-3 p-3">
      <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm">B</div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Your Business</p>
        <p className="text-xs text-gray-500">1,234 followers</p>
        <p className="text-xs text-gray-400">{format(new Date(scheduledAt), 'MMM d, yyyy')} · 🌐</p>
      </div>
    </div>
    <div className="px-3 pb-3">
      <p className="text-sm text-gray-900 whitespace-pre-wrap">{content}</p>
    </div>
    <div className="border-t mx-3" />
    <div className="flex items-center justify-around py-2 px-3">
      <button className="flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 rounded px-3 py-1.5">
        <ThumbsUp size={16} /> Like
      </button>
      <button className="flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 rounded px-3 py-1.5">
        <MessageCircle size={16} /> Comment
      </button>
      <button className="flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 rounded px-3 py-1.5">
        <Repeat2 size={16} /> Repost
      </button>
      <button className="flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 rounded px-3 py-1.5">
        <Send size={16} /> Send
      </button>
    </div>
  </div>
);

const XPreview = ({ content, scheduledAt }: { content: string; scheduledAt: string }) => (
  <div className="bg-white rounded-lg shadow-sm border max-w-[500px] w-full">
    <div className="flex items-start gap-3 p-3">
      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-sm shrink-0">B</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-bold text-gray-900">Your Business</p>
          <p className="text-sm text-gray-500">@yourbiz · {format(new Date(scheduledAt), 'MMM d')}</p>
        </div>
        <p className="text-sm text-gray-900 whitespace-pre-wrap mt-1">{content}</p>
        <div className="flex items-center justify-between mt-3 max-w-[300px]">
          <button className="text-gray-400 hover:text-blue-500"><MessageCircle size={16} /></button>
          <button className="text-gray-400 hover:text-green-500"><Repeat2 size={16} /></button>
          <button className="text-gray-400 hover:text-red-500"><Heart size={16} /></button>
          <button className="text-gray-400 hover:text-blue-500"><Share2 size={16} /></button>
        </div>
      </div>
    </div>
  </div>
);

const PLATFORM_LABELS: Record<string, { label: string; icon: any; bg: string }> = {
  facebook: { label: 'Facebook', icon: Facebook, bg: 'bg-blue-600' },
  instagram: { label: 'Instagram', icon: Instagram, bg: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, bg: 'bg-blue-700' },
  x: { label: 'X (Twitter)', icon: Twitter, bg: 'bg-black' },
};

const PlatformPreview: React.FC<PlatformPreviewProps> = ({ post, open, onOpenChange, onEdit }) => {
  if (!post) return null;

  const platformInfo = PLATFORM_LABELS[post.platform];
  const Icon = platformInfo?.icon || Facebook;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-gray-100 border-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-6 h-6 rounded flex items-center justify-center text-white", platformInfo?.bg || 'bg-gray-500')}>
              <Icon size={14} />
            </div>
            <span className="text-sm font-semibold">{platformInfo?.label || post.platform} Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">{post.status}</Badge>
            {onEdit && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEdit}>
                Edit Post
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-center p-4 pt-0">
          {post.platform === 'facebook' && <FacebookPreview content={post.content} scheduledAt={post.scheduled_at} />}
          {post.platform === 'instagram' && <InstagramPreview content={post.content} scheduledAt={post.scheduled_at} />}
          {post.platform === 'linkedin' && <LinkedInPreview content={post.content} scheduledAt={post.scheduled_at} />}
          {post.platform === 'x' && <XPreview content={post.content} scheduledAt={post.scheduled_at} />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlatformPreview;
