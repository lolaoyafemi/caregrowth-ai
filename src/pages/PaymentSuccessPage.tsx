import React, { useEffect, useState, useRef } from 'react';
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
  const [processingAttempts, setProcessingAttempts] = useState(0);
  const navigate = useNavigate();
  const { refetch } = useUserCredits();
  const hasProcessed = useRef(false);
  const maxRetries = 3;

  useEffect(() => {
    // Prevent multiple simultaneous executions
    if (hasProcessed.current) {
      return;
    }

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

      // Mark as processed to prevent re-runs
      hasProcessed.current = true;

      try {
        console.log('Calling confirm-payment function with session ID:', sessionId);
        
        // Add timeout and better error handling
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
        });

        const requestPromise = supabase.functions.invoke('confirm-payment', {
          body: { session_id: sessionId }
        });

        const { data, error: functionError } = await Promise.race([
          requestPromise,
          timeoutPromise
        ]) as any;

        console.log('Function response:', data);
        console.log('Function error:', functionError);

        // Handle different types of errors
        if (functionError) {
          console.error('Supabase function error:', functionError);
          
          // If it's a network error and we haven't exceeded retries, try again
          if (processingAttempts < maxRetries && 
              (functionError.message?.includes('fetch') || 
               functionError.message?.includes('network') ||
               functionError.message?.includes('timeout'))) {
            
            console.log(`Retrying payment confirmation (attempt ${processingAttempts + 1}/${maxRetries})`);
            setProcessingAttempts(prev => prev + 1);
            hasProcessed.current = false; // Allow retry
            
            setTimeout(() => {
              confirmPayment();
            }, 2000 * (processingAttempts + 1)); // Exponential backoff
            return;
          }
          
          throw new Error(`Payment service error: ${functionError.message}`);
        }

        // Handle successful response
        if (data && data.success === true) {
          console.log('Payment confirmed successfully:', data);
          setConfirmed(true);
          setError(null);
          toast.success("Payment confirmed! Your credits have been added to your account.");
          
          // Refresh credits and redirect to dashboard
          setTimeout(() => {
            refetch();
            // Redirect to dashboard and reload to ensure credits are reflected
            navigate('/dashboard');
            window.location.reload();
          }, 1500);
        }
        // Handle failed response with success: false
        else if (data && data.success === false) {
          const errorMsg = data.message || data.error || "Payment confirmation returned failure status";
          console.error('Payment confirmation failed with success=false:', errorMsg);
          throw new Error(errorMsg);
        }
        // Handle unexpected response format
        else {
          console.error('Unexpected response format:', data);
          throw new Error("Received unexpected response format from payment service");
        }

      } catch (err) {
        console.error("Payment confirmation error:", err);
        
        // Only set error state if we've exhausted retries or it's not a retry-able error
        if (processingAttempts >= maxRetries || 
            !(err instanceof Error && 
              (err.message.includes('fetch') || 
               err.message.includes('network') || 
               err.message.includes('timeout')))) {
          
          let errorMessage = "Something went wrong confirming your payment.";
          
          if (err instanceof Error) {
            if (err.message.includes('timeout') || err.message.includes('Request timeout')) {
              errorMessage = "Payment confirmation timed out. Your payment may still be processed. Please check your dashboard or contact support.";
            } else if (err.message.includes('network') || err.message.includes('fetch')) {
              errorMessage = "Network error occurred. Please check your connection and try refreshing the page.";
            } else {
              errorMessage = err.message;
            }
          }
          
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to prevent immediate flickering
    const timer = setTimeout(() => {
      confirmPayment();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [searchParams]); // Removed refetch from dependencies to prevent re-runs

  // Prevent flickering by showing loading state initially
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p>Processing your payment...</p>
                {processingAttempts > 0 && (
                  <p className="text-sm text-gray-500">
                    Retry attempt {processingAttempts} of {maxRetries}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {confirmed && (
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
            
            {error && (
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
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="w-full"
                  >
                    Retry Confirmation
                  </Button>
                  <Button 
                    onClick={() => window.open('https://buy.stripe.com/3cI28sbNC05F3QCeXHbsc0y?success_url=https%3A%2F%2Fwww.caregrowthassistant.com%2Fpayment-success%3Fsession_id%3D%7BCHECKOUT_SESSION_ID%7D', '_blank')}
                    className="w-full"
                  >
                    Make New Payment
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



// import React, { useEffect, useState } from 'react';
// import { useSearchParams, useNavigate } from 'react-router-dom';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import Header from '@/components/layout/Header';
// import Footer from '@/components/layout/Footer';
// import { supabase } from '@/integrations/supabase/client';
// import { toast } from 'sonner';
// import { useUserCredits } from '@/hooks/useUserCredits';

// const PaymentSuccessPage = () => {
//   const [searchParams] = useSearchParams();
//   const [loading, setLoading] = useState(true);
//   const [confirmed, setConfirmed] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const navigate = useNavigate();
//   const { refetch } = useUserCredits();

//   useEffect(() => {
//     const confirmPayment = async () => {
//       const sessionId = searchParams.get("session_id");

//       console.log('PaymentSuccessPage: Starting payment confirmation');
//       console.log('Session ID from URL:', sessionId);

//       if (!sessionId) {
//         console.error('No session ID found in URL');
//         setError("No session ID found. Please contact support.");
//         setLoading(false);
//         return;
//       }

//       setLoading(true);

//       try {
//         console.log('Calling confirm-payment function with session ID:', sessionId);
        
//         // Use the Supabase client to invoke the edge function with session_id in body
//         const { data, error: functionError } = await supabase.functions.invoke('confirm-payment', {
//           body: { session_id: sessionId }
//         });

//         console.log('Function response:', data);
//         console.log('Function error:', functionError);

//         if (functionError) {
//           console.error('Function error:', functionError);
//           throw new Error(`Function error: ${functionError.message}`);
//         }

//         if (data?.success) {
//           console.log('Payment confirmed successfully:', data);
//           setConfirmed(true);
//           toast.success("Payment confirmed! Your credits have been added to your account.");
          
//           // Refresh credits to reflect the new purchase
//           setTimeout(() => {
//             refetch();
//           }, 1000);
//         } else {
//           const errorMsg = data?.error || "Payment confirmation failed";
//           console.error('Payment confirmation failed:', errorMsg);
//           throw new Error(errorMsg);
//         }
//       } catch (err) {
//         console.error("Payment confirmation error:", err);
//         const errorMessage = err instanceof Error ? err.message : "Something went wrong confirming your payment.";
//         setError(errorMessage);
//         toast.error(errorMessage);
//       } finally {
//         setLoading(false);
//       }
//     };

//     confirmPayment();
//   }, [searchParams, refetch]);

//   return (
//     <div className="min-h-screen flex flex-col bg-gray-50">
//       <Header />
//       <main className="flex-grow flex items-center justify-center p-4">
//         <Card className="w-full max-w-md">
//           <CardHeader>
//             <CardTitle className="text-center">Payment Status</CardTitle>
//           </CardHeader>
//           <CardContent className="text-center space-y-4">
//             {loading && (
//               <div className="space-y-2">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
//                 <p>Processing your payment...</p>
//               </div>
//             )}
            
//             {!loading && confirmed && (
//               <div className="space-y-4">
//                 <div className="text-green-600 text-lg font-semibold">
//                   ✅ Payment confirmed!
//                 </div>
//                 <p className="text-gray-600">
//                   Your credits have been successfully added to your account.
//                 </p>
//                 <Button 
//                   onClick={() => navigate('/dashboard')}
//                   className="w-full"
//                 >
//                   Go to Dashboard
//                 </Button>
//               </div>
//             )}
            
//             {!loading && error && (
//               <div className="space-y-4">
//                 <div className="text-red-600 text-lg font-semibold">
//                   ❌ Payment verification failed
//                 </div>
//                 <p className="text-gray-600 text-sm">{error}</p>
//                 <div className="space-y-2">
//                   <Button 
//                     onClick={() => navigate('/dashboard')}
//                     variant="outline"
//                     className="w-full"
//                   >
//                     Go to Dashboard
//                   </Button>
//                   <Button 
//                     onClick={() => navigate('/stripe-payment')}
//                     className="w-full"
//                   >
//                     Try Again
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </main>
//       <Footer />
//     </div>
//   );
// };

// export default PaymentSuccessPage;
