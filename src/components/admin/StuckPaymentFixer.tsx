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
  const [sessionId, setSessionId] = useState('');
  const [monitoring, setMonitoring] = useState(false);

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

  const handleMonitorPayments = async () => {
    setMonitoring(true);
    setResult('');
    
    try {
      const { data, error } = await supabase.functions.invoke('payment-monitor');
      
      if (error) {
        setResult(`Error: ${error.message}`);
      } else if (data?.success) {
        if (data.stuck_payments_count === 0) {
          setResult('✅ No stuck payments found - all payments are processing correctly');
        } else {
          const stuckList = data.stuck_payments.map((p: any) => 
            `• ${p.email}: $${(p.amount / 100).toFixed(2)} (${p.stripe_session_id})`
          ).join('\n');
          setResult(`⚠️ Found ${data.stuck_payments_count} stuck payments:\n\n${stuckList}\n\nUse the session IDs above to fix individual payments.`);
          setHasStuckPayments(true);
        }
      } else {
        setResult(`❌ Failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error monitoring payments:', error);
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMonitoring(false);
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
        body: { session_id: sessionId.trim() }
      });

      console.log('Function response:', data);
      console.log('Function error:', error);

      if (error) {
        throw error;
      }

      if (data?.success) {
        setResult(`✅ Payment created successfully! Payment ID: ${data.payment_id}, Credits: ${data.credits_allocated}`);
        toast.success('Payment has been created and processed successfully!');
        setSessionId(''); // Clear the input
        checkForStuckPayments(); // Recheck
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
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Payment System Monitor & Tools</CardTitle>
        <p className="text-sm text-gray-600">
          Monitor payment health and fix stuck payments
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Health Monitor */}
        <div className="space-y-3">
          <h3 className="font-medium">Payment Health Check</h3>
          <div className="flex gap-2">
            <Button 
              onClick={handleMonitorPayments}
              disabled={monitoring}
              variant="outline"
              className="flex-1"
            >
              {monitoring ? 'Scanning...' : 'Check for Stuck Payments'}
            </Button>
            
            <Button 
              onClick={handleFixStuckPayment}
              disabled={loading || !hasStuckPayments}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Fix Stuck Payments'}
            </Button>
          </div>
          
          {hasStuckPayments && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ Found payments that need attention
            </p>
          )}
        </div>

        {/* Manual Payment Creation */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-medium">Manual Payment Recovery</h3>
          <p className="text-sm text-gray-600">
            If you have a Stripe session ID for a successful payment that wasn't recorded in our system:
          </p>
          
          <div className="flex gap-2">
            <Input
              placeholder="cs_live_..."
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button 
              onClick={handleCreatePaymentFromSession}
              disabled={loading || !sessionId.trim()}
            >
              {loading ? 'Creating...' : 'Fix Payment'}
            </Button>
          </div>
        </div>

        {result && (
          <div className={`p-4 rounded-md text-sm font-mono whitespace-pre-wrap ${
            result.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 
            result.includes('⚠️') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StuckPaymentFixer;