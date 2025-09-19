import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = 'Payment Successful - CareGrowth Assistant';
    
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      processCheckoutSession(sessionId);
    } else {
      // No session ID, just redirect to dashboard
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, navigate]);

  const processCheckoutSession = async (sessionId: string) => {
    setProcessing(true);
    
    try {
      console.log('Processing checkout session:', sessionId);
      
      // Call the confirm-payment function
      const { data, error } = await supabase.functions.invoke('confirm-payment', {
        body: { session_id: sessionId }
      });

      if (error) {
        console.error('Error processing checkout session:', error);
        toast({
          title: "Processing Error",
          description: "There was an issue processing your payment. Please contact support if credits are not reflected in your account.",
          variant: "destructive",
        });
      } else if (data?.success) {
        console.log('Checkout session processed successfully:', data);
        setSuccess(true);
        toast({
          title: "Payment Successful!",
          description: `${data.total_credits} credits have been added to your account.`,
        });
      } else {
        console.error('Unexpected response:', data);
        toast({
          title: "Processing Issue",
          description: data?.error || "Unable to process payment. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error calling confirm-payment:', err);
      toast({
        title: "Error",
        description: "There was an error processing your payment. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      
      // Clean up URL and redirect to dashboard after a delay
      const timer = setTimeout(() => {
        // Remove the session_id from URL and navigate to dashboard
        navigate('/dashboard', { replace: true });
      }, success ? 3000 : 2000);
      
      return () => clearTimeout(timer);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <section className="text-center max-w-md mx-auto px-6">
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-foreground mb-2">Processing Payment...</h1>
            <p className="text-muted-foreground mb-4">Please wait while we confirm your payment and allocate your credits.</p>
          </>
        ) : success ? (
          <>
            <div className="w-12 h-12 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-4">Your credits have been successfully added to your account.</p>
            <p className="text-sm text-muted-foreground">Redirecting you to your dashboard...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-foreground mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-4">Thank you for your purchase. Your credits are being processed.</p>
            <p className="text-sm text-muted-foreground">Redirecting you to your dashboard...</p>
          </>
        )}
      </section>
    </main>
  );
};

export default PaymentSuccessPage;