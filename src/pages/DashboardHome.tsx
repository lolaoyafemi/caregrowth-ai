import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import {
  Building2, Eye, MessageCircle, ArrowRight,
  CalendarDays, FileText, Sparkles, Coins, Zap,
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useActivitySnapshot } from '@/hooks/useActivitySnapshot';
import CreditExpirationWarning from '@/components/dashboard/CreditExpirationWarning';
import AgencyHealthScore from '@/components/dashboard/AgencyHealthScore';
import TodaysInsights from '@/components/dashboard/TodaysInsights';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Setup completion helper                                            */
/* ------------------------------------------------------------------ */
function useSetupCompletion() {
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);

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

        if (!profile) { setCompletion(0); return; }

        const fields = [
          profile.agency_name,
          profile.service_area,
          profile.services_offered?.length,
          profile.caregiving_focus?.length,
          profile.tone_preference,
        ];
        const filled = fields.filter(Boolean).length;
        setCompletion(Math.round((filled / fields.length) * 100));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { completion, loading };
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const DashboardHome = () => {
  const { user } = useUser();
  const { credits, loading, refetch, usedThisMonth, getUsagePercentage } = useUserCredits();
  const { metrics: usageMetrics, loading: usageLoading, refetch: refetchUsage } = useUsageTracking();
  const activity = useActivitySnapshot();
  const setup = useSetupCompletion();
  const [creditUpdateAnimation, setCreditUpdateAnimation] = useState(false);
  const [previousCredits, setPreviousCredits] = useState(credits);
  const [searchParams] = useSearchParams();

  const isMainAdmin = user?.role === 'admin';
  const firstName = user?.full_name?.split(' ')[0] ?? '';
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  useEffect(() => { refetch(); refetchUsage(); }, []);

  // Handle Stripe redirect
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      toast.success('Payment successful! Your subscription is now active.');
      refetch(); refetchUsage();
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]session_id=[^&]*/, '').replace(/^&/, '?');
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, refetch, refetchUsage]);

  // Credit animation
  useEffect(() => {
    if (credits !== previousCredits && !loading) {
      setCreditUpdateAnimation(true);
      setPreviousCredits(credits);
      const timer = setTimeout(() => setCreditUpdateAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [credits, previousCredits, loading]);

  // Handle payment success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    if (paymentStatus === 'success' && sessionId) {
      const confirmPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('confirm-payment', { body: { session_id: sessionId } });
          if (error) throw error;
          if (data?.success) {
            toast.success('Payment confirmed! Your credits have been added to your account.');
            refetch();
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Payment confirmation failed:', error);
        }
      };
      confirmPayment();
    }
  }, [refetch]);

  const examplePrompts = [
    'How should I respond to a family asking about dementia care?',
    'What content should I post this week?',
    'How do I handle hospital discharge inquiries?',
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Agency Health Score */}
      <AgencyHealthScore />

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white/90 tracking-tight">
          Good {timeOfDay}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-white/40 text-lg">
          Your Agency Command Center. Everything you need to grow your home care agency in one place.
        </p>
      </div>

      {/* Credit bar for admins */}
      {isMainAdmin && (
        <Card className={cn(
          "mb-6 bg-white/[0.03] border-white/[0.06] transition-all duration-300",
          creditUpdateAnimation && "ring-1 ring-caregrowth-green/30 scale-[1.01]"
        )}>
          <CardContent className="flex items-center gap-5 p-5">
            <div className="shrink-0 rounded-none bg-caregrowth-green/10 p-2.5 text-caregrowth-green">
              <Coins className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white/60 tracking-wide">Credits</span>
                <span className={cn(
                  "font-bold text-lg text-white/90 transition-all",
                  creditUpdateAnimation && "scale-110"
                )}>
                  {credits.toLocaleString()}
                  {creditUpdateAnimation && <Zap size={14} className="inline ml-1 text-caregrowth-green animate-pulse" />}
                </span>
              </div>
              <Progress value={100 - getUsagePercentage()} className="h-1 bg-white/[0.06] [&>div]:bg-caregrowth-green/60" />
              <div className="flex items-center justify-between mt-1 text-xs text-white/30">
                <span>Used: {usedThisMonth.toLocaleString()}</span>
                <span>{getUsagePercentage()}% used</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" className="bg-caregrowth-green/20 hover:bg-caregrowth-green/30 text-caregrowth-green border border-caregrowth-green/20 rounded-none text-[11px] tracking-wider uppercase" onClick={() => window.location.href = '/stripe-payment'}>
                Buy Credits
              </Button>
              <Button variant="outline" size="sm" className="border-white/10 text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-none text-[11px] tracking-wider uppercase" onClick={() => { refetch(); refetchUsage(); }} disabled={loading || usageLoading}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isMainAdmin && <CreditExpirationWarning />}

      {/* Three Pillar Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 mb-10">

        {/* 1. Agency Setup */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-none hover:bg-white/[0.04] transition-all flex flex-col lg:border-r">
          <CardContent className="p-6 flex flex-col flex-1 gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-none bg-caregrowth-green/10 border border-caregrowth-green/20">
              <Building2 className="h-5 w-5 text-caregrowth-green" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white/80 mb-1.5">
                Build Your Agency Foundation
              </h3>
              <p className="text-sm text-white/35 leading-relaxed">
                Complete your agency profile and onboarding so CareGrowth can generate guidance and content tailored to your services.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-white/30 mb-1.5">
                <span className="tracking-wider uppercase text-[10px]">Onboarding progress</span>
                <span className="font-medium text-white/60">{setup.completion}%</span>
              </div>
              <Progress value={setup.completion} className="h-1 bg-white/[0.06] [&>div]:bg-caregrowth-green/60" />
            </div>

            <div className="flex flex-col gap-2 text-xs text-white/30">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Complete agency profile
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Upload agency documents
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Continue onboarding training
              </span>
            </div>

            <Link to="/dashboard/agency-setup" className="mt-auto">
              <Button className="w-full gap-1.5 bg-caregrowth-green/15 hover:bg-caregrowth-green/25 text-caregrowth-green border border-caregrowth-green/20 rounded-none text-[11px] tracking-wider uppercase" size="sm">
                Continue Setup <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 2. Family Visibility Engine */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-none hover:bg-white/[0.04] transition-all flex flex-col lg:border-r">
          <CardContent className="p-6 flex flex-col flex-1 gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-none bg-caregrowth-green/10 border border-caregrowth-green/20">
              <Eye className="h-5 w-5 text-caregrowth-green" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white/80 mb-1.5">
                Stay Visible to Families Searching for Care
              </h3>
              <p className="text-sm text-white/35 leading-relaxed">
                Generate and schedule helpful posts that show families how your agency can support them.
              </p>
            </div>

            <div className="rounded-none bg-white/[0.03] border border-white/[0.06] p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/30">Posts scheduled this week</span>
                <span className="font-medium text-white/70">{activity.postsScheduled}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30">Posts published</span>
                <span className="font-medium text-white/70">{activity.postsPublished}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <Link to="/dashboard/social-media" className="flex-1">
                <Button className="w-full bg-caregrowth-green/15 hover:bg-caregrowth-green/25 text-caregrowth-green border border-caregrowth-green/20 rounded-none text-[11px] tracking-wider uppercase" size="sm">Generate Posts</Button>
              </Link>
              <Link to="/dashboard/content-calendar" className="flex-1">
                <Button variant="outline" className="w-full gap-1 border-white/10 text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-none text-[11px] tracking-wider uppercase" size="sm">
                  <CalendarDays className="h-3.5 w-3.5" /> Calendar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 3. Ask Jared */}
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-none hover:bg-white/[0.04] transition-all flex flex-col">
          <CardContent className="p-6 flex flex-col flex-1 gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-none bg-caregrowth-green/10 border border-caregrowth-green/20">
              <MessageCircle className="h-5 w-5 text-caregrowth-green" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white/80 mb-1.5">
                Ask Jared
              </h3>
              <p className="text-sm text-white/35 leading-relaxed">
                Your home care assistant trained on agency knowledge and documents.
              </p>
            </div>

            <div className="space-y-2">
              {examplePrompts.map((prompt, i) => (
                <Link
                  key={i}
                  to={`/dashboard/qa-assistant?q=${encodeURIComponent(prompt)}`}
                  className="block rounded-none bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-xs text-white/35 hover:bg-white/[0.06] hover:text-white/50 transition-colors leading-relaxed"
                >
                  "{prompt}"
                </Link>
              ))}
            </div>

            <Link to="/dashboard/qa-assistant" className="mt-auto">
              <Button className="w-full gap-1.5 bg-caregrowth-green/15 hover:bg-caregrowth-green/25 text-caregrowth-green border border-caregrowth-green/20 rounded-none text-[11px] tracking-wider uppercase" size="sm">
                Start Conversation <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Today's Insights */}
      <TodaysInsights />
    </div>
  );
};

export default DashboardHome;
