
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, CreditCard, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccessPage = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [creditsAllocated, setCreditsAllocated] = useState<number | null>(null);
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const processPayment = async () => {
      if (!user?.email) {
        console.log('No user found, redirecting to home');
        navigate('/');
        return;
      }

      try {
        // Get URL parameters to determine which plan was purchased
        const urlParams = new URLSearchParams(window.location.search);
        const planParam = urlParams.get('plan') || 'professional';
        
        // Define plan details
        const planDetails = {
          starter: { name: 'Starter', amount: 49, credits: 50 },
          professional: { name: 'Professional', amount: 99, credits: 200 },
          enterprise: { name: 'Enterprise', amount: 249, credits: 500 }
        };

        const selectedPlan = planDetails[planParam as keyof typeof planDetails] || planDetails.professional;

        console.log('Processing payment for plan:', selectedPlan);

        // Process the payment and allocate credits
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: {
            email: user.email,
            planName: selectedPlan.name,
            amount: selectedPlan.amount,
            creditsGranted: selectedPlan.credits
          }
        });

        if (error) {
          throw error;
        }

        console.log('Payment processed successfully:', data);
        setCreditsAllocated(selectedPlan.credits);
        
        toast({
          title: "Payment Successful!",
          description: `${selectedPlan.credits} credits have been added to your account.`,
        });

      } catch (error) {
        console.error('Error processing payment:', error);
        toast({
          title: "Processing Error",
          description: "There was an issue processing your payment. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [user, navigate, toast]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caregrowth-blue mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold mb-2">Processing Your Payment</h2>
                <p className="text-gray-600">Please wait while we allocate your credits...</p>
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
      
      <main className="flex-grow py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
            <p className="text-xl text-gray-600">
              Thank you for your purchase. Your credits have been added to your account.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Purchase Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Credits Purchased:</span>
                  <span className="font-bold text-2xl text-caregrowth-blue">
                    {creditsAllocated || 'Processing...'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 font-medium">Completed</span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Your credits are now available in your dashboard. Start creating amazing content!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button className="bg-caregrowth-blue hover:bg-blue-700 text-white px-8 py-3">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/dashboard/social-media">
              <Button variant="outline" className="px-8 py-3">
                Start Creating Content
              </Button>
            </Link>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600">
              Need help? <Link to="/help" className="text-caregrowth-blue hover:underline">Contact our support team</Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;
