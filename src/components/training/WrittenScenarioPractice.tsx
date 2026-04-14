import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Send, RefreshCw, CheckCircle, AlertCircle,
  Lightbulb, BarChart3, Target, Award, ArrowLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

interface Scenario {
  id: string;
  title: string;
  scenario_text: string;
  category: string;
  difficulty: string;
  is_active: boolean;
  auto_generated?: boolean;
  trigger_id?: string;
}

interface Attempt {
  id: string;
  scenario_id: string;
  score: number;
  feedback: string;
  strengths: string;
  improvements: string;
  created_at: string;
}

interface ScoringResult {
  score: number;
  feedback: string;
  strengths: string;
  improvements: string;
  better_answer: string;
}

const DIFF_STYLE: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
};

export default function WrittenScenarioPractice() {
  const { user } = useUser();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [activeTab, setActiveTab] = useState('scenarios');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: sc }, { data: att }] = await Promise.all([
      supabase.from('scenarios').select('*').eq('is_active', true).order('auto_generated', { ascending: false }).order('created_at', { ascending: false }),
      user ? supabase.from('scenario_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ]);
    setScenarios((sc as Scenario[]) || []);
    setAttempts((att as Attempt[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selected || !response.trim() || !user) return;
    setSubmitting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('score-scenario-response', {
        body: { scenario_id: selected.id, user_response: response.trim() },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult({
        score: data.score,
        feedback: data.feedback,
        strengths: data.strengths,
        improvements: data.improvements,
        better_answer: data.better_answer,
      });
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Scoring failed');
    } finally {
      setSubmitting(false);
    }
  };

  const completedIds = new Set(attempts.filter(a => a.score >= 70).map(a => a.scenario_id));

  const stats = useMemo(() => {
    if (!attempts.length) return null;
    const avg = Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length);
    const byCat: Record<string, number[]> = {};
    attempts.forEach(a => {
      const sc = scenarios.find(s => s.id === a.scenario_id);
      if (sc) {
        if (!byCat[sc.category]) byCat[sc.category] = [];
        byCat[sc.category].push(a.score);
      }
    });
    const catAvgs = Object.entries(byCat).map(([cat, scores]) => ({
      cat,
      avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
    }));
    const strongest = catAvgs.sort((a, b) => b.avg - a.avg)[0];
    const weakest = catAvgs.sort((a, b) => a.avg - b.avg)[0];
    return { total: attempts.length, avg, strongest, weakest };
  }, [attempts, scenarios]);

  const resetToList = () => {
    setSelected(null);
    setResponse('');
    setResult(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="scenarios"><FileText className="h-4 w-4 mr-1" /> Scenarios</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-1" /> Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="mt-4">
          {!selected ? (
            <div className="space-y-4">
              {scenarios.length === 0 ? (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">No written scenarios available yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scenarios.map(s => {
                    const done = completedIds.has(s.id);
                    return (
                      <Card key={s.id} className={`cursor-pointer hover:shadow-md transition-shadow ${done ? 'border-green-200' : ''} ${(s as any).auto_generated ? 'ring-1 ring-chart-4/30' : ''}`} onClick={() => { setSelected(s); setResult(null); setResponse(''); }}>
                        <CardContent className="p-5">
                          {(s as any).auto_generated && (
                            <Badge variant="outline" className="text-[10px] mb-2 gap-1 border-chart-4/30 text-chart-4">
                              <Sparkles className="h-2.5 w-2.5" />
                              Based on real activity
                            </Badge>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs capitalize">{s.category}</Badge>
                            <div className="flex gap-1">
                              {done && <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge>}
                              <Badge variant="outline" className={`text-xs ${DIFF_STYLE[s.difficulty]}`}>{s.difficulty}</Badge>
                            </div>
                          </div>
                          <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{s.scenario_text}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={resetToList}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs capitalize">{selected.category}</Badge>
                    <Badge variant="outline" className={`text-xs ${DIFF_STYLE[selected.difficulty]}`}>{selected.difficulty}</Badge>
                  </div>
                  <CardTitle className="text-lg">{selected.title}</CardTitle>
                  <CardDescription className="whitespace-pre-wrap">{selected.scenario_text}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!result ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Your Response</label>
                        <Textarea
                          value={response}
                          onChange={e => setResponse(e.target.value)}
                          placeholder="How would you handle this situation?"
                          rows={6}
                          disabled={submitting}
                        />
                      </div>
                      <Button onClick={handleSubmit} disabled={!response.trim() || submitting} className="w-full">
                        {submitting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Scoring…</> : <><Send className="h-4 w-4 mr-2" /> Submit Answer</>}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-6">
                      {/* Score */}
                      <div className="text-center py-4">
                        <div className={`text-5xl font-bold ${result.score >= 80 ? 'text-green-600' : result.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {result.score}<span className="text-lg text-muted-foreground">/100</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{result.feedback}</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-green-800">
                            <CheckCircle className="h-4 w-4" /> What You Did Well
                          </h4>
                          <p className="text-sm text-green-900">{result.strengths}</p>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-amber-800">
                            <AlertCircle className="h-4 w-4" /> What Needs Improvement
                          </h4>
                          <p className="text-sm text-amber-900">{result.improvements}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-primary" /> Suggested Better Answer
                        </h4>
                        <p className="text-sm text-muted-foreground italic">{result.better_answer}</p>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setResponse(''); }}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                        </Button>
                        <Button className="flex-1" onClick={resetToList}>
                          Next Scenario <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {!stats ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground">Complete a written scenario to see your stats.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Attempts</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stats.avg}</div>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <Target className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-sm font-bold capitalize">{stats.strongest?.cat || '—'}</div>
                <p className="text-xs text-muted-foreground">Strongest</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                <div className="text-sm font-bold capitalize">{stats.weakest?.cat || '—'}</div>
                <p className="text-xs text-muted-foreground">Needs Work</p>
              </CardContent></Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
