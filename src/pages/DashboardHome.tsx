
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Coins, HelpCircle, FileText, MessageCircle, Zap } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import CreditExpirationWarning from '@/components/dashboard/CreditExpirationWarning';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DashboardHome = () => {
  const { user } = useUser();
  const { credits, loading, refetch, usedThisMonth, getTotalCredits, getUsagePercentage } = useUserCredits();
  const { metrics: usageMetrics, loading: usageLoading, refetch: refetchUsage } = useUsageTracking();
  const [creditUpdateAnimation, setCreditUpdateAnimation] = useState(false);
  const [previousCredits, setPreviousCredits] = useState(credits);
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isMainAdmin = user?.role === 'admin';

  // Add effect to refetch credits when component mounts
  useEffect(() => {
    refetch();
    refetchUsage();
  }, []);

  // Add animation effect when credits change
  useEffect(() => {
    if (credits !== previousCredits && !loading) {
      setCreditUpdateAnimation(true);
      setPreviousCredits(credits);
      
      // Remove animation after 2 seconds
      const timer = setTimeout(() => {
        setCreditUpdateAnimation(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [credits, previousCredits, loading]);

  // Add debugging
  useEffect(() => {
    console.log('Dashboard - User:', user);
    console.log('Dashboard - Credits:', credits);
    console.log('Dashboard - Loading:', loading);
    console.log('Dashboard - Usage Metrics:', usageMetrics);
    console.log('Dashboard - Usage Loading:', usageLoading);
  }, [user, credits, loading, usageMetrics, usageLoading]);

  // Handle payment success from Stripe redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {
      console.log('Payment success detected, confirming with session ID:', sessionId);
      
      const confirmPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('confirm-payment', {
            body: { session_id: sessionId }
          });
          
          if (error) throw error;
          
          if (data?.success) {
            console.log('Payment confirmed successfully');
            toast.success('Payment confirmed! Your credits have been added to your account.');
            refetch(); // Refresh credits
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Payment confirmation failed:', error);
        }
      };
      
      confirmPayment();
    }
  }, [refetch]);

  // Calculate remaining percentage (inverted logic)
  const getRemainingPercentage = () => {
    return 100 - getUsagePercentage();
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to CareGrowth Assistant</h1>
          <p className="text-gray-600 mt-2">Your AI-powered agency growth assistant</p>
        </div>
        
        {/* Credit Balance Module - Only show for main admins */}
        {isMainAdmin && (
          <Card className={cn(
            "w-64 bg-gradient-to-br from-caregrowth-lightblue to-white border-caregrowth-blue transition-all duration-300",
            creditUpdateAnimation && "ring-2 ring-blue-400 ring-opacity-50 scale-[1.02]"
          )}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Coins className="mr-2 h-5 w-5 text-caregrowth-blue" />
                  Credit Balance
                  {creditUpdateAnimation && (
                    <Zap size={16} className="ml-2 text-yellow-500 animate-pulse" />
                  )}
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent className="w-80 p-2">
                      <p>Credits power all AI features. Each generation consumes credits from your agency wallet.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Available Credits</span>
                <span className={cn(
                  "font-bold text-xl transition-all duration-300",
                  creditUpdateAnimation && "scale-110 text-gray-600"
                )}>
                  {credits.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4 text-xs text-gray-500">
                <span>Used this month: {usedThisMonth.toLocaleString()}</span>
                <span>{getUsagePercentage()}%</span>
              </div>
              <Progress value={getRemainingPercentage()} className="h-2 mb-4 bg-gray-100 [&>div]:bg-caregrowth-blue" />
              <div className="flex gap-2">
                <a href="https://buy.stripe.com/your-stripe-link" target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button className="w-full bg-caregrowth-blue hover:bg-caregrowth-blue/90 transition-all duration-200">
                    Buy More Credits
                  </Button>
                </a>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    refetch();
                    refetchUsage();
                  }}
                  disabled={loading || usageLoading}
                >
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Credit Expiration Warning */}
      {isMainAdmin && <CreditExpirationWarning />}


      <h2 className="text-2xl font-semibold mb-6">AI Solutions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="transition-transform duration-200 hover:scale-[1.02] hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-caregrowth-lightblue mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-caregrowth-blue">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10H9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 10H17L15 13.5H17V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 10H13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <CardTitle>Nora</CardTitle>
            <CardDescription>Generate engaging posts that drive client engagement and growth</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/social-media">
              <Button className="w-full bg-caregrowth-blue hover:bg-caregrowth-blue/90 transition-all duration-200">
                Create Your Next Post
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-transform duration-200 hover:scale-[1.02] hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-caregrowth-lightgreen mb-4">
              <FileText className="h-6 w-6 text-caregrowth-green" />
            </div>
            <CardTitle>Indexa</CardTitle>
            <CardDescription>Extract insights and analyze data from your agency documents</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/document-search">
              <Button className="w-full bg-caregrowth-green hover:bg-caregrowth-green/90 transition-all duration-200">
                Analyze Documents
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-transform duration-200 hover:scale-[1.02] hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-caregrowth-lightblue mb-4">
              <MessageCircle className="h-6 w-6 text-caregrowth-blue" />
            </div>
            <CardTitle>Jared</CardTitle>
            <CardDescription>Get instant, accurate answers to client and team questions</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/qa-assistant">
              <Button className="w-full bg-caregrowth-blue hover:bg-caregrowth-blue/90 transition-all duration-200">
                Answer Questions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
