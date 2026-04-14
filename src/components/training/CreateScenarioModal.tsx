import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

interface CreateScenarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CATEGORIES = [
  { value: 'conversation', label: 'Conversation' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'objection', label: 'Objection Handling' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const initialForm = {
  title: '',
  scenario_text: '',
  category: 'conversation',
  difficulty: 'medium',
  ideal_answer: '',
  common_mistakes: '',
};

export default function CreateScenarioModal({ open, onOpenChange, onCreated }: CreateScenarioModalProps) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleAIGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-training-scenarios', {
        body: {
          generateSingle: true,
          category: form.category,
          difficulty: form.difficulty,
        },
      });

      if (error) throw error;

      if (data?.scenario) {
        setForm(prev => ({
          ...prev,
          title: data.scenario.title || prev.title,
          scenario_text: data.scenario.scenario_text || data.scenario.description || prev.scenario_text,
          ideal_answer: data.scenario.ideal_answer || data.scenario.ideal_response || prev.ideal_answer,
          common_mistakes: data.scenario.common_mistakes || prev.common_mistakes,
        }));
        toast.success('Scenario generated! Review and save.');
      } else {
        toast.info('AI generation returned no data. Please fill in manually.');
      }
    } catch {
      toast.error('AI generation failed. Please fill in manually.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.scenario_text.trim()) {
      toast.error('Title and scenario description are required');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('scenarios').insert({
        title: form.title.trim(),
        scenario_text: form.scenario_text.trim(),
        category: form.category,
        difficulty: form.difficulty,
        ideal_answer: form.ideal_answer.trim() || null,
        common_mistakes: form.common_mistakes.trim() || null,
        is_active: true,
        created_by: user.id,
      });

      if (error) throw error;
      toast.success('Scenario created');
      setForm(initialForm);
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Scenario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Client asks about pricing…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Scenario Description</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIGenerate}
                disabled={generating}
                className="text-xs"
              >
                {generating ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="h-3 w-3 mr-1" /> Generate with AI</>
                )}
              </Button>
            </div>
            <Textarea
              value={form.scenario_text}
              onChange={e => setForm({ ...form, scenario_text: e.target.value })}
              placeholder="Describe the real-world situation…"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Ideal Answer <span className="text-muted-foreground text-xs">(hidden from users)</span></Label>
            <Textarea
              value={form.ideal_answer}
              onChange={e => setForm({ ...form, ideal_answer: e.target.value })}
              placeholder="What would a perfect response look like?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Common Mistakes <span className="text-muted-foreground text-xs">(hidden from users)</span></Label>
            <Textarea
              value={form.common_mistakes}
              onChange={e => setForm({ ...form, common_mistakes: e.target.value })}
              placeholder="What mistakes should the system watch for?"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Scenario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
