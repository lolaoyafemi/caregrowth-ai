import React from 'react';
import { CheckCircle2, Clock, MessageCircle } from 'lucide-react';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const typeConfig = {
  published: { icon: CheckCircle2, color: 'text-emerald-400' },
  scheduled: { icon: Clock, color: 'text-blue-400' },
  engagement: { icon: MessageCircle, color: 'text-amber-400' },
} as const;

export default function ActivityFeedSection() {
  const { items, loading } = useActivityFeed();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium tracking-[0.2em] uppercase text-muted-foreground/50">
        Recent activity
      </h3>
      <div className="space-y-1">
        {items.map(item => {
          const c = typeConfig[item.type];
          const Icon = c.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
            >
              <Icon className={cn('h-3.5 w-3.5 shrink-0', c.color)} />
              <span className="text-sm text-foreground/70 flex-1 truncate">{item.message}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatRelative(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
