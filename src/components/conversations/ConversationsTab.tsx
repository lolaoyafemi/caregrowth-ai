import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import {
  MessageCircle, Facebook, Instagram, Linkedin, Twitter,
  ExternalLink, Check, Sparkles, Loader2, Send, Filter,
  MessageSquare, Users, HelpCircle, Heart, Clock,
  CheckCircle, ChevronRight, RefreshCw
} from 'lucide-react';

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  x: Twitter,
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-[hsl(220,46%,48%)]',
  instagram: 'bg-[hsl(330,60%,52%)]',
  linkedin: 'bg-[hsl(210,60%,42%)]',
  x: 'bg-foreground',
};

const CLASSIFICATION_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  potential_family_inquiry: {
    label: 'Family Inquiry',
    icon: Users,
    className: 'bg-status-approval-bg text-status-approval border-transparent',
  },
  general_engagement: {
    label: 'Engagement',
    icon: Heart,
    className: 'bg-status-published-bg text-status-published border-transparent',
  },
  caregiver_concern: {
    label: 'Caregiver Concern',
    icon: HelpCircle,
    className: 'bg-status-failed-bg text-status-failed border-transparent',
  },
  informational_question: {
    label: 'Question',
    icon: MessageSquare,
    className: 'bg-status-scheduled-bg text-status-scheduled border-transparent',
  },
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  replied: 'Replied',
  handled: 'Handled',
};

interface Conversation {
  id: string;
  platform: string;
  commenter_name: string | null;
  commenter_avatar_url: string | null;
  comment_text: string;
  ai_classification: string | null;
  ai_suggested_reply: string | null;
  status: string;
  engagement_count: number;
  created_at: string;
  post_id: string | null;
  reply_text: string | null;
  replied_at: string | null;
}

