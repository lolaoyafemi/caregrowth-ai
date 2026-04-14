import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Eye } from 'lucide-react';
import { useVisibilityStatus } from '@/hooks/useVisibilityStatus';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const config = {
  good: {
    icon: Shield,
    accent: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
    iconBg: 'bg-emerald-500/10',
  },
  warning: {
    icon: AlertTriangle,
    accent: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    iconBg: 'bg-amber-500/10',
  },
  risk: {
    icon: Eye,
    accent: 'text-red-400',
    border: 'border-red-500/20',
    bg: 'bg-red-500/5',
    iconBg: 'bg-red-500/10',
  },
} as const;

export default function StatusCard() {
  const status = useVisibilityStatus();
  const c = config[status.level];
  const Icon = c.icon;

  if (status.loading) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  return (
    <Card className={cn('border rounded-lg', c.border, c.bg)}>
      <CardContent className="p-6 flex items-start gap-4">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', c.iconBg)}>
          <Icon className={cn('h-5 w-5', c.accent)} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h2 className={cn('text-base font-medium', c.accent)}>
            {status.headline}
          </h2>
          <p className="text-sm text-muted-foreground">
            {status.detail}
          </p>
        </div>
        {status.level === 'risk' && (
          <Link to="/dashboard/content-calendar">
            <Button size="sm" variant="destructive" className="shrink-0 text-xs">
              Fix visibility now
            </Button>
          </Link>
        )}
        {status.level === 'warning' && (
          <Link to="/dashboard/content-calendar">
            <Button size="sm" variant="outline" className="shrink-0 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
              Generate 7 days
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
