import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mic, MicOff, Volume2, Phone, User, X, ArrowLeft,
  RefreshCw, CheckCircle, AlertCircle, Star, Lightbulb,
  MessageSquare, BarChart3, Heart, Search, ShieldCheck, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Scenario {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  caller_persona: string | null;
  care_situation: string | null;
}

interface VoiceMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoicePracticeSessionProps {
  scenario: Scenario;
  userId: string;
  agencyId?: string;
  onClose: () => void;
  onComplete: () => void;
}

const MAX_TURNS = 8;
const MIN_TURNS_FOR_END = 3;

const SCORE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  empathy: { label: 'Empathy', icon: Heart },
  clarity: { label: 'Clarity', icon: Lightbulb },
  discovery: { label: 'Discovery', icon: Search },
  confidence: { label: 'Confidence', icon: ShieldCheck },
  next_steps: { label: 'Next Steps', icon: ArrowRight },
};

export default function VoicePracticeSession({
  scenario,
  userId,
  agencyId,
  onClose,
  onComplete
}: VoicePracticeSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [startTime] = useState(new Date());
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const userTurns = messages.filter(m => m.role === 'user').length;
  const canEnd = userTurns >= MIN_TURNS_FOR_END;
  const conversationEnded = !!evaluation;

  // Scroll to bottom when messages change
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session and get first AI message
  useEffect(() => {
    initializeSession();
    return () => {
      // Cleanup audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const initializeSession = async () => {
    setIsProcessing(true);
    try {
      // Create session record
      const { data: session, error: sessionError } = await supabase
        .from('voice_practice_sessions')
        .insert({
          user_id: userId,
          agency_id: agencyId,
          scenario_id: scenario.id,
          transcript: [],
          status: 'in_progress',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      setSessionId(session.id);

      // Get initial AI message
      const { data, error } = await supabase.functions.invoke('simulate-training-conversation', {
        body: { scenarioId: scenario.id, messages: [] },
      });

      if (error) throw error;
      if (data.reply) {
        const aiMessage: VoiceMessage = { role: 'assistant', content: data.reply, timestamp: new Date() };
        setMessages([aiMessage]);
        await speakText(data.reply);
        await updateSessionTranscript(session.id, [aiMessage]);
      }
    } catch (error: any) {
      console.error('Failed to initialize session:', error);
      toast.error('Failed to start voice practice');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSessionTranscript = async (sessId: string, msgs: VoiceMessage[]) => {
    try {
      await supabase
        .from('voice_practice_sessions')
        .update({
          transcript: msgs.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() })) as any,
          total_turns: msgs.filter(m => m.role === 'user').length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessId);
    } catch (error) {
      console.error('Failed to update transcript:', error);
    }
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);
    try {
      const { data, error } = await supabase.functions.invoke('voice-text-to-speech', {
        body: { text, voice: 'nova' },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Play audio
      const audioBlob = base64ToBlob(data.audio, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return new Promise<void>((resolve) => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setIsSpeaking(false);
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };
        audio.play();
      });
    } catch (error: any) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      // Don't show error toast for TTS - text is still visible
    }
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processRecording(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error('Recording error:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Speech-to-text
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const sttResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-speech-to-text`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      const sttData = await sttResponse.json();
      if (!sttData.success) throw new Error(sttData.error || 'Speech recognition failed');

      const userText = sttData.text;
      if (!userText || userText.trim().length === 0) {
        toast.error('Could not understand speech. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Add user message
      const userMessage: VoiceMessage = { role: 'user', content: userText, timestamp: new Date() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      // Check if we should auto-end
      const newUserTurns = newMessages.filter(m => m.role === 'user').length;
      if (newUserTurns >= MAX_TURNS) {
        await updateSessionTranscript(sessionId!, newMessages);
        await endConversation(newMessages);
        return;
      }

      // Get AI response
      const { data, error } = await supabase.functions.invoke('simulate-training-conversation', {
        body: { 
          scenarioId: scenario.id, 
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        },
      });

      if (error) throw error;

      if (data.reply) {
        const aiMessage: VoiceMessage = { role: 'assistant', content: data.reply, timestamp: new Date() };
        const updatedMessages = [...newMessages, aiMessage];
        setMessages(updatedMessages);
        await updateSessionTranscript(sessionId!, updatedMessages);
        await speakText(data.reply);
      }
    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error(error.message || 'Failed to process response');
    } finally {
      setIsProcessing(false);
    }
  };

  const endConversation = async (finalMessages?: VoiceMessage[]) => {
    const msgsToEvaluate = finalMessages || messages;
    if (!sessionId || isEvaluating) return;

    setIsEvaluating(true);
    const timeSpent = Math.floor((Date.now() - startTime.getTime()) / 1000);

    try {
      const { data, error } = await supabase.functions.invoke('evaluate-training-response', {
        body: {
          scenarioId: scenario.id,
          userId: userId,
          userResponse: msgsToEvaluate.map(m => `${m.role === 'user' ? 'Staff' : 'Caller'}: ${m.content}`).join('\n\n'),
          conversationHistory: msgsToEvaluate.map(m => ({ role: m.role, content: m.content })),
          timeSpentSeconds: timeSpent,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setEvaluation(data.evaluation);

      // Update session with results
      await supabase
        .from('voice_practice_sessions')
        .update({
          status: 'completed',
          overall_score: data.evaluation.score,
          score_breakdown: data.evaluation.score_breakdown,
          feedback_summary: {
            overall_feedback: data.evaluation.overall_feedback,
            example_response: data.evaluation.example_response,
          },
          strengths: data.evaluation.strengths,
          improvements: data.evaluation.improvements,
          duration_seconds: timeSpent,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      onComplete();
    } catch (error: any) {
      console.error('Evaluation error:', error);
      toast.error(error.message || 'Failed to evaluate conversation');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleEndPractice = () => {
    if (canEnd) {
      endConversation();
    }
  };

  const handleClose = async () => {
    if (sessionId && !evaluation) {
      // Mark as abandoned
      await supabase
        .from('voice_practice_sessions')
        .update({ status: 'abandoned' })
        .eq('id', sessionId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">{scenario.title}</h2>
            <p className="text-xs text-muted-foreground">{scenario.caller_persona || 'Family Member'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{userTurns}/{MAX_TURNS} turns</Badge>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Scenario Brief */}
      <div className="px-4 py-3 bg-muted/30 border-b">
        <p className="text-sm text-muted-foreground">{scenario.description}</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Transcript */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-accent-foreground" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-foreground'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex gap-3 justify-start">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Evaluating indicator */}
            {isEvaluating && (
              <div className="flex justify-center py-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-5 py-3 rounded-full">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing your performance…
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>
        </ScrollArea>

        {/* Speaking Indicator */}
        {isSpeaking && (
          <div className="flex justify-center py-2 bg-accent/20">
            <div className="flex items-center gap-2 text-sm text-accent-foreground">
              <Volume2 className="h-4 w-4 animate-pulse" />
              <span>AI is speaking...</span>
            </div>
          </div>
        )}

        {/* Controls */}
        {!conversationEnded && (
          <div className="border-t p-4 bg-card">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-4">
                {/* Mic Button */}
                <Button
                  size="lg"
                  variant={isRecording ? 'destructive' : 'default'}
                  className={`h-16 w-16 rounded-full ${isRecording ? 'animate-pulse' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing || isSpeaking || isEvaluating}
                >
                  {isRecording ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">
                {isRecording ? 'Tap to stop recording' : 'Tap to speak'}
              </p>

              {/* End button */}
              {canEnd && !isRecording && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={handleEndPractice} disabled={isEvaluating || isProcessing}>
                    End Practice & Get Feedback
                  </Button>
                </div>
              )}

              {/* Progress */}
              <div className="mt-4">
                <Progress value={(userTurns / MAX_TURNS) * 100} className="h-1.5" />
                <p className="text-center text-xs text-muted-foreground mt-1">
                  {userTurns} of {MAX_TURNS} turns
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Evaluation Results */}
        {evaluation && (
          <div className="border-t overflow-auto">
            <div className="max-w-2xl mx-auto p-6 space-y-6">
              {/* Score Header */}
              <div className="text-center">
                <div className={`text-5xl font-bold ${evaluation.score >= 80 ? 'text-green-600' : evaluation.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {evaluation.score}<span className="text-lg font-normal text-muted-foreground">/100</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{evaluation.overall_feedback}</p>
              </div>

              {/* Score Breakdown */}
              {evaluation.score_breakdown && (
                <div className="grid grid-cols-5 gap-3">
                  {Object.entries(evaluation.score_breakdown).map(([key, value]) => {
                    const cfg = SCORE_LABELS[key];
                    const Icon = cfg?.icon || Star;
                    return (
                      <div key={key} className="text-center">
                        <div className="h-9 w-9 mx-auto rounded-full bg-muted flex items-center justify-center mb-1">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className={`text-lg font-bold ${(value as number) >= 80 ? 'text-green-600' : (value as number) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {value as number}
                        </div>
                        <p className="text-xs text-muted-foreground">{cfg?.label || key}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Strengths & Improvements */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-green-800">
                    <CheckCircle className="h-4 w-4" /> What You Did Well
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2 text-green-900">
                        <Star className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-amber-800">
                    <AlertCircle className="h-4 w-4" /> Areas to Improve
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.improvements.map((s: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2 text-amber-900">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Example Response */}
              {evaluation.example_response && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" /> Stronger Response Example
                  </h4>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">{evaluation.example_response}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Done
                </Button>
                <Button className="flex-1" onClick={handleClose}>
                  Practice Another
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
