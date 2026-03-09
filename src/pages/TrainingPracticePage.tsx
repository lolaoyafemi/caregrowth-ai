import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, ChevronRight, Star, CheckCircle, AlertCircle, 
  BookOpen, Clock, Target, RefreshCw, MessageSquare, TrendingUp,
  ChevronDown, ChevronUp, Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

interface Scenario {
  id: string;
  title: string;
  description: string;
  context: string | null;
  prompt_to_user: string;
  expected_key_points: string[];
  difficulty_level: string;
  scenario_type: string;
  category: string;
  tags: string[];
}

interface Evaluation {
  score: number;
  strengths: string[];
  improvements: string[];
  example_response: string;
  overall_feedback: string;
  key_points_addressed?: string[];
  key_points_missed?: string[];
}

interface Progress {
  category: string;
  scenarios_completed: number;
  scenarios_attempted: number;
  average_score: number;
  best_score: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  client_intake_guidance: 'Client Intake',
  conversation_scripts: 'Conversation Scripts',
  insurance_payment_knowledge: 'Insurance & Payment',
  family_faq: 'Family FAQ',
  training_modules: 'Training Modules',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-600',
  medium: 'text-yellow-600',
  hard: 'text-red-600',
};

export default function TrainingPracticePage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [userResponse, setUserResponse] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedScenarios, setCompletedScenarios] = useState<Set<string>>(new Set());
  const { user } = useUser();

  useEffect(() => {
    loadScenariosAndProgress();
  }, []);

  useEffect(() => {
    if (currentScenario) {
      setStartTime(new Date());
    }
  }, [currentScenario]);

  const loadScenariosAndProgress = async () => {
    setIsLoading(true);
    try {
      const [{ data: scenariosData }, { data: progressData }, { data: responsesData }] = await Promise.all([
        supabase
          .from('training_scenarios')
          .select('*')
          .eq('is_active', true)
          .order('difficulty_level'),
        user ? supabase
          .from('training_progress')
          .select('*')
          .eq('user_id', user.id) : Promise.resolve({ data: [] }),
        user ? supabase
          .from('training_responses')
          .select('scenario_id, score')
          .eq('user_id', user.id)
          .gte('score', 70) : Promise.resolve({ data: [] }),
      ]);

      setScenarios(scenariosData || []);
      setProgress(progressData || []);
      const completed = new Set((responsesData || []).map((r: any) => r.scenario_id));
      setCompletedScenarios(completed);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScenario = (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setUserResponse('');
    setEvaluation(null);
    setShowExample(false);
  };

  const handleSubmitResponse = async () => {
    if (!user || !currentScenario || !userResponse.trim()) {
      toast.error('Please write a response before submitting');
      return;
    }

    setIsEvaluating(true);
    const timeSpent = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : null;

    try {
      const { data, error } = await supabase.functions.invoke('evaluate-training-response', {
        body: {
          scenarioId: currentScenario.id,
          userId: user.id,
          userResponse: userResponse.trim(),
          timeSpentSeconds: timeSpent,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setEvaluation(data.evaluation);
      if (data.evaluation.score >= 70) {
        setCompletedScenarios(prev => new Set([...prev, currentScenario.id]));
      }
      await loadScenariosAndProgress();
    } catch (error: any) {
      console.error('Evaluation error:', error);
      toast.error(error?.message || 'Failed to evaluate response');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleTryAgain = () => {
    setUserResponse('');
    setEvaluation(null);
    setShowExample(false);
    setStartTime(new Date());
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const categories = [...new Set(scenarios.map(s => s.category))];
  const filteredScenarios = selectedCategory 
    ? scenarios.filter(s => s.category === selectedCategory) 
    : scenarios;

  const totalCompleted = completedScenarios.size;
  const totalScenarios = scenarios.length;
  const overallProgress = totalScenarios > 0 ? Math.round((totalCompleted / totalScenarios) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-semibold">Your Training Progress</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {totalCompleted} / {totalScenarios} scenarios completed
            </span>
          </div>
          <Progress value={overallProgress} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">{overallProgress}% complete</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Training Scenarios</CardTitle>
              <CardDescription>Select a scenario to practice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Category filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs"
                >
                  All
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="text-xs"
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </Button>
                ))}
              </div>

              {filteredScenarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No scenarios available yet</p>
                  <p className="text-xs">Upload training documents to generate scenarios</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredScenarios.map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => handleSelectScenario(scenario)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        currentScenario?.id === scenario.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {completedScenarios.has(scenario.id) && (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            )}
                            <p className="text-sm font-medium truncate">{scenario.title}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${DIFFICULTY_COLOR[scenario.difficulty_level]}`}>
                              {scenario.difficulty_level}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {CATEGORY_LABELS[scenario.category] || scenario.category}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress by category */}
          {progress.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Progress by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {progress.map(p => (
                  <div key={p.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{CATEGORY_LABELS[p.category] || p.category}</span>
                      <span className="font-medium">{Math.round(p.average_score || 0)}% avg</span>
                    </div>
                    <Progress value={p.average_score || 0} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Practice Area */}
        <div className="lg:col-span-2">
          {!currentScenario ? (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center">
                <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-40" />
                <h3 className="font-semibold text-lg mb-2">Select a Training Scenario</h3>
                <p className="text-muted-foreground text-sm">
                  Choose a scenario from the list to start your interactive training.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Scenario Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[currentScenario.category] || currentScenario.category}
                        </Badge>
                        <span className={`text-xs font-medium ${DIFFICULTY_COLOR[currentScenario.difficulty_level]}`}>
                          {currentScenario.difficulty_level} difficulty
                        </span>
                      </div>
                      <CardTitle>{currentScenario.title}</CardTitle>
                    </div>
                    {completedScenarios.has(currentScenario.id) && (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide text-xs">
                      Scenario
                    </p>
                    <p className="text-sm">{currentScenario.description}</p>
                    {currentScenario.context && (
                      <p className="text-sm text-muted-foreground mt-2 italic">{currentScenario.context}</p>
                    )}
                  </div>

                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">How would you respond?</p>
                        <p className="text-sm text-muted-foreground">{currentScenario.prompt_to_user}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Response Area */}
              {!evaluation ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Your Response</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Type your response here. Be as detailed as you would in a real situation..."
                      value={userResponse}
                      onChange={e => setUserResponse(e.target.value)}
                      className="min-h-[140px] resize-none"
                      disabled={isEvaluating}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{userResponse.length} characters</span>
                      </div>
                      <Button
                        onClick={handleSubmitResponse}
                        disabled={!userResponse.trim() || isEvaluating}
                      >
                        {isEvaluating ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Evaluating...
                          </>
                        ) : (
                          <>
                            <Target className="h-4 w-4 mr-2" />
                            Submit for Feedback
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Evaluation Results */
                <Card className={`border ${getScoreBg(evaluation.score)}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Feedback</CardTitle>
                      <div className={`text-3xl font-bold ${getScoreColor(evaluation.score)}`}>
                        {evaluation.score}
                        <span className="text-base font-normal text-muted-foreground">/100</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{evaluation.overall_feedback}</p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Strengths */}
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        Strengths
                      </h4>
                      <ul className="space-y-1.5">
                        {evaluation.strengths.map((s, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Star className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        Areas to Improve
                      </h4>
                      <ul className="space-y-1.5">
                        {evaluation.improvements.map((imp, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <ChevronRight className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Example Response */}
                    <div>
                      <button
                        onClick={() => setShowExample(!showExample)}
                        className="flex items-center gap-2 text-sm font-semibold text-primary"
                      >
                        <Lightbulb className="h-4 w-4" />
                        Example Improved Response
                        {showExample ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {showExample && (
                        <div className="mt-2 p-3 bg-background rounded-lg border text-sm text-muted-foreground leading-relaxed">
                          {evaluation.example_response}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" onClick={handleTryAgain} className="flex-1">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => {
                          const remaining = filteredScenarios.filter(
                            s => s.id !== currentScenario?.id && !completedScenarios.has(s.id)
                          );
                          if (remaining.length > 0) {
                            handleSelectScenario(remaining[0]);
                          } else {
                            setCurrentScenario(null);
                          }
                        }}
                        className="flex-1"
                      >
                        Next Scenario
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
