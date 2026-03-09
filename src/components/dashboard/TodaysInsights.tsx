import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Lightbulb, Dumbbell, HeartPulse, TrendingUp, Pen, CalendarDays,
} from 'lucide-react';
import { useContentInsights } from '@/hooks/useContentInsights';
import { Skeleton } from '@/components/ui/skeleton';

/* ------------------------------------------------------------------ */
/*  Static seasonal insights (Family Pulse lite)                       */
/* ------------------------------------------------------------------ */
interface QuickInsight {
  id: string;
  icon: React.ElementType;
  label: string;
  text: string;
  actionLabel: string;
  actionPath: string;
  color: string;
}

function useSeasonalInsights(): QuickInsight[] {
  return useMemo(() => {
    const month = new Date().getMonth();

    const pool: (QuickInsight & { peak: number[] })[] = [
      {
        id: 'hospital',
        icon: HeartPulse,
        label: 'Family Care Trend',
        text: 'Families are searching for help with hospital discharge transitions. A post on this topic could reach new clients.',
        actionLabel: 'Create a Post',
        actionPath: '/dashboard/social-media?pulse=' + encodeURIComponent('Create a post about supporting families during hospital-to-home transitions.'),
        color: 'border-l-chart-1',
        peak: [0, 1, 10, 11],
      },
      {
        id: 'dementia',
        icon: HeartPulse,
        label: 'Family Care Trend',
        text: 'Nighttime wandering is one of the top reasons families look for professional in-home care. Consider sharing your approach.',
        actionLabel: 'Create a Post',
        actionPath: '/dashboard/social-media?pulse=' + encodeURIComponent('Create a post explaining how caregivers prevent nighttime wandering risks.'),
        color: 'border-l-chart-2',
        peak: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
      {
        id: 'burnout',
        icon: HeartPulse,
        label: 'Family Care Trend',
        text: 'Caregiver burnout peaks in spring. A post about respite care could resonate with families right now.',
        actionLabel: 'Create a Post',
        actionPath: '/dashboard/social-media?pulse=' + encodeURIComponent('Create a post about recognizing caregiver burnout and how respite care helps.'),
        color: 'border-l-chart-3',
        peak: [2, 3, 4, 5],
      },
      {
        id: 'training-reminder',
        icon: Dumbbell,
        label: 'Training Reminder',
        text: 'Practicing intake conversations helps your team convert more inquiries. Try a quick scenario this week.',
        actionLabel: 'Practice Now',
        actionPath: '/dashboard/training-practice',
        color: 'border-l-chart-4',
        peak: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
      {
        id: 'fall-prevention',
        icon: HeartPulse,
        label: 'Seasonal Opportunity',
        text: 'Falls are the leading cause of injury in older adults. Share practical prevention tips families can use at home.',
        actionLabel: 'Create a Post',
        actionPath: '/dashboard/social-media?pulse=' + encodeURIComponent('Create a post with practical fall-prevention tips for families.'),
        color: 'border-l-chart-5',
        peak: [5, 6, 7, 8],
      },
    ];

    const scored = pool.map((item) => ({
      ...item,
      relevance: item.peak.includes(month) ? 2 : 1,
    }));
    scored.sort((a, b) => b.relevance - a.relevance);
    return scored.slice(0, 3);
  }, []);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const TodaysInsights: React.FC = () => {
  const seasonal = useSeasonalInsights();
  const { insights: contentInsights, loading } = useContentInsights();

  // Merge content insights into a simple format
  const contentCards = useMemo(() => {
    return contentInsights.slice(0, 2).map((ci) => ({
      id: ci.id,
      icon: TrendingUp,
      label: 'Content Opportunity',
      text: `${ci.headline} — ${ci.detail}`,
      actionLabel: 'Explore',
      actionPath: '/dashboard/social-media',
      color: 'border-l-primary',
    }));
  }, [contentInsights]);

  const allCards = [...seasonal, ...contentCards].slice(0, 5);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Today's Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (allCards.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Today's Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.id} className={`border-l-4 ${card.color} hover:shadow-md transition-shadow`}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-medium text-primary">{card.label}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {card.text}
                </p>
                <Link to={card.actionPath}>
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    {card.actionLabel}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TodaysInsights;
