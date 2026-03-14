import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Workflow } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PostingWorkflowSection: React.FC = () => {
  const [mode, setMode] = useState<'auto_post' | 'approve_before_posting'>('auto_post');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMode = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('agency_profiles')
        .select('posting_workflow_mode')
        .limit(1)
        .maybeSingle();
      if (data?.posting_workflow_mode) {
        setMode(data.posting_workflow_mode as 'auto_post' | 'approve_before_posting');
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMode(); }, [fetchMode]);

  const handleChange = async (value: string) => {
    const newMode = value as 'auto_post' | 'approve_before_posting';
    setMode(newMode);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agency_profiles')
        .update({ posting_workflow_mode: newMode })
        .not('id', 'is', null); // update all rows for this user (RLS filters)
      if (error) throw error;
      toast.success(newMode === 'auto_post' ? 'Posts will be scheduled automatically.' : 'Posts will require your approval before scheduling.');
    } catch (err: any) {
      toast.error('Failed to update workflow: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Workflow size={18} /> Posting Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label className="text-sm text-muted-foreground">
          How would you like CareGrowth to handle your posts?
        </Label>

        <RadioGroup value={mode} onValueChange={handleChange} className="space-y-3" disabled={saving}>
          <div className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="auto_post" id="auto_post" className="mt-0.5" />
            <div>
              <Label htmlFor="auto_post" className="font-medium cursor-pointer">Auto Post</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generated posts are automatically scheduled and published at the best times.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="approve_before_posting" id="approve_before_posting" className="mt-0.5" />
            <div>
              <Label htmlFor="approve_before_posting" className="font-medium cursor-pointer">Approve Before Posting</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Posts are generated but held for your review. You decide what gets published.
              </p>
            </div>
          </div>
        </RadioGroup>

        <p className="text-xs text-muted-foreground/70 italic">You can change this anytime.</p>
      </CardContent>
    </Card>
  );
};

export default PostingWorkflowSection;
