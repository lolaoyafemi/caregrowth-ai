
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserCredits } from '@/hooks/useUserCredits';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refetch } = useUserCredits();

  useEffect(() => {
    const confirmPayment = async () => {
      const sessionId = searchParams.get("session_id");

      console.log('PaymentSuccessPage: Starting payment confirmation');
      console.log('Session ID from URL:', sessionId);

      if (!sessionId) {
        console.error('No session ID found in URL');
        setError("No session ID found. Please contact support.");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        console.log('Calling confirm-payment function with session ID:', sessionId);
        
        // Use the Supabase client to invoke the edge function
        const { data, error: functionError } = await supabase.functions.invoke('confirm-payment', {
          body: { session_id: sessionId }
        });

        console.log('Function response:', data);
        console.log('Function error:', functionError);

        if (functionError) {
          console.error('Function error:', functionError);
          throw new Error(`Function error: ${functionError.message}`);
        }

        if (data?.success) {
          console.log('Payment confirmed successfully:', data);
          setConfirmed(true);
          toast.success("Payment confirmed! Your credits have been added to your account.");
          
          // Refresh credits to reflect the new purchase
          setTimeout(() => {
            refetch();
          }, 1000);
        } else {
          const errorMsg = data?.error || "Payment confirmation failed";
          console.error('Payment confirmation failed:', errorMsg);
          throw new Error(errorMsg);
        }
      } catch (err) {
        console.error("Payment confirmation error:", err);
        const errorMessage = err instanceof Error ? err.message : "Something went wrong confirming your payment.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams, refetch]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {loading && (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p>Processing your payment...</p>
              </div>
            )}
            
            {!loading && confirmed && (
              <div className="space-y-4">
                <div className="text-green-600 text-lg font-semibold">
                  ✅ Payment confirmed!
                </div>
                <p className="text-gray-600">
                  Your credits have been successfully added to your account.
                </p>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
            
            {!loading && error && (
              <div className="space-y-4">
                <div className="text-red-600 text-lg font-semibold">
                  ❌ Payment verification failed
                </div>
                <p className="text-gray-600 text-sm">{error}</p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                  <Button 
                    onClick={() => navigate('/stripe-payment')}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;
