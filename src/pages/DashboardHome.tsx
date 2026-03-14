import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Compass, Eye, MessageCircle, Dumbbell, BarChart3,
  ArrowRight, CalendarOff, MessageSquareWarning, Activity, Settings2,
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useActivitySnapshot } from '@/hooks/useActivitySnapshot';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Signal types & priority engine                                     */
/* ------------------------------------------------------------------ */
interface Signal {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
  priority: number; // higher = more important
}

function useAgencySignals() {
  const activity = useActivitySnapshot();
  const [setupComplete, setSetupComplete] = useState<number>(100);

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) return;
        const { data: profile } = await supabase
          .from('agency_profiles')
          .select('agency_name, service_area, services_offered, caregiving_focus, tone_preference')
          .limit(1)
          .maybeSingle();
        if (!profile) { setSetupComplete(0); return; }
        const fields = [profile.agency_name, profile.service_area, profile.services_offered?.length, profile.caregiving_focus?.length, profile.tone_preference];
        setSetupComplete(Math.round((fields.filter(Boolean).length / fields.length) * 100));
      } catch { /* silent */ }
    })();
  }, []);

  const signals = useMemo<Signal[]>(() => {
    const pool: Signal[] = [];

    if (activity.postsScheduled === 0) {
      pool.push({
        id: 'no-posts',
        icon: CalendarOff,
        title: 'No posts scheduled',
        description: 'Your content calendar is empty this week. Generate posts to stay visible to families searching for care.',
        actionLabel: 'Generate Posts',
        actionPath: '/dashboard/content-calendar',
        priority: 90,
      });
    }

    if (setupComplete < 80) {
      pool.push({
        id: 'setup-incomplete',
        icon: Settings2,
        title: 'Agency setup incomplete',
        description: `Your agency profile is ${setupComplete}% complete. Finish setup so CareGrowth can tailor guidance to your services.`,
        actionLabel: 'Complete Setup',
        actionPath: '/dashboard/agency-setup',
        priority: setupComplete < 30 ? 95 : 70,
      });
    }

    // Always-available lower-priority signals
    pool.push({
      id: 'practice-reminder',
      icon: Dumbbell,
      title: 'Practice Gym reminder',
      description: 'Sharpen your intake skills with a quick role-play scenario. Consistent practice builds confidence.',
      actionLabel: 'Start Practice',
      actionPath: '/dashboard/training-practice',
      priority: 40,
    });

    pool.push({
      id: 'engagement-detected',
      icon: MessageSquareWarning,
      title: 'Check for engagement signals',
      description: 'Review comments and inquiries on your published posts. Responding quickly builds trust with families.',
      actionLabel: 'View Activity',
      actionPath: '/dashboard/content-calendar',
      priority: activity.postsPublished > 0 ? 60 : 20,
    });

    pool.push({
      id: 'insights-available',
      icon: Activity,
      title: 'New insights available',
      description: 'Review seasonal tips and content performance data to refine your outreach strategy.',
      actionLabel: 'View Insights',
      actionPath: '/dashboard/settings',
      priority: 30,
    });

    return pool.sort((a, b) => b.priority - a.priority).slice(0, 3);
  }, [activity, setupComplete]);

  return { signals, loading: activity.loading };
}

/* ------------------------------------------------------------------ */
/*  Team assistant definitions                                         */
/* ------------------------------------------------------------------ */
interface Assistant {
  name: string;
  role: string;
  icon: React.ElementType;
  path: string;
  statusLabel: string;
  statusValue: string | number;
}

