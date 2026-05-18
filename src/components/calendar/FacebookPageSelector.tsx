import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Facebook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FbPage {
  id: string;
  name: string;
  access_token: string;
  picture: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

const FacebookPageSelector: React.FC<Props> = ({ open, onClose, onConnected }) => {
  const [pages, setPages] = useState<FbPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadPages();
  }, [open]);

  const loadPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-pages', {
        body: { action: 'list_pages' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPages(data.pages || []);
      if (!data.pages?.length) {
        toast.error('No Facebook Pages found on your account.');
      }
    } catch (err: any) {
      toast.error('Failed to load pages: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async () => {
    const page = pages.find(p => p.id === selectedId);
    if (!page) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-pages', {
        body: {
          action: 'select_page',
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          picture: page.picture,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Connected to ${page.name}`);
      onConnected();
      onClose();
    } catch (err: any) {
      toast.error('Failed to connect page: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" /> Select a Facebook Page
          </DialogTitle>
          <DialogDescription>
            Choose which page CareGrowth Assistant should publish to and manage comments for.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto py-2">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => setSelectedId(page.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors',
                  selectedId === page.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {page.picture ? (
                  <img src={page.picture} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Facebook className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{page.name}</p>
                  <p className="text-xs text-muted-foreground truncate">ID: {page.id}</p>
                </div>
                {selectedId === page.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </button>
            ))}
            {!pages.length && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No pages available. Create one on Facebook, then reconnect.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSelect} disabled={!selectedId || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Connect Page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FacebookPageSelector;
