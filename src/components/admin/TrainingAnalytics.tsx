import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, Target, TrendingUp, AlertTriangle, RefreshCw,
  BookOpen, CheckCircle, ChevronRight, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnalyticsData {
  scenario_id: string;
  category: string;
  total_attempts: number;
  total_completions: number;
  average_score: number;
  common_mistakes: Array<{ point: string; count: number }>;
  difficulty_rating: number;
  training_scenarios: {
    title: string;
    difficulty_level: string;
  };
}

interface UserProgress {
  user_id: string;
  category: string;
  scenarios_completed: number;
  scenarios_attempted: number;
  average_score: number;
  last_activity_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  client_intake_guidance: 'Client Intake',
  conversation_scripts: 'Conversation Scripts',
  insurance_payment_knowledge: 'Insurance & Payment',
  family_faq: 'Family FAQ',
  training_modules: 'Training Modules',
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444'];

export default function TrainingAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalScenarios, setTotalScenarios] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [
        { data: analyticsData },
        { data: progressData },
        { count: scenarioCount }
      ] = await Promise.all([
        supabase
          .from('training_analytics')
          .select('*, training_scenarios(title, difficulty_level)')
          .order('total_attempts', { ascending: false }),
        supabase
          .from('training_progress')
          .select('*')
          .order('last_activity_at', { ascending: false }),
        supabase
          .from('training_scenarios')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
      ]);

      setAnalytics((analyticsData || []).filter((a: any) => a.training_scenarios));
      setUserProgress(progressData || []);
      setTotalScenarios(scenarioCount || 0);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  // Aggregate stats
  const totalAttempts = analytics.reduce((sum, a) => sum + a.total_attempts, 0);
  const totalCompletions = analytics.reduce((sum, a) => sum + a.total_completions, 0);
  const overallCompletion = totalAttempts > 0 ? Math.round((totalCompletions / totalAttempts) * 100) : 0;
  const avgScore = analytics.length > 0
    ? Math.round(analytics.reduce((sum, a) => sum + (a.average_score || 0), 0) / analytics.length)
    : 0;

  // Category performance data
  const categoryData = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
    const catAnalytics = analytics.filter(a => a.category === key);
    const catAttempts = catAnalytics.reduce((sum, a) => sum + a.total_attempts, 0);
    const catScore = catAnalytics.length > 0
      ? Math.round(catAnalytics.reduce((sum, a) => sum + (a.average_score || 0), 0) / catAnalytics.length)
      : 0;
    return { name: label, attempts: catAttempts, avgScore: catScore };
  }).filter(d => d.attempts > 0);

  // Most difficult scenarios
  const hardestScenarios = [...analytics]
    .sort((a, b) => (a.average_score || 0) - (b.average_score || 0))
    .slice(0, 5);

  // Most common mistakes across all scenarios
  const allMistakes: Record<string, number> = {};
  analytics.forEach(a => {
    (a.common_mistakes || []).forEach((m: any) => {
      allMistakes[m.point] = (allMistakes[m.point] || 0) + m.count;
    });
  });
  const topMistakes = Object.entries(allMistakes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Unique active users
  const uniqueUsers = new Set(userProgress.map(p => p.user_id)).size;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalScenarios}</p>
                <p className="text-xs text-muted-foreground">Active Scenarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueUsers}</p>
                <p className="text-xs text-muted-foreground">Active Learners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCompletions}</p>
                <p className="text-xs text-muted-foreground">Completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Target className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore}</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance Chart */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Category Performance
              </CardTitle>
              <CardDescription>Average score and attempts per category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="avgScore" name="Avg Score" radius={[4, 4, 0, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Common Mistakes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Most Common Mistakes
            </CardTitle>
            <CardDescription>Concepts trainees most often miss</CardDescription>
          </CardHeader>
          <CardContent>
            {topMistakes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No mistakes tracked yet</p>
                <p className="text-xs">Data will appear as users complete scenarios</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topMistakes.map(([mistake, count], i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="truncate text-muted-foreground" title={mistake}>
                        {mistake.length > 55 ? mistake.substring(0, 55) + '...' : mistake}
                      </span>
                      <span className="font-medium ml-2 flex-shrink-0">{count}×</span>
                    </div>
                    <Progress 
                      value={(count / (topMistakes[0][1] || 1)) * 100} 
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hardest Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Most Difficult Scenarios
          </CardTitle>
          <CardDescription>Scenarios where trainees struggle the most</CardDescription>
        </CardHeader>
        <CardContent>
          {hardestScenarios.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No attempt data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hardestScenarios.map((a) => (
                <div key={a.scenario_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {a.training_scenarios?.title || 'Unknown scenario'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[a.category] || a.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {a.total_attempts} attempts
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        (a.average_score || 0) >= 70 ? 'text-green-600' : 
                        (a.average_score || 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {Math.round(a.average_score || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">avg score</p>
                    </div>
                    <div>
                      <Progress 
                        value={a.average_score || 0} 
                        className="w-20 h-2" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Learner Activity */}
      {userProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Learner Activity
            </CardTitle>
            <CardDescription>Progress across all agency users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userProgress.slice(0, 10).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {CATEGORY_LABELS[p.category] || p.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.scenarios_completed}/{p.scenarios_attempted} completed
                        {p.last_activity_at && ` · ${new Date(p.last_activity_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={p.average_score || 0} className="w-16 h-1.5" />
                    <span className="text-sm font-medium w-10 text-right">
                      {Math.round(p.average_score || 0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
