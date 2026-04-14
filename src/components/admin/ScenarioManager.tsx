import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, RefreshCw, Sparkles, Eye, EyeOff } from 'lucide-react';

interface Scenario {
  id: string;
  title: string;
  scenario_text: string;
  category: string;
  difficulty: string;
  ideal_answer: string | null;
  common_mistakes: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'compliance', label: 'Compliance' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'objection', label: 'Objection Handling' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const emptyForm = {
  title: '',
  scenario_text: '',
  category: 'conversation',
  difficulty: 'medium',
  ideal_answer: '',
  common_mistakes: '',
  is_active: true,
};

export default function ScenarioManager() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchScenarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setScenarios((data as Scenario[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchScenarios(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Scenario) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      scenario_text: s.scenario_text,
      category: s.category,
      difficulty: s.difficulty,
      ideal_answer: s.ideal_answer || '',
      common_mistakes: s.common_mistakes || '',
      is_active: s.is_active,
    });
    setDialogOpen(true);
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

      const payload = {
        title: form.title.trim(),
        scenario_text: form.scenario_text.trim(),
        category: form.category,
        difficulty: form.difficulty,
        ideal_answer: form.ideal_answer.trim() || null,
        common_mistakes: form.common_mistakes.trim() || null,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('scenarios').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Scenario updated');
      } else {
        const { error } = await supabase.from('scenarios').insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast.success('Scenario created');
      }
      setDialogOpen(false);
      fetchScenarios();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scenario?')) return;
    const { error } = await supabase.from('scenarios').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); fetchScenarios(); }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('scenarios').update({ is_active: !active }).eq('id', id);
    if (error) toast.error(error.message);
    else fetchScenarios();
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('score-scenario-response', {
        body: { generate: true, category: form.category, difficulty: form.difficulty },
      });
      // Fallback: use a simple generation prompt via the existing OpenAI setup
      // For now, fill with placeholder that admin can refine
      toast.info('AI generation will be available soon. Please fill in the scenario manually.');
    } catch {
      toast.error('AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const diffColor = (d: string) =>
    d === 'easy' ? 'bg-green-100 text-green-700 border-green-200' :
    d === 'hard' ? 'bg-red-100 text-red-700 border-red-200' :
    'bg-amber-100 text-amber-700 border-amber-200';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Written Scenarios</CardTitle>
            <CardDescription>Create and manage written assessment scenarios for the Practice Gym.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchScenarios}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Scenario
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : scenarios.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No scenarios yet. Create your first one!</div>
        ) : (
          <div className="space-y-3">
            {scenarios.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{s.title}</h4>
                    {!s.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{s.category}</Badge>
                    <Badge variant="outline" className={`text-xs ${diffColor(s.difficulty)}`}>{s.difficulty}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(s.id, s.is_active)} title={s.is_active ? 'Deactivate' : 'Activate'}>
                    {s.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Scenario' : 'Create Scenario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Client asks about pricing…" />
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
              <Label>Scenario Description</Label>
              <Textarea value={form.scenario_text} onChange={e => setForm({ ...form, scenario_text: e.target.value })} placeholder="Describe the real-world situation…" rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Ideal Answer <span className="text-muted-foreground text-xs">(hidden from users)</span></Label>
              <Textarea value={form.ideal_answer} onChange={e => setForm({ ...form, ideal_answer: e.target.value })} placeholder="What would a perfect response look like?" rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Common Mistakes <span className="text-muted-foreground text-xs">(hidden from users)</span></Label>
              <Textarea value={form.common_mistakes} onChange={e => setForm({ ...form, common_mistakes: e.target.value })} placeholder="What mistakes should the system watch for?" rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active (visible to users)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
