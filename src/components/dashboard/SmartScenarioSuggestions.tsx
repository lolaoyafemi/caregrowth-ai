import React from 'react';
import { Link } from 'react-router-dom';
import { useSmartScenarios, type ScenarioSuggestion } from '@/hooks/useSmartScenarios';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, CalendarDays, ArrowRight, Dumbbell, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  signal: Zap,
  clock: Clock,
  calendar: CalendarDays,
} as const;

const TYPE_STYLES = {
  opportunity: 'border-chart-4/40 bg-chart-4/5',
  reminder: 'border-chart-3/40 bg-chart-3/5',
  seasonal: 'border-primary/40 bg-primary/5',
} as const;

const BADGE_STYLES = {
  opportunity: 'bg-chart-4/15 text-chart-4',
  reminder: 'bg-chart-3/15 text-chart-3',
  seasonal: 'bg-primary/15 text-primary',
} as const;

const SmartScenarioSuggestions: React.FC = () => {
  const { suggestions, loading } = useSmartScenarios();

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Dumbbell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Practice Suggestions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Dumbbell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Practice Suggestions</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((s, idx) => (
          <SuggestionCard key={idx} suggestion={s} />
        ))}
      </div>
    </div>
  );
};

function SuggestionCard({ suggestion }: { suggestion: ScenarioSuggestion }) {
  const Icon = ICON_MAP[suggestion.icon];
  const practiceUrl = suggestion.scenarioId
    ? `/dashboard/training-practice?scenario=${suggestion.scenarioId}`
    : '/dashboard/training-practice';

  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-shadow hover:shadow-sm flex flex-col gap-3',
        TYPE_STYLES[suggestion.type]
      )}
    >
      {/* Badge + Icon */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
            BADGE_STYLES[suggestion.type]
          )}
        >
          <Icon className="h-3 w-3" />
          {suggestion.type === 'opportunity'
            ? 'Practice Opportunity'
            : suggestion.type === 'reminder'
              ? 'Training Reminder'
              : 'Seasonal Prep'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground mb-1">{suggestion.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.description}</p>
      </div>

      {/* Scenario + CTA */}
      <div className="pt-1 border-t border-border/40">
        <p className="text-xs text-muted-foreground mb-2">
          Suggested: <span className="font-medium text-foreground">{suggestion.scenarioTitle}</span>
        </p>
        <Link to={practiceUrl}>
          <Button size="sm" variant="outline" className="w-full gap-1.5">
            Start Practice
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default SmartScenarioSuggestions;
