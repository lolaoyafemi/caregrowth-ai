
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, CreditCard, Shield, Lock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const StripePaymentPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 1,
      credits: 50,
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
      price: 2,
      credits: 200,
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
      price: 3,
      credits: 500,
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
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to continue.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPlanData) return;

    setLoading(true);

    try {
      // Store signup data BEFORE creating checkout session
      const signupData = {
        email: email.trim(),
        plan: selectedPlan,
        planName: selectedPlanData.name,
        amount: selectedPlanData.price,
        credits: selectedPlanData.credits,
        timestamp: Date.now()
      };
      
      console.log('Storing pending signup data:', signupData);
      localStorage.setItem('pendingSignup', JSON.stringify(signupData));
      
      // Verify it was stored
      const stored = localStorage.getItem('pendingSignup');
      console.log('Verified stored data:', stored);

      // Create dynamic Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          planName: selectedPlanData.name,
          amount: selectedPlanData.price,
          email: email.trim()
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        console.log('Redirecting to Stripe checkout:', data.url);
        // Open Stripe checkout in the same window to preserve localStorage
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive"
      });
      // Clear stored data on error
      localStorage.removeItem('pendingSignup');
    } finally {
      setLoading(false);
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
              to="/payment" 
              className="inline-flex items-center text-caregrowth-blue hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
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
              <h2 className="text-2xl font-bold mb-6">Choose Your Credit Package</h2>
              
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
                          <p className="text-sm text-gray-600 mt-1">{plan.credits} credits</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${plan.price}</div>
                          <div className="text-gray-600 text-sm">one-time</div>
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
              
              {/* Email Input */}
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-caregrowth-blue focus:border-caregrowth-blue"
                      required
                    />
                    <p className="text-xs text-gray-600">
                      You'll use this email to create your account after payment
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{selectedPlanData?.name} Credits</span>
                    <span className="font-bold">${selectedPlanData?.price}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Credits included:</span>
                    <span className="font-medium">{selectedPlanData?.credits} credits</span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Due</span>
                      <span className="text-caregrowth-blue">${selectedPlanData?.price}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      One-time credit purchase
                    </p>
                  </div>

                  <Button 
                    onClick={handleCheckout}
                    disabled={loading || !email.trim()}
                    className="w-full bg-caregrowth-blue hover:bg-blue-700 text-white py-4 text-lg font-medium disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Checkout...
                      </div>
                    ) : (
                      `Pay $${selectedPlanData?.price} - Continue to Stripe`
                    )}
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
              ✓ Instant credit delivery &nbsp;&nbsp;&nbsp; 
              ✓ Secure payment processing &nbsp;&nbsp;&nbsp; 
              ✓ 24/7 customer support
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StripePaymentPage;
