import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useInterventions } from '@/hooks/useInterventions';

export default function InterventionsSection() {
  const { interventions, loading, dismiss } = useInterventions();

  if (loading || interventions.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium tracking-[0.2em] uppercase text-muted-foreground/50">
        Needs attention
      </h3>
      <div className="space-y-2">
        {interventions.map(item => (
          <Card key={item.id} className="border border-border/50 bg-card/80">
            <CardContent className="p-4 flex items-center gap-4">
              <p className="text-sm text-foreground/80 flex-1">{item.message}</p>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={item.action_path}>
                  <Button size="sm" variant="outline" className="text-xs">
                    {item.action_label}
                  </Button>
                </Link>
                <button
                  onClick={() => dismiss(item.id)}
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