function useTeamAssistants(): Assistant[] {
  const activity = useActivitySnapshot();

  return useMemo<Assistant[]>(() => [
    {
      name: 'Compass',
      role: 'Agency Setup',
      icon: Compass,
      path: '/dashboard/agency-setup',
      statusLabel: 'Profile',
      statusValue: 'Configure',
    },
    {
      name: 'Nora',
      role: 'Visibility & Content',
      icon: Eye,
      path: '/dashboard/content-calendar',
      statusLabel: activity.postsNeedsApproval > 0 ? 'Awaiting' : 'Scheduled',
      statusValue: activity.postsNeedsApproval > 0
        ? `${activity.postsNeedsApproval} posts waiting for approval`
        : `${activity.postsScheduled} posts`,
    },
    {
      name: 'Jared',
      role: 'Knowledge Assistant',
      icon: MessageCircle,
      path: '/dashboard/qa-assistant',
      statusLabel: 'Ready',
      statusValue: 'Ask anything',
    },
    {
      name: 'Coach',
      role: 'Practice Gym',
      icon: Dumbbell,
      path: '/dashboard/training-practice',
      statusLabel: 'Sessions',
      statusValue: 'Start training',
    },
    {
      name: 'Pulse',
      role: 'Insights & Analytics',
      icon: BarChart3,
      path: '/dashboard/settings',
      statusLabel: 'Status',
      statusValue: 'View insights',
    },
  ], [activity.postsScheduled]);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const DashboardHome = () => {
  const { user } = useUser();
  const { refetch } = useUserCredits();
  const [searchParams] = useSearchParams();
  const { signals, loading: signalsLoading } = useAgencySignals();
  const team = useTeamAssistants();

  const firstName = user?.full_name?.split(' ')[0] ?? '';
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  // Handle Stripe redirect
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      toast.success('Payment successful! Your subscription is now active.');
      refetch();
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]session_id=[^&]*/, '').replace(/^&/, '?');
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, refetch]);

  // Handle payment success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    if (paymentStatus === 'success' && sessionId) {
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke('confirm-payment', { body: { session_id: sessionId } });
          if (error) throw error;
          if (data?.success) {
            toast.success('Payment confirmed! Credits added to your account.');
            refetch();
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {
          console.error('Payment confirmation failed:', e);
        }
      })();
    }
  }, [refetch]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-12">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-white/90 tracking-tight">
          Good {timeOfDay}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-white/35">
          Here's what needs your attention today.
        </p>
      </div>

      {/* ── Section 1: Agency Pulse ── */}
      <section>
        <h2 className="text-[11px] font-medium tracking-[0.25em] uppercase text-white/25 mb-4">
          Agency Pulse
        </h2>

        {signalsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-white/[0.02] border-white/[0.06] rounded-none animate-pulse h-44" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {signals.map(signal => (
              <Card
                key={signal.id}
                className="bg-white/[0.02] border-white/[0.06] rounded-none hover:bg-white/[0.04] transition-colors"
              >
                <CardContent className="p-5 flex flex-col gap-3 h-full">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-none bg-caregrowth-green/10 border border-caregrowth-green/20">
                      <signal.icon className="h-4 w-4 text-caregrowth-green" />
                    </div>
                    <span className="text-sm font-medium text-white/80">{signal.title}</span>
                  </div>
                  <p className="text-xs text-white/30 leading-relaxed flex-1">
                    {signal.description}
                  </p>
                  <Link to={signal.actionPath}>
                    <Button
                      size="sm"
                      className="w-full gap-1.5 bg-caregrowth-green/15 hover:bg-caregrowth-green/25 text-caregrowth-green border border-caregrowth-green/20 rounded-none text-[11px] tracking-wider uppercase"
                    >
                      {signal.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Your CareGrowth Team ── */}
      <section>
        <h2 className="text-[11px] font-medium tracking-[0.25em] uppercase text-white/25 mb-4">
          Your CareGrowth Team
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {team.map(assistant => (
            <Link key={assistant.name} to={assistant.path} className="group">
              <Card className="bg-white/[0.02] border-white/[0.06] rounded-none hover:bg-white/[0.04] hover:border-caregrowth-green/20 transition-all h-full">
                <CardContent className="p-5 flex flex-col items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-none bg-white/[0.04] border border-white/[0.08] group-hover:bg-caregrowth-green/10 group-hover:border-caregrowth-green/20 transition-colors">
                    <assistant.icon className="h-4.5 w-4.5 text-white/50 group-hover:text-caregrowth-green transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white/80">{assistant.name}</h3>
                    <p className="text-[11px] text-white/30 mt-0.5">{assistant.role}</p>
                  </div>
                  <div className="mt-auto pt-2 border-t border-white/[0.04] w-full">
                    <span className="text-[10px] tracking-wider uppercase text-white/20">{assistant.statusLabel}</span>
                    <p className="text-xs text-white/50 mt-0.5">{assistant.statusValue}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardHome;
