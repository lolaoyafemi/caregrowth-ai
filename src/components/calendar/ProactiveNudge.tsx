import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useProactiveNudge } from '@/hooks/useProactiveNudge';
import { cn } from '@/lib/utils';

interface ProactiveNudgeProps {
  onGenerate?: () => void;
  onConnect?: () => void;
  onSubscribe?: () => void;
}

const ProactiveNudge = ({ onGenerate, onConnect, onSubscribe }: ProactiveNudgeProps) => {
  const { nudge, loading, dismiss } = useProactiveNudge();

  if (loading || !nudge) return null;

  const handleCta = () => {
    switch (nudge.action) {
      case 'generate':
        onGenerate?.();
        break;
      case 'connect':
      case 'refresh':
        onConnect?.();
        break;
      case 'subscribe':
        onSubscribe?.();
        break;
    }
  };

  const typeStyles: Record<string, string> = {
    calendar_gap: 'border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20',
    best_performer: 'border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20',
    format_balance: 'border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20',
    connection_health: 'border-orange-200 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-950/20',
    seasonal: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20',
  };

  return (
    <Card className={cn(
      'border transition-all animate-in fade-in slide-in-from-top-2 duration-500',
      typeStyles[nudge.type] || 'border-muted'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0 mt-0.5">{nudge.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-relaxed">{nudge.message}</p>
            {nudge.cta && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2.5 text-xs"
                onClick={handleCta}
              >
                {nudge.cta}
              </Button>
            )}
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1 rounded-md hover:bg-muted/50"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProactiveNudge;
