import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Check, X, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DraftScenarioManager() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDraft, setEditingDraft] = useState<any>(null);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_scenarios')
        .select('*')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (err: any) {
      toast.error('Failed to load drafts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('training_scenarios')
        .update({ status: 'published' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Scenario published successfully');
      fetchDrafts();
    } catch (err: any) {
      toast.error('Error approving scenario: ' + err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('training_scenarios')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Scenario archived');
      fetchDrafts();
    } catch (err: any) {
      toast.error('Error rejecting scenario: ' + err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingDraft) return;
    try {
      const { error } = await supabase
        .from('training_scenarios')
        .update({
          title: editingDraft.title,
          category: editingDraft.category,
          description: editingDraft.description,
          caller_persona: editingDraft.caller_persona,
          care_situation: editingDraft.care_situation,
          primary_concern: editingDraft.primary_concern,
          emotional_tone: editingDraft.emotional_tone,
          prompt_to_user: editingDraft.prompt_to_user,
          difficulty_level: editingDraft.difficulty_level,
          expected_key_points: editingDraft.expected_key_points,
          common_mistakes: editingDraft.common_mistakes,
        })
        .eq('id', editingDraft.id);
      if (error) throw error;
      toast.success('Draft updated successfully');
      setEditingDraft(null);
      fetchDrafts();
    } catch (err: any) {
      toast.error('Error saving draft: ' + err.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Draft Scenarios</CardTitle>
            <CardDescription>Review and approve AI-generated scenarios before they appear for agencies.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDrafts}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : drafts.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No draft scenarios awaiting review.
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map(draft => (
              <Card key={draft.id} className="border bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{draft.title}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{draft.category}</Badge>
                        <Badge variant="secondary">{draft.difficulty_level}</Badge>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">{draft.emotional_tone}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingDraft(draft)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(draft.id)}>
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(draft.id)}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground font-medium">Caller Persona:</span> {draft.caller_persona}
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Care Situation:</span> {draft.care_situation}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground font-medium">Primary Concern:</span> {draft.primary_concern}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground font-medium">Situation Summary:</span> {draft.description}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editingDraft} onOpenChange={(o) => !o && setEditingDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Draft Scenario</DialogTitle>
            <DialogDescription>Make changes before publishing.</DialogDescription>
          </DialogHeader>
          {editingDraft && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={editingDraft.title} onChange={e => setEditingDraft({...editingDraft, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={editingDraft.category} onChange={e => setEditingDraft({...editingDraft, category: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Caller Persona</Label>
                  <Input value={editingDraft.caller_persona} onChange={e => setEditingDraft({...editingDraft, caller_persona: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Emotional Tone</Label>
                  <Input value={editingDraft.emotional_tone} onChange={e => setEditingDraft({...editingDraft, emotional_tone: e.target.value})} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Care Situation</Label>
                  <Input value={editingDraft.care_situation} onChange={e => setEditingDraft({...editingDraft, care_situation: e.target.value})} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Primary Concern</Label>
                  <Input value={editingDraft.primary_concern} onChange={e => setEditingDraft({...editingDraft, primary_concern: e.target.value})} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Situation Summary</Label>
                  <Textarea value={editingDraft.description} onChange={e => setEditingDraft({...editingDraft, description: e.target.value})} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Prompt to User</Label>
                  <Input value={editingDraft.prompt_to_user} onChange={e => setEditingDraft({...editingDraft, prompt_to_user: e.target.value})} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDraft(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
