import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, TrendingDown, AlertTriangle, Eye } from 'lucide-react';
import { usePredictiveAlerts } from '@/hooks/usePredictiveAlerts';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ReactNode> = {
  predictive_visibility: <Eye className="h-4 w-4" />,
  predictive_engagement: <TrendingDown className="h-4 w-4" />,
  predictive_conversion: <AlertTriangle className="h-4 w-4" />,
  predictive_momentum: <TrendingDown className="h-4 w-4" />,
};

const severityStyles = {
  high: 'border-red-500/30 bg-red-500/5',
  medium: 'border-amber-500/30 bg-amber-500/5',
  low: 'border-muted',
};

const iconStyles = {
  high: 'text-red-400 bg-red-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low: 'text-muted-foreground bg-muted/50',
};

export default function PredictiveAlerts() {
  const { alerts, loading, dismiss } = usePredictiveAlerts();

  if (loading || alerts.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium tracking-[0.2em] uppercase text-muted-foreground/50">
        Early warnings
      </h3>
      <div className="space-y-2">
        {alerts.map(alert => (
          <Card key={alert.id} className={cn('border', severityStyles[alert.severity])}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', iconStyles[alert.severity])}>
                {iconMap[alert.type] ?? <AlertTriangle className="h-4 w-4" />}
              </div>
              <p className="text-sm text-foreground/80 flex-1">{alert.message}</p>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={alert.action_path}>
                  <Button size="sm" variant="outline" className="text-xs">
                    {alert.action_label}
                  </Button>
                </Link>
                <button
                  onClick={() => dismiss(alert.id)}
                  className="p-1 rounded hover:bg-muted/50 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
