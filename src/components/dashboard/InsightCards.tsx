import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useContentInsights, ContentInsight } from '@/hooks/useContentInsights';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS: Record<ContentInsight['category'], string> = {
  topic: 'border-l-blue-500 dark:border-l-blue-400',
  anchor: 'border-l-emerald-500 dark:border-l-emerald-400',
  format: 'border-l-violet-500 dark:border-l-violet-400',
  trigger: 'border-l-amber-500 dark:border-l-amber-400',
  trend: 'border-l-rose-500 dark:border-l-rose-400',
};

const InsightCard = ({ insight }: { insight: ContentInsight }) => (
  <Card className={cn(
    'border-l-4 bg-card hover:shadow-md transition-shadow duration-200',
    CATEGORY_COLORS[insight.category]
  )}>
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5 shrink-0">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground leading-snug mb-1">
            {insight.headline}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.detail}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const InsightCards = () => {
  const { insights, loading } = useContentInsights();

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">📊 CareGrowth Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">📊 CareGrowth Insights</h2>
        <p className="text-sm text-muted-foreground">Patterns from your published content</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map(insight => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
};

export default InsightCards;
