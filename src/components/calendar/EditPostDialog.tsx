import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Facebook, Instagram, Linkedin, Twitter, Trash2, ImagePlus, X, RefreshCw, ChevronDown, Loader2 } from 'lucide-react';
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
    image_url?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EditPostDialog: React.FC<EditPostDialogProps> = ({
  post,
  open,
  onOpenChange,
  onSaved,
}) => {
  const [content, setContent] = useState(post.content);
  const [scheduledAt, setScheduledAt] = useState(format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm"));
  const [status, setStatus] = useState(post.status);
  const [imageUrl, setImageUrl] = useState<string | null>(post.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const Icon = PLATFORM_ICONS[post.platform] || Facebook;

  const handleRegenerateImage = async () => {
    setRegeneratingImage(true);
    try {
      // Extract hook from content (first line or first sentence)
      const hookLine = content.split('\n')[0].substring(0, 100);

      const { data, error } = await supabase.functions.invoke('generate-post-image', {
        body: {
          hook_line: hookLine,
          business_name: '',
          post_id: post.id,
          platform: post.platform,
        },
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

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop();
      const filePath = `${userId}/${post.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      setImageUrl(urlData.publicUrl);
      toast.success('Image replaced.');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
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

      const { error } = await supabase
        .from('content_posts')
        .update(updateData)
        .eq('id', post.id);

      if (error) throw error;

      // Track reschedule for smart scheduling
      const originalTime = format(new Date(post.scheduled_at), 'HH:mm');
      const newTime = scheduledAt.split('T')[1];
      if (originalTime !== newTime) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            // Increment reschedule count
            await supabase
              .from('user_profiles')
              .update({
                reschedule_count: (await supabase
                  .from('user_profiles')
                  .select('reschedule_count')
                  .eq('user_id', userData.user.id)
                  .single()
                  .then(r => (r.data?.reschedule_count || 0) + 1)),
                preferred_post_time: newTime + ':00',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })
              .eq('user_id', userData.user.id);
          }
        } catch {
          // Non-critical, don't block save
        }
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
      const { error } = await supabase
        .from('content_posts')
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

          {/* Image section */}
          <div>
            <Label className="text-sm">Image</Label>
            {imageUrl ? (
              <div className="mt-1 relative group">
                <img
                  src={imageUrl}
                  alt="Post image"
                  className="w-full max-h-48 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={removeImage}
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1 italic">No image attached</p>
            )}
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleRegenerateImage}
                disabled={regeneratingImage}
              >
                {regeneratingImage ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {regeneratingImage ? 'Generating…' : 'Regenerate Image'}
              </Button>
            </div>

            {/* Advanced: Replace Image */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-6 px-1">
                  <ChevronDown size={12} className={cn("transition-transform", advancedOpen && "rotate-180")} />
                  Advanced: Replace Image
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 w-full gap-2 text-muted-foreground text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImagePlus size={14} />
                  {uploading ? 'Uploading…' : 'Upload Custom Image'}
                </Button>
              </CollapsibleContent>
            </Collapsible>
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
