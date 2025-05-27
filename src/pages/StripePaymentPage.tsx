
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, CreditCard, Shield, Lock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const StripePaymentPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 49,
      priceId: 'price_starter', // Replace with actual Stripe price ID
      features: [
        '50 Social Media Posts',
        '5 Documents (up to 25 pages each)',
        '100 Q&A Queries',
        'Email Support'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 99,
      priceId: 'price_professional', // Replace with actual Stripe price ID
      features: [
        '200 Social Media Posts',
        '20 Documents (up to 50 pages each)',
        '500 Q&A Queries',
        'Priority Support',
        'Advanced Analytics'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 249,
      priceId: 'price_enterprise', // Replace with actual Stripe price ID
      features: [
        'Unlimited Social Media Posts',
        'Unlimited Documents',
        'Unlimited Q&A Queries',
        'Dedicated Account Manager',
        'Custom Integrations',
        'White-label Options'
      ]
    }
  ];

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan);

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to continue with payment",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Call Stripe checkout function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: selectedPlanData?.priceId,
          planName: selectedPlanData?.name,
          amount: selectedPlanData?.price
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Navigation */}
          <div className="mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center text-caregrowth-blue hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Complete Your Purchase</h1>
            <p className="text-xl text-gray-600">
              Secure payment processing powered by Stripe
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plan Selection */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Choose Your Plan</h2>
              
              <div className="space-y-4">
                {plans.map((plan) => (
                  <Card 
                    key={plan.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedPlan === plan.id 
                        ? 'border-2 border-caregrowth-blue shadow-md' 
                        : 'border border-gray-200 hover:border-gray-300'
                    } ${plan.popular ? 'relative' : ''}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-caregrowth-blue text-white px-4 py-1 text-sm font-medium rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${plan.price}</div>
                          <div className="text-gray-600 text-sm">/month</div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                        {plan.features.length > 3 && (
                          <li className="text-sm text-gray-500">
                            +{plan.features.length - 3} more features
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Payment Summary</h2>
              
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{selectedPlanData?.name} Plan</span>
                    <span className="font-bold">${selectedPlanData?.price}/month</span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Due Today</span>
                      <span className="text-caregrowth-blue">${selectedPlanData?.price}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Recurring monthly subscription
                    </p>
                  </div>

                  <Button 
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full bg-caregrowth-blue hover:bg-blue-700 text-white py-4 text-lg font-medium"
                  >
                    {isLoading ? 'Processing...' : `Pay $${selectedPlanData?.price} - Continue to Stripe`}
                  </Button>

                  {/* Security badges */}
                  <div className="flex items-center justify-center space-x-4 pt-4 border-t">
                    <div className="flex items-center text-sm text-gray-600">
                      <Shield className="w-4 h-4 mr-1" />
                      SSL Secured
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Lock className="w-4 h-4 mr-1" />
                      256-bit Encryption
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Powered by Stripe. Your payment information is secure and encrypted.
                  </p>
                </CardContent>
              </Card>

              {/* Features Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What's Included</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedPlanData?.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="text-center mt-12 pt-8 border-t">
            <p className="text-gray-600 mb-4">
              ✓ 30-day money-back guarantee &nbsp;&nbsp;&nbsp; 
              ✓ Cancel anytime &nbsp;&nbsp;&nbsp; 
              ✓ Secure payment processing
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StripePaymentPage;
