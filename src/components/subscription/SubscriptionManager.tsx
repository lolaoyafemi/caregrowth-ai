import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, CreditCard, Calendar, AlertTriangle, History, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';

interface Subscription {
  id: string;
  plan_name: string;
  credits_per_cycle: number;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

const SubscriptionManager = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { transactions } = useCreditTransactions();

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user || !session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage your subscription.",
        variant: "destructive"
      });
      return;
    }

    setManagingSubscription(true);

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to open customer portal');
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      } else if (data?.fallback_url) {
        // Handle case where billing portal is not configured
        toast({
          title: "Portal Unavailable",
          description: data.message || "Please contact support to manage your subscription.",
          variant: "default"
        });
        // Optionally redirect to payment page
        window.open(data.fallback_url, '_blank');
      } else if (data?.error === "Billing portal not configured") {
        toast({
          title: "Portal Configuration Required",
          description: "The billing portal needs to be set up. Please contact support.",
          variant: "default"
        });
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: "Portal Error",
        description: error instanceof Error ? error.message : "Failed to open customer portal",
        variant: "destructive"
      });
    } finally {
      setManagingSubscription(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) return 'destructive';
    if (status === 'active') return 'default';
    if (status === 'past_due') return 'destructive';
    return 'secondary';
  };

  const getStatusText = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) return 'Canceling';
    if (status === 'active') return 'Active';
    if (status === 'past_due') return 'Past Due';
    return status.replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading subscription...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
            <p className="text-muted-foreground mb-4">
              Subscribe to get monthly credits and access to all features.
            </p>
            <Button onClick={() => window.location.href = '/stripe-payment'}>
              Subscribe Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Subscription</span>
          <Badge variant={getStatusColor(subscription.status, subscription.cancel_at_period_end)}>
            {getStatusText(subscription.status, subscription.cancel_at_period_end)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Plan</h4>
            <p className="text-lg">{subscription.plan_name}</p>
            <p className="text-sm text-muted-foreground">
              {subscription.credits_per_cycle} credits per month
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Next Billing Date</h4>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(subscription.current_period_end)}</span>
            </div>
          </div>
        </div>

        {subscription.cancel_at_period_end && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <h4 className="font-semibold text-destructive">Subscription Ending</h4>
                <p className="text-sm">
                  Your subscription will end on {formatDate(subscription.current_period_end)}. 
                  You'll still have access until then.
                </p>
              </div>
            </div>
          </div>
        )}

           
          {showTransactions && (
            <div className="bg-muted/30 rounded-lg p-4 mt-4">
              <h4 className="font-semibold mb-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Recent Transactions
              </h4>
              {transactions.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center py-2 px-3 bg-background rounded border">
                      <div>
                        <div className="text-sm font-medium">
                          {transaction.type === 'purchase' ? 'Credit Purchase' : 'Credit Usage'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(transaction.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          transaction.type === 'purchase' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'purchase' ? '+' : ''}{transaction.amount} credits
                        </div>
                        <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No transactions found</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
export default SubscriptionManager;