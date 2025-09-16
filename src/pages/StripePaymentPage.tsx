
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, CreditCard, Shield, Lock, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import CreditExpirationWarning from '@/components/dashboard/CreditExpirationWarning';
import { supabase } from '@/integrations/supabase/client';

const StripePaymentPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const plans = [
    {
      id: 'professional',
      name: 'CareGrowthAI Credits',
      price: 49,
      credits: 1000,
      features: [
        '1000 Social Media Posts', 
        'Unlimited Documents', 
        'Unlimited Q&A Queries', 
        'Priority Support', 
        'Advanced Analytics',
        'Custom Integrations'
      ],
      popular: true
    }
  ];


  const selectedPlanData = plans.find(plan => plan.id === selectedPlan);

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caregrowth-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !session) {
    toast({
      title: "Login Required",
      description: "Please log in before proceeding to payment.",
      variant: "destructive"
    });
    navigate('/login');
    return null;
  }

  const handleSubscribe = async () => {
    if (!user || !session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue with payment.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (!selectedPlanData) {
      toast({
        title: "Plan Selection Required",
        description: "Please select a plan before proceeding.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          planName: selectedPlanData.name,
          amount: selectedPlanData.price,
          email: user.email,
          credits: selectedPlanData.credits,
          couponCode: couponCode.trim() || undefined
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Payment session creation failed:', error);
      toast({
        title: "Payment Error",
        description: "Failed to create payment session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <Link to="/payment" className="inline-flex items-center text-caregrowth-blue">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Link>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Complete Your Purchase</h1>
            <p className="text-xl text-gray-600">Secure payment powered by Stripe</p>
            {user && (
              <p className="text-sm text-gray-500 mt-2">Logged in as: {user.email}</p>
            )}
          </div>

          <CreditExpirationWarning />

          <div className="space-y-8">
              <div className="flex justify-center">
                <div className="w-full max-w-lg">
                  <h2 className="text-2xl font-bold mb-6 text-center">Your Credit Package</h2>
                  {plans.map(plan => (
                    <Card
                      key={plan.id}
                      className="border-2 border-caregrowth-blue shadow-md mb-6"
                    >
                      <CardHeader className="pb-4 text-center">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <div className="text-3xl font-bold">${plan.price}</div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center mb-4">
                          <span className="font-medium text-lg">{plan.credits} credits</span>
                          <div className="flex items-center justify-center text-sm text-gray-500 mt-1">
                            <Clock className="w-4 h-4 mr-1" />
                            Monthly subscription
                          </div>
                        </div>
                        <ul className="text-sm text-gray-600 space-y-2">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-center">
                              <Check className="w-4 h-4 text-green-500 mr-2" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <Card className="border-2 border-gray-200 w-full max-w-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Complete Purchase
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-center">
                    {selectedPlanData && (
                      <>
                        <div className="flex justify-between">
                          <span>{selectedPlanData.name}</span>
                          <span className="font-bold">${selectedPlanData.price}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {selectedPlanData.credits} credits - Monthly subscription
                        </div>
                      </>
                     )}
                    
                    <div className="space-y-4 mt-6">
                      <div>
                        <label htmlFor="coupon" className="block text-sm font-medium text-gray-700 mb-2">
                          Coupon Code (Optional)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="coupon"
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder="Enter coupon code"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caregrowth-blue focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSubscribe}
                      disabled={!selectedPlanData || !user || !session || loading}
                      className="w-full bg-caregrowth-blue hover:bg-blue-700 text-white py-4 text-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : !user || !session ? (
                        'Please Log In'
                      ) : (
                        `Subscribe $${selectedPlanData?.price || 0}/month`
                      )}
                    </Button>
                    
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mt-4">
                      <Shield className="w-4 h-4" />
                      <span>Secure payment powered by Stripe</span>
                      <Lock className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StripePaymentPage;
