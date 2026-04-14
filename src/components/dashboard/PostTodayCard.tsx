import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Pencil, SkipForward, RefreshCw } from 'lucide-react';
import { useTodaysPost } from '@/hooks/useTodaysPost';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function PostTodayCard() {
  const { post, loading } = useTodaysPost();

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (!post) {
    return (
      <Card className="border border-border/50 bg-card/50">
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Nothing to post today.</p>
          <Link to="/dashboard/content-calendar">
            <Button variant="outline" size="sm" className="text-xs">
              Plan Content
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Extract hook/body/CTA from post
  const hook = post.hook || post.headline || '';
  const body = post.post_body.length > 200 ? post.post_body.slice(0, 200) + '…' : post.post_body;
  const cta = post.engagement_hook || '';

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium tracking-[0.2em] uppercase text-muted-foreground/50">
        Post this today
      </h3>
      <Card className="border border-border/50 bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-normal">
              {post.platform}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>

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
            <Link to={`/dashboard/content-calendar`}>
              <Button size="sm" variant="ghost" className="text-xs gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
            <Button size="sm" variant="ghost" className="text-xs gap-1 text-muted-foreground">
              <SkipForward className="h-3.5 w-3.5" /> Skip
            </Button>
            <Button size="sm" variant="ghost" className="text-xs gap-1 text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Another angle
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
