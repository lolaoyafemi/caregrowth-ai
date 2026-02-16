import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Facebook, Instagram, Linkedin, Twitter, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORM_ICONS: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  x: Twitter,
};

interface EditPostDialogProps {
  post: {
    id: string;
    platform: string;
    content: string;
    scheduled_at: string;
    status: string;
    error_message: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EditPostDialog: React.FC<EditPostDialogProps> = ({ post, open, onOpenChange, onSaved }) => {
  const [content, setContent] = useState(post.content);
  const [scheduledAt, setScheduledAt] = useState(format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm"));
  const [status, setStatus] = useState(post.status);
  const [saving, setSaving] = useState(false);

  const Icon = PLATFORM_ICONS[post.platform] || Facebook;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          content,
          scheduled_at: new Date(scheduledAt).toISOString(),
          status,
        })
        .eq('id', post.id);

      if (error) throw error;
      toast.success('Post updated.');
      onSaved();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;
      toast.success('Post removed from calendar.');
      onSaved();
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon size={20} />
            Edit {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)} Post
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {post.error_message && (
            <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg p-3">
              <strong>Publishing error:</strong> {post.error_message}
            </div>
          )}
          <div>
            <Label className="text-sm">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Scheduled Date & Time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={handleDelete}>
            <Trash2 size={14} /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-caregrowth-blue hover:bg-caregrowth-blue/90">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPostDialog;
