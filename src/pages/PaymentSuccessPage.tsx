
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const confirmPayment = async () => {
      const sessionId = searchParams.get("session_id");

      if (!sessionId) {
        setError("No session ID found. Please contact support.");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        console.log('Confirming payment with session ID:', sessionId);
        
        const { data, error: functionError } = await supabase.functions.invoke('confirm-payment', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (functionError) {
          throw new Error(functionError.message || "Could not confirm payment");
        }

        if (data?.success) {
          console.log('Payment confirmed successfully:', data);
          setConfirmed(true);
          toast.success("Payment confirmed! Your credits have been added to your account.");
        } else {
          throw new Error(data?.error || "Payment confirmation failed");
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
  }, [searchParams]);

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
                <p className="text-gray-600">{error}</p>
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
