import React from 'react';
import { Link } from 'react-router-dom';
import { useAgencyHealthScore } from '@/hooks/useAgencyHealthScore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ArrowRight, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const AgencyHealthScore: React.FC = () => {
  const { totalScore, pillars, suggestions, loading } = useAgencyHealthScore();

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const scoreColor =
    totalScore >= 80
      ? 'text-chart-2'
      : totalScore >= 60
        ? 'text-chart-4'
        : totalScore >= 40
          ? 'text-chart-3'
          : 'text-destructive';

  const scoreLabel =
    totalScore >= 80
      ? 'Excellent'
      : totalScore >= 60
        ? 'Good'
        : totalScore >= 40
          ? 'Fair'
          : 'Needs Attention';

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 mb-8">
      {/* Header with Score Circle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
        {/* Score Circle */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'flex items-center justify-center w-20 h-20 rounded-full border-4',
              totalScore >= 80
                ? 'border-chart-2 bg-chart-2/10'
                : totalScore >= 60
                  ? 'border-chart-4 bg-chart-4/10'
                  : totalScore >= 40
                    ? 'border-chart-3 bg-chart-3/10'
                    : 'border-destructive bg-destructive/10'
            )}
          >
            <span className={cn('text-2xl font-bold', scoreColor)}>{totalScore}</span>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-1">
            <Target className={cn('h-4 w-4', scoreColor)} />
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-foreground">Agency Health Score</h2>
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                totalScore >= 80
                  ? 'bg-chart-2/20 text-chart-2'
                  : totalScore >= 60
                    ? 'bg-chart-4/20 text-chart-4'
                    : totalScore >= 40
                      ? 'bg-chart-3/20 text-chart-3'
                      : 'bg-destructive/20 text-destructive'
              )}
            >
              {scoreLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Track your marketing health across 5 key areas
          </p>
        </div>
      </div>

      {/* Pillars Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {pillars.map((pillar) => {
          const percentage = (pillar.score / pillar.maxScore) * 100;
          return (
            <div
              key={pillar.name}
              className="rounded-xl border border-border/40 bg-secondary/30 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {pillar.name}
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {pillar.score}/{pillar.maxScore}
                </span>
              </div>
              <Progress
                value={percentage}
                className="h-1.5 bg-secondary [&>div]:bg-primary"
              />
            </div>
          );
        })}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {suggestions.length === 1
                ? 'One quick action could boost your score:'
                : `${suggestions.length} quick actions could push your score above ${Math.min(100, totalScore + 20)}:`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <Link key={idx} to={suggestion.actionPath}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  {suggestion.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyHealthScore;
