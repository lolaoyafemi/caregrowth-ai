import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

const StuckPaymentFixer = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [hasStuckPayments, setHasStuckPayments] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState('cs_live_a1r77nz88hengOEYMJw5VvYOZulpLnNzkkpGAbF2igyKYv35BNIgol7CnB');

  useEffect(() => {
    checkForStuckPayments();
  }, []);

  const checkForStuckPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('status', 'pending')
        .limit(1);

      if (error) {
        console.error('Error checking for stuck payments:', error);
        return;
      }

      setHasStuckPayments(data && data.length > 0);
    } catch (err) {
      console.error('Error checking stuck payments:', err);
    }
  };

  const handleFixStuckPayment = async () => {
    setLoading(true);
    setResult('');

    try {
      console.log('Calling fix-stuck-payment function');
      
      const { data, error } = await supabase.functions.invoke('fix-stuck-payment', {
        body: {}
      });

      console.log('Function response:', data);
      console.log('Function error:', error);

      if (error) {
        throw error;
      }

      if (data?.success) {
        setResult(`✅ Payment fixed successfully! Payment ID: ${data.payment_id}, User Credits: ${data.user_credits}`);
        toast.success('Stuck payment has been processed successfully!');
        // Recheck for stuck payments
        checkForStuckPayments();
      } else {
        setResult(`❌ ${data?.error || 'Unknown error occurred'}`);
        toast.error(data?.error || 'Failed to fix payment');
      }

    } catch (err) {
      console.error('Error calling fix function:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setResult(`❌ Error: ${errorMsg}`);
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentFromSession = async () => {
    if (!sessionId.trim()) {
      toast.error('Please enter a Stripe session ID');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      console.log('Creating payment from session:', sessionId);
      
      const { data, error } = await supabase.functions.invoke('fix-stuck-payment', {
        body: { sessionId: sessionId.trim() }
      });

      console.log('Function response:', data);
      console.log('Function error:', error);

      if (error) {
        throw error;
      }

      if (data?.success) {
        setResult(`✅ Payment created successfully! Payment ID: ${data.payment_id}, User Credits: ${data.user_credits}`);
        toast.success('Payment has been created and processed successfully!');
        setSessionId(''); // Clear the input
        // Recheck for stuck payments
        checkForStuckPayments();
      } else {
        setResult(`❌ ${data?.error || 'Unknown error occurred'}`);
        toast.error(data?.error || 'Failed to create payment');
      }

    } catch (err) {
      console.error('Error calling fix function:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setResult(`❌ Error: ${errorMsg}`);
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (hasStuckPayments === false) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-green-600">No Issues Detected</p>
            <p className="text-sm text-gray-600">All payments are processing correctly</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Payment System Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fix existing stuck payments */}
        <div className="space-y-3">
          <h3 className="font-medium">Fix Existing Stuck Payments</h3>
          {hasStuckPayments && (
            <p className="text-sm text-gray-600">
              Found stuck payments that need to be processed.
            </p>
          )}
          
          <Button 
            onClick={handleFixStuckPayment}
            disabled={loading || hasStuckPayments === null}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Fix Stuck Payment'}
          </Button>
        </div>

        {/* Create payment from Stripe session */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-medium">Create Payment from Stripe Session</h3>
          <p className="text-sm text-gray-600">
            If a payment was made but no record exists, enter the Stripe session ID to create it.
          </p>
          
          <Input
            placeholder="cs_live_..."
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            disabled={loading}
          />
          
          <Button 
            onClick={handleCreatePaymentFromSession}
            disabled={loading || !sessionId.trim()}
            className="w-full"
            variant="outline"
          >
            {loading ? 'Creating...' : 'Create Payment Record'}
          </Button>
        </div>

        {result && (
          <div className="p-3 bg-gray-50 rounded border text-sm">
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StuckPaymentFixer;