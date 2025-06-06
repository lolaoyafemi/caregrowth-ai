
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, CreditCard, Shield, Lock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const StripePaymentPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [loading, setLoading] = useState(false);
  const [addingCredits, setAddingCredits] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 1,
      credits: 50,
      features: ['50 Social Media Posts', '5 Documents', '100 Q&A Queries', 'Email Support']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 2,
      credits: 200,
      features: ['200 Posts', '20 Documents', '500 Q&A', 'Priority Support', 'Analytics'],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 3,
      credits: 500,
      features: ['Unlimited Posts', 'Unlimited Docs', 'Unlimited Q&A', 'Account Manager']
    }
  ];

  const creditPackages = [
    { credits: 50, label: '50 Credits', planName: 'Starter Package' },
    { credits: 200, label: '200 Credits', planName: 'Professional Package' },
    { credits: 500, label: '500 Credits', planName: 'Enterprise Package' }
  ];

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan);

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in before proceeding to payment.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (!selectedPlanData) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan: selectedPlan,
          planName: selectedPlanData.name,
          amount: selectedPlanData.price,
          credits: selectedPlanData.credits,
          email: user.email,
          user_id: user.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Failed",
        description: "Unable to create checkout session.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async (credits: number, planName: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add credits.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    setAddingCredits(credits.toString());

    try {
      const { data, error } = await supabase.functions.invoke('add-credits', {
        body: {
          credits,
          planName
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Credits Added!",
          description: `Successfully added ${credits} credits to your account. Total: ${data.total_credits}`,
        });
      } else {
        throw new Error(data?.error || "Failed to add credits");
      }
    } catch (error) {
      console.error('Add credits error:', error);
      toast({
        title: "Failed to Add Credits",
        description: error.message || "Unable to add credits to your account.",
        variant: "destructive"
      });
    } finally {
      setAddingCredits(null);
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Choose Your Credit Package</h2>
              {plans.map(plan => (
                <Card
                  key={plan.id}
                  className={`${selectedPlan === plan.id ? 'border-2 border-caregrowth-blue shadow-md' : 'border'} cursor-pointer`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{plan.credits} credits</span>
                      <span className="font-bold text-lg">${plan.price}</span>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {plan.features.slice(0, 3).map((f, i) => (
                        <li key={i} className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          {f}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-sm text-gray-500">
                          +{plan.features.length - 3} more
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              ))}

              {/* Free Credit Addition Section */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Add Credits Directly (Free for Testing)</h3>
                <div className="space-y-3">
                  {creditPackages.map((pkg) => (
                    // <Button
                    //   key={pkg.credits}
                    //   onClick={() => handleAddCredits(pkg.credits, pkg.planName)}
                    //   disabled={addingCredits === pkg.credits.toString()}
                    //   variant="outline"
                    //   className="w-full text-left justify-between border-2 border-dashed border-gray-300 hover:border-caregrowth-blue"
                    // >

                    <Button
                      key={pkg.credits}
                      onClick={() => handleAddCredits(pkg.credits, pkg.planName)}
                      disabled={addingCredits === pkg.credits.toString()}
                      variant="outline"
                      className="w-full text-left justify-between border-2 border-black-400 hover:border-caregrowth-blue"
                    >
                      <span>Add {pkg.label}</span>
                      {addingCredits === pkg.credits.toString() ? (
                        <span className="text-sm">Adding...</span>
                      ) : (
                        <span className="text-sm text-gray-500">Free</span>
                      )}
                    </Button>
                  ))}
                </div>

              </div>
            </div>

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
                  <div className="flex justify-between">
                    <span>{selectedPlanData?.name} Credits</span>
                    <span className="font-bold">${selectedPlanData?.price}</span>
                  </div>
                  <Button 
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full bg-caregrowth-blue hover:bg-blue-700 text-white py-4 text-lg"
                  >
                    {loading ? 'Redirecting...' : `Pay $${selectedPlanData?.price} with Stripe`}
                  </Button>
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
