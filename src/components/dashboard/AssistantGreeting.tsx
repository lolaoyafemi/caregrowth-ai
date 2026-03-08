import React, { useMemo } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Sparkles } from 'lucide-react';

interface Props {
  postsScheduled: number;
  nextPostDate?: string;
}

const AssistantGreeting: React.FC<Props> = ({ postsScheduled, nextPostDate }) => {
  const { user } = useUser();
  const firstName = user?.full_name?.split(' ')[0] ?? '';

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const greeting = useMemo(() => {
    // Pick a contextual sub-message
    if (postsScheduled === 0) {
      return {
        main: `Good ${timeOfDay}${firstName ? `, ${firstName}` : ''}`,
        sub: 'Your calendar is getting quiet. Want to schedule some posts?',
      };
    }
    if (nextPostDate) {
      const date = new Date(nextPostDate);
      const isToday = date.toDateString() === new Date().toDateString();
      const isTomorrow =
        date.toDateString() === new Date(Date.now() + 86400000).toDateString();
      const label = isToday ? 'today' : isTomorrow ? 'tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        main: `Good ${timeOfDay}${firstName ? `, ${firstName}` : ''}`,
        sub: `Your next post goes live ${label}.`,
      };
    }
    return {
      main: `I've missed you${firstName ? `, ${firstName}` : ''}`,
      sub: "Let's create momentum in your business today.",
    };
  }, [timeOfDay, firstName, postsScheduled, nextPostDate]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent border border-border/60 p-8 mb-8">
      <div className="absolute top-4 right-4 opacity-10">
        <Sparkles className="h-24 w-24 text-primary" />
      </div>
      <div className="relative z-10">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {greeting.main}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-xl">
          {greeting.sub}
        </p>
      </div>
    </div>
  );
};

export default AssistantGreeting;
