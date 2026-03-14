import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Facebook, Instagram, Linkedin, Twitter, Trash2, ImagePlus, X, RefreshCw, ChevronDown, Loader2, CheckCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORM_ICONS: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  x: Twitter,
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-status-scheduled-bg text-status-scheduled',
  published: 'bg-status-published-bg text-status-published',
  needs_approval: 'bg-status-approval-bg text-status-approval',
  failed: 'bg-status-failed-bg text-status-failed',
  draft: 'bg-status-draft-bg text-status-draft',
};

interface EditPostDialogProps {
  post: {
    id: string;
    platform: string;
    content: string;
    scheduled_at: string;
    status: string;
    error_message: string | null;
    image_url?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EditPostDialog: React.FC<EditPostDialogProps> = ({ post, open, onOpenChange, onSaved }) => {
  const [content, setContent] = useState(post.content);
  const [scheduledAt, setScheduledAt] = useState(format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm"));
  const [status, setStatus] = useState(post.status);
  const [imageUrl, setImageUrl] = useState<string | null>(post.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const Icon = PLATFORM_ICONS[post.platform] || Facebook;
  const canDelete = ['needs_approval', 'scheduled', 'draft'].includes(post.status);
  const canApprove = post.status === 'needs_approval';

  const handleRegenerateImage = async () => {
    setRegeneratingImage(true);
    try {
      const hookLine = content.split('\n')[0].substring(0, 100);
      const { data, error } = await supabase.functions.invoke('generate-post-image', {
        body: { hook_line: hookLine, business_name: '', post_id: post.id, platform: post.platform },
      });
      if (error) throw error;
      if (data?.image_url) {
        setImageUrl(data.image_url);
        toast.success('Image regenerated.');
      }
    } catch (err: any) {
      toast.error('Failed to regenerate image: ' + err.message);
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB.'); return; }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop();
      const filePath = `${userId}/${post.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('post-images').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filePath);
      setImageUrl(urlData.publicUrl);
      toast.success('Image replaced.');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => setImageUrl(null);

  const handleApprove = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('content_posts').update({ status: 'scheduled' }).eq('id', post.id);
      if (error) throw error;
      toast.success('Post approved and scheduled.');
      onSaved();
    } catch (err: any) {
      toast.error('Failed to approve: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        post_body: content,
        scheduled_at: new Date(scheduledAt).toISOString(),
        status,
        image_url: imageUrl,
      };
      const { error } = await supabase.from('content_posts').update(updateData).eq('id', post.id);
      if (error) throw error;

      const originalTime = format(new Date(post.scheduled_at), 'HH:mm');
      const newTime = scheduledAt.split('T')[1];
      if (originalTime !== newTime) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            await supabase.from('user_profiles').update({
              reschedule_count: (await supabase.from('user_profiles').select('reschedule_count').eq('user_id', userData.user.id).single().then(r => (r.data?.reschedule_count || 0) + 1)),
              preferred_post_time: newTime + ':00',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }).eq('user_id', userData.user.id);
          }
        } catch {}
      }
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
      const { error } = await supabase.from('content_posts').delete().eq('id', post.id);
      if (error) throw error;
      toast.success('Post removed from calendar.');
      onSaved();
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg rounded-2xl border-cal-border p-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-cal-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base">
                <div className="w-7 h-7 rounded-lg bg-cal-surface flex items-center justify-center">
                  <Icon size={16} className="text-foreground/70" />
                </div>
                Edit {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)} Post
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {post.error_message && (
              <div className="text-sm bg-status-failed-bg text-status-failed rounded-xl p-3.5">
                <strong>Publishing error:</strong> {post.error_message}
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Content</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="rounded-xl border-cal-border focus:border-cal-border-selected resize-none text-sm leading-relaxed" />
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Image</Label>
              {imageUrl ? (
                <div className="relative group rounded-xl overflow-hidden">
                  <img src={imageUrl} alt="Post image" className="w-full max-h-48 object-cover" />
                  <Button variant="destructive" size="sm" className="absolute top-2 right-2 h-7 w-7 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={removeImage}>
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">No image attached</p>
              )}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-lg border-cal-border" onClick={handleRegenerateImage} disabled={regeneratingImage}>
                  {regeneratingImage ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {regeneratingImage ? 'Generating…' : 'Regenerate'}
                </Button>
              </div>
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground/60 gap-1 h-6 px-1 hover:text-muted-foreground">
                    <ChevronDown size={12} className={cn("transition-transform", advancedOpen && "rotate-180")} />
                    Replace Image
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button variant="outline" size="sm" className="mt-1.5 w-full gap-2 text-muted-foreground text-xs rounded-lg border-cal-border border-dashed" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <ImagePlus size={14} />
                    {uploading ? 'Uploading…' : 'Upload Custom Image'}
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Schedule & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Schedule</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="rounded-lg border-cal-border text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="rounded-lg border-cal-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="needs_approval">Needs Approval</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-cal-border flex items-center justify-between">
            <div>
              {canDelete && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 text-xs rounded-lg" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 size={13} /> Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canApprove && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-lg text-status-scheduled border-status-scheduled/30 hover:bg-status-scheduled-bg" onClick={handleApprove} disabled={saving}>
                  <CheckCircle size={13} /> Approve
                </Button>
              )}
              <Button variant="outline" size="sm" className="rounded-lg border-cal-border text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-lg text-xs gap-1.5 px-4">
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl border-cal-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this post from your calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditPostDialog;
