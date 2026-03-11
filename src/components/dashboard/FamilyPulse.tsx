import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  HeartPulse,
  Hospital,
  Brain,
  Flame,
  Leaf,
  ShieldAlert,
  Pen,
  Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Insight data — seasonally rotated, human-first language            */
/* ------------------------------------------------------------------ */

interface PulseInsight {
  id: string;
  icon: React.ElementType;
  situation: string;
  explanation: string;
  postPrompt: string;
  practiceCategory: string;
  /** months (0-indexed) when this insight is most relevant */
  peak: number[];
  color: string;
}

const ALL_INSIGHTS: PulseInsight[] = [
  {
    id: 'hospital-discharge',
    icon: Hospital,
    situation: 'Hospital discharge transitions',
    explanation:
      'Families feel overwhelmed when a loved one is sent home from the hospital with little notice. They worry about managing medications, mobility, and follow-up care alone.',
    postPrompt: 'Create a post explaining how your agency supports families during hospital-to-home transitions.',
    practiceCategory: 'Hospital Discharge',
    peak: [0, 1, 10, 11],
    color: 'border-chart-1/40 bg-chart-1/5',
  },
  {
    id: 'dementia-wandering',
    icon: Brain,
    situation: 'Nighttime wandering in dementia care',
    explanation:
      'Many families worry about a parent or spouse wandering at night. This is one of the most common reasons families begin searching for professional in-home care.',
    postPrompt: 'Create a post explaining how caregivers prevent nighttime wandering risks.',
    practiceCategory: 'Dementia / Memory Care',
    peak: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // year-round
    color: 'border-purple-400/40 bg-purple-50/50 dark:bg-purple-950/20',
  },
  {
    id: 'caregiver-burnout',
    icon: Flame,
    situation: 'Caregiver burnout',
    explanation:
      'Adult children caring for aging parents often reach a breaking point. They feel guilty asking for help but know they can\'t keep going alone.',
    postPrompt: 'Create a post about recognizing caregiver burnout and how respite care helps families recover.',
    practiceCategory: 'Caregiver Burnout',
    peak: [2, 3, 4, 5],
    color: 'border-chart-3/40 bg-chart-3/5',
  },
  {
    id: 'seasonal-transitions',
    icon: Leaf,
    situation: 'Seasonal care transitions',
    explanation:
      'As seasons change, so do risks for seniors — icy walkways in winter, heat exhaustion in summer, and holiday loneliness in late fall. Families look for guidance during these shifts.',
    postPrompt: 'Create a seasonal safety post that helps families prepare for upcoming weather and activity changes.',
    practiceCategory: 'Trust & Safety',
    peak: [2, 3, 9, 10],
    color: 'border-chart-4/40 bg-chart-4/5',
  },
  {
    id: 'fall-prevention',
    icon: ShieldAlert,
    situation: 'Fall prevention at home',
    explanation:
      'Falls are the leading cause of injury in older adults. Families often don\'t realize how small changes in the home can make a big difference.',
    postPrompt: 'Create a post with practical fall-prevention tips families can use right away.',
    practiceCategory: 'Trust & Safety',
    peak: [5, 6, 7, 8],
    color: 'border-chart-2/40 bg-chart-2/5',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const FamilyPulse: React.FC = () => {
  const insights = useMemo(() => {
    const month = new Date().getMonth();

    // Score each insight: peak-season match gets +2, always show at least 3
    const scored = ALL_INSIGHTS.map((insight) => ({
      ...insight,
      relevance: insight.peak.includes(month) ? 2 : 1,
    }));

    scored.sort((a, b) => b.relevance - a.relevance);
    return scored.slice(0, 3);
  }, []);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <HeartPulse className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Family Pulse</h2>
        <span className="text-xs text-muted-foreground ml-1">What families are experiencing right now</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div
              key={insight.id}
              className={cn(
                'rounded-xl border p-5 flex flex-col gap-3 transition-shadow hover:shadow-sm',
                insight.color
              )}
            >
              {/* Icon + situation */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-lg bg-secondary p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {insight.situation}
                </p>
              </div>

              {/* Explanation */}
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                {insight.explanation}
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
                <Link to={`/dashboard/content-calendar`}>
                  <Button size="sm" className="w-full gap-1.5">
                    <Pen className="h-3 w-3" />
                    Generate Post
                  </Button>
                </Link>
                <Link to={`/dashboard/training-practice?category=${encodeURIComponent(insight.practiceCategory)}`}>
                  <Button size="sm" variant="outline" className="w-full gap-1.5">
                    <Dumbbell className="h-3 w-3" />
                    Practice Scenario
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FamilyPulse;
