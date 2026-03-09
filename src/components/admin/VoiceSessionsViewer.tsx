import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Mic, Phone, User, Eye, BarChart3, Clock, Star,
  Heart, Lightbulb, Search, ShieldCheck, ArrowRight,
  TrendingDown, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceSession {
  id: string;
  user_id: string;
  agency_id: string | null;
  scenario_id: string;
  transcript: any[];
  score_breakdown: any;
  feedback_summary: any;
  overall_score: number | null;
  strengths: string[] | null;
  improvements: string[] | null;
  total_turns: number;
  duration_seconds: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  training_scenarios?: {
    title: string;
    category: string;
  };
  user_profiles?: {
    email: string;
  };
}

const SCORE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  empathy: { label: 'Empathy', icon: Heart },
  clarity: { label: 'Clarity', icon: Lightbulb },
  discovery: { label: 'Discovery', icon: Search },
  confidence: { label: 'Confidence', icon: ShieldCheck },
  next_steps: { label: 'Next Steps', icon: ArrowRight },
};

export default function VoiceSessionsViewer() {
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<VoiceSession | null>(null);
  const [weakAreaStats, setWeakAreaStats] = useState<Record<string, number>>({});

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('voice_practice_sessions')
        .select(`
          *,
          training_scenarios (title, category)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSessions(data || []);

      // Calculate weak area stats
      const areaScores: Record<string, number[]> = {
        empathy: [],
        clarity: [],
        discovery: [],
        confidence: [],
        next_steps: [],
      };

      (data || []).forEach((session: VoiceSession) => {
        if (session.score_breakdown) {
          Object.keys(areaScores).forEach(key => {
            if (session.score_breakdown[key] !== undefined) {
              areaScores[key].push(session.score_breakdown[key]);
            }
          });
        }
      });

      const avgScores: Record<string, number> = {};
      Object.entries(areaScores).forEach(([key, scores]) => {
        if (scores.length > 0) {
          avgScores[key] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
      });
      setWeakAreaStats(avgScores);
    } catch (error) {
      console.error('Failed to load voice sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.training_scenarios?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.training_scenarios?.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSessions = sessions.length;
  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((a, s) => a + (s.overall_score || 0), 0) / sessions.length)
    : 0;

  const weakestArea = Object.entries(weakAreaStats).sort((a, b) => a[1] - b[1])[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Mic className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold text-foreground">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">Voice Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <div className="text-2xl font-bold text-foreground">{avgScore}</div>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <div className="text-lg font-bold text-foreground">
              {weakestArea ? SCORE_LABELS[weakestArea[0]]?.label || weakestArea[0] : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Weakest Area ({weakestArea?.[1] || 0})</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-foreground">
              {sessions.length > 0
                ? Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / sessions.length / 60)
                : 0}m
            </div>
            <p className="text-xs text-muted-foreground">Avg Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Weak Areas Breakdown */}
      {Object.keys(weakAreaStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Common Weak Areas (All Sessions)</CardTitle>
            <CardDescription>Average scores by skill dimension</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(weakAreaStats)
              .sort((a, b) => a[1] - b[1])
              .map(([key, value]) => {
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

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Voice Practice Sessions</CardTitle>
              <CardDescription>Review completed voice practice sessions</CardDescription>
            </div>
            <div className="w-64">
              <Input
                placeholder="Search scenarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <Mic className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No voice practice sessions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      (session.overall_score || 0) >= 80 ? 'bg-green-100 text-green-700' 
                      : (session.overall_score || 0) >= 60 ? 'bg-amber-100 text-amber-700' 
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {session.overall_score || '—'}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{session.training_scenarios?.title || 'Unknown Scenario'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{session.training_scenarios?.category}</Badge>
                        <span>•</span>
                        <span>{session.total_turns} turns</span>
                        <span>•</span>
                        <span>{new Date(session.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedSession(session)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Voice Session Review</DialogTitle>
                      </DialogHeader>
                      
                      {selectedSession && (
                        <div className="space-y-6">
                          {/* Session Info */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{selectedSession.training_scenarios?.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(selectedSession.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className={`text-3xl font-bold ${
                              (selectedSession.overall_score || 0) >= 80 ? 'text-green-600' 
                              : (selectedSession.overall_score || 0) >= 60 ? 'text-amber-600' 
                              : 'text-red-600'
                            }`}>
                              {selectedSession.overall_score}/100
                            </div>
                          </div>

                          {/* Score Breakdown */}
                          {selectedSession.score_breakdown && (
                            <div className="grid grid-cols-5 gap-2">
                              {Object.entries(selectedSession.score_breakdown).map(([key, value]) => {
                                const cfg = SCORE_LABELS[key];
                                return (
                                  <div key={key} className="text-center p-2 bg-muted rounded-lg">
                                    <div className={`text-lg font-bold ${(value as number) >= 80 ? 'text-green-600' : (value as number) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                      {value as number}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{cfg?.label || key}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Transcript */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3">Transcript</h4>
                            <ScrollArea className="h-64 border rounded-lg p-4">
                              <div className="space-y-3">
                                {(selectedSession.transcript || []).map((msg: any, i: number) => (
                                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                      <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                                        <Phone className="h-3 w-3" />
                                      </div>
                                    )}
                                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                      msg.role === 'user' 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted text-foreground'
                                    }`}>
                                      {msg.content}
                                    </div>
                                    {msg.role === 'user' && (
                                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="h-3 w-3 text-primary" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>

                          {/* Strengths & Improvements */}
                          <div className="grid grid-cols-2 gap-4">
                            {selectedSession.strengths && selectedSession.strengths.length > 0 && (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                <h4 className="text-sm font-semibold text-green-800 mb-2">Strengths</h4>
                                <ul className="text-sm space-y-1">
                                  {selectedSession.strengths.map((s, i) => (
                                    <li key={i} className="text-green-900">• {s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {selectedSession.improvements && selectedSession.improvements.length > 0 && (
                              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                <h4 className="text-sm font-semibold text-amber-800 mb-2">Improvements</h4>
                                <ul className="text-sm space-y-1">
                                  {selectedSession.improvements.map((s, i) => (
                                    <li key={i} className="text-amber-900">• {s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
