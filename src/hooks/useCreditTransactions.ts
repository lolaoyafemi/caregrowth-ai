
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Transaction } from '@/types/credit';

export const useCreditTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadTransactions = async () => {
    try {
      console.log('Loading credit transactions...');
      
      // Fetch recent credit purchases
      const { data: purchases, error: purchaseError } = await supabase
        .from('credit_sales_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (purchaseError) {
        console.error('Error fetching purchases:', purchaseError);
      }

      // Fetch recent credit usage
      const { data: usage, error: usageError } = await supabase
        .from('credit_usage_log')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(10);

      if (usageError) {
        console.error('Error fetching usage:', usageError);
      }

      const allTransactions: Transaction[] = [];

      // Add purchases
      purchases?.forEach(purchase => {
        allTransactions.push({
          id: purchase.id,
          user_email: purchase.email,
          type: 'purchase',
          amount: purchase.credits_purchased,
          timestamp: purchase.timestamp,
          status: 'completed'
        });
      });

      // Add usage
      usage?.forEach(usageItem => {
        allTransactions.push({
          id: usageItem.id,
          user_email: usageItem.email || 'Unknown',
          type: 'usage',
          amount: -usageItem.credits_used,
          timestamp: usageItem.used_at,
          status: 'completed'
        });
      });

      // Sort by timestamp
      const sortedTransactions = allTransactions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);

      setTransactions(sortedTransactions);
      console.log('Loaded transactions:', sortedTransactions.length);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transaction data');
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  return {
    transactions,
    loadTransactions
  };
};
