
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle } from 'lucide-react';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const CreditExpirationWarning = () => {
  const { getExpirationInfo } = useUserCredits();
  const { user } = useAuth();
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptionExpiry = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('current_period_end')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
        } else if (data) {
          setSubscriptionExpiry(new Date(data.current_period_end));
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionExpiry();
  }, [user]);

  // Use subscription expiry if available, otherwise fall back to credit expiry
  const getEffectiveExpirationInfo = () => {
    if (loading) return null;
    
    if (subscriptionExpiry) {
      const now = new Date();
      const daysUntilExpiry = Math.ceil((subscriptionExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        expiresAt: subscriptionExpiry,
        daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry <= 7,
        isExpired: daysUntilExpiry <= 0
      };
    }
    
    return getExpirationInfo();
  };

  const effectiveExpirationInfo = getEffectiveExpirationInfo();

  if (!effectiveExpirationInfo || effectiveExpirationInfo.isExpired) {
    return null;
  }

  if (effectiveExpirationInfo.isExpiringSoon) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Credits expiring soon!</strong> Your credits will expire in {effectiveExpirationInfo.daysUntilExpiry} day{effectiveExpirationInfo.daysUntilExpiry !== 1 ? 's' : ''} 
          ({effectiveExpirationInfo.expiresAt.toLocaleDateString()}).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Clock className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        Your credits expire on {effectiveExpirationInfo.expiresAt.toLocaleDateString()} 
        ({effectiveExpirationInfo.daysUntilExpiry} days remaining).
      </AlertDescription>
    </Alert>
  );
};

export default CreditExpirationWarning;
