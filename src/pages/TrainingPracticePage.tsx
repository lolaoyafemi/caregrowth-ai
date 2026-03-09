import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap, ChevronRight, Star, CheckCircle, AlertCircle,
  BookOpen, Clock, Target, RefreshCw, MessageSquare, TrendingUp,
  Send, Phone, User, Lightbulb, Dumbbell, BarChart3, Award, Flame,
  ShieldCheck, Heart, Search, Mic, Brain, ArrowRight, Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import VoicePracticeSession from '@/components/training/VoicePracticeSession';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Scenario {
  id: string;
  title: string;
  description: string;
  prompt_to_user: string;
  expected_key_points: string[];
  difficulty_level: string;
  scenario_type: string;
  category: string;
  tags: string[];
  caller_persona: string | null;
  care_situation: string | null;
  primary_concern: string | null;
  emotional_tone: string | null;
  ai_system_prompt: string | null;
  evaluation_rubric: any;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ScoreBreakdown {
  empathy: number;
  clarity: number;
  discovery: number;
  confidence: number;
  next_steps: number;
}

interface Evaluation {
  score: number;
  strengths: string[];
  improvements: string[];
  example_response: string;
  overall_feedback: string;
  key_points_addressed?: string[];
  key_points_missed?: string[];
  score_breakdown?: ScoreBreakdown;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_EXCHANGES = 8;
const MIN_EXCHANGES_FOR_END = 3;

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  'Intake Calls': { label: 'Intake Calls', icon: Phone, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Cost & Payment Questions': { label: 'Cost Questions', icon: BarChart3, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'Dementia / Memory Care': { label: 'Dementia Safety', icon: Brain, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'Hospital Discharge': { label: 'Hospital Discharge', icon: Heart, color: 'bg-red-100 text-red-700 border-red-200' },
  'Caregiver Burnout': { label: 'Caregiver Burnout', icon: Flame, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'Trust & Safety': { label: 'Trust & Safety', icon: ShieldCheck, color: 'bg-teal-100 text-teal-700 border-teal-200' },
  client_intake_guidance: { label: 'Client Intake', icon: Phone, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  conversation_scripts: { label: 'Scripts', icon: MessageSquare, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  insurance_payment_knowledge: { label: 'Insurance', icon: BarChart3, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  family_faq: { label: 'Family FAQ', icon: Search, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  training_modules: { label: 'Training', icon: GraduationCap, color: 'bg-violet-100 text-violet-700 border-violet-200' },
};

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  easy: { label: 'Easy', color: 'text-green-700', bg: 'bg-green-100 border-green-200' },
  medium: { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  hard: { label: 'Hard', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
};

const SCORE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  empathy: { label: 'Empathy', icon: Heart },
  clarity: { label: 'Clarity', icon: Lightbulb },
  discovery: { label: 'Discovery', icon: Search },
  confidence: { label: 'Confidence', icon: ShieldCheck },
  next_steps: { label: 'Next Steps', icon: ArrowRight },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TrainingPracticePage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedScenarios, setCompletedScenarios] = useState<Set<string>>(new Set());
  const [conversationEnded, setConversationEnded] = useState(false);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('scenarios');
  const [voicePracticeScenario, setVoicePracticeScenario] = useState<Scenario | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  const userExchanges = messages.filter(m => m.role === 'user').length;

  useEffect(() => { loadData(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Auto-end after MAX_EXCHANGES
  useEffect(() => {
    if (userExchanges >= MAX_EXCHANGES && !conversationEnded && !isEvaluating && currentScenario) {
      handleEndConversation();
    }
  }, [userExchanges]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [{ data: scenariosData }, { data: responsesData }] = await Promise.all([
        supabase
          .from('training_scenarios')
          .select('*')
          .eq('is_active', true)
          .eq('status', 'published')
          .order('difficulty_level'),
        user
          ? supabase.from('training_responses').select('scenario_id, score, created_at, strengths, improvements, ai_evaluation').eq('user_id', user.id).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      setScenarios((scenariosData as Scenario[]) || []);
      setAllResponses(responsesData || []);
      setCompletedScenarios(new Set((responsesData || []).filter((r: any) => r.score >= 70).map((r: any) => r.scenario_id)));
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- Stats computations ---------- */
  const stats = useMemo(() => {
    if (!allResponses.length) return null;
    const totalConversations = allResponses.length;
    const avgScore = Math.round(allResponses.reduce((a, r) => a + (r.score || 0), 0) / totalConversations);

    // Aggregate score breakdowns
    const breakdownTotals: Record<string, number> = { empathy: 0, clarity: 0, discovery: 0, confidence: 0, next_steps: 0 };
    let breakdownCount = 0;
    allResponses.forEach(r => {
      const bd = r.ai_evaluation?.score_breakdown;
      if (bd) {
        breakdownCount++;
        Object.keys(breakdownTotals).forEach(k => { breakdownTotals[k] += bd[k] || 0; });
      }
    });

    const avgBreakdown = breakdownCount > 0
      ? Object.fromEntries(Object.entries(breakdownTotals).map(([k, v]) => [k, Math.round(v / breakdownCount)]))
      : null;

    const strongest = avgBreakdown ? Object.entries(avgBreakdown).sort((a, b) => b[1] - a[1])[0] : null;
    const weakest = avgBreakdown ? Object.entries(avgBreakdown).sort((a, b) => a[1] - b[1])[0] : null;

    return { totalConversations, avgScore, avgBreakdown, strongest, weakest };
  }, [allResponses]);

  /* ---------- Scenario actions ---------- */
  const handleSelectScenario = async (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setMessages([]);
    setEvaluation(null);
    setConversationEnded(false);
    setStartTime(new Date());
    setActiveTab('scenarios');
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('simulate-training-conversation', {
        body: { scenarioId: scenario.id, messages: [] },
      });
      if (error) throw error;
      if (data.reply) setMessages([{ role: 'assistant', content: data.reply }]);
    } catch {
      toast.error('Failed to start scenario');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentScenario || isSending || conversationEnded) return;

    const userMsg: ChatMessage = { role: 'user', content: inputMessage.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('simulate-training-conversation', {
        body: { scenarioId: currentScenario.id, messages: newMessages },
      });
      if (error) throw error;
      if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      toast.error('Failed to get response');
    } finally {
      setIsSending(false);
    }
  };

  const handleEndConversation = async () => {
    if (!currentScenario || !user || isEvaluating) return;
    setConversationEnded(true);
    setIsEvaluating(true);

    const timeSpent = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : null;

    try {
      const { data, error } = await supabase.functions.invoke('evaluate-training-response', {
        body: {
          scenarioId: currentScenario.id,
          userId: user.id,
          userResponse: messages.map(m => `${m.role === 'user' ? 'Staff' : 'Caller'}: ${m.content}`).join('\n\n'),
          conversationHistory: messages,
          timeSpentSeconds: timeSpent,
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      setEvaluation(data.evaluation);
      if (data.evaluation.score >= 70) setCompletedScenarios(prev => new Set([...prev, currentScenario.id]));
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to evaluate conversation');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const resetToList = () => {
    setCurrentScenario(null);
    setMessages([]);
    setEvaluation(null);
    setConversationEnded(false);
  };

  const handleStartVoicePractice = (scenario: Scenario) => {
    setVoicePracticeScenario(scenario);
  };

  const handleVoicePracticeComplete = () => {
    loadData();
  };

  const handleVoicePracticeClose = () => {
    setVoicePracticeScenario(null);
  };

  /* ---------- Derived ---------- */
  const categories = [...new Set(scenarios.map(s => s.category))];
  const filteredScenarios = selectedCategory ? scenarios.filter(s => s.category === selectedCategory) : scenarios;
  const totalCompleted = completedScenarios.size;
  const totalScenarios = scenarios.length;
  const overallProgress = totalScenarios > 0 ? Math.round((totalCompleted / totalScenarios) * 100) : 0;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Practice Gym</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">
            Sharpen your skills with AI-simulated family conversations
          </p>
        </div>

        {/* Quick Stats Row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">{totalCompleted}/{totalScenarios}</span>
            <span className="text-xs text-muted-foreground">completed</span>
          </div>
          {stats && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{stats.avgScore}</span>
              <span className="text-xs text-muted-foreground">avg score</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
            <span className="text-sm font-semibold text-primary">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="scenarios" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Scenarios
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Practice Stats
          </TabsTrigger>
        </TabsList>

        {/* ============ SCENARIOS TAB ============ */}
        <TabsContent value="scenarios" className="mt-4">
          {!currentScenario ? (
            <div className="space-y-6">
              {/* Category Filters */}
              <div className="flex flex-wrap gap-2">
                <Button variant={selectedCategory === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(null)}>All</Button>
                {categories.map(cat => {
                  const cfg = CATEGORY_CONFIG[cat];
                  return (
                    <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat)}>
                      {cfg?.label || cat}
                    </Button>
                  );
                })}
              </div>

              {/* Scenario Cards Grid */}
              {filteredScenarios.length === 0 ? (
                <Card className="py-16">
                  <CardContent className="text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="font-medium text-foreground mb-1">No scenarios available yet</p>
                    <p className="text-sm text-muted-foreground">Scenarios will appear here once approved by your Super Admin.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredScenarios.map(scenario => {
                    const catCfg = CATEGORY_CONFIG[scenario.category] || { label: scenario.category, icon: GraduationCap, color: 'bg-muted text-foreground border-border' };
                    const diffCfg = DIFFICULTY_CONFIG[scenario.difficulty_level] || DIFFICULTY_CONFIG.medium;
                    const isCompleted = completedScenarios.has(scenario.id);
                    const CatIcon = catCfg.icon;

                    return (
                      <Card
                        key={scenario.id}
                        className={`group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${isCompleted ? 'border-green-200 bg-green-50/30' : ''}`}
                        onClick={() => handleSelectScenario(scenario)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${catCfg.color} border`}>
                              <CatIcon className="h-4 w-4" />
                            </div>
                            <div className="flex items-center gap-2">
                              {isCompleted && (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Done
                                </Badge>
                              )}
                              <Badge variant="outline" className={`text-xs ${diffCfg.bg} ${diffCfg.color}`}>
                                {diffCfg.label}
                              </Badge>
                            </div>
                          </div>

                          <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                            {scenario.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{scenario.description}</p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{catCfg.label}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-primary"
                                onClick={(e) => { e.stopPropagation(); handleStartVoicePractice(scenario); }}
                              >
                                <Mic className="h-3 w-3 mr-1" /> Voice
                              </Button>
                              <Button variant="ghost" size="sm" className="text-xs text-primary">
                                Start Practice <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ============ ACTIVE CONVERSATION ============ */
            <div className="space-y-4">
              {/* Back + Scenario Info */}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={resetToList}>
                  ← Back
                </Button>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{CATEGORY_CONFIG[currentScenario.category]?.label || currentScenario.category}</Badge>
                        <Badge variant="outline" className={`text-xs ${DIFFICULTY_CONFIG[currentScenario.difficulty_level]?.bg || ''} ${DIFFICULTY_CONFIG[currentScenario.difficulty_level]?.color || ''}`}>
                          {DIFFICULTY_CONFIG[currentScenario.difficulty_level]?.label || currentScenario.difficulty_level}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground">{currentScenario.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{currentScenario.description}</p>
                    </div>
                    {currentScenario.caller_persona && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 shrink-0 ml-4">{currentScenario.caller_persona}</Badge>
                    )}
                  </div>
                  {/* Exchange counter */}
                  {!conversationEnded && (
                    <div className="mt-3 flex items-center gap-2">
                      <Progress value={(userExchanges / MAX_EXCHANGES) * 100} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{userExchanges}/{MAX_EXCHANGES} exchanges</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chat */}
              <Card className="flex flex-col" style={{ minHeight: '420px' }}>
                <CardContent className="flex-1 p-0 flex flex-col">
                  <ScrollArea className="flex-1 p-4" style={{ height: '350px' }}>
                    <div className="space-y-4">
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'assistant' && (
                            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                              <Phone className="h-4 w-4 text-accent-foreground" />
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          {msg.role === 'user' && (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isSending && (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                            <Phone className="h-4 w-4 text-accent-foreground" />
                          </div>
                          <div className="bg-muted rounded-2xl px-4 py-2.5">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      {isEvaluating && (
                        <div className="flex justify-center py-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Analyzing your performance…
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  {!conversationEnded && messages.length > 0 && (
                    <div className="border-t p-4">
                      <div className="flex gap-2">
                        <Input
                          value={inputMessage}
                          onChange={e => setInputMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type your response…"
                          disabled={isSending}
                          className="flex-1"
                        />
                        <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isSending} size="icon">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-muted-foreground">{userExchanges} of {MAX_EXCHANGES} exchanges</p>
                        {userExchanges >= MIN_EXCHANGES_FOR_END && (
                          <Button variant="outline" size="sm" onClick={handleEndConversation} disabled={isEvaluating}>
                            <Target className="h-3 w-3 mr-1" /> End & Get Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ============ EVALUATION ============ */}
              {evaluation && (
                <Card className="border-2 border-primary/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Performance Review</h3>
                        <p className="text-sm text-muted-foreground mt-1">{evaluation.overall_feedback}</p>
                      </div>
                      <div className={`text-4xl font-bold ${evaluation.score >= 80 ? 'text-green-600' : evaluation.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {evaluation.score}<span className="text-lg font-normal text-muted-foreground">/100</span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-6">
                    {/* Score Breakdown */}
                    {evaluation.score_breakdown && (
                      <div>
                        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" /> Score Breakdown
                        </h4>
                        <div className="grid grid-cols-5 gap-4">
                          {Object.entries(evaluation.score_breakdown).map(([key, value]) => {
                            const cfg = SCORE_LABELS[key];
                            const Icon = cfg?.icon || Star;
                            return (
                              <div key={key} className="text-center">
                                <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center mb-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className={`text-lg font-bold ${(value as number) >= 80 ? 'text-green-600' : (value as number) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {value as number}
                                </div>
                                <p className="text-xs text-muted-foreground">{cfg?.label || key}</p>
                                <Progress value={value as number} className="h-1 mt-1" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Strengths */}
                      <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-green-800">
                          <CheckCircle className="h-4 w-4" /> Strengths
                        </h4>
                        <ul className="space-y-2">
                          {evaluation.strengths.map((s, i) => (
                            <li key={i} className="text-sm flex items-start gap-2 text-green-900">
                              <Star className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Improvements */}
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-amber-800">
                          <AlertCircle className="h-4 w-4" /> Areas to Improve
                        </h4>
                        <ul className="space-y-2">
                          {evaluation.improvements.map((s, i) => (
                            <li key={i} className="text-sm flex items-start gap-2 text-amber-900">
                              <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Example Response */}
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" /> Stronger Response Example
                      </h4>
                      <p className="text-sm text-muted-foreground italic leading-relaxed">{evaluation.example_response}</p>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={() => handleSelectScenario(currentScenario!)} variant="outline" className="flex-1">
                        <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                      </Button>
                      <Button onClick={resetToList} variant="default" className="flex-1">
                        Next Scenario <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ============ STATS TAB ============ */}
        <TabsContent value="stats" className="mt-4">
          {!stats ? (
            <Card className="py-16">
              <CardContent className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="font-medium text-foreground mb-1">No practice data yet</p>
                <p className="text-sm text-muted-foreground">Complete a practice scenario to see your stats.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold text-foreground">{stats.totalConversations}</div>
                    <p className="text-xs text-muted-foreground">Conversations</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold text-foreground">{stats.avgScore}</div>
                    <p className="text-xs text-muted-foreground">Average Score</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Zap className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <div className="text-lg font-bold text-foreground">{stats.strongest ? SCORE_LABELS[stats.strongest[0]]?.label || stats.strongest[0] : '—'}</div>
                    <p className="text-xs text-muted-foreground">Strongest Skill</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Target className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                    <div className="text-lg font-bold text-foreground">{stats.weakest ? SCORE_LABELS[stats.weakest[0]]?.label || stats.weakest[0] : '—'}</div>
                    <p className="text-xs text-muted-foreground">Needs Work</p>
                  </CardContent>
                </Card>
              </div>

              {/* Skill Breakdown */}
              {stats.avgBreakdown && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Skill Breakdown</CardTitle>
                    <CardDescription>Your average scores across all practice sessions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(stats.avgBreakdown).map(([key, value]) => {
                      const cfg = SCORE_LABELS[key];
                      const Icon = cfg?.icon || Star;
                      return (
                        <div key={key} className="flex items-center gap-4">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{cfg?.label || key}</span>
                              <span className={`text-sm font-bold ${value >= 80 ? 'text-green-600' : value >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{value}</span>
                            </div>
                            <Progress value={value} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Recent Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allResponses.slice(0, 10).map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            r.score >= 80 ? 'bg-green-100 text-green-700' : r.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {r.score}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Practice Session</p>
                            <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {r.score >= 70 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Passed</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Retry</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
