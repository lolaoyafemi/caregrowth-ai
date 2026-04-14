import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import StatusCard from '@/components/dashboard/StatusCard';
import PostTodayCard from '@/components/dashboard/PostTodayCard';
import ActivityFeed from '@/components/dashboard/ActivityFeedSection';
import InterventionsSection from '@/components/dashboard/InterventionsSection';
import PredictiveAlerts from '@/components/dashboard/PredictiveAlerts';

const DashboardHome = () => {
  const { user } = useUser();
  const { refetch } = useUserCredits();
  const [searchParams] = useSearchParams();

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
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
      {/* Greeting — minimal */}
      <p className="text-sm text-muted-foreground">
        Good {timeOfDay}{firstName ? `, ${firstName}` : ''}
      </p>

      {/* 1. STATUS CARD */}
      <StatusCard />

      {/* 2. POST TODAY */}
      <PostTodayCard />

      {/* 3. ACTIVITY FEED */}
      <ActivityFeed />

      {/* 4. INTERVENTIONS (only when needed) */}
      <InterventionsSection />
    </div>
  );
};

export default DashboardHome;
