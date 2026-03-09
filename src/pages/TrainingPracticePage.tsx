import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GraduationCap, ChevronRight, Star, CheckCircle, AlertCircle,
  BookOpen, Clock, Target, RefreshCw, MessageSquare, TrendingUp,
  Send, Phone, User, Bot, Lightbulb,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

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

const CATEGORY_LABELS: Record<string, string> = {
  'Intake Calls': 'Intake Calls',
  'Cost & Payment Questions': 'Cost & Payment',
  'Dementia / Memory Care': 'Dementia Care',
  'Hospital Discharge': 'Hospital Discharge',
  'Caregiver Burnout': 'Caregiver Burnout',
  'Trust & Safety': 'Trust & Safety',
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

const SCORE_LABELS: Record<string, string> = {
  empathy: 'Empathy',
  clarity: 'Clarity',
  discovery: 'Discovery',
  confidence: 'Confidence',
  next_steps: 'Next Steps',
};

export default function TrainingPracticePage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedScenarios, setCompletedScenarios] = useState<Set<string>>(new Set());
  const [conversationEnded, setConversationEnded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  useEffect(() => {
    loadScenariosAndProgress();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadScenariosAndProgress = async () => {
    setIsLoading(true);
    try {
      const [{ data: scenariosData }, { data: progressData }, { data: responsesData }] = await Promise.all([
        supabase
          .from('training_scenarios')
          .select('*')
          .eq('is_active', true)
          .eq('status', 'published')
          .order('difficulty_level'),
        user ? supabase.from('training_progress').select('*').eq('user_id', user.id) : Promise.resolve({ data: [] }),
        user ? supabase.from('training_responses').select('scenario_id, score').eq('user_id', user.id).gte('score', 70) : Promise.resolve({ data: [] }),
      ]);

      setScenarios((scenariosData as Scenario[]) || []);
      setUserProgress(progressData || []);
      setCompletedScenarios(new Set((responsesData || []).map((r: any) => r.scenario_id)));
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScenario = async (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setMessages([]);
    setEvaluation(null);
    setConversationEnded(false);
    setStartTime(new Date());

    // Get initial caller message
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-training-conversation', {
        body: { scenarioId: scenario.id, messages: [] },
      });
      if (error) throw error;
      if (data.reply) {
        setMessages([{ role: 'assistant', content: data.reply }]);
      }
    } catch (err: any) {
      toast.error('Failed to start scenario');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentScenario || isSending) return;

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
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err: any) {
      toast.error('Failed to get response');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleEndConversation = async () => {
    if (!currentScenario || !user) return;
    setConversationEnded(true);
    setIsEvaluating(true);

    const timeSpent = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : null;

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
      if (data.evaluation.score >= 70) {
        setCompletedScenarios(prev => new Set([...prev, currentScenario.id]));
      }
      await loadScenariosAndProgress();
    } catch (error: any) {
      console.error('Evaluation error:', error);
      toast.error(error?.message || 'Failed to evaluate conversation');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const categories = [...new Set(scenarios.map(s => s.category))];
  const filteredScenarios = selectedCategory ? scenarios.filter(s => s.category === selectedCategory) : scenarios;
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
              <span className="font-semibold">Practice Scenarios</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {totalCompleted} / {totalScenarios} completed
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
              <CardTitle className="text-base">Scenarios</CardTitle>
              <CardDescription>Select a scenario to begin roleplay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant={selectedCategory === null ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(null)} className="text-xs">All</Button>
                {categories.map(cat => (
                  <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)} className="text-xs">
                    {CATEGORY_LABELS[cat] || cat}
                  </Button>
                ))}
              </div>

              {filteredScenarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No published scenarios available yet</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2 pr-2">
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
                              {completedScenarios.has(scenario.id) && <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
                              <p className="text-sm font-medium truncate">{scenario.title}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${DIFFICULTY_COLOR[scenario.difficulty_level]}`}>{scenario.difficulty_level}</span>
                              <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[scenario.category] || scenario.category}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {!currentScenario ? (
            <Card className="h-full flex items-center justify-center min-h-[500px]">
              <CardContent className="text-center">
                <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-40" />
                <h3 className="font-semibold text-lg mb-2">Select a Practice Scenario</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Choose a scenario to start a roleplay conversation. The AI will simulate a family member contacting your agency.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Scenario Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[currentScenario.category] || currentScenario.category}</Badge>
                        <span className={`text-xs font-medium ${DIFFICULTY_COLOR[currentScenario.difficulty_level]}`}>{currentScenario.difficulty_level}</span>
                      </div>
                      <h3 className="font-semibold">{currentScenario.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{currentScenario.description}</p>
                    </div>
                    {currentScenario.caller_persona && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 shrink-0">{currentScenario.caller_persona}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chat Messages */}
              <Card className="flex flex-col" style={{ minHeight: '400px' }}>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-[350px] p-4">
                    <div className="space-y-4">
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'assistant' && (
                            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                              <Phone className="h-4 w-4 text-accent-foreground" />
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
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
                          <div className="bg-muted rounded-xl px-4 py-2.5">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  {!conversationEnded && messages.length > 0 && (
                    <div className="border-t p-4">
                      <div className="flex gap-2">
                        <Input
                          value={inputMessage}
                          onChange={e => setInputMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type your response..."
                          disabled={isSending}
                          className="flex-1"
                        />
                        <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isSending} size="icon">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-muted-foreground">{messages.filter(m => m.role === 'user').length} exchanges</p>
                        {messages.filter(m => m.role === 'user').length >= 3 && (
                          <Button variant="outline" size="sm" onClick={handleEndConversation} disabled={isEvaluating}>
                            {isEvaluating ? (
                              <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Evaluating...</>
                            ) : (
                              <><Target className="h-3 w-3 mr-1" /> End & Get Feedback</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Evaluation Results */}
              {evaluation && (
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Performance Review</CardTitle>
                      <div className={`text-3xl font-bold ${evaluation.score >= 80 ? 'text-green-600' : evaluation.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {evaluation.score}<span className="text-base font-normal text-muted-foreground">/100</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{evaluation.overall_feedback}</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Score Breakdown */}
                    {evaluation.score_breakdown && (
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Score Breakdown</h4>
                        <div className="grid grid-cols-5 gap-3">
                          {Object.entries(evaluation.score_breakdown).map(([key, value]) => (
                            <div key={key} className="text-center">
                              <div className={`text-lg font-bold ${(value as number) >= 80 ? 'text-green-600' : (value as number) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {value as number}
                              </div>
                              <p className="text-xs text-muted-foreground">{SCORE_LABELS[key] || key}</p>
                              <Progress value={value as number} className="h-1 mt-1" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths */}
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-green-700">
                        <CheckCircle className="h-4 w-4" /> Strengths
                      </h4>
                      <ul className="space-y-1.5">
                        {evaluation.strengths.map((s, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Star className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-amber-700">
                        <AlertCircle className="h-4 w-4" /> Areas to Improve
                      </h4>
                      <ul className="space-y-1.5">
                        {evaluation.improvements.map((s, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Example Response */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" /> Stronger Response Example
                      </h4>
                      <p className="text-sm text-muted-foreground italic">{evaluation.example_response}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleSelectScenario(currentScenario!)} variant="outline" className="flex-1">
                        <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                      </Button>
                      <Button onClick={() => { setCurrentScenario(null); setMessages([]); setEvaluation(null); setConversationEnded(false); }} variant="default" className="flex-1">
                        Next Scenario <ChevronRight className="h-4 w-4 ml-2" />
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