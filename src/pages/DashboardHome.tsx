import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Coins, HelpCircle, MessageCircle, Zap, CalendarDays } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useActivitySnapshot } from '@/hooks/useActivitySnapshot';
import CreditExpirationWarning from '@/components/dashboard/CreditExpirationWarning';
import AssistantGreeting from '@/components/dashboard/AssistantGreeting';
import ActivitySnapshot from '@/components/dashboard/ActivitySnapshot';
import StrategyFeed from '@/components/dashboard/StrategyFeed';
import InsightCards from '@/components/dashboard/InsightCards';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DashboardHome = () => {
  const { user } = useUser();
  const { credits, loading, refetch, usedThisMonth, getTotalCredits, getUsagePercentage } = useUserCredits();
  const { metrics: usageMetrics, loading: usageLoading, refetch: refetchUsage } = useUsageTracking();
  const activity = useActivitySnapshot();
  const [creditUpdateAnimation, setCreditUpdateAnimation] = useState(false);
  const [previousCredits, setPreviousCredits] = useState(credits);
  const [searchParams] = useSearchParams();

  const isMainAdmin = user?.role === 'admin';

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

  const getRemainingPercentage = () => 100 - getUsagePercentage();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Zone 1 — Assistant Header */}
      <AssistantGreeting postsScheduled={activity.postsScheduled} />

      {/* Credit bar for admins */}
      {isMainAdmin && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Card className={cn(
            "flex-1 w-full bg-card border-border/60 transition-all duration-300",
            creditUpdateAnimation && "ring-2 ring-primary/30 scale-[1.01]"
          )}>
            <CardContent className="flex items-center gap-5 p-5">
              <div className="shrink-0 rounded-lg bg-secondary p-2.5 text-primary">
                <Coins className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">Credits</span>
                  <span className={cn(
                    "font-bold text-lg text-foreground transition-all",
                    creditUpdateAnimation && "scale-110"
                  )}>
                    {credits.toLocaleString()}
                    {creditUpdateAnimation && <Zap size={14} className="inline ml-1 text-chart-4 animate-pulse" />}
                  </span>
                </div>
                <Progress value={getRemainingPercentage()} className="h-1.5 bg-secondary [&>div]:bg-primary" />
                <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                  <span>Used: {usedThisMonth.toLocaleString()}</span>
                  <span>{getUsagePercentage()}% used</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => window.location.href = '/stripe-payment'}>
                  Buy Credits
                </Button>
                <Button variant="outline" size="sm" onClick={() => { refetch(); refetchUsage(); }} disabled={loading || usageLoading}>
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isMainAdmin && <CreditExpirationWarning />}

      {/* Zone 2 — Strategy Feed */}
      <StrategyFeed />

      {/* CareGrowth Insights */}
      <InsightCards />

      {/* Zone 3 — Activity Snapshot */}
      <ActivitySnapshot
        postsScheduled={activity.postsScheduled}
        postsPublished={activity.postsPublished}
        platformsConnected={activity.platformsConnected}
        documentsUploaded={activity.documentsUploaded}
        loading={activity.loading}
      />

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-foreground mb-4">AI Solutions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10H9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 10H17L15 13.5H17V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 10H13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <CardTitle className="text-base">Nora</CardTitle>
            <CardDescription>Generate posts that drive client engagement</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/dashboard/social-media">
              <Button className="w-full" size="sm">Create Your Next Post</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary mb-3">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Content Calendar</CardTitle>
            <CardDescription>Plan, schedule, and auto-publish content</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/dashboard/content-calendar">
              <Button className="w-full" size="sm">Open Calendar</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary mb-3">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Jared</CardTitle>
            <CardDescription>Instant answers to client and team questions</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/dashboard/qa-assistant">
              <Button className="w-full" size="sm">Answer Questions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
