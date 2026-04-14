import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Pencil, SkipForward, RefreshCw, Loader2 } from 'lucide-react';
import { useTodaysPost } from '@/hooks/useTodaysPost';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CONTENT_CATEGORIES,
  getNextAngleIntent,
  type ContentIntent,
} from '@/lib/contentIntent';

/** Map decision category to our intent system */
function categoryToIntent(category: string): ContentIntent {
  const map: Record<string, ContentIntent> = {
    visibility: 'visibility',
    engagement: 'engagement',
    authority: 'authority',
    conversion: 'conversion',
    lead_activation: 'lead_activation',
    results: 'conversion',
    conversation: 'lead_activation',
    rotation: 'visibility',
  };
  return map[category] || 'visibility';
}

/** Map post_type from DB to our intent system */
function resolveCurrentIntent(postType: string | null | undefined): ContentIntent {
  if (!postType) return 'visibility';
  const match = CONTENT_CATEGORIES.find(c => c.postType === postType);
  if (match) return match.intent;
  const legacy: Record<string, ContentIntent> = {
    attract: 'visibility', connect: 'engagement', transact: 'conversion',
    educational: 'visibility', heartfelt: 'engagement', authority: 'authority',
    conversion: 'conversion', lead_activation: 'lead_activation',
  };
  return legacy[postType] || 'visibility';
}

const INTENT_LABELS: Record<ContentIntent, string> = {
  visibility: 'Stay visible',
  engagement: 'Spark connection',
  authority: 'Build trust',
  conversion: 'Drive action',
  lead_activation: 'Start conversations',
};

const REASON_HEADLINES: Record<string, string> = {
  visibility: 'Post this now to stay visible',
  engagement: 'Post this to spark connection',
  authority: 'Post this to build trust',
  conversion: 'Post this to drive action',
  lead_activation: 'Post this to start conversations',
};

export default function PostTodayCard() {
  const { post, loading: postLoading, refetch } = useTodaysPost();
  const { decision, state, loading: decisionLoading } = useDecisionEngine();
  const [regenerating, setRegenerating] = useState(false);

  const loading = postLoading || decisionLoading;

  // Determine current intent from decision engine or post type
  const activeIntent = decision
    ? categoryToIntent(decision.category)
    : resolveCurrentIntent(post?.post_type);

  const handleAnotherAngle = useCallback(async () => {
    if (!post || regenerating) return;
    setRegenerating(true);

    try {
      const currentIntent = resolveCurrentIntent(post.post_type);
      const nextCategory = getNextAngleIntent(currentIntent);

      const { data, error } = await supabase.functions.invoke('generate-post', {
        body: {
          postType: nextCategory.postType,
          tone: 'conversational',
          platform: post.platform,
          audience: '',
          subject: '',
        },
      });

      if (error) throw error;

      const newBody = data?.post || `${data?.hook || ''}\n\n${data?.body || ''}\n\n${data?.cta || ''}`.trim();

      await supabase
        .from('content_posts')
        .update({
          post_body: newBody,
          hook: data?.hook || null,
          headline: data?.headline || null,
          engagement_hook: data?.engagement_hook || null,
          post_type: nextCategory.postType,
          content_anchor: data?.content_anchor || null,
          core_message: data?.core_message || null,
          caption_instagram: data?.caption_instagram || null,
          caption_linkedin: data?.caption_linkedin || null,
          caption_facebook: data?.caption_facebook || null,
          caption_x: data?.caption_x || null,
        })
        .eq('id', post.id);

      toast.success(`Switched to: ${nextCategory.label}`);
      refetch();
    } catch (err: any) {
      toast.error('Failed to regenerate. Try again.');
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  }, [post, regenerating, refetch]);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (!post) {
    return (
      <Card className="border border-border/50 bg-card/50">
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {decision?.reason || 'Nothing to post today.'}
          </p>
          <Link to="/dashboard/content-calendar">
            <Button variant="outline" size="sm" className="text-xs">
              Plan Content
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const intentLabel = INTENT_LABELS[activeIntent];
  const contextMessage = decision?.reason
    ? REASON_HEADLINES[decision.category] || decision.reason
    : 'Post this today';

  const hook = post.hook || post.headline || '';
  const body = post.post_body.length > 200 ? post.post_body.slice(0, 200) + '…' : post.post_body;
  const cta = post.engagement_hook || '';

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium tracking-[0.2em] uppercase text-muted-foreground/50">
        {contextMessage}
      </h3>
      <Card className="border border-border/50 bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-normal">
                {post.platform}
              </Badge>
              <span className="text-[10px] text-muted-foreground/60">·</span>
              <span className="text-[10px] text-primary/60 font-medium">{intentLabel}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>

          {decision?.reason && (
            <p className="text-[11px] text-muted-foreground/70 italic border-l-2 border-primary/20 pl-2">
              {decision.reason}
            </p>
          )}

          <div className="space-y-2">
            {hook && (
              <p className="text-sm font-medium text-foreground/90">{hook}</p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            {cta && (
              <p className="text-xs text-primary/70 italic">{cta}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
            <Button size="sm" className="text-xs gap-1.5 flex-1">
              <Sparkles className="h-3.5 w-3.5" /> Post now
            </Button>
            <Link to="/dashboard/content-calendar">
              <Button size="sm" variant="ghost" className="text-xs gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
            <Button size="sm" variant="ghost" className="text-xs gap-1 text-muted-foreground">
              <SkipForward className="h-3.5 w-3.5" /> Skip
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 text-muted-foreground"
              onClick={handleAnotherAngle}
              disabled={regenerating}
            >
              {regenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {regenerating ? 'Switching…' : 'Another angle'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