const ConversationsTab: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'potential_family_inquiry'>('all');
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      let query = supabase
        .from('social_conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'new') {
        query = query.eq('status', 'new');
      } else if (filter === 'potential_family_inquiry') {
        query = query.eq('ai_classification', 'potential_family_inquiry');
      }

      const { data, error } = await query;
      if (error) throw error;
      setConversations((data || []) as Conversation[]);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleMarkHandled = async (convo: Conversation) => {
    try {
      const { error } = await supabase
        .from('social_conversations')
        .update({ status: 'handled', updated_at: new Date().toISOString() })
        .eq('id', convo.id);
      if (error) throw error;
      toast.success('Marked as handled');
      fetchConversations();
      if (selectedConvo?.id === convo.id) setSelectedConvo(null);
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  const handleGenerateReply = async (convo: Conversation) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('classify-conversation', {
        body: {
          action: 'suggest_reply',
          comment_text: convo.comment_text,
          platform: convo.platform,
          classification: convo.ai_classification,
        },
      });
      if (error) throw error;
      setReplyText(data?.suggested_reply || 'Thank you for reaching out! We\'d love to help.');
    } catch (err: any) {
      toast.error('Failed to generate reply');
      setReplyText('Thank you for your comment! We appreciate your engagement.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendReply = async (convo: Conversation) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('social_conversations')
        .update({
          status: 'replied',
          reply_text: replyText,
          replied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', convo.id);
      if (error) throw error;
      toast.success('Reply saved. Direct platform replies will be available once APIs are connected.');
      setReplyText('');
      setSelectedConvo(null);
      fetchConversations();
    } catch (err: any) {
      toast.error('Failed to save reply: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const openReplyPanel = (convo: Conversation) => {
    setSelectedConvo(convo);
    setReplyText(convo.ai_suggested_reply || '');
  };

  const newCount = conversations.filter(c => c.status === 'new').length;
  const inquiryCount = conversations.filter(c => c.ai_classification === 'potential_family_inquiry').length;

  const ConversationCard = ({ convo }: { convo: Conversation }) => {
    const PlatformIcon = PLATFORM_ICONS[convo.platform] || MessageCircle;
    const classConfig = CLASSIFICATION_CONFIG[convo.ai_classification || 'general_engagement'] || CLASSIFICATION_CONFIG.general_engagement;
    const ClassIcon = classConfig.icon;

    return (
      <div
        className={cn(
          "group rounded-xl border border-cal-border bg-card p-4 transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:-translate-y-0.5",
          convo.status === 'new' && 'border-l-2 border-l-primary'
        )}
        onClick={() => openReplyPanel(convo)}
      >
        <div className="flex items-start gap-3">
          {/* Avatar / Platform */}
          <div className="shrink-0 relative">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground/70">
              {convo.commenter_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className={cn(
              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white",
              PLATFORM_COLORS[convo.platform] || 'bg-muted-foreground'
            )}>
              <PlatformIcon size={9} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground truncate">
                {convo.commenter_name || 'Anonymous'}
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(convo.created_at), { addSuffix: true })}
              </span>
            </div>

            <p className="text-[13px] text-foreground/75 line-clamp-2 leading-relaxed mb-2.5">
              {convo.comment_text}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full gap-1", classConfig.className)}>
                <ClassIcon size={10} />
                {classConfig.label}
              </Badge>

              {convo.engagement_count > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Heart size={10} /> {convo.engagement_count}
                </span>
              )}

              {convo.status === 'replied' && (
                <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-status-published-bg text-status-published border-transparent gap-1">
                  <CheckCircle size={10} /> Replied
                </Badge>
              )}

              {convo.status === 'handled' && (
                <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border-transparent gap-1">
                  <Check size={10} /> Handled
                </Badge>
              )}
            </div>
          </div>

          {/* Action hint */}
          <ChevronRight size={16} className="text-muted-foreground/30 shrink-0 mt-1 group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>
    );
  };

  const EmptyState = ({ message, sub }: { message: string; sub?: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-cal-surface flex items-center justify-center mb-4">
        <MessageCircle size={24} className="text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-foreground/60">{message}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            className="rounded-lg text-xs h-8 gap-1.5"
            onClick={() => setFilter('all')}
          >
            All
            {conversations.length > 0 && <span className="text-[10px] opacity-70">({conversations.length})</span>}
          </Button>
          <Button
            variant={filter === 'new' ? 'default' : 'outline'}
            size="sm"
            className="rounded-lg text-xs h-8 gap-1.5 border-cal-border"
            onClick={() => setFilter('new')}
          >
            New
            {newCount > 0 && <span className="text-[10px] opacity-70">({newCount})</span>}
          </Button>
          <Button
            variant={filter === 'potential_family_inquiry' ? 'default' : 'outline'}
            size="sm"
            className="rounded-lg text-xs h-8 gap-1.5 border-cal-border"
            onClick={() => setFilter('potential_family_inquiry')}
          >
            <Users size={12} />
            Inquiries
            {inquiryCount > 0 && <span className="text-[10px] opacity-70">({inquiryCount})</span>}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-8 gap-1.5 text-muted-foreground"
          onClick={() => { setLoading(true); fetchConversations(); }}
        >
          <RefreshCw size={12} /> Refresh
        </Button>
      </div>

      {/* Conversations list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={20} />
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          message="Nothing waiting here right now."
          sub="Comments and reactions from your connected platforms will appear here once your social APIs are active."
        />
      ) : (
        <div className="grid gap-3">
          {conversations.map(convo => (
            <ConversationCard key={convo.id} convo={convo} />
          ))}
        </div>
      )}

      {/* Reply panel */}
      <Sheet open={!!selectedConvo} onOpenChange={(open) => { if (!open) { setSelectedConvo(null); setReplyText(''); } }}>
        <SheetContent className="sm:max-w-md overflow-y-auto border-l-cal-border">
          {selectedConvo && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg font-semibold flex items-center gap-2">
                  <MessageCircle size={18} />
                  Conversation
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Original comment */}
                <div className="space-y-3">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Comment</p>
                  <div className="rounded-xl bg-cal-surface p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground/70">
                        {selectedConvo.commenter_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{selectedConvo.commenter_name || 'Anonymous'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(selectedConvo.created_at), 'MMM d, yyyy · h:mm a')}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {selectedConvo.comment_text}
                    </p>
                    {(() => {
                      const classConfig = CLASSIFICATION_CONFIG[selectedConvo.ai_classification || 'general_engagement'] || CLASSIFICATION_CONFIG.general_engagement;
                      const ClassIcon = classConfig.icon;
                      return (
                        <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full gap-1", classConfig.className)}>
                          <ClassIcon size={10} />
                          {classConfig.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                {/* Reply section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reply</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1.5 text-primary hover:text-primary"
                      onClick={() => handleGenerateReply(selectedConvo)}
                      disabled={generating}
                    >
                      {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI Suggestion
                    </Button>
                  </div>

                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    className="min-h-[120px] rounded-xl border-cal-border bg-cal-surface text-sm resize-none"
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleSendReply(selectedConvo)}
                      disabled={sending || !replyText.trim()}
                      className="flex-1 gap-2 rounded-lg h-9"
                    >
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Send Reply
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-lg h-9 gap-1.5 border-cal-border text-xs"
                      onClick={() => handleMarkHandled(selectedConvo)}
                    >
                      <Check size={13} /> Mark Handled
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground/60 text-center">
                    Replies are saved locally. Direct platform delivery requires API connection.
                  </p>
                </div>

                {/* Previous reply */}
                {selectedConvo.reply_text && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Previous Reply</p>
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                      <p className="text-sm text-foreground/80 leading-relaxed">{selectedConvo.reply_text}</p>
                      {selectedConvo.replied_at && (
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Sent {format(new Date(selectedConvo.replied_at), 'MMM d · h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ConversationsTab;
