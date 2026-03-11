import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvidencePanel, EvidenceInsight } from '@/hooks/useEvidencePanel';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CATEGORY_STYLES: Record<EvidenceInsight['category'], { bg: string; border: string; accent: string }> = {
  trust: { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', accent: 'text-violet-700 dark:text-violet-300' },
  inquiry: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', accent: 'text-amber-700 dark:text-amber-300' },
  suggestion: { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', accent: 'text-rose-700 dark:text-rose-300' },
};

const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'neutral' }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const InsightCard = ({ insight }: { insight: EvidenceInsight }) => {
  const style = CATEGORY_STYLES[insight.category];

  return (
    <Card className={cn('border transition-all hover:shadow-md', style.bg, style.border)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{insight.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={cn('text-sm font-semibold', style.accent)}>{insight.title}</h4>
              <TrendIcon trend={insight.trend} />
            </div>
            <p className="text-sm text-foreground leading-relaxed">{insight.message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EvidencePanel = () => {
  const { insights, loading } = useEvidencePanel();

  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          📊 What Your Content Is Doing
        </CardTitle>
        <CardDescription>
          Human-readable insights from your post performance data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EvidencePanel;
