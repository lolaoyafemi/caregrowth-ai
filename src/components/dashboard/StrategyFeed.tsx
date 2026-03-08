import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useStrategyFeed } from '@/hooks/useStrategyFeed';

const StrategyFeed = () => {
  const { cards, loading } = useStrategyFeed();

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Today's Opportunities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Today's Opportunities</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(card => (
          <Card
            key={card.id}
            className="border-l-4 border-l-primary/60 bg-card hover:shadow-md transition-shadow duration-200"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5 shrink-0">{card.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground leading-snug mb-1">
                    {card.insight}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {card.reason}
                  </p>
                  <Link to={card.ctaLink}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-primary border-primary/30 hover:bg-primary/10"
                    >
                      {card.ctaLabel}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StrategyFeed;
