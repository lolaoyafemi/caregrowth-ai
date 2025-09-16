import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const StuckPaymentFixer = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Fix Stuck Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          This will process the stuck payment with ID: 737e877d-7139-493a-8bc6-963b86fbb1d1
        </p>
        
        <Button 
          onClick={handleFixStuckPayment}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Fix Stuck Payment'}
        </Button>

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